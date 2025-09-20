#!/usr/bin/env bash
set -euo pipefail

# Delete existing JSONs in the GCS prefix and upload local JSONs only.
# Usage:
#   GCS_BUCKET=oddlyoptic-portfolio-media GCS_JSON_PREFIX=ai-ads/json bash scripts/gcs_publish_json.sh
# Optional: set CACHE_CONTROL, e.g., 'public, max-age=60'

BUCKET="${GCS_BUCKET:-oddlyoptic-portfolio-media}"
PREFIX="${GCS_JSON_PREFIX:-ai-ads/json}"
LOCAL_DIR="gcs-upload/ai-ads/json"
CACHE_CONTROL="${CACHE_CONTROL:-public, max-age=60}"

if ! command -v gsutil >/dev/null 2>&1; then
  echo "Error: gsutil is required. Install Google Cloud SDK and run 'gcloud auth login' or activate a service account." >&2
  exit 1
fi

if [ ! -d "$LOCAL_DIR" ]; then
  echo "Error: local JSON folder not found: $LOCAL_DIR" >&2
  exit 1
fi

echo "Remote: gs://$BUCKET/$PREFIX"
echo "Local:  $LOCAL_DIR"

echo "Listing remote JSONs before deletion..."
gsutil ls "gs://$BUCKET/$PREFIX/*.json" || true

echo "Deleting remote JSONs (only .json files in the prefix)..."
gsutil -m rm "gs://$BUCKET/$PREFIX/*.json" || true

echo "Uploading local JSONs..."
gsutil -m -h "Cache-Control:$CACHE_CONTROL" cp -a public-read "$LOCAL_DIR"/*.json "gs://$BUCKET/$PREFIX/"

echo "Listing remote JSONs after upload..."
gsutil ls -l "gs://$BUCKET/$PREFIX/*.json"

echo "Done."

