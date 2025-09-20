#!/usr/bin/env node
// Create normalized JSON metadata for all local ad videos.
// Optional: if ASSEMBLYAI_API_KEY is set and --with-transcripts is passed,
// will attempt to transcribe audio using AssemblyAI and include transcript-derived description when no metadata exists.

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const VIDEOS_DIRS = [
  path.join(ROOT, 'gcs-upload', 'ai-ads', 'videos'),
  path.join(ROOT, 'ai generated ads'), // legacy folder name with spaces
]
const PUBLIC_META_DIR = path.join(ROOT, 'public', 'ai-ads-json')
const OUT_DIR = path.join(ROOT, 'video-metadata')
const TRANSCRIPTS_DIR = path.join(ROOT, 'transcripts')

const WITH_TRANSCRIPTS = process.argv.includes('--with-transcripts')
const AAI_KEY = process.env.ASSEMBLYAI_API_KEY || ''

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function listFiles(dir) {
  try {
    return fs.readdirSync(dir).map((f) => path.join(dir, f))
  } catch {
    return []
  }
}

function discoverVideos() {
  const files = VIDEOS_DIRS.flatMap(listFiles)
  const vids = files.filter((f) => /\.(mp4|mov|m4v|webm)$/i.test(f))
  // de-duplicate by base key so we don't process same ad twice
  const seen = new Set()
  const unique = []
  for (const f of vids) {
    const b = baseKeyFromFilename(f)
    if (seen.has(b)) continue
    seen.add(b)
    unique.push(f)
  }
  return unique
}

function baseKeyFromFilename(file) {
  // Example: ad_01_finance.mp4 -> ad_01
  const name = path.basename(file)
  const noExt = name.replace(/\.[^.]+$/, '')
  const m = noExt.match(/^(ad_\d+)/i)
  return m ? m[1].toLowerCase() : noExt.toLowerCase()
}

function loadPublicMetaForBase(base) {
  // Try exact base match first (ad_01.json) from public
  const candidates = [
    path.join(PUBLIC_META_DIR, `${base}.json`),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch {}
    }
  }
  return null
}

function loadTranscript(base) {
  try {
    const p = path.join(TRANSCRIPTS_DIR, `${base}.txt`)
    if (fs.existsSync(p)) {
      const t = fs.readFileSync(p, 'utf8').trim()
      return t || null
    }
  } catch {}
  return null
}

async function transcribeWithAssemblyAI(file) {
  if (!AAI_KEY) return null
  const endpointUpload = 'https://api.assemblyai.com/v2/upload'
  const endpointTranscript = 'https://api.assemblyai.com/v2/transcripts'

  const buf = fs.readFileSync(file)
  // Upload audio/video
  const upRes = await fetch(endpointUpload, {
    method: 'POST',
    headers: { 'authorization': AAI_KEY },
    body: buf,
  })
  if (!upRes.ok) {
    console.error('Upload failed:', upRes.status, await upRes.text())
    return null
  }
  const upData = await upRes.json()
  const audioUrl = upData.upload_url

  // Request transcript
  const tRes = await fetch(endpointTranscript, {
    method: 'POST',
    headers: {
      'authorization': AAI_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ audio_url: audioUrl }),
  })
  if (!tRes.ok) {
    console.error('Transcript create failed:', tRes.status, await tRes.text())
    return null
  }
  const tData = await tRes.json()
  const id = tData.id

  // Poll
  while (true) {
    await sleep(2000)
    const pRes = await fetch(`${endpointTranscript}/${id}`, {
      headers: { 'authorization': AAI_KEY },
    })
    if (!pRes.ok) break
    const p = await pRes.json()
    if (p.status === 'completed') return p.text
    if (p.status === 'error') {
      console.error('Transcript error:', p.error)
      return null
    }
  }
  return null
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function defaultTitle(base) {
  const pretty = base
    .replace(/_/g, ' ')     // ad_01 -> ad 01
    .replace(/\bad\b/i, 'Ad')
    .replace(/\b(\d{2})\b/, ' $1')
  return pretty.charAt(0).toUpperCase() + pretty.slice(1)
}

async function main() {
  ensureDir(OUT_DIR)
  const videos = discoverVideos()
  if (!videos.length) {
    console.log('No videos found.')
    process.exit(0)
  }

  for (const file of videos) {
    const base = baseKeyFromFilename(file)
    const outPath = path.join(OUT_DIR, `${base}.json`)
    // Transcript-only mode: ignore public metadata; build all fields from transcripts if present
    const transcriptText = loadTranscript(base) || ''
    const title = defaultTitle(base)
    const normalized = {
      title,
      tags: [],
      blurb: transcriptText ? (transcriptText.length > 140 ? transcriptText.slice(0, 137) + '…' : transcriptText) : '',
      description: transcriptText,
      transcript: transcriptText,
    }
    fs.writeFileSync(outPath, JSON.stringify(normalized, null, 2))
    console.log('Wrote', path.relative(ROOT, outPath))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
