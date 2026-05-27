#!/usr/bin/env node
'use strict';

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

// MIDI note number to note name
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function noteName(midi) {
  const oct = Math.floor(midi / 12) - 1;
  return NOTE_NAMES[midi % 12] + oct;
}
function noteClass(midi) {
  return NOTE_NAMES[midi % 12];
}

// Interval name from semitones
const INTERVAL_NAMES = {
  0: 'unison', 1: 'm2', 2: 'M2', 3: 'm3', 4: 'M3', 5: 'P4',
  6: 'tritone', 7: 'P5', 8: 'm6', 9: 'M6', 10: 'm7', 11: 'M7', 12: 'octave'
};
function intervalName(semitones) {
  const abs = Math.abs(semitones);
  const name = INTERVAL_NAMES[abs % 12] || `${abs % 12}st`;
  return (semitones < 0 ? 'down ' : 'up ') + name;
}

// Detect scale/key from pitch class histogram
function detectScale(pitchCounts) {
  const total = Object.values(pitchCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return 'unknown';

  // Major scale intervals: 0,2,4,5,7,9,11
  // Natural minor: 0,2,3,5,7,8,10
  // Pentatonic major: 0,2,4,7,9
  // Pentatonic minor: 0,3,5,7,10
  const SCALES = {
    'major':           [0,2,4,5,7,9,11],
    'natural minor':   [0,2,3,5,7,8,10],
    'harmonic minor':  [0,2,3,5,7,8,11],
    'melodic minor':   [0,2,3,5,7,9,11],
    'pentatonic major':[0,2,4,7,9],
    'pentatonic minor':[0,3,5,7,10],
    'dorian':          [0,2,3,5,7,9,10],
    'phrygian':        [0,1,3,5,7,8,10],
    'mixolydian':      [0,2,4,5,7,9,10],
  };

  let bestScore = -1;
  let bestKey = '';
  let bestScale = '';

  for (let root = 0; root < 12; root++) {
    for (const [scaleName, intervals] of Object.entries(SCALES)) {
      const scaleNotes = new Set(intervals.map(i => (root + i) % 12));
      // Score = sum of note counts that are in scale
      let inScale = 0;
      let outScale = 0;
      for (let pc = 0; pc < 12; pc++) {
        const count = pitchCounts[pc] || 0;
        if (scaleNotes.has(pc)) inScale += count;
        else outScale += count;
      }
      // Weight: in-scale proportion minus penalty for chromaticism
      const score = inScale / (total + 1) - outScale / (total + 1) * 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestKey = NOTE_NAMES[root];
        bestScale = scaleName;
      }
    }
  }
  return `${bestKey} ${bestScale} (score: ${bestScore.toFixed(3)})`;
}

// Classify note duration in ticks relative to PPQ
function durationClass(durationTicks, ppq) {
  const beats = durationTicks / ppq;
  if (beats < 0.1)        return '32nd or shorter';
  if (beats < 0.2)        return '16th';
  if (beats < 0.35)       return '8th (or dotted 16th)';
  if (beats < 0.55)       return 'quarter';
  if (beats < 0.85)       return 'dotted quarter / half';
  if (beats < 1.3)        return 'half';
  if (beats < 2.2)        return 'dotted half';
  return 'whole or longer';
}

// Quantize IOI (inter-onset interval) to rhythmic value relative to PPQ
function rhythmClass(ioiTicks, ppq) {
  const beats = ioiTicks / ppq;
  if (beats < 0.1)        return '32nd';
  if (beats < 0.2)        return '16th';
  if (beats < 0.28)       return 'dotted 16th';
  if (beats < 0.42)       return '8th';
  if (beats < 0.58)       return 'dotted 8th';
  if (beats < 0.83)       return 'quarter';
  if (beats < 1.2)        return 'dotted quarter';
  if (beats < 1.8)        return 'half';
  if (beats < 3.0)        return 'dotted half';
  return 'whole+';
}

// Detect motifs: sequences of 3-5 notes by interval pattern
function findMotifs(notes, minLen=3, maxLen=5, minOccurrences=2) {
  if (notes.length < minLen) return [];
  const motifs = {};
  for (let len = minLen; len <= maxLen; len++) {
    for (let i = 0; i <= notes.length - len; i++) {
      const intervals = [];
      for (let j = 0; j < len - 1; j++) {
        intervals.push(notes[i + j + 1].midi - notes[i + j].midi);
      }
      const key = intervals.join(',');
      if (!motifs[key]) motifs[key] = { count: 0, len, intervals, pitches: [] };
      motifs[key].count++;
      motifs[key].pitches.push(notes[i].midi);
    }
  }
  return Object.entries(motifs)
    .filter(([, v]) => v.count >= minOccurrences)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([key, v]) => ({
      intervals: v.intervals,
      count: v.count,
      len: v.len,
      typicalStart: noteName(Math.round(v.pitches.reduce((a,b)=>a+b,0)/v.pitches.length))
    }));
}

