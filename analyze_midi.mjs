import pkg from '@tonejs/midi';
const { Midi } = pkg;
import fs from 'fs';
import path from 'path';

const ROOT = './midiref/total';
const SAMPLE = 300; // files to analyze

// Collect all MIDI paths
function collectMidis(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) collectMidis(full, acc);
    else if (ent.name.endsWith('.mid') || ent.name.endsWith('.midi')) acc.push(full);
  }
  return acc;
}

const all = collectMidis(ROOT);
console.log(`Total files: ${all.length}`);

// Deterministic shuffle sample
function sample(arr, n) {
  const out = [];
  const step = Math.floor(arr.length / n);
  for (let i = 0; i < n && i * step < arr.length; i++) out.push(arr[i * step]);
  return out;
}

const files = sample(all, SAMPLE);

// Stats accumulators
const intervals = {};       // semitone interval → count (melody channel)
const durations = {};       // duration bucket → count
const restGaps  = {};       // rest gap bucket → count
const bpms      = [];
const trackCounts = {};
const noteCountsPerTrack = [];
const velBuckets = { '0-40': 0, '41-64': 0, '65-84': 0, '85-100': 0, '101-127': 0 };
const phraseEndIntervals = {}; // intervals at bar-boundary notes

let parsed = 0, failed = 0;

for (const f of files) {
  try {
    const buf = fs.readFileSync(f);
    const midi = new Midi(buf);

    if (midi.header.tempos.length > 0) bpms.push(midi.header.tempos[0].bpm);
    const tc = midi.tracks.length;
    trackCounts[tc] = (trackCounts[tc] || 0) + 1;

    // Find the "lead melody" track: longest note sequence on non-drum channel
    const melodyCandidates = midi.tracks
      .filter(t => t.channel !== 9 && t.notes.length > 4)
      .sort((a, b) => b.notes.length - a.notes.length);

    if (melodyCandidates.length === 0) { parsed++; continue; }
    const lead = melodyCandidates[0];
    noteCountsPerTrack.push(lead.notes.length);

    const notes = [...lead.notes].sort((a, b) => a.time - b.time);

    for (const n of notes) {
      const v = Math.round(n.velocity * 127);
      if (v <= 40) velBuckets['0-40']++;
      else if (v <= 64) velBuckets['41-64']++;
      else if (v <= 84) velBuckets['65-84']++;
      else if (v <= 100) velBuckets['85-100']++;
      else velBuckets['101-127']++;

      const durBucket = n.duration < 0.1 ? '16th' : n.duration < 0.25 ? '8th' : n.duration < 0.5 ? 'qtr' : n.duration < 1.0 ? 'half' : 'whole+';
      durations[durBucket] = (durations[durBucket] || 0) + 1;
    }

    // Melody intervals
    for (let i = 1; i < notes.length; i++) {
      const gap = notes[i].time - (notes[i-1].time + notes[i-1].duration);
      if (gap > 0.15) {
        const gb = gap < 0.3 ? 'short' : gap < 0.6 ? 'med' : gap < 1.5 ? 'beat' : 'long';
        restGaps[gb] = (restGaps[gb] || 0) + 1;
        continue; // rest — don't count as interval
      }
      const iv = notes[i].midi - notes[i-1].midi;
      if (Math.abs(iv) <= 24) intervals[iv] = (intervals[iv] || 0) + 1;
    }

    parsed++;
  } catch { failed++; }
}

console.log(`\nParsed: ${parsed}, Failed: ${failed}`);

// Interval distribution
const totalIv = Object.values(intervals).reduce((a, b) => a + b, 0);
console.log('\n── MELODY INTERVALS ──');
const sorted = Object.entries(intervals).map(([k,v]) => [parseInt(k), v]).sort((a,b)=>a[0]-b[0]);
for (const [iv, cnt] of sorted) {
  const pct = ((cnt / totalIv) * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(cnt / totalIv * 80));
  console.log(`  ${String(iv).padStart(3)}: ${pct.padStart(5)}%  ${bar}`);
}

