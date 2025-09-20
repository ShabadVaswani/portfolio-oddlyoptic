#!/usr/bin/env bash
set -euo pipefail

# Local Whisper.cpp pipeline: download ffmpeg + whisper binary + model, transcribe all videos,
# save transcripts/*.txt, then generate JSON via scripts/transcribe.js.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BIN_DIR="$ROOT_DIR/bin"
TOOLS_DIR="$ROOT_DIR/tools"
MODELS_DIR="$ROOT_DIR/models"
TRANS_DIR="$ROOT_DIR/transcripts"
VIDEOS_DIR1="$ROOT_DIR/gcs-upload/ai-ads/videos"
VIDEOS_DIR2="$ROOT_DIR/ai generated ads"

mkdir -p "$BIN_DIR" "$TOOLS_DIR" "$MODELS_DIR" "$TRANS_DIR" "$TRANS_DIR/tmp"

have_cmd() { command -v "$1" >/dev/null 2>&1; }

# 1) FFmpeg
if have_cmd ffmpeg; then
  FFmpeg="ffmpeg"
else
  if [ ! -x "$BIN_DIR/ffmpeg" ]; then
    echo "Downloading static ffmpeg..."
    curl -L -o "$TOOLS_DIR/ffmpeg.tar.xz" https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
    tar -xf "$TOOLS_DIR/ffmpeg.tar.xz" -C "$TOOLS_DIR"
    rm -f "$TOOLS_DIR/ffmpeg.tar.xz"
    FF_DIR="$(ls -d "$TOOLS_DIR"/ffmpeg-*-amd64-static | head -n1)"
    cp "$FF_DIR/ffmpeg" "$BIN_DIR/ffmpeg"
    cp "$FF_DIR/ffprobe" "$BIN_DIR/ffprobe" || true
    chmod +x "$BIN_DIR/ffmpeg" "$BIN_DIR/ffprobe" || true
  fi
  FFmpeg="$BIN_DIR/ffmpeg"
fi

# 2) Whisper binary
WHISPER_BIN="$BIN_DIR/whisper"
if [ ! -x "$WHISPER_BIN" ]; then
  echo "Building whisper.cpp from source (no prebuilt binary found)..."
  cd "$TOOLS_DIR"
  if [ ! -d whisper.cpp ]; then
    git clone --depth=1 https://github.com/ggerganov/whisper.cpp.git
  fi
  cd whisper.cpp
  if command -v cmake >/dev/null 2>&1; then
    echo "Using CMake build"
    mkdir -p build
    cmake -S . -B build
    cmake --build build -j 2
    CANDIDATES=("build/bin/main" "build/main" "bin/main" "main")
  else
    echo "Using Make build"
    make -j 2
    CANDIDATES=("main" "bin/main")
  fi
  FOUND=""
  for c in "${CANDIDATES[@]}"; do
    if [ -f "$c" ]; then
      FOUND="$c"
      break
    fi
  done
  if [ -z "$FOUND" ]; then
    echo "Could not locate built whisper binary (tried: ${CANDIDATES[*]})." >&2
    exit 1
  fi
  cp "$FOUND" "$WHISPER_BIN"
  chmod +x "$WHISPER_BIN"
  cd "$ROOT_DIR"
fi

# 3) Model
MODEL_PATH="$MODELS_DIR/ggml-base.en.bin"
if [ ! -f "$MODEL_PATH" ]; then
  echo "Downloading model ggml-base.en.bin..."
  curl -L -o "$MODEL_PATH" https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin || \
  curl -L -o "$MODEL_PATH" https://github.com/ggerganov/whisper.cpp/releases/download/v1.6.0/ggml-base.en.bin
fi

shopt -s nullglob
ALL_VIDEOS=("$VIDEOS_DIR1"/*.{mp4,MP4,mov,MOV,m4v,M4V,webm,WEBM} "$VIDEOS_DIR2"/*.{mp4,MP4,mov,MOV,m4v,M4V,webm,WEBM}) || true

# Optional args: list of base keys to process (e.g., ad_02 ad_05)
if [ "$#" -gt 0 ]; then
  keys=("$@")
  declare -A want
  for k in "${keys[@]}"; do want[$k]=1; done
  videos=()
  for v in "${ALL_VIDEOS[@]}"; do
    b="$(basename "$v")"; b="${b%.*}"
    if [[ "$b" =~ ^(ad_[0-9]+) ]]; then baseKey="${BASH_REMATCH[1]}"; else baseKey="$b"; fi
    if [[ -n "${want[$baseKey]:-}" ]]; then videos+=("$v"); fi
  done
  # Remove any existing transcripts for these keys to force re-transcription
  for k in "${keys[@]}"; do rm -f "$TRANS_DIR/$k.txt" 2>/dev/null || true; done
else
  videos=("${ALL_VIDEOS[@]}")
fi

if [ ${#videos[@]} -eq 0 ]; then
  echo "No videos found in: $VIDEOS_DIR1 or $VIDEOS_DIR2"
  exit 0
fi

echo "Found ${#videos[@]} videos. Transcribing..."
for v in "${videos[@]}"; do
  [ -f "$v" ] || continue
  basefile="$(basename "$v")"
  base="${basefile%.*}"
  # Normalize to ad_XX base key if possible
  if [[ "$base" =~ ^(ad_[0-9]+) ]]; then
    key="${BASH_REMATCH[1]}"
  else
    key="$base"
  fi
  out_txt="$TRANS_DIR/$key.txt"
  # do not skip; we want fresh transcript when invoked with specific keys
  wav="$TRANS_DIR/tmp/$key.wav"
  echo "Extracting audio: $basefile"
  "$FFmpeg" -y -i "$v" -vn -ac 1 -ar 16000 -f wav "$wav"
  # Prefer whisper-cli if present (newer), else fallback to built binary
  if [ -x "$TOOLS_DIR/whisper.cpp/build/bin/whisper-cli" ]; then
    echo "Running whisper-cli: $key"
    "$TOOLS_DIR/whisper.cpp/build/bin/whisper-cli" -m "$MODEL_PATH" -f "$wav" -otxt -of "$TRANS_DIR/$key" --print-progress
  else
    echo "Running whisper: $key"
    "$WHISPER_BIN" -m "$MODEL_PATH" -f "$wav" -otxt -of "$TRANS_DIR/$key"
  fi
  rm -f "$wav" || true
  if [ -s "$out_txt" ]; then
    echo "OK: $out_txt"
  else
    echo "Failed to produce transcript for $v" >&2
  fi
done

echo "Generating JSON from transcripts and existing metadata..."
node "$ROOT_DIR/scripts/transcribe.js"
echo "Done. See video-metadata/*.json"
