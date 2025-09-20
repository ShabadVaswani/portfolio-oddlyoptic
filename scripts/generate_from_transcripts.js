#!/usr/bin/env node
// Generate JSON for ads using transcripts only as context.
// Produces: { title, tags, blurb, description, transcript }

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const TRANS_DIR = path.join(ROOT, 'transcripts')
const OUT_DIR = path.join(ROOT, 'video-metadata')
const ARGV = process.argv.slice(2).filter(a => !a.startsWith('-'))

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }) }

function listTranscripts() {
  try {
    let arr = fs.readdirSync(TRANS_DIR)
      .filter(f => f.toLowerCase().endsWith('.txt'))
      .map(f => ({ base: f.replace(/\.txt$/i, ''), path: path.join(TRANS_DIR, f) }))
    if (ARGV.length) {
      const set = new Set(ARGV)
      arr = arr.filter(it => set.has(it.base))
    }
    return arr
  } catch { return [] }
}

function readText(p) {
  try { return fs.readFileSync(p, 'utf8').replace(/\r\n?/g, '\n').trim() } catch { return '' }
}

const CATS = [
  { tag: 'Beauty', kws: ['makeup','foundation','blend','concealer','mascara','lip','cakey'] },
  { tag: 'Hearing', kws: ['hearing','ear','hearing aid','audiologist','prescription'] },
  { tag: 'Learning', kws: ['learn','learning','class','study','memorized','read','questions'] },
  { tag: 'Finance', kws: ['expense','expenses','ledger','invoice','receipts','spreadsheets'] },
  { tag: 'Health', kws: ['gummy','greens','healthy','nutrition','vitamin','salad'] },
  { tag: 'Food Delivery', kws: ['foodie','delivery','order','offers','app','download','cravings','eat','food'] },
  { tag: 'Home', kws: ['home','room','kitchen','before','after','transform','light'] },
  { tag: 'Fashion', kws: ['bag','handbag','shoe','sneaker','style','outfit'] },
  { tag: 'Fitness', kws: ['workout','fit','gym','morph','pulse'] },
]

function detectTags(text) {
  const t = text.toLowerCase()
  // score categories by keyword hits
  const scores = CATS.map(c => ({ tag: c.tag, score: c.kws.reduce((n, k) => n + (t.includes(k) ? 1 : 0), 0) }))
  scores.sort((a,b) => b.score - a.score)
  const top = scores.filter(s => s.score > 0).slice(0, 2).map(s => s.tag)
  // Style signal
  const isInterview = /\bwhat(?:'|’)s\b|\?|^-|\b(i|you|we)\b/m.test(text)
  if (isInterview) top.push('UGC')
  return Array.from(new Set(top))
}

function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1) }

function titleFromTranscript(base, text, tags) {
  // Prefer a category-driven headline
  if (tags.includes('Beauty')) return 'Makeup — Light, Fast, Effortless'
  if (tags.includes('Hearing')) return 'Hearing Aids — Clear, Modern, Subtle'
  if (tags.includes('Learning')) return 'Learning — It Listens Back'
  if (tags.includes('Finance')) return 'Expenses — Ditch the Spreadsheets'
  if (tags.includes('Health')) return 'Greens Gummies — Snackable Wellness'
  if (tags.includes('Home')) return 'Before/After — Satisfying Transformations'
  if (tags.includes('Fashion')) return 'Style — Color That Pops'
  if (tags.includes('Fitness')) return 'Motion — Benefits In Sync'
  // Fallback to base key
  const pretty = base.replace(/_/g,' ').replace(/\bad\b/i,'Ad').replace(/\b(\d{2})\b/, ' $1')
  return capitalize(pretty)
}

function blurbFromTranscript(tags) {
  // Generate a paraphrased one-liner based on detected tags (no direct transcript copy)
  if (tags.includes('Beauty')) return 'Featherlight coverage with quick, foolproof application.'
  if (tags.includes('Hearing')) return 'Clear, discreet hearing support without the hassle.'
  if (tags.includes('Learning')) return 'Adaptive learning that listens and meets you where you are.'
  if (tags.includes('Finance')) return 'Automated expense capture—goodbye manual spreadsheets.'
  if (tags.includes('Health')) return 'Daily greens made easy—tasty and convenient.'
  if (tags.includes('Home')) return 'Satisfying before/after reveals that highlight real change.'
  if (tags.includes('Fashion')) return 'High-contrast styling engineered to stop the scroll.'
  if (tags.includes('Fitness')) return 'Benefit-led motion synced to a crisp rhythm.'
  return 'A clear, benefits-first story designed for fast feeds.'
}

function descriptionFromTranscript(text, tags) {
  // Compose a 2–3 sentence marketing summary from cues
  const t = text.toLowerCase()
  const points = []
  if (tags.includes('Beauty')) {
    points.push('Lightweight coverage that feels like nothing.')
    points.push('Quick, foolproof application designed to save time.')
  }
  if (tags.includes('Hearing')) {
    points.push('Modern hearing help without the hassle or stigma.')
    points.push('Clear sound, discreet form, and no prescriptions.')
  }
  if (tags.includes('Learning')) {
    points.push('Adaptive, human-centered learning that “listens back”.')
    points.push('Built for clarity, momentum, and real understanding.')
  }
  if (tags.includes('Finance')) {
    points.push('Automates tracking so you can ditch manual spreadsheets.')
    points.push('Fast, reliable capture that keeps budgets honest.')
  }
  if (tags.includes('Health')) {
    points.push('Daily greens made easy—no juicers, no fuss.')
    points.push('Great taste with the micronutrients you actually need.')
  }
  if (tags.includes('Home')) {
    points.push('Satisfying before/after reveals that make benefits obvious.')
    points.push('Clean angles and hierarchy for instant comprehension.')
  }
  if (tags.includes('Fashion')) {
    points.push('High-contrast color and crisp crops for scroll-stopping impact.')
    points.push('Elevated styling that still reads in under a second.')
  }
  if (tags.includes('Fitness')) {
    points.push('Beat-matched motion that aligns benefits to rhythm.')
    points.push('Energy without clutter so messages always land.')
  }
  // Generic fallbacks if nothing matched
  if (points.length === 0) {
    points.push('A clear, attention-worthy narrative tuned for fast feeds.')
    points.push('Designed to communicate benefits at a glance.')
  }
  return points.join(' ')
}

function buildRecord(base, transcript) {
  const tags = detectTags(transcript)
  const title = titleFromTranscript(base, transcript, tags)
  const blurb = blurbFromTranscript(tags)
  const description = descriptionFromTranscript(transcript, tags)
  return { title, tags, blurb, description, transcript }
}

function main() {
  ensureDir(OUT_DIR)
  const items = listTranscripts()
  if (!items.length) {
    console.log('No transcripts found in', TRANS_DIR)
    process.exit(0)
  }
  for (const it of items) {
    const transcript = readText(it.path)
    const rec = buildRecord(it.base, transcript)
    const out = path.join(OUT_DIR, `${it.base}.json`)
    fs.writeFileSync(out, JSON.stringify(rec, null, 2))
    console.log('Wrote', path.relative(ROOT, out))
  }
}

main()
