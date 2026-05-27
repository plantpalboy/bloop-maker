#!/usr/bin/env node
'use strict';

// Deep melodic analysis - focused on melody lines only
const { Midi } = require('/home/water/data/coding/claude/midiplayer/node_modules/@tonejs/midi');
const fs = require('fs');
const path = require('path');

const MIDI_DIR = '/home/water/data/coding/claude/midiplayer/midiref/undertale midi/';
const TARGET_FILES = [
  'Once Upon A Time.mid',
  'Waterfall.mid',
  'Enemy Approaching.mid',
  'Determination.mid',
  'Quiet Water.mid',
  'Deltarune - Quiet Autumn.mid',
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// --- Interval step analysis (condensed to absolute semitones) ---
function intervalStats(notes) {
  const sortedNotes = [...notes].sort((a, b) => a.ticks - b.ticks);
  const stepCounts = {}; // signed semitones, clamped to ±24
  const dirCounts = { up: 0, down: 0, same: 0 };
  const absCounts = {};
  for (let i = 1; i < sortedNotes.length; i++) {
    const diff = sortedNotes[i].midi - sortedNotes[i-1].midi;
    dirCounts[diff > 0 ? 'up' : diff < 0 ? 'down' : 'same']++;
    const clamped = Math.max(-24, Math.min(24, diff));
    stepCounts[clamped] = (stepCounts[clamped] || 0) + 1;
    const abs = Math.min(Math.abs(diff), 24);
    absCounts[abs] = (absCounts[abs] || 0) + 1;
  }
  const total = sortedNotes.length - 1;
  return { stepCounts, absCounts, dirCounts, total };
}

// --- Rhythmic grid quantization ---
// Returns fraction of notes on each rhythmic value
function rhythmStats(notes, ppq) {
  const sortedNotes = [...notes].sort((a, b) => a.ticks - b.ticks);
  const iois = [];
  for (let i = 1; i < sortedNotes.length; i++) {
    const ioi = sortedNotes[i].ticks - sortedNotes[i-1].ticks;
    if (ioi > 0) iois.push(ioi / ppq); // in beats
  }
  const durs = notes.map(n => n.durationTicks / ppq);

  // Bin into rhythmic values (in beats)
  const GRID = [
    { name: '16th',           beats: 0.25 },
    { name: 'dotted 16th',    beats: 0.375 },
    { name: '8th',            beats: 0.5 },
    { name: 'dotted 8th',     beats: 0.75 },
    { name: 'quarter',        beats: 1.0 },
    { name: 'dotted quarter', beats: 1.5 },
    { name: 'half',           beats: 2.0 },
    { name: 'dotted half',    beats: 3.0 },
    { name: 'whole',          beats: 4.0 },
  ];

  function closest(val) {
    let best = GRID[0];
    let bestDist = Infinity;
    for (const g of GRID) {
      const d = Math.abs(val - g.beats);
      if (d < bestDist) { bestDist = d; best = g; }
    }
    return best.name;
  }

  const ioiGrid = {}, durGrid = {};
  for (const v of iois) ioiGrid[closest(v)] = (ioiGrid[closest(v)] || 0) + 1;
  for (const v of durs) durGrid[closest(v)] = (durGrid[closest(v)] || 0) + 1;

  return { ioiGrid, durGrid, ioiCount: iois.length, durCount: durs.length };
}

// --- Pitch class usage ---
function pitchClassProfile(notes) {
  const counts = new Array(12).fill(0);
  for (const n of notes) counts[n.midi % 12]++;
  const total = counts.reduce((a, b) => a + b, 0);
  return counts.map((c, i) => ({ pc: NOTE_NAMES[i], count: c, pct: Math.round(c/total*100) }))
    .sort((a, b) => b.count - a.count);
}

// --- Simple scale match (returns root & mode with score) ---
const SCALES = {
  'major':          [0,2,4,5,7,9,11],
  'natural minor':  [0,2,3,5,7,8,10],
  'harmonic minor': [0,2,3,5,7,8,11],
  'dorian':         [0,2,3,5,7,9,10],
  'mixolydian':     [0,2,4,5,7,9,10],
  'phrygian':       [0,1,3,5,7,8,10],
};

function detectScale(notes) {
  const counts = new Array(12).fill(0);
  for (const n of notes) counts[n.midi % 12]++;
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  let best = { score: -1, root: 0, scale: '' };
  for (let root = 0; root < 12; root++) {
    for (const [name, intervals] of Object.entries(SCALES)) {
      const inScale = new Set(intervals.map(i => (root + i) % 12));
      let score = 0;
      for (let pc = 0; pc < 12; pc++) {
        if (inScale.has(pc)) score += counts[pc];
        else score -= counts[pc] * 0.5;
      }
      score /= total;
      if (score > best.score) best = { score, root, scale: name };
    }
  }
  return { root: NOTE_NAMES[best.root], scale: best.scale, score: best.score.toFixed(3) };
}

// --- Scale degree analysis ---
function scaleDegrees(notes, root, mode) {
  const intervals = SCALES[mode] || SCALES['major'];
  const degCounts = {};
  for (const n of notes) {
    const pc = ((n.midi % 12) - root + 12) % 12;
    const deg = intervals.indexOf(pc);
    const label = deg >= 0 ? `^${deg+1}` : `chr(${pc})`;
    degCounts[label] = (degCounts[label] || 0) + 1;
  }
  return Object.entries(degCounts).sort((a,b)=>b[1]-a[1]);
}

// --- N-gram motif extraction (by interval pattern) ---
function extractMotifs(notes, n=3) {
  const sorted = [...notes].sort((a, b) => a.ticks - b.ticks);
  const pats = {};
  for (let i = 0; i <= sorted.length - n; i++) {
    const ivs = [];
    for (let j = 0; j < n-1; j++) ivs.push(sorted[i+j+1].midi - sorted[i+j].midi);
    const key = ivs.join(',');
    pats[key] = (pats[key] || 0) + 1;
  }
  return Object.entries(pats)
    .filter(([, v]) => v >= 3)
    .sort((a,b) => b[1]-a[1])
    .slice(0, 8)
    .map(([key, cnt]) => ({
      intervals: key.split(',').map(Number),
      count: cnt
    }));
}

// --- Phrase shape (contour) analysis ---
function contourStats(notes) {
  const sorted = [...notes].sort((a, b) => a.ticks - b.ticks);
  let up=0, down=0, same=0;
  // Phrase-level: group into 4-note windows, label shape
  const shapes = {};
  for (let i = 0; i <= sorted.length - 4; i++) {
    const w = sorted.slice(i, i+4);
    const deltas = [w[1].midi-w[0].midi, w[2].midi-w[1].midi, w[3].midi-w[2].midi];
    const shape = deltas.map(d => d > 0 ? '↑' : d < 0 ? '↓' : '—').join('');
    shapes[shape] = (shapes[shape] || 0) + 1;
  }
  return Object.entries(shapes).sort((a,b)=>b[1]-a[1]).slice(0,8);
}

// --- Main ---
function isMelodyTrack(track, notes) {
  if (!notes.length) return false;
  if (track.channel === 9) return false;
  const name = (track.name || '').toLowerCase();
  if (name.includes('drum') || name.includes('perc') || name.includes('bass')) return false;
  const avgMidi = notes.reduce((a,n)=>a+n.midi,0)/notes.length;
  return avgMidi >= 55; // exclude pure bass
}

for (const file of TARGET_FILES) {
  const fp = path.join(MIDI_DIR, file);
  if (!fs.existsSync(fp)) { console.log(`SKIP: ${file}`); continue; }
  const midi = new Midi(fs.readFileSync(fp));
  const ppq = midi.header.ppq;
  const bpm = midi.header.tempos.length ? midi.header.tempos[0].bpm : 120;

  // Collect all melody notes
  let melodyNotes = [];
  for (const track of midi.tracks) {
    if (isMelodyTrack(track, track.notes)) {
      melodyNotes = melodyNotes.concat(track.notes);
    }
  }
  melodyNotes.sort((a,b) => a.ticks - b.ticks);

  if (melodyNotes.length < 10) {
    console.log(`\n${file}: too few melody notes (${melodyNotes.length}), skipping`);
    continue;
  }

  const scaleInfo = detectScale(melodyNotes);
  const rootPc = NOTE_NAMES.indexOf(scaleInfo.root);
  const modeIntervals = SCALES[scaleInfo.scale] || SCALES['major'];

  const ivStats = intervalStats(melodyNotes);
  const rStats = rhythmStats(melodyNotes, ppq);
  const pcProfile = pitchClassProfile(melodyNotes);
  const degrees = scaleDegrees(melodyNotes, rootPc, scaleInfo.scale);
  const motifs3 = extractMotifs(melodyNotes, 3);
  const motifs4 = extractMotifs(melodyNotes, 4);
  const contours = contourStats(melodyNotes);

  const totalIntervals = ivStats.total;
  const dirPct = {
    up: Math.round(ivStats.dirCounts.up / totalIntervals * 100),
    down: Math.round(ivStats.dirCounts.down / totalIntervals * 100),
    same: Math.round(ivStats.dirCounts.same / totalIntervals * 100),
  };

  console.log(`\n${'━'.repeat(72)}`);
  console.log(`MELODY DEEP-DIVE: ${file}`);
  console.log(`  BPM: ${bpm.toFixed(1)}  |  Key: ${scaleInfo.root} ${scaleInfo.scale} (fit: ${scaleInfo.score})  |  Melody notes: ${melodyNotes.length}`);

  console.log(`\n  DIRECTION: up ${dirPct.up}%  down ${dirPct.down}%  same/unison ${dirPct.same}%`);

  console.log(`\n  TOP INTERVALS (absolute semitones, by frequency):`);
  const topAbs = Object.entries(ivStats.absCounts).sort((a,b)=>b[1]-a[1]).slice(0, 8);
  const INAMES = {0:'unison',1:'m2',2:'M2',3:'m3',4:'M3',5:'P4',6:'tritone',7:'P5',8:'m6',9:'M6',10:'m7',11:'M7',12:'octave'};
  for (const [abs, cnt] of topAbs) {
    const pct = Math.round(cnt/totalIntervals*100);
    const bar = '█'.repeat(Math.round(pct/2));
    console.log(`    ${(INAMES[abs]||abs+'st').padEnd(10)} ${cnt.toString().padStart(4)}  ${pct}%  ${bar}`);
  }

  console.log(`\n  SIGNED STEP DISTRIBUTION (top 10, shows melodic direction preference):`);
  const topSigned = Object.entries(ivStats.stepCounts)
    .sort((a,b)=>b[1]-a[1]).slice(0, 10);
  for (const [iv, cnt] of topSigned) {
    const n = parseInt(iv);
    const sign = n > 0 ? '+' : n < 0 ? '' : '±';
    const name = INAMES[Math.abs(n)] || `${Math.abs(n)}st`;
    const pct = Math.round(cnt/totalIntervals*100);
    console.log(`    ${(sign+iv+'st ('+name+')').padEnd(18)} ${cnt.toString().padStart(4)}  ${pct}%`);
  }

  console.log(`\n  RHYTHM — IOI (note spacing):`);
  const totalIoi = rStats.ioiCount;
  const sortedIoi = Object.entries(rStats.ioiGrid).sort((a,b)=>b[1]-a[1]);
  for (const [r, cnt] of sortedIoi) {
    const pct = Math.round(cnt/totalIoi*100);
    const bar = '█'.repeat(Math.round(pct/3));
    console.log(`    ${r.padEnd(18)} ${cnt.toString().padStart(4)}  ${pct}%  ${bar}`);
  }

  console.log(`\n  RHYTHM — NOTE DURATIONS:`);
  const totalDur = rStats.durCount;
  const sortedDur = Object.entries(rStats.durGrid).sort((a,b)=>b[1]-a[1]);
  for (const [r, cnt] of sortedDur) {
    const pct = Math.round(cnt/totalDur*100);
    console.log(`    ${r.padEnd(18)} ${cnt.toString().padStart(4)}  ${pct}%`);
  }

  console.log(`\n  PITCH CLASS PROFILE (top 7):`);
  for (const { pc, count, pct } of pcProfile.slice(0,7)) {
    const bar = '█'.repeat(Math.round(pct/3));
    console.log(`    ${pc.padEnd(4)} ${count.toString().padStart(4)}  ${pct}%  ${bar}`);
  }

  console.log(`\n  SCALE DEGREES (in ${scaleInfo.root} ${scaleInfo.scale}):`);
  for (const [deg, cnt] of degrees.slice(0, 8)) {
    const pct = Math.round(cnt/melodyNotes.length*100);
    const bar = '█'.repeat(Math.round(pct/2));
    console.log(`    ${deg.padEnd(8)} ${cnt.toString().padStart(4)}  ${pct}%  ${bar}`);
  }

  console.log(`\n  4-NOTE PHRASE CONTOURS (↑=up ↓=down —=same):`);
  for (const [shape, cnt] of contours.slice(0, 8)) {
    console.log(`    ${shape}  x${cnt}`);
  }

  console.log(`\n  3-NOTE MOTIFS (interval patterns appearing 3+ times):`);
  for (const m of motifs3.slice(0, 6)) {
    const desc = m.intervals.map(i => {
      const sign = i > 0 ? '+' : i < 0 ? '' : '±';
      const abs = Math.min(Math.abs(i), 12);
      return `${sign}${i}(${INAMES[abs]||abs+'st'})`;
    }).join(' → ');
    console.log(`    [x${m.count}] ${desc}`);
  }

  console.log(`\n  4-NOTE MOTIFS:`);
  for (const m of motifs4.slice(0, 4)) {
    const desc = m.intervals.map(i => {
      const sign = i > 0 ? '+' : i < 0 ? '' : '±';
      const abs = Math.min(Math.abs(i), 12);
      return `${sign}${i}(${INAMES[abs]||abs+'st'})`;
    }).join(' → ');
    console.log(`    [x${m.count}] ${desc}`);
  }
}

// Aggregate cross-file melody stats
console.log(`\n\n${'━'.repeat(72)}`);
console.log('AGGREGATE: ALL MELODY TRACKS COMBINED');
console.log('━'.repeat(72));

let allNotes = [];
let allRhythmIoi = {};
let allRhythmDur = {};
let totalPPQ = 960; // use as reference

for (const file of TARGET_FILES) {
  const fp = path.join(MIDI_DIR, file);
  if (!fs.existsSync(fp)) continue;
  const midi = new Midi(fs.readFileSync(fp));
  const ppq = midi.header.ppq;

  for (const track of midi.tracks) {
    if (!isMelodyTrack(track, track.notes)) continue;
    allNotes = allNotes.concat(track.notes.map(n => ({ ...n, _ppq: ppq })));

    const rStats = rhythmStats(track.notes, ppq);
    for (const [r, c] of Object.entries(rStats.ioiGrid))
      allRhythmIoi[r] = (allRhythmIoi[r] || 0) + c;
    for (const [r, c] of Object.entries(rStats.durGrid))
      allRhythmDur[r] = (allRhythmDur[r] || 0) + c;
  }
}

const INAMES = {0:'unison',1:'m2',2:'M2',3:'m3',4:'M3',5:'P4',6:'tritone',7:'P5',8:'m6',9:'M6',10:'m7',11:'M7',12:'octave'};

// Aggregate interval stats
let totalIvs = 0;
const aggAbsCounts = {};
const aggSignedCounts = {};
let aggUp=0, aggDown=0, aggSame=0;

// Sort all notes globally (cross-track, same-file notes approximation)
// Better: per-track stats are already captured; do signed interval from allNotes
const sortedAll = [...allNotes].sort((a,b) => a.ticks - b.ticks);
for (let i = 1; i < sortedAll.length; i++) {
  // Only count within-track transitions would be ideal, but this is an approximation
  const diff = sortedAll[i].midi - sortedAll[i-1].midi;
  if (Math.abs(diff) > 18) continue; // skip large gaps (cross-track)
  const abs = Math.abs(diff);
  aggAbsCounts[abs] = (aggAbsCounts[abs] || 0) + 1;
  aggSignedCounts[diff] = (aggSignedCounts[diff] || 0) + 1;
  if (diff > 0) aggUp++;
  else if (diff < 0) aggDown++;
  else aggSame++;
  totalIvs++;
}

console.log(`\nTotal melody notes analyzed: ${allNotes.length}`);
console.log(`Direction: up ${Math.round(aggUp/totalIvs*100)}%  down ${Math.round(aggDown/totalIvs*100)}%  same ${Math.round(aggSame/totalIvs*100)}%`);

console.log(`\nAggregated interval distribution (absolute, cross-file):`);
Object.entries(aggAbsCounts).sort((a,b)=>b[1]-a[1]).slice(0, 10)
  .forEach(([abs, cnt]) => {
    const pct = Math.round(cnt/totalIvs*100);
    const bar = '█'.repeat(Math.round(pct/2));
    console.log(`  ${(INAMES[abs]||abs+'st').padEnd(10)} ${cnt.toString().padStart(5)}  ${pct}%  ${bar}`);
  });

console.log(`\nAggregated IOI rhythm distribution:`);
const totalIoiAll = Object.values(allRhythmIoi).reduce((a,b)=>a+b,0);
Object.entries(allRhythmIoi).sort((a,b)=>b[1]-a[1])
  .forEach(([r, cnt]) => {
    const pct = Math.round(cnt/totalIoiAll*100);
    const bar = '█'.repeat(Math.round(pct/3));
    console.log(`  ${r.padEnd(18)} ${cnt.toString().padStart(5)}  ${pct}%  ${bar}`);
  });

console.log(`\nAggregated duration distribution:`);
const totalDurAll = Object.values(allRhythmDur).reduce((a,b)=>a+b,0);
Object.entries(allRhythmDur).sort((a,b)=>b[1]-a[1])
  .forEach(([r, cnt]) => {
    const pct = Math.round(cnt/totalDurAll*100);
    console.log(`  ${r.padEnd(18)} ${cnt.toString().padStart(5)}  ${pct}%`);
  });
