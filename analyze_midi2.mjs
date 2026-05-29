import pkg from '@tonejs/midi';
const { Midi } = pkg;
import fs from 'fs';
import path from 'path';

const ROOT = './midiref/total';

function collectMidis(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) collectMidis(full, acc);
    else if (ent.name.endsWith('.mid') || ent.name.endsWith('.midi')) acc.push(full);
  }
  return acc;
}

const all = collectMidis(ROOT);
function sample(arr, n) {
  const out = [];
  const step = Math.floor(arr.length / n);
  for (let i = 0; i < n && i * step < arr.length; i++) out.push(arr[i * step]);
  return out;
}
const files = sample(all, 500);

// Per-BPM-range analysis
const ranges = {
  slow:   { label: '<90 BPM (ambient/menu)', ivs: {}, totalNotes: 0, upLeaps: 0, downLeaps: 0, rests: 0 },
  mid:    { label: '90-130 BPM (town/explore)', ivs: {}, totalNotes: 0, upLeaps: 0, downLeaps: 0, rests: 0 },
  fast:   { label: '130+ BPM (battle)', ivs: {}, totalNotes: 0, upLeaps: 0, downLeaps: 0, rests: 0 },
};

// Phrase-end analysis: what interval does the last note of a 4-bar phrase have?
const phraseEndTarget = { root: 0, third: 0, fifth: 0, other: 0 };

// Direction run analysis: how long do ascending/descending runs go before reversing?
const runLengths = {};

// Repeated-note patterns (ostinato detection)
const repeatRunLengths = { '1': 0, '2': 0, '3': 0, '4+': 0 };

let parsed = 0;

for (const f of files) {
  try {
    const buf = fs.readFileSync(f);
    const midi = new Midi(buf);

    const bpm = midi.header.tempos[0]?.bpm ?? 120;
    const range = bpm < 90 ? ranges.slow : bpm < 130 ? ranges.mid : ranges.fast;

    const lead = midi.tracks
      .filter(t => t.channel !== 9 && t.notes.length > 8)
      .sort((a, b) => b.notes.length - a.notes.length)[0];
    if (!lead) { parsed++; continue; }

    const notes = [...lead.notes].sort((a, b) => a.time - b.time);

    // Direction run tracking
    let runDir = 0, runLen = 0;
    // Repeat run tracking
    let repLen = 1;

    for (let i = 1; i < notes.length; i++) {
      const gap = notes[i].time - (notes[i-1].time + notes[i-1].duration);
      if (gap > 0.2) { range.rests++; runLen = 0; repLen = 1; continue; }

      const iv = notes[i].midi - notes[i-1].midi;
      range.ivs[iv] = (range.ivs[iv] || 0) + 1;
      range.totalNotes++;

      // Leaps
      if (iv > 4) range.upLeaps++;
      if (iv < -4) range.downLeaps++;

      // Direction runs
      const dir = iv > 0 ? 1 : iv < 0 ? -1 : 0;
      if (dir === 0) { /* repeat — break run */ runLen = 0; runDir = 0; }
      else if (dir === runDir) { runLen++; }
      else {
        if (runLen > 0) runLengths[runLen] = (runLengths[runLen] || 0) + 1;
        runLen = 1; runDir = dir;
      }

      // Repeat runs
      if (iv === 0) repLen++;
      else {
        if (repLen >= 4) repeatRunLengths['4+']++;
        else if (repLen >= 3) repeatRunLengths['3']++;
        else if (repLen >= 2) repeatRunLengths['2']++;
        else repeatRunLengths['1']++;
        repLen = 1;
      }
    }

    parsed++;
  } catch { /* skip */ }
}

console.log(`Parsed: ${parsed}\n`);

for (const [key, r] of Object.entries(ranges)) {
  console.log(`\n════ ${r.label} ════`);
  const total = Object.values(r.ivs).reduce((a,b) => a+b, 0);
  if (total === 0) { console.log('  (no data)'); continue; }

  const steps   = (['-2','-1','1','2'].reduce((a,k) => a+(r.ivs[parseInt(k)]||0), 0));
  const thirds  = (['-4','-3','3','4'].reduce((a,k) => a+(r.ivs[parseInt(k)]||0), 0));
  const fourths = (['-5','5'].reduce((a,k) => a+(r.ivs[parseInt(k)]||0), 0));
  const fifths  = (['-7','7'].reduce((a,k) => a+(r.ivs[parseInt(k)]||0), 0));
  const octs    = (['-12','12'].reduce((a,k) => a+(r.ivs[parseInt(k)]||0), 0));
  const repeats = r.ivs[0] || 0;
  const other   = total - steps - thirds - fourths - fifths - octs - repeats;

  console.log(`  Repeat (0):     ${((repeats/total)*100).toFixed(1)}%`);
  console.log(`  Steps (±1,±2):  ${((steps/total)*100).toFixed(1)}%`);
  console.log(`  3rds (±3,±4):   ${((thirds/total)*100).toFixed(1)}%`);
  console.log(`  4ths (±5):      ${((fourths/total)*100).toFixed(1)}%`);
  console.log(`  5ths (±7):      ${((fifths/total)*100).toFixed(1)}%`);
  console.log(`  Octaves (±12):  ${((octs/total)*100).toFixed(1)}%`);
  console.log(`  Other leaps:    ${((other/total)*100).toFixed(1)}%`);
  console.log(`  Up leaps >4st:  ${r.upLeaps} | Down leaps >4st: ${r.downLeaps} | ratio: ${(r.upLeaps/Math.max(1,r.downLeaps)).toFixed(2)}`);
  console.log(`  Rest breaks:    ${r.rests} (${((r.rests/total)*100).toFixed(1)}% of intervals)`);
}

console.log('\n── DIRECTION RUN LENGTHS (before reversal) ──');
const totalRuns = Object.values(runLengths).reduce((a,b)=>a+b,0);
for (const [k,v] of Object.entries(runLengths).sort((a,b)=>parseInt(a[0])-parseInt(b[0]))) {
  if (parseInt(k) > 8) continue;
  console.log(`  ${k} notes: ${((v/totalRuns)*100).toFixed(1)}%`);
}

console.log('\n── REPEATED-NOTE RUN LENGTHS ──');
const totalRep = Object.values(repeatRunLengths).reduce((a,b)=>a+b,0);
for (const [k,v] of Object.entries(repeatRunLengths)) {
  console.log(`  ${k} repeat: ${((v/totalRep)*100).toFixed(1)}%`);
}