// Categorize
const steps  = (intervals[-2]||0) + (intervals[-1]||0) + (intervals[1]||0) + (intervals[2]||0);
const thirds = (intervals[-4]||0) + (intervals[-3]||0) + (intervals[3]||0) + (intervals[4]||0);
const fourths = (intervals[-5]||0) + (intervals[5]||0);
const fifths = (intervals[-7]||0) + (intervals[7]||0);
const repeats = intervals[0] || 0;
const leaps  = totalIv - steps - thirds - fourths - fifths - repeats;
console.log('\n── INTERVAL CATEGORIES ──');
console.log(`  Repeat (0):        ${((repeats/totalIv)*100).toFixed(1)}%`);
console.log(`  Steps (±1,±2):     ${((steps/totalIv)*100).toFixed(1)}%`);
console.log(`  3rds (±3,±4):      ${((thirds/totalIv)*100).toFixed(1)}%`);
console.log(`  4ths (±5):         ${((fourths/totalIv)*100).toFixed(1)}%`);
console.log(`  5ths (±7):         ${((fifths/totalIv)*100).toFixed(1)}%`);
console.log(`  Leaps (±6,8+):     ${((leaps/totalIv)*100).toFixed(1)}%`);

// BPM
bpms.sort((a,b)=>a-b);
const bpmBuckets = { '<70': 0, '70-90': 0, '90-110': 0, '110-130': 0, '130-160': 0, '160-200': 0, '200+': 0 };
for (const b of bpms) {
  if (b < 70) bpmBuckets['<70']++;
  else if (b < 90) bpmBuckets['70-90']++;
  else if (b < 110) bpmBuckets['90-110']++;
  else if (b < 130) bpmBuckets['110-130']++;
  else if (b < 160) bpmBuckets['130-160']++;
  else if (b < 200) bpmBuckets['160-200']++;
  else bpmBuckets['200+']++;
}
console.log('\n── BPM DISTRIBUTION ──');
for (const [k,v] of Object.entries(bpmBuckets)) console.log(`  ${k.padEnd(10)}: ${v} (${((v/bpms.length)*100).toFixed(1)}%)`);
console.log(`  Median: ${bpms[Math.floor(bpms.length/2)]?.toFixed(0)}, Mean: ${(bpms.reduce((a,b)=>a+b,0)/bpms.length).toFixed(0)}`);

// Durations
const totalDur = Object.values(durations).reduce((a,b)=>a+b,0);
console.log('\n── NOTE DURATIONS ──');
for (const [k,v] of Object.entries(durations)) console.log(`  ${k.padEnd(8)}: ${((v/totalDur)*100).toFixed(1)}%`);

// Rests
const totalRest = Object.values(restGaps).reduce((a,b)=>a+b,0);
console.log('\n── REST GAPS ──');
for (const [k,v] of Object.entries(restGaps)) console.log(`  ${k.padEnd(8)}: ${((v/totalRest)*100).toFixed(1)}%`);

// Velocity
const totalVel = Object.values(velBuckets).reduce((a,b)=>a+b,0);
console.log('\n── VELOCITY DISTRIBUTION ──');
for (const [k,v] of Object.entries(velBuckets)) console.log(`  ${k.padEnd(10)}: ${((v/totalVel)*100).toFixed(1)}%`);

// Track count
console.log('\n── TRACK COUNTS ──');
for (const [k,v] of Object.entries(trackCounts).sort((a,b)=>parseInt(a[0])-parseInt(b[0]))) console.log(`  ${k} tracks: ${v} songs`);

const avgNotes = noteCountsPerTrack.reduce((a,b)=>a+b,0)/noteCountsPerTrack.length;
console.log(`\n── LEAD TRACK: avg ${avgNotes.toFixed(0)} notes per song ──`);
