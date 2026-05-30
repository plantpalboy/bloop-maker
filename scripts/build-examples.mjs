// Scans landing/examples/ and writes landing/examples/manifest.json, which the
// examples.html page fetches to render its song cards + download buttons.
//
// Run with: npm run build:examples   (also runs as part of npm run build:site)
//
// Convention: each song = a set of files sharing one base name. See the
// README.txt in landing/examples/ for the full description.

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const DIR = 'landing/examples';

function prettify(slug) {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

if (!existsSync(DIR)) {
  console.error(`Missing ${DIR}/ — nothing to build.`);
  process.exit(0);
}

const files = readdirSync(DIR).filter((f) => !f.startsWith('.') && f !== 'README.txt');

// Group files by base name (everything before the last extension).
const songs = new Map();
for (const file of files) {
  const ext = extname(file).toLowerCase();
  const slug = basename(file, extname(file));
  if (!songs.has(slug)) songs.set(slug, {});
  const entry = songs.get(slug);
  if (ext === '.wav') entry.wav = file;
  else if (ext === '.mid' || ext === '.midi') entry.mid = file;
  else if (ext === '.txt') entry.info = file;
  else if (ext === '.json') {
    try { entry.meta = JSON.parse(readFileSync(join(DIR, file), 'utf8')); }
    catch (e) { console.warn(`! Could not parse ${file}: ${e.message}`); }
  }
}

const manifest = [];
for (const [slug, entry] of songs) {
  if (!entry.wav) continue; // a song needs audio to play
  const meta = entry.meta || {};
  manifest.push({
    slug,
    title: meta.title || prettify(slug),
    description: meta.description || '',
    soundfont: meta.soundfont || '',
    order: typeof meta.order === 'number' ? meta.order : 9999,
    wav: entry.wav,
    mid: entry.mid || null,
    info: entry.info || null,
  });
}

manifest.sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title));
manifest.forEach((m) => delete m.order);

writeFileSync(join(DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`✓ examples/manifest.json — ${manifest.length} song(s)`);
for (const m of manifest) {
  console.log(`  • ${m.title}  [wav${m.mid ? ' · mid' : ''}${m.info ? ' · info' : ''}]`);
}
