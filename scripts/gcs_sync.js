#!/usr/bin/env node
// Sync videos and/or metadata JSON from a public GCS bucket into the repo.
// No auth required if the bucket objects are publicly readable.

import fs from 'node:fs'
import path from 'node:path'

const BUCKET = process.env.GCS_BUCKET || 'oddlyoptic-portfolio-media'
const VIDEO_PREFIX = process.env.GCS_VIDEO_PREFIX || 'ai-ads/videos'
const JSON_PREFIX = process.env.GCS_JSON_PREFIX || 'ai-ads/json'

const argv = process.argv.slice(2)
const DO_VIDEOS = !argv.includes('--json-only')
const DO_JSON = !argv.includes('--videos-only')
// Optional positional args: list of base keys to sync (e.g., ad_02 ad_05)
const BASE_FILTER = argv.filter(a => !a.startsWith('--')).map(s => s.toLowerCase())

const OUT_VIDEOS_DIR = path.join(process.cwd(), 'gcs-upload', 'ai-ads', 'videos')
const OUT_JSON_DIR = path.join(process.cwd(), 'public', 'ai-ads-json')

const allowedExts = ['.mp4', '.webm', '.mov', '.m4v']

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }) }

function encPath(p) { return p.split('/').map(encodeURIComponent).join('/') }

async function listAll(prefix) {
  let items = []
  let pageToken = ''
  while (true) {
    const u = new URL(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o`)
    u.searchParams.set('prefix', prefix)
    u.searchParams.set('fields', 'items(name,contentType),nextPageToken')
    if (pageToken) u.searchParams.set('pageToken', pageToken)
    const res = await fetch(u, { method: 'GET' })
    if (!res.ok) throw new Error(`GCS list failed ${res.status}`)
    const data = await res.json()
    if (Array.isArray(data.items)) items = items.concat(data.items)
    if (!data.nextPageToken) break
    pageToken = data.nextPageToken
  }
  return items
}

async function downloadObject(name, destPath) {
  const url = `https://storage.googleapis.com/${BUCKET}/${encPath(name)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download failed ${res.status} for ${name}`)
  const ab = await res.arrayBuffer()
  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  fs.writeFileSync(destPath, Buffer.from(ab))
}

function cleanDir(dir, keepExts) {
  if (!fs.existsSync(dir)) return
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    if (fs.statSync(p).isDirectory()) continue
    if (keepExts && keepExts.length) {
      if (!keepExts.includes(path.extname(f).toLowerCase())) fs.unlinkSync(p)
    } else {
      fs.unlinkSync(p)
    }
  }
}

async function syncVideos() {
  ensureDir(OUT_VIDEOS_DIR)
  const items = await listAll(VIDEO_PREFIX)
  let vids = items.filter(it => allowedExts.includes(path.extname(it.name).toLowerCase()))
  if (BASE_FILTER.length) {
    vids = vids.filter(it => {
      const name = it.name.slice(VIDEO_PREFIX.length + 1).toLowerCase()
      // match if starts with any base key like 'ad_02'
      return BASE_FILTER.some(b => name.startsWith(b))
    })
  }
  if (!vids.length) {
    console.log('No video objects found under', VIDEO_PREFIX)
    return
  }
  // Clean existing files first (only video extensions)
  if (!BASE_FILTER.length) cleanDir(OUT_VIDEOS_DIR, allowedExts)
  for (const it of vids) {
    const filename = it.name.substring(VIDEO_PREFIX.length + 1) // remove prefix + '/'
    const out = path.join(OUT_VIDEOS_DIR, filename)
    console.log('Downloading', it.name, '->', path.relative(process.cwd(), out))
    await downloadObject(it.name, out)
  }
}

async function syncJson() {
  ensureDir(OUT_JSON_DIR)
  const items = await listAll(JSON_PREFIX)
  const jsons = items.filter(it => it.name.toLowerCase().endsWith('.json'))
  if (!jsons.length) {
    console.log('No JSON objects found under', JSON_PREFIX)
    return
  }
  // Clean existing .json files
  for (const f of fs.readdirSync(OUT_JSON_DIR)) {
    const p = path.join(OUT_JSON_DIR, f)
    if (fs.statSync(p).isDirectory()) continue
    if (f.toLowerCase().endsWith('.json')) fs.unlinkSync(p)
  }
  for (const it of jsons) {
    const filename = it.name.substring(JSON_PREFIX.length + 1)
    const out = path.join(OUT_JSON_DIR, filename)
    console.log('Downloading', it.name, '->', path.relative(process.cwd(), out))
    ensureDir(path.dirname(out))
    await downloadObject(it.name, out)
  }
}

async function main() {
  if (DO_VIDEOS) await syncVideos()
  if (DO_JSON) await syncJson()
  console.log('Sync complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