// Guess track role by MIDI channel, pitch range, name
function guessRole(track, notes) {
  const name = (track.name || '').toLowerCase();
  const channel = track.channel;

  if (channel === 9 || name.includes('drum') || name.includes('perc')) return 'percussion';

  if (notes.length === 0) return 'empty';

  const avgMidi = notes.reduce((a, n) => a + n.midi, 0) / notes.length;

  if (name.includes('bass') || avgMidi < 48) return 'bass';
  if (name.includes('lead') || name.includes('melody')) return 'melody';
  if (name.includes('chord') || name.includes('pad') || name.includes('accomp')) return 'accompaniment';

  // Heuristic: high average = melody, low = bass, mid = accompaniment
  if (avgMidi >= 60) return avgMidi >= 70 ? 'melody (high)' : 'melody/accomp';
  if (avgMidi < 50)  return 'bass';
  return 'accompaniment';
}

function analyzeFile(filename) {
  const filepath = path.join(MIDI_DIR, filename);
  const buf = fs.readFileSync(filepath);
  let midi;
  try {
    midi = new Midi(buf);
  } catch (e) {
    return { error: e.message };
  }

  const ppq = midi.header.ppq;
  const timeSignatures = midi.header.timeSignatures.map(ts => ({
    ticks: ts.ticks,
    numerator: ts.timeSignature[0],
    denominator: ts.timeSignature[1],
  }));
  const tempos = midi.header.tempos.map(t => ({
    ticks: t.ticks,
    bpm: Math.round(t.bpm * 10) / 10,
  }));

  const bpmValues = tempos.map(t => t.bpm);
  const bpmMin = bpmValues.length ? Math.min(...bpmValues) : null;
  const bpmMax = bpmValues.length ? Math.max(...bpmValues) : null;

  const trackAnalyses = [];

  // Global pitch class histogram across all non-drum tracks
  const globalPitchCounts = {};
  for (let pc = 0; pc < 12; pc++) globalPitchCounts[pc] = 0;

  for (const track of midi.tracks) {
    const notes = track.notes;
    const role = guessRole(track, notes);

    if (notes.length === 0) {
      trackAnalyses.push({ name: track.name || '(unnamed)', role, noteCount: 0 });
      continue;
    }

    // Pitch range
    const midiNums = notes.map(n => n.midi);
    const minMidi = Math.min(...midiNums);
    const maxMidi = Math.max(...midiNums);

    // Pitch class histogram
    const pitchCounts = {};
    for (let pc = 0; pc < 12; pc++) pitchCounts[pc] = 0;
    for (const n of notes) {
      const pc = n.midi % 12;
      pitchCounts[pc]++;
      if (role !== 'percussion') globalPitchCounts[pc]++;
    }

    // Top pitch classes
    const topPCs = Object.entries(pitchCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .filter(([, v]) => v > 0)
      .map(([pc, cnt]) => `${NOTE_NAMES[pc]}(${cnt})`);

    // Intervals between consecutive notes (sorted by tick time)
    const sortedNotes = [...notes].sort((a, b) => a.ticks - b.ticks);
    const intervalCounts = {};
    for (let i = 1; i < sortedNotes.length; i++) {
      const diff = sortedNotes[i].midi - sortedNotes[i-1].midi;
      const key = Math.abs(diff) <= 24 ? diff : (diff > 0 ? 25 : -25);
      intervalCounts[key] = (intervalCounts[key] || 0) + 1;
    }
    const topIntervals = Object.entries(intervalCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([iv, cnt]) => {
        const n = parseInt(iv);
        if (Math.abs(n) > 24) return `${n > 0 ? 'up' : 'down'} >2oct(${cnt})`;
        return `${intervalName(n)}(${cnt})`;
      });

    // Rhythm: inter-onset intervals
    const ioiCounts = {};
    for (let i = 1; i < sortedNotes.length; i++) {
      const ioi = sortedNotes[i].ticks - sortedNotes[i-1].ticks;
      if (ioi > 0) {
        const cls = rhythmClass(ioi, ppq);
        ioiCounts[cls] = (ioiCounts[cls] || 0) + 1;
      }
    }
    const topRhythms = Object.entries(ioiCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([r, cnt]) => `${r}(${cnt})`);

    // Duration distribution
    const durCounts = {};
    for (const n of notes) {
      const cls = durationClass(n.durationTicks, ppq);
      durCounts[cls] = (durCounts[cls] || 0) + 1;
    }
    const topDurs = Object.entries(durCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([d, cnt]) => `${d}(${cnt})`);

    // Motifs
    const motifs = findMotifs(sortedNotes, 3, 5, 2);

    // Scale detection per track
    const trackScale = role === 'percussion' ? 'N/A' : detectScale(pitchCounts);

    trackAnalyses.push({
      name: track.name || '(unnamed)',
      role,
      noteCount: notes.length,
      pitchRange: `${noteName(minMidi)} - ${noteName(maxMidi)} (midi ${minMidi}-${maxMidi})`,
      topPitchClasses: topPCs,
      topIntervals,
      topRhythms,
      topDurations: topDurs,
      scale: trackScale,
      motifs: motifs.slice(0, 5),
    });
  }

  const globalScale = detectScale(globalPitchCounts);

  return {
    filename,
    ppq,
    tempos,
    bpmRange: bpmMin === bpmMax ? `${bpmMin} BPM` : `${bpmMin}–${bpmMax} BPM`,
    timeSignatures,
    trackCount: midi.tracks.length,
    globalScale,
    tracks: trackAnalyses,
  };
}

function printAnalysis(result) {
  if (result.error) {
    console.log(`  ERROR: ${result.error}`);
    return;
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`FILE: ${result.filename}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`  PPQ: ${result.ppq}`);
  console.log(`  Tempo: ${result.bpmRange}`);
  if (result.tempos.length > 1) {
    console.log(`  Tempo changes: ${result.tempos.map(t => `${t.bpm}@tick${t.ticks}`).join(', ')}`);
  }
  console.log(`  Time Signatures: ${result.timeSignatures.map(ts => `${ts.numerator}/${ts.denominator}@tick${ts.ticks}`).join(', ') || '4/4 (default)'}`);
  console.log(`  Track count: ${result.trackCount}`);
  console.log(`  GLOBAL SCALE DETECTION: ${result.globalScale}`);

  for (const tr of result.tracks) {
    console.log(`\n  --- Track: "${tr.name}" [${tr.role}] ---`);
    if (tr.noteCount === 0) {
      console.log(`    (no notes)`);
      continue;
    }
    console.log(`    Notes: ${tr.noteCount}`);
    console.log(`    Pitch range: ${tr.pitchRange}`);
    console.log(`    Top pitch classes: ${tr.topPitchClasses.join(', ')}`);
    console.log(`    Top intervals: ${tr.topIntervals.join(' | ')}`);
    console.log(`    Rhythm (IOI): ${tr.topRhythms.join(' | ')}`);
    console.log(`    Durations: ${tr.topDurations.join(' | ')}`);
    console.log(`    Scale: ${tr.scale}`);
    if (tr.motifs && tr.motifs.length > 0) {
      console.log(`    Motifs (interval sequences, sorted by frequency):`);
      for (const m of tr.motifs) {
        const ivNames = m.intervals.map(iv => {
          const sign = iv > 0 ? '+' : iv < 0 ? '' : '±';
          return `${sign}${iv}st`;
        }).join(', ');
        console.log(`      [${m.len}-note, x${m.count}] intervals: [${ivNames}] (typical start: ${m.typicalStart})`);
      }
    }
  }
}

// Main
console.log('UNDERTALE/DELTARUNE MIDI ANALYSIS');
console.log('==================================\n');

const allResults = [];
for (const file of TARGET_FILES) {
  const filepath = path.join(MIDI_DIR, file);
  if (!fs.existsSync(filepath)) {
    console.log(`SKIP (not found): ${file}`);
    continue;
  }
  const result = analyzeFile(file);
  allResults.push(result);
  printAnalysis(result);
}

// Cross-file summary
console.log('\n\n' + '='.repeat(70));
console.log('CROSS-FILE SUMMARY: COMMON PATTERNS');
console.log('='.repeat(70));

// Aggregate intervals across melody/lead tracks
const allIntervals = {};
const allRhythms = {};
const allBPMs = [];

for (const r of allResults) {
  if (r.error) continue;
  if (r.tempos && r.tempos.length > 0) allBPMs.push(...r.tempos.map(t => t.bpm));
  for (const tr of r.tracks) {
    if (!tr.noteCount || tr.role === 'percussion') continue;
    if (tr.topIntervals) {
      for (const iv of tr.topIntervals) {
        const match = iv.match(/^(.+)\((\d+)\)$/);
        if (match) allIntervals[match[1]] = (allIntervals[match[1]] || 0) + parseInt(match[2]);
      }
    }
    if (tr.topRhythms) {
      for (const rh of tr.topRhythms) {
        const match = rh.match(/^(.+)\((\d+)\)$/);
        if (match) allRhythms[match[1]] = (allRhythms[match[1]] || 0) + parseInt(match[2]);
      }
    }
  }
}

console.log(`\nBPM range across all files: ${Math.min(...allBPMs).toFixed(1)} – ${Math.max(...allBPMs).toFixed(1)}`);
console.log(`Most common BPM values: ${[...allBPMs].sort((a,b)=>a-b).map(b=>b.toFixed(1)).join(', ')}`);

console.log('\nTop intervals across all melodic/harmonic tracks:');
Object.entries(allIntervals).sort((a,b)=>b[1]-a[1]).slice(0,12)
  .forEach(([iv, cnt]) => console.log(`  ${iv.padEnd(22)} ${cnt}`));

console.log('\nTop rhythmic values (IOI) across all tracks:');
Object.entries(allRhythms).sort((a,b)=>b[1]-a[1]).slice(0,8)
  .forEach(([rh, cnt]) => console.log(`  ${rh.padEnd(22)} ${cnt}`));
