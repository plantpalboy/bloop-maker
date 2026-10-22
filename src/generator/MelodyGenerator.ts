import type { NoteEvent, ChannelId } from '../types';

export type GenMode = 'ambient' | 'mid' | 'battle' | 'jazzy' | 'funky' | 'silly' | 'weird';
export type ScaleType =
  | 'minor' | 'mixolydian' | 'lydian' | 'major'
  | 'dorian' | 'pentatonicMinor' | 'pentatonicMajor' | 'wholeTone'
  | 'harmonicMinor';

export interface GenConfig {
  mode: GenMode;
  key: number;
  octave: number;
  bars: number;
  bpm?: number;
  scaleType?: ScaleType;
  generateNoise?: boolean;
  sparseness?: number;
  channelSparseness?: { pulse1?: number; pulse2?: number; wave?: number; noise?: number; pulse3?: number; pad?: number; extra1?: number; extra2?: number; extra3?: number };
  channelStyles?: { pulse1?: string; pulse2?: string; wave?: string; noise?: string; pulse3?: string; pad?: string };
  motifSeed?: number[];
  arpStyle?: string;
  extraChannelRoles?: { extra1?: string; extra2?: string; extra3?: string };
  seed?: number; // pass original seed to reproduce the same song structure
}

export interface GenResult {
  channels: Record<ChannelId, NoteEvent[]>;
  duration: number;
  bpm: number;
  seed: number;
  motifIntervals: number[]; // degree offsets of primary motif (for inspector)
  metricMod: boolean;       // true if this song uses double-time in chorus
}

const SCALES: Record<ScaleType, number[]> = {
  minor:          [0, 2, 3, 5, 7, 8, 10],
  mixolydian:     [0, 2, 4, 5, 7, 9, 10],
  lydian:         [0, 2, 4, 6, 7, 9, 11],
  major:          [0, 2, 4, 5, 7, 9, 11],
  dorian:         [0, 2, 3, 5, 7, 9, 10],
  pentatonicMinor:[0, 3, 5, 7, 10],
  pentatonicMajor:[0, 2, 4, 7, 9],
  wholeTone:      [0, 2, 4, 6, 8, 10],
  harmonicMinor:  [0, 2, 3, 5, 7, 8, 11], // raised 7th gives leading-tone drama
};

const PROGRESSIONS: Record<ScaleType, number[][]> = {
  minor: [
    [0, 6, 5, 6],   // i – VII – VI – VII (modal rock)
    [0, 3, 0, 4],   // i – III – i – iv
    [0, 5, 2, 6],   // i – v – ii° – VII
    [0, 4, 5, 0],   // i – iv – v – i
    [0, 6, 3, 4],   // i – VII – III – iv
    [0, 5, 6, 4],   // i – v – VII – iv
    [0, 2, 6, 5],   // i – ii° – VII – VI
    [0, 3, 6, 0],   // i – III – VII – i
    [0, 4, 6, 5],   // i – iv – VII – VI
    [0, 6, 0, 6],   // simple 2-chord vamp i–VII
    [0, 4, 0, 4],   // 2-chord vamp i–iv (Enemy Approaching)
    [0, 5, 6, 0],   // i – bVI – bVII – i (modal minor loop)
    [0, 3, 4, 5],   // i – iv – V – bVI (classical with modal landing)
  ],
  mixolydian: [
    [0, 6, 5, 6],
    [0, 4, 3, 4],
    [0, 2, 3, 4],
    [0, 5, 6, 4],
    [0, 3, 6, 0],
    [0, 4, 6, 0],
    [0, 5, 4, 6],
    [0, 6, 4, 0],
    [0, 6, 0, 6],   // 2-chord vamp
  ],
  lydian: [
    [0, 1, 0, 1],
    [0, 1, 6, 0],
    [0, 6, 5, 1],
    [0, 4, 1, 6],
    [0, 1, 4, 0],
    [0, 2, 1, 0],
    [0, 5, 1, 4],
    [0, 1, 0, 4],
  ],
  major: [
    [0, 3, 4, 0],
    [0, 5, 3, 4],
    [0, 5, 1, 4],
    [0, 3, 1, 4],
    [0, 4, 5, 0],
    [0, 1, 4, 0],
    [0, 3, 5, 4],
    [0, 5, 3, 0],
    [0, 2, 5, 0],
    [0, 3, 0, 4],   // simple I–IV–I–V
    [0, 4, 0, 4],   // 2-chord I–V vamp
  ],
  dorian: [
    [0, 5, 1, 4],
    [0, 4, 1, 0],
    [0, 3, 4, 5],
    [0, 1, 4, 0],
    [0, 5, 4, 1],
    [0, 4, 5, 0],
    [0, 3, 1, 4],
    [0, 6, 4, 0],
    [0, 4, 0, 4],   // 2-chord vamp
  ],
  harmonicMinor: [
    [0, 3, 4, 0],   // i – iv – V – i (classic with leading tone)
    [0, 5, 4, 0],   // i – bVI – V – i (Eastern flavor)
    [0, 3, 4, 5],   // i – iv – V – bVI
    [0, 6, 4, 0],   // i – VII° – V – i
    [0, 4, 0, 4],   // 2-chord i–V vamp
    [0, 5, 4, 5],   // i – bVI – V – bVI (unresolved tension loop)
    [0, 3, 6, 4],   // i – iv – VII° – V
  ],
  pentatonicMinor: [
    [0, 2, 3, 2],
    [0, 3, 2, 0],
    [0, 1, 2, 1],
    [0, 3, 4, 0],
    [0, 2, 4, 3],
    [0, 4, 2, 1],
    [0, 1, 4, 0],
  ],
  pentatonicMajor: [
    [0, 1, 3, 1],
    [0, 3, 1, 3],
    [0, 1, 2, 1],
    [0, 2, 3, 1],
    [0, 3, 2, 1],
    [0, 1, 3, 2],
    [0, 2, 1, 0],
  ],
  wholeTone: [
    [0, 1, 2, 1],
    [0, 2, 1, 0],
    [0, 1, 3, 2],
    [0, 3, 1, 2],
    [0, 2, 3, 0],
    [0, 1, 2, 3],
  ],
};

// Per-mode rhythm tables — one is picked randomly each generation for variety
const RHYTHM_PROFILES: Record<GenMode, { beats: number; w: number }[][]> = {
  ambient: [
    [ { beats: 0.5, w: 40 }, { beats: 1.0, w: 25 }, { beats: 1.5, w: 15 }, { beats: 0.75, w: 12 }, { beats: 2.0, w: 8  } ],
    [ { beats: 1.0, w: 45 }, { beats: 2.0, w: 25 }, { beats: 0.5, w: 15 }, { beats: 1.5,  w: 10 }, { beats: 3.0, w: 5  } ],
    [ { beats: 0.75,w: 40 }, { beats: 0.5, w: 30 }, { beats: 1.5, w: 18 }, { beats: 1.0,  w: 12 }                        ],
    [ { beats: 0.5, w: 35 }, { beats: 0.5, w: 30 }, { beats: 1.0, w: 20 }, { beats: 2.0,  w: 10 }, { beats: 0.25, w: 5 } ],
  ],
  mid: [
    [ { beats: 0.5, w: 52 }, { beats: 1.0, w: 20 }, { beats: 0.75, w: 15 }, { beats: 1.5, w: 8  }, { beats: 0.25, w: 5  } ],
    [ { beats: 0.25,w: 40 }, { beats: 0.5, w: 35 }, { beats: 0.75, w: 15 }, { beats: 1.0, w: 10 }                          ],
    [ { beats: 1.0, w: 40 }, { beats: 0.5, w: 30 }, { beats: 1.5,  w: 18 }, { beats: 0.75,w: 8  }, { beats: 2.0, w: 4  } ],
    [ { beats: 0.5, w: 35 }, { beats: 0.75,w: 30 }, { beats: 1.0,  w: 20 }, { beats: 0.25,w: 10 }, { beats: 1.5, w: 5  } ],
  ],
  battle: [
    [ { beats: 0.5, w: 40 }, { beats: 0.25, w: 35 }, { beats: 0.75, w: 15 }, { beats: 1.0, w: 10 } ],
    [ { beats: 0.25,w: 55 }, { beats: 0.5,  w: 30 }, { beats: 0.75, w: 10 }, { beats: 1.0, w: 5  } ],
    [ { beats: 0.5, w: 50 }, { beats: 0.5,  w: 25 }, { beats: 1.0,  w: 15 }, { beats: 0.25,w: 10 } ],
    [ { beats: 0.75,w: 35 }, { beats: 0.25, w: 35 }, { beats: 0.5,  w: 20 }, { beats: 1.0, w: 10 } ],
  ],
  jazzy: [
    [ { beats: 0.33, w: 35 }, { beats: 0.67, w: 30 }, { beats: 1.0, w: 20 }, { beats: 0.75, w: 10 }, { beats: 1.5, w: 5 } ],
    [ { beats: 0.67, w: 38 }, { beats: 0.33, w: 25 }, { beats: 1.0, w: 22 }, { beats: 1.5,  w: 10 }, { beats: 0.5, w: 5 } ],
    [ { beats: 0.75, w: 40 }, { beats: 1.0,  w: 25 }, { beats: 0.5, w: 20 }, { beats: 1.5,  w: 10 }, { beats: 0.33,w: 5 } ],
    [ { beats: 1.0,  w: 35 }, { beats: 0.67, w: 30 }, { beats: 1.5, w: 20 }, { beats: 0.33, w: 10 }, { beats: 2.0, w: 5 } ],
  ],
  funky: [
    [ { beats: 0.25, w: 45 }, { beats: 0.5, w: 35 }, { beats: 0.75, w: 12 }, { beats: 1.0, w: 8  } ],
    [ { beats: 0.5,  w: 50 }, { beats: 0.25,w: 30 }, { beats: 0.75, w: 12 }, { beats: 1.0, w: 8  } ],
    [ { beats: 0.25, w: 40 }, { beats: 0.5, w: 30 }, { beats: 0.5,  w: 20 }, { beats: 0.25,w: 10 } ],
    [ { beats: 0.5,  w: 42 }, { beats: 0.5, w: 30 }, { beats: 0.25, w: 18 }, { beats: 1.0, w: 10 } ],
  ],
  silly: [
    [ { beats: 0.25, w: 55 }, { beats: 0.5, w: 30 }, { beats: 0.75, w: 10 }, { beats: 1.0, w: 5  } ],
    [ { beats: 0.5,  w: 55 }, { beats: 0.25,w: 35 }, { beats: 0.75, w: 7  }, { beats: 1.0, w: 3  } ],
    [ { beats: 0.25, w: 60 }, { beats: 0.5, w: 25 }, { beats: 1.0,  w: 10 }, { beats: 0.75,w: 5  } ],
    [ { beats: 0.5,  w: 45 }, { beats: 0.25,w: 40 }, { beats: 1.0,  w: 10 }, { beats: 0.75,w: 5  } ],
  ],
  weird: [
    [ { beats: 0.33, w: 30 }, { beats: 0.67, w: 25 }, { beats: 1.0, w: 20 }, { beats: 0.5,  w: 15 }, { beats: 1.5, w: 10 } ],
    [ { beats: 0.67, w: 28 }, { beats: 1.0,  w: 25 }, { beats: 0.33,w: 22 }, { beats: 1.5,  w: 15 }, { beats: 0.5, w: 10 } ],
    [ { beats: 0.5,  w: 30 }, { beats: 0.33, w: 28 }, { beats: 1.0, w: 22 }, { beats: 0.67, w: 12 }, { beats: 2.0, w: 8  } ],
    [ { beats: 1.0,  w: 25 }, { beats: 0.67, w: 28 }, { beats: 0.33,w: 25 }, { beats: 1.5,  w: 12 }, { beats: 0.5, w: 10 } ],
  ],
};

const DEFAULT_BPM: Record<GenMode, number> = { ambient: 65, mid: 130, battle: 183, jazzy: 105, funky: 120, silly: 170, weird: 100 };
const BASE_REST_PROB: Record<GenMode, number> = { ambient: 0.38, mid: 0.25, battle: 0.12, jazzy: 0.28, funky: 0.20, silly: 0.15, weird: 0.30 };

// Lead rhythm profiles — committed to one dominant duration per song
const LEAD_RHYTHM_PROFILES: { beats: number; w: number }[][] = [
  [ { beats: 0.5, w: 72 }, { beats: 1.0, w: 18 }, { beats: 1.5, w: 6  }, { beats: 2.0, w: 4  } ],
  [ { beats: 1.0, w: 68 }, { beats: 0.5, w: 18 }, { beats: 1.5, w: 9  }, { beats: 2.0, w: 5  } ],
  [ { beats: 1.5, w: 65 }, { beats: 1.0, w: 18 }, { beats: 0.5, w: 12 }, { beats: 3.0, w: 5  } ],
  [ { beats: 1.0, w: 45 }, { beats: 1.75,w: 30 }, { beats: 0.5, w: 15 }, { beats: 2.0, w: 10 } ],
  [ { beats: 0.5, w: 52 }, { beats: 1.0, w: 28 }, { beats: 2.0, w: 14 }, { beats: 4.0, w: 6  } ],
  [ { beats: 2.0, w: 55 }, { beats: 1.0, w: 25 }, { beats: 0.5, w: 12 }, { beats: 3.0, w: 8  } ], // long-note style
  [ { beats: 1.0, w: 60 }, { beats: 1.5, w: 22 }, { beats: 0.5, w: 10 }, { beats: 2.0, w: 8  } ], // AC bouncy quarters
  [ { beats: 1.0, w: 50 }, { beats: 0.5, w: 30 }, { beats: 2.0, w: 12 }, { beats: 1.5, w: 8  } ], // AC mix quarters+8ths
  // Syncopated quirky: dotted-quarter + eighth combos (quarter, dotted-quarter, eighth)
  // Creates the off-beat accent feel common in quirky game music
  [ { beats: 1.5, w: 50 }, { beats: 0.5, w: 35 }, { beats: 1.0, w: 15 } ],
];
const LEAD_REST_PROB: Record<GenMode, number> = { ambient: 0.28, mid: 0.18, battle: 0.10, jazzy: 0.20, funky: 0.14, silly: 0.08, weird: 0.26 };

// Opening interval by scale (characteristic first melodic leap)
const OPENING_LEAP: Record<ScaleType, { deg: number; upProb: number }> = {
  minor:          { deg: 2, upProb: 0.35 },
  dorian:         { deg: 2, upProb: 0.65 },
  mixolydian:     { deg: 3, upProb: 0.75 },
  major:          { deg: 2, upProb: 0.70 },
  lydian:         { deg: 4, upProb: 0.80 },
  pentatonicMinor:{ deg: 2, upProb: 0.50 },
  pentatonicMajor:{ deg: 2, upProb: 0.70 },
  wholeTone:      { deg: 3, upProb: 0.65 },
  harmonicMinor:  { deg: 3, upProb: 0.45 }, // leap to 4th/5th, often downward for tension
};

// ── Motif system ─────────────────────────────────────────────

interface MotifNote { degreeOffset: number; beats: number; }
type MotifVariant = 'statement' | 'answer' | 'inversion' | 'sequence' | 'retrograde';
interface Motif { notes: MotifNote[]; totalBeats: number; }

function genMotif(rng: RNG, mode: GenMode, scaleType: ScaleType = 'major'): Motif {
  const numNotes = 2 + rng.int(4);
  const beatPools: Record<GenMode, number[][]> = {
    battle:  [[0.5, 0.5, 0.75], [0.25, 0.5, 0.75], [0.5, 0.75, 0.5], [0.5, 0.5, 1.0]],
    ambient: [[1.0, 0.5, 1.5], [0.75, 1.0, 2.0], [0.5, 1.0, 0.75], [1.0, 1.5, 0.5]],
    mid:     [[0.5, 1.0, 0.75], [1.0, 0.5, 1.0], [0.75, 1.0, 0.5], [0.5, 0.75, 1.0]],
    jazzy:   [[0.33, 0.67, 1.0], [0.67, 0.33, 1.0], [0.75, 0.5, 1.0], [0.5, 0.67, 0.33]],
    funky:   [[0.25, 0.5, 0.25], [0.5, 0.25, 0.5], [0.25, 0.25, 0.5], [0.5, 0.5, 0.25]],
    silly:   [[0.25, 0.5, 0.25], [0.5, 0.25, 0.25], [0.25, 0.25, 0.5], [0.5, 0.25, 0.5]],
    weird:   [[0.33, 1.0, 0.67], [0.67, 0.5, 0.33], [1.0, 0.33, 0.67], [0.5, 0.67, 1.0]],
  };
  const beatPool = rng.pick(beatPools[mode]);
  // Arch 35%, Wave 25%, Rising 20%, Falling 20% (doc: contour archetype sampling)
  const contour = rng.weighted([{value:0,w:25},{value:1,w:20},{value:2,w:20},{value:3,w:35}]);

  const leap = OPENING_LEAP[scaleType];
  const openingDir = rng.next() < leap.upProb ? 1 : -1;
  // Start on root, 3rd, or 5th (not always root)
  const startDeg = rng.weighted([{ value: 0, w: 5 }, { value: 2, w: 2 }, { value: 4, w: 2 }, { value: -2, w: 1 }]);

  const notes: MotifNote[] = [];
  let totalBeats = 0;
  let deg = startDeg;
  for (let i = 0; i < numNotes; i++) {
    const beats = rng.pick(beatPool);
    if (totalBeats + beats > 3.0) break;
    notes.push({ degreeOffset: Math.max(-4, Math.min(8, deg)), beats });
    totalBeats += beats;
    if (i === 0) {
      deg += openingDir * leap.deg;
    } else {
      const half = numNotes / 2;
      const upBias = contour === 1 ? 0.75 : contour === 2 ? 0.25 : contour === 3 ? (i < half ? 0.75 : 0.25) : 0.5;
      // 55% single step, 30% skip (3rd), 15% leap (4th) — more memorable motifs
      const stepSize = rng.next() < 0.55 ? 1 : rng.next() < 0.70 ? 2 : 3;
      deg += rng.next() < upBias ? stepSize : -stepSize;
    }
    deg = Math.max(-4, Math.min(8, deg));
  }
  if (notes.length === 0) { notes.push({ degreeOffset: 0, beats: 0.5 }); totalBeats = 0.5; }
  // Snap last note to nearest stable degree (root/3rd/5th) for cleaner phrase endings
  if (notes.length > 0) {
    const stableDegrees = [-2, 0, 2, 4, 6];
    const lastDeg = notes[notes.length - 1].degreeOffset;
    const closest = stableDegrees.reduce((b, d) => Math.abs(d - lastDeg) < Math.abs(b - lastDeg) ? d : b, 0);
    if (Math.abs(closest - lastDeg) <= 1) {
      notes[notes.length - 1] = { ...notes[notes.length - 1], degreeOffset: closest };
    }
  }
  return { notes, totalBeats };
}

// Quality gate: reject motifs with bad leap sequences or excessive range
function scoreMotif(motif: Motif): number {
  if (motif.notes.length < 2) return 0;
  const degrees = motif.notes.map(n => n.degreeOffset);
  const span = Math.max(...degrees) - Math.min(...degrees);
  if (span > 9) return 0.2;
  let consecLeaps = 0, dirChanges = 0, prev = 0;
  for (let i = 1; i < degrees.length; i++) {
    const iv = degrees[i] - degrees[i - 1];
    consecLeaps = Math.abs(iv) >= 3 ? consecLeaps + 1 : 0;
    if (consecLeaps >= 2) return 0.3;
    if (prev !== 0 && Math.sign(iv) !== Math.sign(prev)) dirChanges++;
    prev = iv;
  }
  return dirChanges > 3 ? 0.5 : 1.0;
}

// Aging: nudge one degree ±1 per call, more aggressively as prob rises
function mutateMotif(motif: Motif, rng: RNG, prob: number): Motif {
  return {
    ...motif,
    notes: motif.notes.map(n => {
      if (rng.next() > prob) return n;
      const d = rng.next() < 0.5 ? 1 : -1;
      return { ...n, degreeOffset: Math.max(-4, Math.min(8, n.degreeOffset + d)) };
    }),
  };
}

function renderMotifVariant(
  motif: Motif, variant: MotifVariant, rng: RNG,
  scale: number[], key: number, oct: number,
  chordDeg: number, beatDur: number, startTime: number,
): NoteEvent[] {
  const out: NoteEvent[] = [];
  let t = startTime;
  // retrograde: play notes in reverse order (same pitches, reversed rhythm)
  const notes = variant === 'retrograde' ? [...motif.notes].reverse() : motif.notes;
  // sequence: shift whole motif up 2 scale degrees (a 3rd) — classic sequence technique
  const answerShift = variant === 'answer' ? 3 : variant === 'sequence' ? 2 : 0;
  for (let i = 0; i < notes.length; i++) {
    const mn = notes[i];
    let degOff = mn.degreeOffset + answerShift;
    if (variant === 'inversion' && i > 0) {
      const firstDeg = notes[0].degreeOffset;
      degOff = firstDeg - (mn.degreeOffset - firstDeg);
    }
    const midi = scaleMidi(key, oct, scale, chordDeg + degOff);
    const dur = mn.beats * beatDur;
    // Micro-crescendo: each successive note in the motif gets slightly louder (+2/note)
    // Retrograde reverses this so the phrase naturally descends in energy
    const crescendo = variant === 'retrograde' ? (notes.length - 1 - i) * 2 : i * 2;
    out.push({ time: t, duration: dur * 0.82, midi: Math.max(0, Math.min(127, midi)), velocity: Math.min(120, 74 + rng.int(16) + crescendo) });
    t += dur;
  }
  return out;
}

// ── RNG ───────────────────────────────────────────────────────

class RNG {
  private s: number;
  constructor(seed = Date.now()) { this.s = seed >>> 0 || 1; }
  next(): number {
    this.s ^= this.s << 13; this.s ^= this.s >> 17; this.s ^= this.s << 5;
    return (this.s >>> 0) / 0xFFFFFFFF;
  }
  int(n: number) { return Math.floor(this.next() * n); }
  pick<T>(a: T[]): T { return a[this.int(a.length)]; }
  weighted<T>(items: { value: T; w: number }[]): T {
    if (items.length === 0) throw new Error('weighted: empty array');
    const total = items.reduce((s, i) => s + i.w, 0);
    let r = this.next() * total;
    for (const item of items) { r -= item.w; if (r <= 0) return item.value; }
    return items[items.length - 1].value;
  }
}

// ── Scale helpers ─────────────────────────────────────────────

function scaleMidi(key: number, oct: number, scaleArr: number[], degree: number): number {
  const octShift = Math.floor(degree / scaleArr.length);
  const idx = ((degree % scaleArr.length) + scaleArr.length) % scaleArr.length;
  return (oct + 1) * 12 + key + scaleArr[idx] + octShift * 12;
}

function snapToScale(midi: number, key: number, scaleArr: number[]): number {
  const pc = ((midi % 12) + 12) % 12;
  const relPc = ((pc - key) + 12) % 12;
  let bestDelta = 99, best = relPc;
  for (const s of scaleArr) {
    const d = Math.min(Math.abs(s - relPc), 12 - Math.abs(s - relPc));
    if (d < Math.abs(bestDelta)) { bestDelta = s - relPc; best = s; }
  }
  return midi + bestDelta;
}

// ── Swing quantization ────────────────────────────────────────
// Shifts notes on even-8th positions (beat-and) forward by `amount` beats,
// giving the 3:2 lilt common in quirky game music.
// amount = 0.15 is a light shuffle; 0.167 is a full triplet swing (2:1).
function applySwing(notes: NoteEvent[], barStart: number, beatDur: number, amount = 0.15): NoteEvent[] {
  const eighth = beatDur * 0.5;
  return notes.map(n => {
    const relTime = n.time - barStart;
    // Snap to nearest 8th position; if it's an odd 8th (beat-and), swing it
    const eighthPos = Math.round(relTime / eighth);
    if (eighthPos % 2 === 1) {
      const shifted = barStart + eighthPos * eighth + amount * beatDur;
      return { ...n, time: shifted };
    }
    return n;
  });
}

// ── 4-3 / 9-8 Suspension insertion ───────────────────────────
// For long notes on strong beats that land on a chord tone (root/3rd/5th):
// split into [suspension: one scale step above, 55% duration] + [resolution: chord tone, 45%].
// This gives the "lean and release" feel described in the harmony rules doc.
function insertSuspensions(
  notes: NoteEvent[], beatDur: number, key: number, scale: number[],
  chordDeg: number, oct: number, rng: RNG, prob = 0.18,
): NoteEvent[] {
  if (notes.length === 0) return notes;
  const chordRoot  = scaleMidi(key, oct, scale, chordDeg);
  const chordThird = scaleMidi(key, oct, scale, chordDeg + 2);
  const chordFifth = scaleMidi(key, oct, scale, chordDeg + 4);
  const chordTones = new Set([chordRoot, chordThird, chordFifth, chordRoot + 12, chordRoot - 12]);

  const result: NoteEvent[] = [];
  for (const n of notes) {
    const isLong      = n.duration >= beatDur * 0.9;
    const isChordTone = chordTones.has(n.midi);
    if (!isLong || !isChordTone || rng.next() > prob) { result.push(n); continue; }

    // Suspension = scale step above the chord tone, same octave range
    const susNote = snapToScale(n.midi + 2, key, scale);
    if (susNote === n.midi || Math.abs(susNote - n.midi) > 3) { result.push(n); continue; }

    const susDur = n.duration * 0.55;
    const resDur = n.duration * 0.45;
    // Suspension slightly softer than resolution (lean-then-resolve dynamic)
    result.push({ time: n.time,          duration: susDur, midi: Math.max(0, Math.min(127, susNote)), velocity: Math.max(1, n.velocity - 8) });
    result.push({ time: n.time + susDur, duration: resDur, midi: n.midi,                              velocity: Math.min(120, n.velocity + 4) });
  }
  return result;
}

// ── Ornament insertion ────────────────────────────────────────
// Mode-aware: combat/funky/silly 22%, jazzy/weird 18%, ambient/mid 12%
function insertOrnaments(notes: NoteEvent[], rng: RNG, key: number, scale: number[], mode: GenMode): NoteEvent[] {
  const ornProb = (mode === 'battle' || mode === 'funky' || mode === 'silly') ? 0.22
    : (mode === 'ambient' || mode === 'mid') ? 0.12 : 0.18;
  if (notes.length < 3 || rng.next() > ornProb) return notes;
  // Pick one note that falls on or just before a strong beat (beatPos ~1 or ~3)
  const result: NoteEvent[] = [];
  let ornamented = false;
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    if (!ornamented && i > 0 && n.time > 0.05) {
      const dir = rng.next() < 0.55 ? 1 : -1; // upper neighbor slightly preferred
      const gMidi = snapToScale(n.midi + dir * 2, key, scale);
      if (gMidi !== n.midi) {
        result.push({ time: n.time - 0.038, duration: 0.032, midi: Math.max(0, Math.min(127, gMidi)), velocity: Math.max(1, n.velocity - 14) });
        ornamented = true;
      }
    }
    result.push(n);
  }
  return result;
}

// ── Melody bar ────────────────────────────────────────────────

function genMelodyBar(
  rng: RNG, scale: number[], key: number, oct: number, chordDeg: number,
  beatDur: number, barStart: number, direction: 'up' | 'down' | 'free',
  prevMidi: number, mode: GenMode, scaleType: ScaleType,
  rhythms: { beats: number; w: number }[],
  lo: number, hi: number,
  overrideDuration?: number, restBias = 0,
  phrasePos = 0,
  phraseRole: 'antecedent' | 'consequent' | 'free' = 'free',
  prevDelta = 0,
): { notes: NoteEvent[]; lastMidi: number; lastDelta: number } {
  const notes: NoteEvent[] = [];
  let t = barStart;
  const barEnd = barStart + (overrideDuration ?? 4 * beatDur);
  let cur = prevMidi;
  let noteRun = 0;
  let lastDelta = prevDelta;

  // Phrase arc: bars 0-1 always ascend (question), bar 3 always descends (answer/resolve)
  const phraseArcDir: 'up' | 'down' | 'free' =
    phrasePos <= 1 ? 'up' : phrasePos >= 3 ? 'down' : 'free';
  // Structural bars obey phrase arc; tension bar (2) uses caller direction
  const effectiveDir: 'up' | 'down' | 'free' =
    phrasePos !== 2 ? phraseArcDir : (direction !== 'free' ? direction : 'free');

  const chordTones = [
    scaleMidi(key, oct, scale, chordDeg),
    scaleMidi(key, oct, scale, chordDeg + 2),
    scaleMidi(key, oct, scale, chordDeg + 4),
    scaleMidi(key, oct + 1, scale, chordDeg),
  ];

  // Pick a committed primary duration for this bar — used 65% of the time for rhythmic identity
  const primaryBeat = rng.weighted(rhythms.map(r => ({ value: r.beats, w: Math.max(1, r.w) })));

  while (t < barEnd - 0.01) {
    const remaining = barEnd - t;
    const eligible = rhythms.filter(r => r.beats * beatDur <= remaining + 0.01);
    if (eligible.length === 0) break;
    const usePrimary = rng.next() < 0.65 && primaryBeat * beatDur <= remaining + 0.01;
    const rhythmEntry = usePrimary ? primaryBeat : rng.weighted(eligible.map(r => ({ value: r.beats, w: r.w })));
    const dur = rhythmEntry * beatDur;

    const beatPos = (t - barStart) / beatDur;
    const isStrongBeat1 = beatPos < 0.12;
    const isStrongBeat3 = Math.abs(beatPos - 2.0) < 0.12;

    const beatRestAdj = isStrongBeat1 ? -0.25 : 0;
    const restProb = Math.max(0, BASE_REST_PROB[mode] + restBias + (noteRun >= 3 ? 0.20 : 0) + (noteRun >= 6 ? 0.15 : 0) + beatRestAdj);
    if (rng.next() < restProb) { noteRun = 0; t += dur; continue; }

    const isBattle = mode === 'battle';

    // Hard leap recovery: force contrasting interval after big leaps (≥7 semitones = 5th+)
    const bigLeapUp   = lastDelta >= 7;
    const bigLeapDown = lastDelta <= -7;
    const hadLeapUp   = lastDelta >= 5;
    const hadLeapDown = lastDelta <= -5;

    let next: number;
    if (bigLeapUp && rng.next() < 0.85) {
      // Force a contrasting interval after large leap — not always a step, often a 3rd/4th back
      const recoverDelta = rng.next() < 0.55 ? -2 : rng.next() < 0.7 ? -4 : -5;
      next = snapToScale(cur + recoverDelta, key, scale);
    } else if (bigLeapDown && rng.next() < 0.85) {
      const recoverDelta = rng.next() < 0.55 ? 2 : rng.next() < 0.7 ? 4 : 5;
      next = snapToScale(cur + recoverDelta, key, scale);
    } else {
      // Zigzag bias: data shows 74.6% of melody notes reverse direction immediately.
      // Apply a direction-reversal bias based on the previous interval (not just leaps).
      const prevDir = lastDelta > 0 ? 1 : lastDelta < 0 ? -1 : 0;
      const zigzagDown = prevDir > 0 ? 1.9 : 1.0;  // previous was up → bias down
      const zigzagUp   = prevDir < 0 ? 1.9 : 1.0;  // previous was down → bias up

      const recoverUp   = hadLeapDown ? 2.5 : 1.0;
      const recoverDown = hadLeapUp   ? 2.5 : 1.0;
      const suppressFar = (hadLeapUp || hadLeapDown) ? 0.25 : 1.0;

      const upW   = (effectiveDir === 'up'   ? 1.4 : effectiveDir === 'down' ? 0.7 : 1.0) * zigzagUp;
      const downW = (effectiveDir === 'down' ? 1.4 : effectiveDir === 'up'   ? 0.7 : 1.0) * zigzagDown;

      // Calibrated from 13,423 real game MIDI files:
      // Repeat ~16%, Steps ~14%, 3rds ~20%, 4ths ~12%, 5ths ~9%, Octaves ~11%
      const intervals: { delta: number; w: number }[] = [
        { delta: -2, w: Math.round(13 * recoverDown * downW) },
        { delta:  2, w: Math.round(11 * recoverUp   * upW)   },
        { delta:  0, w: 22 },
        { delta: -1, w: Math.round(5 * downW) },
        { delta:  1, w: Math.round(5 * upW)   },
        { delta: -3, w: Math.round(13 * downW * suppressFar) },
        { delta:  3, w: Math.round(13 * upW   * suppressFar) },
        { delta: -4, w: Math.round(10 * downW * suppressFar) },
        { delta:  4, w: Math.round(10 * upW   * suppressFar) },
        { delta: -5, w: Math.round(9  * suppressFar) },
        { delta:  5, w: Math.round(9  * suppressFar) },
        { delta: -7, w: Math.round(7  * suppressFar) },
        { delta:  7, w: Math.round(7  * suppressFar) },
        { delta:-12, w: Math.round(8  * suppressFar) },
        { delta: 12, w: Math.round(7  * suppressFar) },
      ];

      const delta = rng.weighted(intervals.map(i => ({ value: i.delta, w: Math.max(1, i.w) })));
      next = snapToScale(cur + delta, key, scale);
    }

    while (next < lo) next += 12;
    while (next > hi) next -= 12;

    // Rhythm-pitch coupling: long notes prefer chord tones; very short notes pass freely
    const isLongNote  = dur >= beatDur;
    const isShortNote = dur <= beatDur * 0.26;
    const snapProb = isStrongBeat1 ? 0.90 : isStrongBeat3 ? 0.76 : isLongNote ? 0.68 : isShortNote ? 0.10 : 0.40;
    if (rng.next() < snapProb) {
      const closest = chordTones.reduce((b, ct) => Math.abs(ct - next) < Math.abs(b - next) ? ct : b, chordTones[0]);
      if (Math.abs(closest - next) <= 2) next = closest;
    }

    // Chromatic neighbor tone on weak off-beats only (5-6%, safe color tone)
    if (!isStrongBeat1 && !isStrongBeat3 && rng.next() < 0.055) {
      next = Math.max(lo, Math.min(hi, next + (rng.next() < 0.5 ? 1 : -1)));
    }

    // Suspension on tension bars (phrasePos===2): occasionally play a 4th/9th above chord root
    // that implies resolution on the following step
    if (phrasePos === 2 && isStrongBeat1 && rng.next() < 0.18) {
      const sus = rng.next() < 0.55 ? chordTones[2] : snapToScale(chordTones[0] + 2, key, scale);
      if (Math.abs(sus - next) <= 5) next = sus;
    }

    // Final beats of any phrase-ending bar: steer toward chord tone
    const isNearPhraseEnd = phrasePos === 3 && t > barEnd - 2.5 * beatDur;
    const isFinalBeat     = phrasePos === 3 && t > barEnd - 1.1 * beatDur;
    if (isNearPhraseEnd) {
      const root = chordTones[0];
      if (isFinalBeat) {
        // Last note: land on root or 3rd for closure; 6th/b7 for softer modal endings
        // (doc: "use 6 or b7 for softer/ambiguous endings" in dorian/mixolydian)
        const allowModalEnd = (scaleType === 'dorian' || scaleType === 'mixolydian') && rng.next() < 0.28;
        if (allowModalEnd) {
          next = scaleMidi(key, oct, scale, chordDeg + 5); // 6th degree (modal color tone)
        } else {
          next = rng.next() < 0.78 ? root : chordTones[1];
        }
      } else {
        // Approach: step toward root stepwise
        const dist = cur - root;
        if (Math.abs(dist) >= 2 && rng.next() < 0.72) {
          next = snapToScale(cur + (dist > 0 ? -2 : 2), key, scale);
        } else {
          const target = [chordTones[0], chordTones[1], chordTones[2]].reduce(
            (b, ct) => Math.abs(ct - next) < Math.abs(b - next) ? ct : b, chordTones[0]
          );
          if (Math.abs(target - next) <= 3 && rng.next() < 0.80) next = target;
        }
      }
    }

    // Velocity: soften for life sim vibe; keep battle/funky punchy
    const velMod = (mode === 'battle' || mode === 'funky') ? 0 : mode === 'ambient' ? -18 : -10;
    // Phrase velocity swell: bars 0-2 build gently, bar 3 resolves softer
    const phraseVelCurve = phrasePos === 0 ? -4 : phrasePos === 1 ? 1 : phrasePos === 2 ? 5 : -3;
    // Mode-aware jitter (doc: ±4 mechanical/chiptune, ±8 humanized, ±10 punchy)
    const jitter: Record<GenMode, number> = { battle: 10, funky: 10, jazzy: 8, mid: 6, ambient: 5, silly: 9, weird: 7 };
    const j = jitter[mode];
    const anchorVel = isStrongBeat1 ? 96 + rng.int(j) + velMod + phraseVelCurve : isStrongBeat3 ? 84 + rng.int(j) + velMod + phraseVelCurve : isLongNote ? 72 + rng.int(j + 4) + velMod + phraseVelCurve : 56 + rng.int(j + 6) + velMod + phraseVelCurve;

    // Gate ratio: mode-aware legato/staccato (from doc: sad/ambient = legato, tense/battle = staccato)
    const modeGate = (mode === 'ambient') ? 0.10 : (mode === 'battle' || mode === 'funky') ? -0.10 : 0;
    const gate = Math.max(0.40, Math.min(0.96, (dur < beatDur * 0.55 ? 0.68 : dur < beatDur * 1.3 ? 0.82 : 0.90) + modeGate));
    notes.push({ time: t, duration: Math.max(dur * gate, 0.05), midi: Math.max(0, Math.min(127, next)), velocity: anchorVel });
    lastDelta = next - cur;
    cur = next; noteRun++; t += dur;
  }

  // Retardation: lengthen final note at any phrase ending for a natural "breathing" feel
  if (notes.length > 0 && phrasePos === 3) {
    const last = notes[notes.length - 1];
    notes[notes.length - 1] = { ...last, duration: Math.min(last.duration * 1.6, beatDur * 1.8) };
  }

  // Hard guarantee: the very last note of a phrase-ending bar must be a chord tone.
  // This is the ultimate fix for "sounds off at section end" — whatever slipped through above gets snapped here.
  if (phrasePos === 3 && notes.length > 0) {
    const last = notes[notes.length - 1];
    const best = chordTones.reduce((b, ct) => Math.abs(ct - last.midi) < Math.abs(b - last.midi) ? ct : b, chordTones[0]);
    notes[notes.length - 1] = {
      ...last,
      midi: Math.max(0, Math.min(127, best)),
      velocity: Math.max(last.velocity, 74),
    };
  }

  return { notes, lastMidi: cur, lastDelta };
}

// ── Accompaniment / harmony ────────────────────────────────────

function genAccompBar(
  rng: RNG, scale: number[], key: number, oct: number, chordDeg: number,
  beatDur: number, barStart: number, scaleType: ScaleType,
  prevChordRoot = -1,
): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const barDur = 4 * beatDur;

  let root    = scaleMidi(key, oct, scale, chordDeg);
  let third   = scaleMidi(key, oct, scale, chordDeg + 2);
  let fifth   = scaleMidi(key, oct, scale, chordDeg + 4);
  let seventh = scaleMidi(key, oct, scale, chordDeg + 6);
  let ninth   = scaleMidi(key, oct, scale, chordDeg + 1);
  const eleventh= scaleMidi(key, oct, scale, chordDeg + 3);

  // Voice leading: move chord tones minimally from previous chord
  if (prevChordRoot >= 0) {
    const wrap = (n: number, anchor: number) => {
      while (n > anchor + 7) n -= 12;
      while (n < anchor - 5) n += 12;
      return n;
    };
    root    = wrap(root,    prevChordRoot);
    third   = wrap(third,   prevChordRoot + 4);
    fifth   = wrap(fifth,   prevChordRoot + 7);
    seventh = wrap(seventh, prevChordRoot + 10);
    ninth   = wrap(ninth,   prevChordRoot + 2);
  }

  const voicingRoll = rng.next();
  let pattern: number[];

  // Simple 4-note patterns — not too busy, Animal Crossing style
  if (scaleType === 'lydian') {
    pattern = voicingRoll < 0.5
      ? [root, eleventh, seventh, ninth, root, eleventh, seventh, ninth]
      : [root, fifth, ninth, seventh, root, fifth, ninth, seventh];
  } else if (scaleType === 'wholeTone') {
    pattern = [root, root + 4, root + 8, root + 4, root, root + 4, root + 8, root + 4];
  } else if (scaleType === 'pentatonicMinor' || scaleType === 'pentatonicMajor') {
    pattern = voicingRoll < 0.5
      ? [root, fifth, root + 12, fifth, root, fifth, root + 12, fifth]
      : [root, third, fifth, third, root, third, fifth, third];
  } else if (scaleType === 'major') {
    pattern = voicingRoll < 0.33
      ? [root, fifth, seventh, fifth, root, fifth, seventh, fifth]
      : voicingRoll < 0.66
      ? [root, third, fifth, third, root, third, fifth, third]
      : [root, ninth, fifth, seventh, root, ninth, fifth, seventh];
  } else if (scaleType === 'mixolydian') {
    pattern = voicingRoll < 0.33
      ? [root, fifth, seventh, fifth, root, fifth, seventh, fifth]
      : voicingRoll < 0.66
      ? [root, third, seventh, fifth, root, third, seventh, fifth]
      : [root, ninth, fifth, seventh, root, ninth, fifth, seventh]; // add9 flat-7 color
  } else if (scaleType === 'dorian') {
    pattern = voicingRoll < 0.33
      ? [root, fifth, seventh, fifth, root, fifth, seventh, fifth]
      : voicingRoll < 0.66
      ? [root, third, fifth, seventh, root, third, fifth, seventh]
      : [root, ninth, fifth, third, root, ninth, fifth, third]; // add9 wistful color
  } else if (scaleType === 'harmonicMinor') {
    // Raised 7th creates tension; voice leading keeps 7th → 8th resolution audible
    pattern = voicingRoll < 0.4
      ? [root, fifth, seventh, fifth, root, fifth, seventh, fifth]   // root-5th-7th (leading tone flavor)
      : voicingRoll < 0.7
      ? [root, third, seventh, third, root, third, seventh, third]  // 7th suspended over root-3rd
      : [root, fifth, third, seventh, root, fifth, third, seventh]; // spread voicing
  } else {
    // minor
    pattern = voicingRoll < 0.35
      ? [root, fifth, seventh, fifth, root, fifth, seventh, fifth]
      : voicingRoll < 0.65
      ? [root, third, fifth, third, root, third, fifth, third]
      : voicingRoll < 0.85
      ? [root, fifth, root + 12, fifth, root, fifth, root + 12, fifth]
      : [root, ninth, fifth, seventh, root, ninth, fifth, seventh]; // minor add9 (melancholy color)
  }

  const stepDur = beatDur * 0.5;
  let t = barStart, i = 0;
  while (t < barStart + barDur - 0.01) {
    const remaining = barStart + barDur - t;
    if (remaining < stepDur * 0.5) break;
    const dur = Math.min(stepDur * 0.82, remaining);
    notes.push({ time: t, duration: dur, midi: Math.max(0, Math.min(127, pattern[i % pattern.length])), velocity: 52 + rng.int(18) });
    t += stepDur; i++;
  }
  return notes;
}

// Chord stab — short staccato chord hits on strong beats (Animal Crossing harmonic style)
function genChordStabBar(
  rng: RNG, scale: number[], key: number, oct: number, chordDeg: number,
  beatDur: number, barStart: number,
): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const root  = scaleMidi(key, oct, scale, chordDeg);
  const third = scaleMidi(key, oct, scale, chordDeg + 2);
  const fifth = scaleMidi(key, oct, scale, chordDeg + 4);

  // 1-3 stabs per bar at varied beat positions
  const stabOptions = [[0], [0, 2], [0, 1.5, 3], [0, 2.5]];
  const beats = rng.pick(stabOptions);
  for (const b of beats) {
    const t = barStart + b * beatDur;
    const dur = beatDur * (0.3 + rng.next() * 0.2);
    const vel = 55 + rng.int(20);
    notes.push({ time: t, duration: dur, midi: Math.max(0, Math.min(127, root)), velocity: vel });
    if (rng.next() < 0.8) notes.push({ time: t, duration: dur, midi: Math.max(0, Math.min(127, fifth)), velocity: vel - 6 });
    if (rng.next() < 0.55) notes.push({ time: t, duration: dur, midi: Math.max(0, Math.min(127, third)), velocity: vel - 10 });
  }
  return notes;
}

// Arpeggio bar for pulse2/pulse3 channels
function genArpBar(
  rng: RNG, scale: number[], key: number, oct: number, chordDeg: number,
  beatDur: number, barStart: number, mode: GenMode,
  styleOverride?: string,
): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const root   = scaleMidi(key, oct, scale, chordDeg);
  const second = scaleMidi(key, oct, scale, chordDeg + 1);
  const third  = scaleMidi(key, oct, scale, chordDeg + 2);
  const fifth  = scaleMidi(key, oct, scale, chordDeg + 4);
  const sev    = scaleMidi(key, oct, scale, chordDeg + 6);
  const ninth  = scaleMidi(key, oct, scale, chordDeg + 8);
  const high   = root + 12;
  const high3  = third + 12;
  const high5  = fifth + 12;
  const low    = root - 12;

  type ArpStyle = 'up' | 'down' | 'updown' | 'broken' | 'alberti' | 'bounce' | 'waltz' |
                  'cascading' | 'pinned' | 'clave' | 'doubletime' | 'jazzy' |
                  'spread' | 'stride' | 'riff' | 'spiral' | 'latin' | 'open5' |
                  'shimmer' | 'heartbeat' | 'barrel' | 'echo' | 'staircase' |
                  'clockwork' | 'trill' | 'pluck' | 'sweep' | 'cross';

  const stylePool: ArpStyle[] = mode === 'battle'
    ? ['up', 'down', 'doubletime', 'cascading', 'riff', 'open5', 'staircase', 'sweep', 'barrel']
    : mode === 'ambient'
    ? ['broken', 'waltz', 'pinned', 'alberti', 'bounce', 'spread', 'shimmer', 'pluck', 'echo']
    : mode === 'jazzy'
    ? ['jazzy', 'broken', 'bounce', 'pinned', 'cascading', 'stride', 'heartbeat', 'trill', 'cross']
    : mode === 'funky'
    ? ['clave', 'doubletime', 'latin', 'bounce', 'riff', 'barrel', 'clockwork', 'sweep']
    : mode === 'silly'
    ? ['doubletime', 'bounce', 'up', 'down', 'spiral', 'cascading', 'open5', 'staircase', 'trill']
    : mode === 'weird'
    ? ['cascading', 'jazzy', 'pinned', 'broken', 'spiral', 'spread', 'shimmer', 'cross', 'echo']
    : ['updown', 'broken', 'alberti', 'bounce', 'up', 'cascading', 'pinned', 'waltz', 'stride', 'latin', 'pluck', 'heartbeat'];

  const style: ArpStyle = (styleOverride && styleOverride !== 'auto')
    ? styleOverride as ArpStyle
    : rng.pick(stylePool);

  let pattern: number[] = [];

  switch (style) {
    case 'up':         pattern = [root, third, fifth, high, root, third, fifth, high]; break;
    case 'down':       pattern = [high, fifth, third, root, high, fifth, third, root]; break;
    case 'updown':     pattern = [root, third, fifth, high, fifth, third, root, third]; break;
    case 'broken':     pattern = [root, fifth, third, high, root, fifth, third, fifth]; break;
    case 'alberti':    pattern = [root, fifth, third, fifth, root, fifth, third, fifth]; break;
    case 'bounce':     pattern = [root, high, fifth, high, root, high, third, high]; break;
    case 'waltz':      pattern = [root, third, fifth, root, third, fifth, root, third]; break;
    case 'cascading':  pattern = [high, fifth, third, root, high5, high, fifth, third]; break;
    case 'pinned':     pattern = [root, third, root, fifth, root, high, root, fifth]; break;
    case 'clave':      pattern = [root, fifth, root, third, fifth, root, third, fifth]; break;
    case 'doubletime': pattern = [root, third, fifth, high, root, third, fifth, high, fifth, third, root, third, fifth, high, fifth, root]; break;
    case 'jazzy':      pattern = [root, sev, third, fifth, ninth, fifth, third, sev]; break;
    case 'spread':     pattern = [low, fifth, root, high, fifth, root, high, fifth]; break;
    case 'stride':     pattern = [low, third, fifth, root, low, fifth, root, third]; break;
    case 'riff':       pattern = [root, third, root, fifth, root, fifth, third, root]; break;
    case 'spiral':     pattern = [root, fifth, third, high, sev, high, fifth, third]; break;
    case 'latin':      pattern = [root, root, fifth, third, root, fifth, third, fifth]; break;
    case 'open5':      pattern = [root, root + 7, high, root + 7, root, root + 7, high, root + 7]; break;
    // new styles
    case 'shimmer':    pattern = [root, ninth, fifth, high, ninth, fifth, high, ninth]; break;       // add9 shimmer, dreamy
    case 'heartbeat':  pattern = [root, root, fifth, root, root, root, fifth, root]; break;          // two short then rest feel
    case 'barrel':     pattern = [root, fifth, high, fifth, root, third, fifth, third]; break;       // rolling barrel organ
    case 'echo':       pattern = [root, fifth, high, high, root, fifth, root, root]; break;          // note + delayed repeat
    case 'staircase':  pattern = [root, third, fifth, sev, high, sev, fifth, third]; break;          // full 7th chord staircase up-down
    case 'clockwork':  pattern = [root, third, root, third, fifth, third, fifth, high]; break;       // mechanical alternating pairs
    case 'trill':      pattern = [root, second, root, second, third, second, third, fifth]; break;   // trilling up stepwise
    case 'pluck':      pattern = [root, high, root, fifth, root, third, root, fifth]; break;         // plucked string feel — root anchor
    case 'sweep':      pattern = [low, root, third, fifth, high, high5, high, fifth]; break;         // wide ascending sweep
    case 'cross':      pattern = [root, high, third, high5, fifth, high, root, high5]; break;        // crossing voices — root vs high
  }

  // For some styles, occasionally use first-inversion (start on third) or second-inversion (start on fifth)
  if (style !== 'doubletime' && style !== 'sweep' && style !== 'staircase' && rng.next() < 0.3) {
    const inv = rng.next() < 0.5 ? 1 : 2;
    if (inv === 1) pattern = pattern.map(n => n === root ? root + 12 : n);
    else           pattern = pattern.map(n => (n === root || n === third) ? n + 12 : n);
  }

  // Note length — double-time uses 16ths, waltz/ambient uses dotted-quarters, others use 8ths
  const noteLen = style === 'doubletime'
    ? beatDur * 0.25
    : style === 'trill'
    ? beatDur * 0.25
    : mode === 'ambient' || style === 'waltz' || style === 'shimmer' || style === 'pluck'
    ? beatDur * (2 / 3)
    : beatDur * 0.5;

  const velBase = mode === 'ambient' ? 38 : mode === 'battle' ? 68 : 55;

  // Velocity accent pattern — downbeats louder
  const accentPattern = [1.0, 0.7, 0.85, 0.7, 0.9, 0.7, 0.8, 0.7, 0.95, 0.7, 0.85, 0.7, 0.9, 0.7, 0.8, 0.7];

  for (let i = 0; i < pattern.length; i++) {
    const t = barStart + i * noteLen;
    if (t >= barStart + 4 * beatDur - 0.01) break;
    if (mode === 'ambient' && rng.next() < 0.22) continue;
    if (mode === 'weird'   && rng.next() < 0.18) continue;
    if (style === 'heartbeat' && (i === 2 || i === 6) && rng.next() < 0.4) continue; // heartbeat gaps
    const accent = accentPattern[i % accentPattern.length];
    const gateMult = style === 'waltz' ? 0.7 : style === 'jazzy' ? 0.65 : style === 'pluck' ? 0.55 : style === 'trill' ? 0.5 : 0.82;
    notes.push({
      time: t,
      duration: noteLen * gateMult,
      midi: Math.max(0, Math.min(127, pattern[i])),
      velocity: Math.round(velBase * accent) + rng.int(10),
    });
  }
  return notes;
}

// Pad channel — sustained harmonic notes
function genPadBar(
  rng: RNG, scale: number[], key: number, oct: number, chordDeg: number,
  beatDur: number, barStart: number, scaleType: ScaleType,
): NoteEvent[] {
  const root  = scaleMidi(key, oct, scale, chordDeg);
  const third = scaleMidi(key, oct, scale, chordDeg + 2);
  const fifth = scaleMidi(key, oct, scale, chordDeg + 4);

  const dur = 3.85 * beatDur;
  const velBase = 35 + rng.int(10);
  const notes: NoteEvent[] = [
    { time: barStart, duration: dur, midi: Math.max(0, Math.min(127, root)),  velocity: velBase },
    { time: barStart, duration: dur, midi: Math.max(0, Math.min(127, fifth)), velocity: velBase - 5 },
  ];
  // Add third only sometimes to keep it simple
  if (rng.next() < 0.65) {
    notes.push({ time: barStart, duration: dur, midi: Math.max(0, Math.min(127, third)), velocity: velBase - 8 });
  }
  // Occasional octave root for fullness
  if (scaleType !== 'wholeTone' && rng.next() < 0.4) {
    notes.push({ time: barStart, duration: dur, midi: Math.max(0, Math.min(127, root - 12)), velocity: velBase - 12 });
  }
  return notes;
}

// ── Bass generators ───────────────────────────────────────────

// Pedal point: sustain the tonic root while upper voices move freely above it.
// Beat 3 gets an optional fifth for a hint of movement without abandoning the pedal.
function genPedalBassBar(
  rng: RNG, scale: number[], key: number, oct: number,
  beatDur: number, barStart: number,
): NoteEvent[] {
  const root  = scaleMidi(key, oct, scale, 0);
  const fifth = root + 7;
  const vel   = 72 + rng.int(12);
  const notes: NoteEvent[] = [
    { time: barStart, duration: 3.85 * beatDur, midi: Math.max(0, Math.min(127, root)), velocity: vel },
  ];
  if (rng.next() < 0.30) {
    notes.push({ time: barStart + 2 * beatDur, duration: beatDur * 0.85, midi: Math.max(0, Math.min(127, fifth)), velocity: vel - 10 });
  }
  return notes;
}

function genWaltzBassBar(
  rng: RNG, scale: number[], key: number, oct: number, chordDeg: number,
  beatDur: number, barStart: number,
): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const root  = scaleMidi(key, oct, scale, chordDeg);
  const third = scaleMidi(key, oct, scale, chordDeg + 2);
  const fifth = root + 7;
  const pattern = [root, fifth, third, root, fifth, third, root, fifth];
  const oom = beatDur * 0.75;
  pattern.forEach((midi, i) => {
    if (barStart + i * oom >= barStart + 4 * beatDur - 0.01) return;
    const isDownbeat = i % 3 === 0;
    const vel = isDownbeat ? 75 + rng.int(10) : 52 + rng.int(12);
    const dur = isDownbeat ? oom * 0.92 : oom * 0.78;
    notes.push({ time: barStart + i * oom, duration: dur, midi: Math.max(0, Math.min(127, midi)), velocity: vel });
  });
  return notes;
}

function genWalkingBassBar(
  rng: RNG, scale: number[], key: number, oct: number, chordDeg: number, nextChordDeg: number,
  beatDur: number, barStart: number,
): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const root  = scaleMidi(key, oct, scale, chordDeg);
  const third = scaleMidi(key, oct, scale, chordDeg + 2);
  const fifth  = scaleMidi(key, oct, scale, chordDeg + 4);
  const nextRoot = scaleMidi(key, oct, scale, nextChordDeg);
  const approach = nextRoot - 1;
  const walk = [root, third, fifth, approach];
  walk.forEach((midi, i) => {
    notes.push({ time: barStart + i * beatDur, duration: beatDur * 0.88, midi: Math.max(0, Math.min(127, midi)), velocity: 78 + rng.int(14) });
  });
  return notes;
}

function genMarchBassBar(
  rng: RNG, scale: number[], key: number, oct: number, chordDeg: number,
  beatDur: number, barStart: number,
): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const root     = scaleMidi(key, oct, scale, chordDeg);
  const fifth    = root + 7;
  const approach = root - 1;
  const dq = beatDur * 0.75;
  const eq = beatDur * 0.25;
  const cells: { midi: number; dur: number }[] = [
    { midi: root, dur: dq }, { midi: approach, dur: eq },
    { midi: fifth, dur: dq }, { midi: approach, dur: eq },
    { midi: root, dur: dq }, { midi: approach, dur: eq },
    { midi: fifth, dur: dq }, { midi: approach, dur: eq },
  ];
  let t = barStart;
  for (const c of cells) {
    if (t >= barStart + 4 * beatDur - 0.01) break;
    const isStrong = c.midi === root || c.midi === fifth;
    const vel = isStrong ? 88 + rng.int(14) : 62 + rng.int(12);
    notes.push({ time: t, duration: c.dur * 0.88, midi: Math.max(0, Math.min(127, c.midi)), velocity: vel });
    t += c.dur;
  }
  return notes;
}

// Syncopated bass — anchor on downbeats (soft), accent on "& of beat" (offbeat bounce)
// Doc: "place bass on & of beat; ensure upper harmony implies tonic on downbeat"
function genSyncopatedBassBar(
  rng: RNG, scale: number[], key: number, oct: number, chordDeg: number,
  beatDur: number, barStart: number,
): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const root  = scaleMidi(key, oct, scale, chordDeg);
  const fifth = root + 7;
  const third = scaleMidi(key, oct, scale, chordDeg + 2);

  // Soft downbeat anchor (keeps tonic clarity) then accented offbeat
  const hits: { time: number; midi: number; vel: number; dur: number }[] = [
    { time: 0,      midi: root,  vel: 55 + rng.int(8),  dur: 0.35 * beatDur }, // beat 1 soft anchor
    { time: 0.5,    midi: root,  vel: 82 + rng.int(12), dur: 0.45 * beatDur }, // & of 1 accent
    { time: 1.5,    midi: fifth, vel: 68 + rng.int(10), dur: 0.40 * beatDur }, // & of 2
    { time: 2,      midi: root,  vel: 52 + rng.int(8),  dur: 0.35 * beatDur }, // beat 3 soft anchor
    { time: 2.5,    midi: fifth, vel: 80 + rng.int(12), dur: 0.45 * beatDur }, // & of 3 accent
    { time: 3.5,    midi: third, vel: 65 + rng.int(10), dur: 0.40 * beatDur }, // & of 4 color
  ];
  for (const h of hits) {
    notes.push({ time: barStart + h.time * beatDur, duration: h.dur, midi: Math.max(0, Math.min(127, h.midi)), velocity: h.vel });
  }
  return notes;
}

function genAlbertiBar(
  rng: RNG, scale: number[], key: number, oct: number, chordDeg: number,
  beatDur: number, barStart: number,
): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const root  = scaleMidi(key, oct, scale, chordDeg);
  const third = scaleMidi(key, oct, scale, chordDeg + 2);
  const fifth = scaleMidi(key, oct, scale, chordDeg + 4);
  const pattern = [root, fifth, third, fifth, root, fifth, third, fifth];
  const eighth = beatDur * 0.5;
  pattern.forEach((midi, i) => {
    const vel = i % 2 === 0 ? 72 + rng.int(12) : 55 + rng.int(10);
    notes.push({ time: barStart + i * eighth, duration: eighth * 0.85, midi: Math.max(0, Math.min(127, midi)), velocity: vel });
  });
  return notes;
}

function genBassBar(
  rng: RNG, scale: number[], key: number, oct: number, chordDeg: number,
  beatDur: number, barStart: number, mode: GenMode, scaleType: ScaleType,
  nextChordDeg = chordDeg,
): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const root  = scaleMidi(key, oct, scale, chordDeg);
  const fifth = root + 7;
  const third = scaleMidi(key, oct, scale, chordDeg + 2);
  const chromatic = root + (rng.next() > 0.5 ? 1 : -1);
  const nextRoot = scaleMidi(key, oct, scale, nextChordDeg);

  if (scaleType === 'lydian' || scaleType === 'wholeTone') {
    notes.push({ time: barStart, duration: 3.9 * beatDur, midi: root, velocity: 72 });
    return notes;
  }

  if (mode === 'battle') {
    const pattern = [root, root, fifth, root, root, fifth, chromatic, fifth];
    pattern.forEach((midi, i) => {
      notes.push({ time: barStart + i * beatDur * 0.5, duration: beatDur * 0.45, midi: Math.max(0, Math.min(127, midi)), velocity: 85 + rng.int(15) });
    });
  } else if (mode === 'mid' || mode === 'jazzy' || mode === 'funky') {
    const walk = rng.next() > (mode === 'jazzy' ? 0.2 : 0.4);
    if (walk) {
      [root, third, fifth, chromatic].forEach((midi, i) => {
        notes.push({ time: barStart + i * beatDur, duration: beatDur * 0.9, midi: Math.max(0, Math.min(127, midi)), velocity: 78 + rng.int(12) });
      });
    } else {
      [root, rng.next() > 0.6 ? fifth : root, root, fifth].forEach((midi, i) => {
        notes.push({ time: barStart + i * beatDur, duration: beatDur * 0.9, midi, velocity: 80 });
      });
    }
  } else if (mode === 'silly') {
    // Bouncy staccato bass with octave hops
    const pattern = [root, root + 12, fifth, root, root + 12, fifth, third, root];
    pattern.forEach((midi, i) => {
      notes.push({ time: barStart + i * beatDur * 0.5, duration: beatDur * 0.35, midi: Math.max(0, Math.min(127, midi)), velocity: 80 + rng.int(18) });
    });
  } else {
    // Ambient + weird: simple root + occasional fifth pickup
    notes.push({ time: barStart, duration: 3.5 * beatDur, midi: root, velocity: 65 });
    if (rng.next() > 0.55) notes.push({ time: barStart + 3.5 * beatDur, duration: 0.5 * beatDur, midi: fifth, velocity: 58 });
  }

  // Approach-tone pickup: on beat 3.5 or 4, add a stepwise neighbor toward the next bar's root.
  // Only when nextRoot differs from current root and no note already occupies that slot.
  if (nextRoot !== root && rng.next() < 0.40 && notes.length > 0) {
    const lastNote = notes[notes.length - 1];
    const lastNoteEnd = lastNote.time + lastNote.duration;
    const pickupTime = barStart + 3.5 * beatDur;
    if (lastNoteEnd <= pickupTime + 0.01) {
      // Pick the chromatic neighbor one step toward nextRoot
      const approach = nextRoot > root ? root + 1 : root - 1;
      notes.push({ time: pickupTime, duration: beatDur * 0.48, midi: Math.max(0, Math.min(127, approach)), velocity: 62 });
    }
  }

  return notes;
}

function genGlockenspielBar(
  rng: RNG, scale: number[], key: number, oct: number, chordDeg: number,
  beatDur: number, barStart: number, prevDeg: number,
): { notes: NoteEvent[]; lastDeg: number } {
  const notes: NoteEvent[] = [];
  const highOct = oct + 2;
  const numNotes = 1 + rng.int(3);
  let deg = prevDeg;
  let t = barStart;
  const spacing = (4 * beatDur) / (numNotes + 1);
  for (let i = 0; i < numNotes; i++) {
    if (rng.next() < 0.35) { t += spacing; continue; }
    const midi = scaleMidi(key, highOct, scale, deg);
    const dur = beatDur * (0.5 + rng.next() * 0.5);
    notes.push({ time: t + i * spacing, duration: dur * 0.75, midi: Math.max(0, Math.min(127, midi)), velocity: 42 + rng.int(22) });
    deg += rng.next() < 0.65 ? -1 : 1;
    deg = Math.max(-2, Math.min(8, deg));
  }
  return { notes, lastDeg: deg };
}

// ── Percussion ────────────────────────────────────────────────

function genPercBar(rng: RNG, beatDur: number, barStart: number, mode: GenMode, useCompound = false, bar = 0): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const KICK = 36, SNARE = 38, HIHAT = 42, HIHAT_OPEN = 46, CRASH = 49;
  const SHAKER = 70, SOFT_KICK = 35, TAMBOURINE = 54;

  if (mode === 'weird') {
    // Sparse, irregular percussion
    for (let b = 0; b < 4; b++) {
      if (rng.next() < 0.4) notes.push({ time: barStart + b * beatDur, duration: 0.08, midi: rng.next() < 0.5 ? KICK : SNARE, velocity: 55 + rng.int(30) });
      if (rng.next() < 0.5) notes.push({ time: barStart + (b + rng.next()) * beatDur, duration: 0.05, midi: HIHAT, velocity: 35 + rng.int(20) });
    }
    return notes;
  }

  if (mode === 'jazzy') {
    // Jazz-style: lighter kick pattern, brushed snare feel, syncopated hats
    [0, 2.5].forEach(b => notes.push({ time: barStart + b * beatDur, duration: 0.1, midi: KICK, velocity: 75 + rng.int(15) }));
    [1, 3].forEach(b => notes.push({ time: barStart + b * beatDur, duration: 0.1, midi: SNARE, velocity: 65 + rng.int(15) }));
    for (let b = 0; b < 4; b++) {
      if (rng.next() > 0.2) notes.push({ time: barStart + b * beatDur, duration: 0.05, midi: HIHAT, velocity: 42 + rng.int(22) });
      if (rng.next() > 0.55) notes.push({ time: barStart + (b + 0.33) * beatDur, duration: 0.05, midi: HIHAT, velocity: 35 + rng.int(18) });
      if (rng.next() > 0.65) notes.push({ time: barStart + (b + 0.67) * beatDur, duration: 0.05, midi: HIHAT, velocity: 30 + rng.int(15) });
    }
    return notes;
  }

  if (mode === 'funky') {
    // Heavy syncopated funk beat with 16ths
    [0, 1.5, 2, 3.5].forEach(b => notes.push({ time: barStart + b * beatDur, duration: 0.1, midi: KICK, velocity: 90 + rng.int(12) }));
    [1, 3].forEach(b => notes.push({ time: barStart + b * beatDur, duration: 0.1, midi: SNARE, velocity: 85 + rng.int(10) }));
    for (let h = 0; h < 16; h++) {
      const vel = h % 4 === 0 ? 72 : h % 2 === 0 ? 58 : 42;
      notes.push({ time: barStart + h * 0.25 * beatDur, duration: 0.05, midi: HIHAT, velocity: vel });
    }
    return notes;
  }

  if (mode === 'silly') {
    // Fast, silly drums: lots of hihats, bouncy kick, accented snare
    [0, 1, 2, 3].forEach(b => notes.push({ time: barStart + b * beatDur, duration: 0.08, midi: b % 2 === 0 ? KICK : SNARE, velocity: 88 + rng.int(15) }));
    for (let h = 0; h < 16; h++) {
      notes.push({ time: barStart + h * 0.25 * beatDur, duration: 0.04, midi: HIHAT, velocity: 55 + rng.int(25) });
    }
    if (rng.next() > 0.5) notes.push({ time: barStart, duration: 0.12, midi: CRASH, velocity: 85 + rng.int(15) });
    return notes;
  }

  if (mode === 'ambient') {
    // Soft ambient percussion: light shakers and hi-hats, very sparse
    for (let b = 0; b < 4; b++) {
      if (rng.next() < 0.55) {
        notes.push({ time: barStart + b * beatDur, duration: 0.05, midi: HIHAT, velocity: 28 + rng.int(14) });
      }
      if (rng.next() < 0.45) {
        notes.push({ time: barStart + (b + 0.5) * beatDur, duration: 0.05, midi: SHAKER, velocity: 22 + rng.int(12) });
      }
    }
    if (rng.next() < 0.35) {
      notes.push({ time: barStart, duration: 0.08, midi: SOFT_KICK, velocity: 45 + rng.int(18) });
    }
    if (rng.next() < 0.25) {
      notes.push({ time: barStart + 2 * beatDur, duration: 0.08, midi: TAMBOURINE, velocity: 40 + rng.int(15) });
    }
    return notes;
  }

  if (mode === 'mid') {
    // Kick 80-120, snare 90-120, hi-hat 50-80 (velocity doc ranges)
    [0, 2].forEach(b => notes.push({ time: barStart + b * beatDur, duration: 0.1, midi: KICK, velocity: 90 + rng.int(15) }));
    [1, 3].forEach(b => notes.push({ time: barStart + b * beatDur, duration: 0.1, midi: SNARE, velocity: 92 + rng.int(12) }));
    for (let b = 0; b < 4; b++) {
      if (rng.next() > 0.3) {
        notes.push({ time: barStart + b * beatDur, duration: 0.05, midi: HIHAT, velocity: 52 + rng.int(22) });
        if (rng.next() > 0.5) notes.push({ time: barStart + (b + 0.5) * beatDur, duration: 0.05, midi: HIHAT, velocity: 42 + rng.int(18) });
      }
    }
    return notes;
  }

  if (useCompound) {
    const tri = beatDur / 1.5;
    [0, 3].forEach(i => notes.push({ time: barStart + i * tri, duration: 0.1, midi: KICK, velocity: 100 }));
    [1.5, 4.5].forEach(i => notes.push({ time: barStart + i * tri, duration: 0.1, midi: SNARE, velocity: 90 }));
    for (let i = 0; i < 6; i++) {
      const vel = i % 3 === 0 ? 72 : 50 + rng.int(20);
      const midi = i === 5 && rng.next() > 0.6 ? HIHAT_OPEN : HIHAT;
      notes.push({ time: barStart + i * tri, duration: 0.05, midi, velocity: vel });
    }
    return notes;
  }
  [0, 2].forEach(b => notes.push({ time: barStart + b * beatDur, duration: 0.1, midi: KICK, velocity: 100 }));
  [1, 3].forEach(b => notes.push({ time: barStart + b * beatDur, duration: 0.1, midi: SNARE, velocity: 95 }));
  for (let h = 0; h < 8; h++) {
    const vel = h % 2 === 0 ? 70 : 50;
    const midi = h === 6 && rng.next() > 0.5 ? HIHAT_OPEN : HIHAT;
    notes.push({ time: barStart + h * 0.5 * beatDur, duration: 0.05, midi, velocity: vel });
  }
  if (rng.next() > 0.75) notes.push({ time: barStart, duration: 0.15, midi: CRASH, velocity: 80 + rng.int(15) });

  // Drum fill: on bar 3 of every 4-bar phrase, add a rapid 16th-note run in the last beat
  if (bar % 4 === 3) {
    const fillVelocities = [60, 90, 110, 127];
    const sixteenth = beatDur * 0.25;
    const fillStart = barStart + 3 * beatDur; // last beat of bar
    for (let i = 0; i < 4; i++) {
      const fillMidi = i % 2 === 0 ? HIHAT : SNARE;
      notes.push({ time: fillStart + i * sixteenth, duration: sixteenth * 0.8, midi: fillMidi, velocity: fillVelocities[i] });
    }
  }

  return notes;
}

// ── Arrangement ───────────────────────────────────────────────

interface PhraseActivity {
  pulse2: boolean; wave: boolean; noise: boolean;
  pulse3: boolean; pad: boolean;
}

type SectionType = 'intro' | 'build' | 'verse' | 'chorus' | 'break' | 'outro';

function getSectionType(progress: number, totalPhrases: number): SectionType {
  if (totalPhrases <= 2) return 'chorus';
  if (progress < 0.12)  return 'intro';
  if (progress < 0.28)  return 'build';
  if (progress < 0.50)  return 'verse';
  if (progress < 0.72)  return 'chorus';
  if (progress < 0.84)  return 'break';
  return 'outro';
}

const SECTION_ACTIVITY: Record<SectionType, { pulse2: boolean; wave: boolean; noise: boolean; pulse3: boolean; pad: boolean }> = {
  intro:  { pulse2: false, wave: true,  noise: false, pulse3: false, pad: true  },
  build:  { pulse2: true,  wave: true,  noise: true,  pulse3: false, pad: true  },
  verse:  { pulse2: true,  wave: true,  noise: true,  pulse3: true,  pad: true  },
  chorus: { pulse2: true,  wave: true,  noise: true,  pulse3: true,  pad: true  },
  break:  { pulse2: false, wave: true,  noise: false, pulse3: false, pad: true  },
  outro:  { pulse2: false, wave: true,  noise: false, pulse3: false, pad: true  },
};

const BATTLE_ACTIVITY: Record<SectionType, { pulse2: boolean; wave: boolean; noise: boolean; pulse3: boolean; pad: boolean }> = {
  intro:  { pulse2: true, wave: true, noise: true, pulse3: true,  pad: false },
  build:  { pulse2: true, wave: true, noise: true, pulse3: true,  pad: false },
  verse:  { pulse2: true, wave: true, noise: true, pulse3: true,  pad: false },
  chorus: { pulse2: true, wave: true, noise: true, pulse3: true,  pad: false },
  break:  { pulse2: true, wave: true, noise: false, pulse3: false, pad: false },
  outro:  { pulse2: true, wave: true, noise: false, pulse3: false, pad: false },
};

function buildArrangement(
  totalBars: number, mode: GenMode, sparseness: number,
  generateNoise: boolean, rng: RNG,
  channelSparseness?: GenConfig['channelSparseness'],
): PhraseActivity[] {
  const totalPhrases = Math.ceil(totalBars / 4);
  const out: PhraseActivity[] = [];

  const sp2  = Math.max(0, Math.min(1, channelSparseness?.pulse2 ?? 0));
  const sw   = Math.max(0, Math.min(1, channelSparseness?.wave   ?? 0));
  const sn   = Math.max(0, Math.min(1, channelSparseness?.noise  ?? 0));
  const sp3  = Math.max(0, Math.min(1, channelSparseness?.pulse3 ?? 0));
  const spad = Math.max(0, Math.min(1, channelSparseness?.pad    ?? 0));

  const map = (mode === 'battle' || mode === 'funky' || mode === 'silly') ? BATTLE_ACTIVITY : SECTION_ACTIVITY;

  for (let p = 0; p < totalPhrases; p++) {
    const progress = p / Math.max(1, totalPhrases - 1);
    const section  = getSectionType(progress, totalPhrases);
    const base     = map[section];

    out.push({
      pulse2: sp2  < 1 && rng.next() > sp2 * 0.65  && (base.pulse2  || rng.next() > 0.65),
      wave:   sw   < 1 && (base.wave   || rng.next() > 0.55),
      noise:  generateNoise && sn < 1,
      pulse3: sp3  < 1 && rng.next() > sp3 * 0.65  && (base.pulse3  || rng.next() > 0.65),
      pad:    spad < 1 && (base.pad    || rng.next() > 0.60),
    });
  }
  return out;
}

// ── Music theory helpers ──────────────────────────────────────

// Returns the "leading tone" — a chromatic note a half-step below the target
// Used to create tension that resolves upward (V7 → I feeling)
function leadingTone(targetMidi: number): number {
  return targetMidi - 1;
}

// Secondary dominant: the V chord of the next chord
// e.g. if next chord is degree 3, secondary dominant is degree (3+4) % scale
// In MIDI terms: a note a perfect 5th below the next root, or major 3rd above
function secondaryDominantNote(nextChordMidi: number): number {
  return nextChordMidi + 7; // dominant is a 5th above the next root
}

// Decide if a bar is a "cadence bar" (last bar of a phrase — bar 3 of every 4)
function isCadenceBar(bar: number): boolean {
  return bar % 4 === 3;
}

// Decide if a bar is a "resolution bar" (first bar of next phrase — bar 0 of every 4)
function isResolutionBar(bar: number): boolean {
  return bar % 4 === 0 && bar > 0;
}

// ── Main export ───────────────────────────────────────────────

// Enforce monophony: truncate any note that overlaps the next note's start on the same channel
function enforceMonophony(notes: NoteEvent[]): NoteEvent[] {
  const s = [...notes].sort((a, b) => a.time - b.time);
  for (let i = 0; i < s.length - 1; i++) {
    const gap = s[i + 1].time - s[i].time;
    if (gap < s[i].duration) s[i] = { ...s[i], duration: Math.max(0.02, gap - 0.005) };
  }
  return s;
}

// Snap note times to the nearest 16th-note grid (tight rhythmic modes only)
function quantize16th(notes: NoteEvent[], beatDur: number): NoteEvent[] {
  const s16 = beatDur * 0.25;
  return notes.map(n => ({ ...n, time: Math.round(n.time / s16) * s16 }));
}

export function generate(config: GenConfig): GenResult {
  // High-entropy seed: time + random + key + mode hash
  // If a seed is passed (e.g. from regenChannel), reuse it so structure matches the original song
  const modeHash = config.mode === 'ambient' ? 1 : config.mode === 'mid' ? 2 : config.mode === 'battle' ? 3 : config.mode === 'jazzy' ? 4 : config.mode === 'funky' ? 5 : config.mode === 'silly' ? 6 : 7;
  const seed = config.seed ?? ((Date.now() ^ (config.key * 1337) ^ (Math.random() * 0xFFFF | 0) ^ (modeHash * 999)) >>> 0);
  const rng = new RNG(seed);

  const DEFAULT_BPM_MAP: Record<GenMode, number> = { ambient: 65, mid: 130, battle: 148, jazzy: 105, funky: 120, silly: 170, weird: 100 };
  const baseBpm = config.bpm ?? DEFAULT_BPM_MAP[config.mode];
  const bpmJitter = (rng.next() - 0.5) * baseBpm * 0.10; // ±10% jitter
  const bpm = Math.round(baseBpm + bpmJitter);
  const beatDur = 60 / bpm;
  const barDur  = 4 * beatDur;

  // weird alternates between wholeTone, harmonicMinor, and pentatonicMajor for variety
  const WEIRD_SCALES: ScaleType[] = ['pentatonicMajor', 'wholeTone', 'harmonicMinor'];
  const DEFAULT_SCALE: Record<GenMode, ScaleType> = { ambient: 'lydian', mid: 'major', battle: rng.next() < 0.35 ? 'harmonicMinor' : 'minor', jazzy: 'dorian', funky: 'mixolydian', silly: 'major', weird: rng.pick(WEIRD_SCALES) };
  const scaleType: ScaleType = config.scaleType ?? DEFAULT_SCALE[config.mode];
  const scale = SCALES[scaleType];

  // A/B progressions: alternate between two different progressions every 4 bars
  const allProgs = PROGRESSIONS[scaleType];
  const progA = rng.pick(allProgs);
  const progBCandidates = allProgs.filter(p => p !== progA);
  const progB = progBCandidates.length > 0 ? rng.pick(progBCandidates) : progA;

  // ── Improvement #9: Signature rhythm cell ─────────────────────
  const SIG_RHYTHMS: { beats: number; w: number }[][] = [
    [{ beats: 0.5, w: 70 }, { beats: 1.0, w: 20 }, { beats: 0.5, w: 10 }],  // [0.5,0.5,1.0]
    [{ beats: 0.75, w: 60 }, { beats: 0.25, w: 25 }, { beats: 1.0, w: 15 }], // [0.75,0.25,1.0]
    [{ beats: 1.0, w: 55 }, { beats: 0.5, w: 30 }, { beats: 0.5, w: 15 }],   // [1.0,0.5,0.5]
    [{ beats: 0.5, w: 65 }, { beats: 1.5, w: 35 }],                           // [0.5,1.5]
    [{ beats: 0.25, w: 40 }, { beats: 0.25, w: 25 }, { beats: 0.5, w: 20 }, { beats: 1.0, w: 15 }], // [0.25,0.25,0.5,1.0]
  ];
  const sigRhythm = rng.pick(SIG_RHYTHMS);

  const rhythms = rng.pick(RHYTHM_PROFILES[config.mode]);
  const leadRhythms = sigRhythm; // #9: use signature rhythm cell for all melody bars
  // Fast fill profile for chorus/build — creates the "speeds up" feel the user likes
  const fastFillRhythms: { beats: number; w: number }[] = [
    { beats: 0.25, w: 40 }, { beats: 0.5, w: 45 }, { beats: 0.75, w: 10 }, { beats: 1.0, w: 5 },
  ];
  // Slow flow profile for intro/break/outro — "slows down" feel
  const slowFlowRhythms: { beats: number; w: number }[] = [
    { beats: 1.0, w: 55 }, { beats: 1.5, w: 25 }, { beats: 2.0, w: 12 }, { beats: 0.5, w: 8 },
  ];
  const leadRestProb = LEAD_REST_PROB[config.mode];

  // Metric modulation: 45% chance this song doubles the motif subdivision in chorus/verse
  // (plays the same motif pattern at 2× speed, creating a double-time illusion)
  const metricModActive = config.mode !== 'ambient' && rng.next() < 0.45;

  // ── Improvement #2: Brightness bias + BPM coupling ────────────
  let brightness: number;
  if (bpm > 130) {
    brightness = 0.7 + rng.next() * 0.3;
  } else if (bpm < 80) {
    brightness = rng.next() * 0.4;
  } else {
    brightness = 0.3 + rng.next() * 0.5;
  }
  // When bright, force bright scales
  let effectiveScaleType = scaleType;
  if (brightness > 0.6 && !config.scaleType) {
    effectiveScaleType = rng.pick(['major', 'lydian', 'pentatonicMajor'] as ScaleType[]);
  }
  const effectiveScale = brightness > 0.6 && !config.scaleType ? SCALES[effectiveScaleType] : scale;
  // Brightness octave boost
  const brightOctBoost = brightness > 0.6 ? 1 : 0;
  // Brightness contour bias (will be applied to contourPool below)

  const sparseness = Math.max(0, Math.min(1, config.sparseness ?? 0));
  const generateNoise = config.generateNoise !== false;
  const sp1  = Math.max(0, Math.min(1, config.channelSparseness?.pulse1 ?? 0));
  const sp3  = Math.max(0, Math.min(1, config.channelSparseness?.pulse3 ?? 0));
  const spad = Math.max(0, Math.min(1, config.channelSparseness?.pad    ?? 0));

  const arrRng = new RNG(Math.floor(rng.next() * 0xFFFFFFFF));
  const arrangement = buildArrangement(config.bars, config.mode, sparseness, generateNoise, arrRng, config.channelSparseness);

  const pulse1: NoteEvent[] = [], pulse2: NoteEvent[] = [], wave: NoteEvent[] = [], noise: NoteEvent[] = [];
  const pulse3: NoteEvent[] = [], pad: NoteEvent[] = [];
  const extra1: NoteEvent[] = [], extra2: NoteEvent[] = [], extra3: NoteEvent[] = [];

  const melodyOctAdj = (config.mode === 'ambient'
    ? (scaleType === 'wholeTone' || scaleType === 'lydian') ? 1
      : scaleType === 'minor' ? -1 : 0
    : 0) + brightOctBoost;
  const isLowRegister = melodyOctAdj < 0;
  const melodyOct = config.octave + melodyOctAdj;
  const accompOct = config.octave - 1;
  const bassOct   = config.octave - 3;
  const arpOct    = config.octave;
  const padOct    = config.octave - 2;

  // Variable pitch range per song: 8–11 semitones (tighter cap prevents jarring leaps)
  const pitchSpan = 8 + rng.int(4);
  const lo = (melodyOct + 1) * 12 + config.key;
  const hi = lo + pitchSpan;

  // Random starting pitch: root, 3rd, or 5th (or motif seed first degree)
  // More diverse starting degrees: root, 3rd, 5th, 2nd, 6th for song-to-song variety
  const startDeg = rng.weighted([{ value: 0, w: 5 }, { value: 2, w: 2 }, { value: 4, w: 2 }, { value: 1, w: 1 }, { value: 6, w: 1 }]);
  // When an archetype motif is active, randomly shift all its degrees within the scale each
  // generation — preserves the interval shape but changes which note it starts on.
  const motifOffset = (config.motifSeed && config.motifSeed.length > 0)
    ? rng.weighted([{ value: 0, w: 3 }, { value: 2, w: 2 }, { value: 4, w: 2 }, { value: -2, w: 1 }, { value: 1, w: 1 }, { value: -1, w: 1 }])
    : 0;
  let prevMidi = (config.motifSeed && config.motifSeed.length > 0)
    ? scaleMidi(config.key, melodyOct, scale, config.motifSeed[0] + motifOffset)
    : scaleMidi(config.key, melodyOct, scale, startDeg);
  let glockDeg = 4;

  // Pre-compute next-chord root for each bar (cadence/leading-tone guidance)
  const nextChordRoots: number[] = Array.from({ length: config.bars }, (_, bar) => {
    const nextBar = bar + 1;
    const pi = Math.floor(nextBar / 4);
    const ap = pi % 2 === 0 ? progA : progB;
    return scaleMidi(config.key, melodyOct, scale, ap[nextBar % ap.length]);
  });

  type Dir = 'up' | 'down' | 'free';
  // Emotional contour bias (doc: sad → descending, happy/tense → ascending)
  // #2: brightness > 0.6 heavily biases toward 'up'
  const contourPool: Dir[] = brightness > 0.6
    ? ['up', 'up', 'up', 'free', 'down']         // bright: strongly ascending
    : brightness < 0.3
    ? ['free', 'free', 'down', 'down', 'up']     // dark: bias descending
    : (scaleType === 'minor' || scaleType === 'harmonicMinor' || config.mode === 'ambient')
      ? ['free', 'free', 'down', 'down', 'up']   // sad/ambient: bias descending
    : (config.mode === 'battle' || scaleType === 'major' || scaleType === 'lydian')
      ? ['free', 'free', 'up', 'up', 'down']     // bright/battle: bias ascending
    : ['free', 'free', 'free', 'down', 'up'];    // neutral
  const dirPattern: Dir[] = Array.from({ length: 4 }, () => rng.pick(contourPool));

  const restBias = (rng.next() - 0.5) * 0.15;

  // Quality-gate motif generation: regenerate up to 3 times if score too low
  let motif = genMotif(rng, config.mode, scaleType);
  for (let t = 0; t < 3 && scoreMotif(motif) < 0.5; t++) motif = genMotif(rng, config.mode, scaleType);
  let bMotif = genMotif(rng, config.mode, scaleType);
  for (let t = 0; t < 3 && scoreMotif(bMotif) < 0.5; t++) bMotif = genMotif(rng, config.mode, scaleType);

  // statement → sequence (up a 3rd) → answer (up a 4th from root) → inversion
  const motifVariants: MotifVariant[] = ['statement', 'sequence', 'answer', 'inversion'];

  // Motif aging: mutation accumulates +5% per 8 bars; retire + replace after 48 bars
  let motifAgeA = 0, motifAgeB = 0;

  const barSections: SectionType[] = [];
  for (let bar = 0; bar < config.bars; bar++) {
    barSections.push(getSectionType(bar / Math.max(1, config.bars - 1), Math.ceil(config.bars / 4)));
  }

  const chorusBars = new Set<number>(barSections.reduce<number[]>((acc, s, i) => { if (s === 'chorus') acc.push(i); return acc; }, []));
  let firstChorusBar = -1;
  for (let bar = 1; bar < config.bars; bar++) {
    if (chorusBars.has(bar) && !chorusBars.has(bar - 1)) { firstChorusBar = bar - 1; break; }
  }

  const modulationType = rng.next();
  const modulationSemitones =
    (scaleType === 'minor' || scaleType === 'dorian') && modulationType < 0.35 ? 3
    : modulationType < 0.55 ? 2
    : modulationType < 0.75 ? 5
    : 7;

  const PITCH_ARC: Record<SectionType, number> = {
    intro: -2, build: 0, verse: 0, chorus: 2, break: -1, outro: -3,
  };

  // Pulse2 mode: pick randomly per song for variety
  // Expand pool so pulse2 gets more variety — was just 6 options with heavy repetition
  const pulse2Mode = rng.pick(['arp', 'arp', 'arp', 'arp', 'stab', 'stab', 'stab', 'sparse']);
  const arpOverride = config.arpStyle && config.arpStyle !== 'auto' ? config.arpStyle : undefined;
  // Texture rule: when pulse2 is dense arp, add to lead rest bias so they don't fight
  // (doc: "keep lead sparse when dense accompaniment is present")
  const accompTextureBias = (pulse2Mode === 'arp' || arpOverride) ? 0.08 : 0;

  let antecedentStartPitch = prevMidi;  // saved at start of each 8-bar period
  let melPrevDelta = 0;                 // interval from last melody note (for leap recovery)
  let prevAccompRoot = -1;              // for voice leading in accompaniment
  let motifRepeatCount = 0;             // velocity layering: +6 per 4th motif repeat
  let lastOrnamentBar = -4;             // limit ornaments to 1 per 4 bars
  let prevBassRootMidi = -1;            // for bass leap protection
  // Harmonic rhythm: sometimes hold a chord for an extra bar
  let holdChord: number | null = null;
  let holdBarsLeft = 0;

  // ── Improvement #1: Phrase caching + replay ───────────────────
  let phraseACache: NoteEvent[] | null = null;
  let phraseBCache: NoteEvent[] | null = null;
  let phraseACacheChordDeg = 0;
  let phraseBCacheChordDeg = 0;
  let phraseACacheReplayCount = 0;
  let phraseBCacheReplayCount = 0;

  // ── Improvement #10: High point architecture ──────────────────
  let versePeakMidi = lo;
  let chorusPeakTarget = lo + 2;

  // ── Improvement #4: Global dynamics curve state ───────────────
  // (computed per-bar below)

  // ── New #8: Articulation by tempo + mode ──────────────────────
  // Gate ratio: fast/punchy modes use shorter notes; slow/lush modes hold longer
  const tempoGate =
    bpm > 140 ? 0.58
    : bpm > 110 ? 0.70
    : bpm < 72  ? 0.92
    : bpm < 90  ? 0.86
    : 0.78;
  const modeGateBonus: Record<GenMode, number> = {
    battle: -0.12, funky: -0.10, silly: -0.08, mid: 0,
    jazzy: 0.06, ambient: 0.12, weird: 0.02,
  };
  const globalGate = Math.max(0.42, Math.min(0.96, tempoGate + modeGateBonus[config.mode]));

  // ── New #3: Countermelody setup ────────────────────────────────
  // Collect lead notes per bar so chorus countermelody can mirror them
  const leadNotesByBar: Map<number, NoteEvent[]> = new Map();

  // ── New #5: Transition fill detection ─────────────────────────
  // A transition bar is the last bar before a new section
  const transitionBars = new Set<number>();
  for (let b = 1; b < config.bars; b++) {
    if (barSections[b] !== barSections[b - 1]) transitionBars.add(b - 1);
  }

  // ── New #6: Register arc per section ──────────────────────────
  // lo/hi pitch bounds shift by section to create emotional register arc
  const sectionRegisterShift: Record<SectionType, number> = {
    intro: -3, build: -1, verse: 0, chorus: 3, break: -4, outro: -5,
  };

  // ── New #7: Modal interchange — borrowed chord pool ────────────
  // For major/lydian: borrow minor iv (chordDeg 3 played as minor = lower 3rd by 1 semitone in midi)
  // For minor/dorian: Picardy third on final chord
  const canBorrowChord = (scaleType === 'major' || scaleType === 'lydian' || scaleType === 'mixolydian');
  const borrowProbability = 0.22; // ~1 in 4-5 tension bars gets a borrowed chord color

  for (let bar = 0; bar < config.bars; bar++) {
    const barStart = bar * barDur;
    // A/B alternating progression: even 4-bar phrases use progA, odd use progB
    const phraseIndex = Math.floor(bar / 4);
    const activeProg = phraseIndex % 2 === 0 ? progA : progB;

    // Antecedent-consequent: 8-bar periods where second 4 bars answers the first
    const period8pos = bar % 8;
    if (period8pos === 0 && bar > 0) antecedentStartPitch = prevMidi;
    if (period8pos === 4 && config.bars >= 8 && rng.next() < 0.35) {
      prevMidi = antecedentStartPitch;
    }

    const phraseRole: 'antecedent' | 'consequent' | 'free' =
      config.bars >= 8 ? (phraseIndex % 2 === 0 ? 'antecedent' : 'consequent') : 'free';

    let rawChordDeg = activeProg[bar % activeProg.length];
    // Harmonic rhythm: hold some chords for an extra bar for breathing room
    const phrasePos = bar % 4;
    // #6: increased root hold probability from 0.42 to 0.55
    if (holdBarsLeft > 0 && holdChord !== null) {
      rawChordDeg = holdChord;
      holdBarsLeft--;
    } else if (rawChordDeg === 0 && phrasePos < 2 && rng.next() < 0.55) {
      holdChord = rawChordDeg; holdBarsLeft = 1;
    } else if (rawChordDeg !== 0 && rng.next() < 0.20) {
      holdChord = rawChordDeg; holdBarsLeft = 1;
    } else {
      holdChord = null; holdBarsLeft = 0;
    }
    const isHoldBar = holdBarsLeft > 0 || (holdChord !== null && holdBarsLeft === 0);
    const chordDeg = rawChordDeg;

    // Reset leap recovery at phrase boundaries
    if (phrasePos === 0) melPrevDelta = 0;
    const act = arrangement[Math.floor(bar / 4)];
    const section = barSections[bar];

    // ── Improvement #4: Global dynamics curve ─────────────────────
    const songProgress = bar / Math.max(1, config.bars - 1);
    const dynamicsMultiplier =
      songProgress < 0.10 ? 0.75
      : songProgress < 0.30 ? 0.85
      : songProgress < 0.50 ? 0.95
      : songProgress < 0.70 ? 1.10
      : songProgress < 0.80 ? 0.80
      : songProgress < 0.90 ? 1.15
      : 0.70;
    // Drop section: silence pulse2 and pad for 2 bars to create contrast
    const isDropBar = songProgress >= 0.70 && songProgress < 0.80;

    // ── Improvement #12: Bass style locked per section ─────────────
    const sectionBassStyle: string =
      section === 'intro' ? 'pedal'
      : section === 'chorus' ? 'walking'
      : (section === 'break' || section === 'outro') ? 'synco'
      : 'root'; // verse/build = root

    const velArc: Record<SectionType, number> = {
      intro: -15, build: -8, verse: 0, chorus: 10, break: -6, outro: -20,
    };
    // Mode-based velocity baseline (from velocity rules doc):
    // sad/soft modes use lower range; happy/upbeat use higher; chiptune compressed
    const modeVelBase: Record<GenMode, number> = {
      ambient: -8, mid: 0, battle: 10, jazzy: 2, funky: 6, silly: 8, weird: 0,
    };
    // Phrase micro-crescendo: +2 per bar within the 4-bar phrase (bars 0→3 = +0,+2,+4,+6)
    const phraseCrescendo = phrasePos * 2;
    const velOffset = velArc[section] + modeVelBase[config.mode] + phraseCrescendo;

    const isChorus = section === 'chorus';
    const activeKey = isChorus ? (config.key + modulationSemitones) % 12 : config.key;
    const activeOct = isChorus ? melodyOct + (config.key + modulationSemitones >= 12 ? 1 : 0) : melodyOct;

    const pitchArcBias = PITCH_ARC[section];
    const arcDir: 'up' | 'down' | 'free' =
      pitchArcBias > 3 ? 'up' : pitchArcBias < -3 ? 'down' : dirPattern[phrasePos];

    // ── New #8: Articulation — globalGate replaces hardcoded scale ─
    const articulationScale = globalGate;

    // ── New #6: Register arc — shift lo/hi by section ─────────────
    const regShift = sectionRegisterShift[section];
    const barLo = lo + regShift;
    const barHi = hi + regShift;

    // ── New #7: Modal interchange — borrowed chord on tension bar ──
    // On phrasePos===2, occasionally lower the 3rd of a major-key chord
    // to create a minor iv "shadow" — one borrowed chord per section
    let chordDegForBar = chordDeg;
    let borrowedChordOffset = 0; // semitone offset applied to chord 3rd only
    if (canBorrowChord && phrasePos === 2 && rng.next() < borrowProbability) {
      // Borrowed minor iv: lower the 3rd of the current chord by 1 semitone in note generation
      // We flag this and apply it in the melody note snapping below
      borrowedChordOffset = -1;
    }
    // Picardy third: in minor songs, bar 3 of the last phrase gets a major lift
    const isPicardy = (scaleType === 'minor' || scaleType === 'harmonicMinor' || scaleType === 'dorian')
      && phrasePos === 3 && bar >= config.bars - 4 && rng.next() < 0.35;

    // ── New #5: Transition fill — denser on the bar before a new section
    const isTransitionBar = transitionBars.has(bar);

    const isSilenceBar = bar === firstChorusBar;

    const isContrastPhrase = config.bars >= 8 && phraseIndex % 2 === 1;
    const isContrastBar = isContrastPhrase && phrasePos >= 2;
    // Dual-motif interplay: A leads on stable bars (0,2), B answers on tension bars (1,3)
    // Swap A/B roles every 8 bars so neither gets stale
    const swapAB = Math.floor(bar / 8) % 2 === 1;
    const primaryM = swapAB ? bMotif : motif;
    const secondaryM = swapAB ? motif : bMotif;
    const activeMotif = (phrasePos % 2 === 0) ? primaryM : secondaryM;

    // Motif aging: +5% mutation per 8 bars; after 48 bars retire and rebuild
    motifAgeA++; motifAgeB++;
    if (motifAgeA >= 48) { motif = genMotif(rng, config.mode, scaleType); motifAgeA = 0; }
    if (motifAgeB >= 48) { bMotif = genMotif(rng, config.mode, scaleType); motifAgeB = 0; }
    // Slower mutation: starts later, stays subtle — melody feels stable with slight drift
    const mutProbA = Math.min(0.18, Math.floor(motifAgeA / 14) * 0.03);
    const mutProbB = Math.min(0.18, Math.floor(motifAgeB / 14) * 0.03);
    if (mutProbA > 0 && rng.next() < 0.18) motif = mutateMotif(motif, rng, mutProbA);
    if (mutProbB > 0 && rng.next() < 0.18) bMotif = mutateMotif(bMotif, rng, mutProbB);

    // Phrase tension curve: bars 0-1 stable (motif heavy), bar 2 tension (free), bar 3 release
    const phraseMotifProb = phrasePos === 0 ? 0.90 : phrasePos === 1 ? 0.68 : phrasePos === 2 ? 0.45 : 0.75;
    const useMotif = !isSilenceBar && rng.next() < (isContrastBar ? phraseMotifProb * 0.55 : phraseMotifProb);
    // Phrase-local structure: bars 0-1 repeat the motif statement (musical recognition),
    // bar 2 sequences it up (tension), bar 3 answers with resolution
    const phraseLocalVariant: MotifVariant =
      phrasePos <= 1 ? 'statement' : phrasePos === 2 ? 'sequence' : 'answer';
    // Period-level variety: inversion on bar 3 of odd 8-bar periods; retrograde on bar 3 of
    // every 3rd 8-bar period (16-bar) — adds long-range interest without disrupting familiarity
    const period8 = Math.floor(bar / 8);
    const variant: MotifVariant =
      phrasePos === 3 && period8 % 3 === 2 ? 'retrograde'
      : phrasePos === 3 && period8 % 2 === 1 ? 'inversion'
      : phraseLocalVariant;

    // Metric modulation: double motif speed in chorus/verse when active; slow down in outro
    const isDoubleTime = (config.mode === 'battle' || metricModActive) && (section === 'chorus' || section === 'verse');
    const augmentFactor = section === 'outro' ? 2 : isDoubleTime ? 0.5 : 1;

    const motifNotes = useMotif
      ? renderMotifVariant(activeMotif, variant, rng, scale, activeKey, activeOct, chordDeg, beatDur * augmentFactor, barStart)
      : [];
    // Velocity layering: each 4th motif repeat adds +6 velocity (builds intensity)
    if (motifNotes.length > 0) {
      motifRepeatCount++;
      const velBoost = Math.min(18, Math.floor(motifRepeatCount / 4) * 6);
      for (let mi = 0; mi < motifNotes.length; mi++) {
        motifNotes[mi] = { ...motifNotes[mi], velocity: Math.min(127, motifNotes[mi].velocity + velBoost) };
      }
    }
    const motifDur = useMotif ? activeMotif.totalBeats * beatDur * augmentFactor : 0;

    if (motifNotes.length > 0) prevMidi = motifNotes[motifNotes.length - 1].midi;

    const breathGap   = 0;
    const freeStart   = barStart + motifDur + breathGap;
    const freeDuration = Math.max(0, 4 * beatDur - motifDur - breathGap);

    // Section-based rhythm: chorus/build = fast runs, intro/outro/break = slow flow, transition = fill
    // New #5: transition bars get the fast fill profile always (dense run into new section)
    const barRhythms = isTransitionBar
      ? fastFillRhythms
      : (section === 'chorus' || section === 'build') && rng.next() < 0.45
      ? fastFillRhythms
      : (section === 'intro' || section === 'outro' || section === 'break') && rng.next() < 0.55
      ? slowFlowRhythms
      : leadRhythms;
    // New #5: transition bars get lower rest probability (more notes = denser fill)
    const fillRestBias = isTransitionBar ? -0.20 : 0;
    const melRaw = !isSilenceBar && freeDuration > beatDur * 1.0
      ? genMelodyBar(rng, scale, activeKey, activeOct, chordDegForBar, beatDur, freeStart, arcDir, prevMidi, config.mode, scaleType, barRhythms, barLo, barHi, freeDuration, leadRestProb - BASE_REST_PROB[config.mode] + restBias + accompTextureBias + fillRestBias, phrasePos, phraseRole, melPrevDelta)
      : { notes: [], lastMidi: prevMidi, lastDelta: 0 };
    // Ornament insertion: mode-aware probability, phrase-start bars only, max 1 per 4 bars
    const canOrnament = phrasePos === 0 && bar - lastOrnamentBar >= 4;
    if (canOrnament) lastOrnamentBar = bar;
    let melNotesFinal = canOrnament ? insertOrnaments(melRaw.notes, rng, activeKey, scale, config.mode) : melRaw.notes;
    // Suspension insertion: long notes on strong beats in ambient/jazzy/mid; sparse in battle
    const susProb = config.mode === 'ambient' ? 0.22 : config.mode === 'jazzy' ? 0.18 : config.mode === 'battle' ? 0.06 : 0.14;
    melNotesFinal = insertSuspensions(melNotesFinal, beatDur, activeKey, scale, chordDeg, activeOct, rng, susProb);
    // Swing: jazzy mode gets 3:2 shuffle on even 8th positions (shuffle lilt)
    if (config.mode === 'jazzy' && rng.next() < 0.70) melNotesFinal = applySwing(melNotesFinal, barStart, beatDur, 0.14);

    // ── Improvement #3: Guaranteed cadences ───────────────────────
    // Bar 2 of phrase (phrasePos===1): last note must be scale degree 1 or 4 (unresolved)
    // Bar 4 of phrase (phrasePos===3): last note must be scale degree 0 (root, resolved)
    if (melNotesFinal.length > 0 && phrasePos === 1) {
      const last = melNotesFinal[melNotesFinal.length - 1];
      const deg1 = scaleMidi(activeKey, activeOct, scale, chordDeg + 1);
      const deg4 = scaleMidi(activeKey, activeOct, scale, chordDeg + 3);
      // pick whichever is closest
      const target = Math.abs(deg1 - last.midi) < Math.abs(deg4 - last.midi) ? deg1 : deg4;
      melNotesFinal[melNotesFinal.length - 1] = { ...last, midi: Math.max(0, Math.min(127, target)) };
    }
    if (melNotesFinal.length > 0 && phrasePos === 3) {
      const last = melNotesFinal[melNotesFinal.length - 1];
      const root = scaleMidi(activeKey, activeOct, scale, chordDeg);
      melNotesFinal[melNotesFinal.length - 1] = { ...last, midi: Math.max(0, Math.min(127, root)) };
    }

    // ── Improvement #11: Color note preparation + resolution ──────
    // A non-chord-tone is musical only if it resolves stepwise DOWN to a chord tone.
    // If it doesn't resolve, snap it to the nearest chord tone instead.
    if (melNotesFinal.length > 1) {
      const chordRoot11  = scaleMidi(activeKey, activeOct, scale, chordDeg);
      const chordThird11 = scaleMidi(activeKey, activeOct, scale, chordDeg + 2);
      const chordFifth11 = scaleMidi(activeKey, activeOct, scale, chordDeg + 4);
      const isChordTone = (m: number) => [chordRoot11, chordThird11, chordFifth11,
        chordRoot11+12, chordRoot11-12, chordThird11+12, chordFifth11+12].includes(m);
      melNotesFinal = melNotesFinal.map((n, i) => {
        if (isChordTone(n.midi)) return n;
        // Check resolution: next note must be a chord tone 1-2 semitones below
        const next = melNotesFinal[i + 1];
        const resolves = next && isChordTone(next.midi) && (n.midi - next.midi) >= 1 && (n.midi - next.midi) <= 2;
        if (resolves) return n; // prepared dissonance — leave it
        // Doesn't resolve cleanly — snap to nearest chord tone
        const tones = [chordRoot11, chordThird11, chordFifth11];
        const closest = tones.reduce((b, t) => Math.abs(t - n.midi) < Math.abs(b - n.midi) ? t : b, tones[0]);
        return { ...n, midi: Math.max(0, Math.min(127, closest)) };
      });
    }

    // ── New #7: Modal interchange — apply Picardy third ───────────
    // In minor songs, the final phrase's last note gets raised to major 3rd above root
    if (isPicardy && melNotesFinal.length > 0) {
      const last = melNotesFinal[melNotesFinal.length - 1];
      const majorThird = scaleMidi(activeKey, activeOct, scale, chordDeg) + 4; // chromatic major 3rd
      if (Math.abs(majorThird - last.midi) <= 4)
        melNotesFinal[melNotesFinal.length - 1] = { ...last, midi: Math.max(0, Math.min(127, majorThird)) };
    }
    // Borrowed chord color: on borrowed tension bars, lower the 3rd of chord tones by 1 semitone
    if (borrowedChordOffset !== 0 && melNotesFinal.length > 0) {
      const chordThirdMidi = scaleMidi(activeKey, activeOct, scale, chordDeg + 2);
      melNotesFinal = melNotesFinal.map(n => {
        if (Math.abs(n.midi - chordThirdMidi) <= 1)
          return { ...n, midi: Math.max(0, Math.min(127, n.midi + borrowedChordOffset)) };
        return n;
      });
    }

    // ── New #4: Chromatic approach tones ──────────────────────────
    // Before a strong chord tone on a beat, insert a 16th-note chromatic neighbor (10-12% chance)
    if (melNotesFinal.length > 1 && config.mode !== 'ambient') {
      const approachNotes: NoteEvent[] = [];
      const chordRootA  = scaleMidi(activeKey, activeOct, scale, chordDeg);
      const chordThirdA = scaleMidi(activeKey, activeOct, scale, chordDeg + 2);
      const chordFifthA = scaleMidi(activeKey, activeOct, scale, chordDeg + 4);
      const strongTones = new Set([chordRootA, chordThirdA, chordFifthA,
        chordRootA+12, chordRootA-12, chordThirdA+12, chordFifthA+12]);
      for (let i = 0; i < melNotesFinal.length; i++) {
        const n = melNotesFinal[i];
        const beatPos = (n.time - barStart) / beatDur;
        const isOnBeat = beatPos < 0.15 || Math.abs(beatPos - Math.round(beatPos)) < 0.15;
        if (isOnBeat && strongTones.has(n.midi) && rng.next() < 0.11) {
          // Chromatic approach from below (half step up into target) or above
          const fromBelow = rng.next() < 0.6;
          const approachMidi = fromBelow ? n.midi - 1 : n.midi + 1;
          const approachTime = n.time - beatDur * 0.25;
          if (approachTime >= barStart) {
            approachNotes.push({
              time: approachTime,
              duration: beatDur * 0.22,
              midi: Math.max(0, Math.min(127, approachMidi)),
              velocity: Math.max(20, n.velocity - 12),
            });
          }
        }
      }
      melNotesFinal = [...melNotesFinal, ...approachNotes].sort((a, b) => a.time - b.time);
    }

    const mel = { ...melRaw, notes: melNotesFinal };
    // Cache lead notes for countermelody generation
    leadNotesByBar.set(bar, [...mel.notes]);

    // ── Improvement #5: Rhythmic locking ──────────────────────────
    const melDensity = mel.notes.length;
    const melodyBusy = melDensity >= 6;
    const meodlySparse = melDensity <= 2;

    // ── Improvement #10: Track verse peak midi (bars 0-8) ─────────
    if (bar < 8) {
      for (const n of mel.notes) versePeakMidi = Math.max(versePeakMidi, n.midi);
    }
    if (bar === 8) {
      chorusPeakTarget = versePeakMidi + 2;
    }
    // Force high point on bar 11 beat 1 (phrasePos===3 of that phrase, actually bar 11)
    if (bar === 11 && phrasePos === 3 && mel.notes.length > 0) {
      const forcedPeak = Math.min(hi, chorusPeakTarget);
      // Add forced peak note at barStart
      const peakNote: NoteEvent = { time: barStart, duration: beatDur * 0.85, midi: forcedPeak, velocity: 100 };
      mel.notes.unshift(peakNote);
    }

    // ── Improvement #1: Phrase caching + replay ───────────────────
    const isASection = phraseIndex % 2 === 0;
    // Build cache on first 4-bar phrase (bars 0-3)
    if (bar < 4) {
      // Cache is accumulated across bars 0-3 (handled after push to pulse1 below)
    }
    // Replay cached phrase for subsequent A-sections
    let cachedPhraseNotes: NoteEvent[] | null = null;
    if (isASection && bar >= 4 && phraseACache !== null) {
      const replayCount = phraseACacheReplayCount;
      // Compute time offset: shift notes from original bar 0-3 start to current phrase start
      const origPhraseStart = 0;
      const curPhraseStart = phraseIndex * 4 * barDur;
      const timeOffset = curPhraseStart - origPhraseStart;
      // Transpose: current chord root vs cached chord root
      const pitchOffset = scaleMidi(activeKey, activeOct, scale, chordDeg) - scaleMidi(activeKey, activeOct, scale, phraseACacheChordDeg);
      let replayNotes = phraseACache
        .filter(n => {
          // only notes that belong to this bar (within bar window)
          const noteBar = Math.floor((n.time + timeOffset) / barDur);
          return noteBar === bar;
        })
        .map(n => {
          let midi = Math.max(0, Math.min(127, n.midi + pitchOffset));
          // #8: Motivic development on repeat
          if (replayCount === 1) midi = Math.max(0, Math.min(127, midi + 1)); // shift +1 semitone
          if (replayCount === 2) {
            // harmony: original + note 3 semitones below
          }
          return { ...n, time: n.time + timeOffset, midi };
        });
      // #8: 3rd replay adds parallel note 3 semitones below
      if (replayCount === 2) {
        const harmonized = replayNotes.map(n => ({
          ...n, midi: Math.max(0, Math.min(127, n.midi - 3)), velocity: Math.max(20, n.velocity - 10)
        }));
        replayNotes = [...replayNotes, ...harmonized];
      }
      // Keep only last beat as fresh cadence (bar 4 beat 4 = phrasePos===3, last beat)
      if (phrasePos === 3) {
        const lastBeatStart = barStart + 3 * beatDur;
        replayNotes = replayNotes.filter(n => n.time < lastBeatStart);
        // fresh cadence: use the generated mel for last beat
        const cadenceNotes = mel.notes.filter(n => n.time >= lastBeatStart);
        replayNotes = [...replayNotes, ...cadenceNotes];
      }
      if (replayNotes.length > 0) cachedPhraseNotes = replayNotes;
    }
    // Same for B sections
    let cachedPhraseBNotes: NoteEvent[] | null = null;
    if (!isASection && bar >= 8 && phraseBCache !== null) {
      const replayCount = phraseBCacheReplayCount;
      const origPhraseStart = 4 * barDur; // B section starts at bar 4
      const curPhraseStart = phraseIndex * 4 * barDur;
      const timeOffset = curPhraseStart - origPhraseStart;
      const pitchOffset = scaleMidi(activeKey, activeOct, scale, chordDeg) - scaleMidi(activeKey, activeOct, scale, phraseBCacheChordDeg);
      let replayNotes = phraseBCache
        .filter(n => {
          const noteBar = Math.floor((n.time + timeOffset) / barDur);
          return noteBar === bar;
        })
        .map(n => {
          let midi = Math.max(0, Math.min(127, n.midi + pitchOffset));
          if (replayCount === 1) midi = Math.max(0, Math.min(127, midi + 1));
          return { ...n, time: n.time + timeOffset, midi };
        });
      if (replayCount === 2) {
        const harmonized = replayNotes.map(n => ({
          ...n, midi: Math.max(0, Math.min(127, n.midi - 3)), velocity: Math.max(20, n.velocity - 10)
        }));
        replayNotes = [...replayNotes, ...harmonized];
      }
      if (phrasePos === 3) {
        const lastBeatStart = barStart + 3 * beatDur;
        replayNotes = replayNotes.filter(n => n.time < lastBeatStart);
        const cadenceNotes = mel.notes.filter(n => n.time >= lastBeatStart);
        replayNotes = [...replayNotes, ...cadenceNotes];
      }
      if (replayNotes.length > 0) cachedPhraseBNotes = replayNotes;
    }

    // #2: bright songs get accompOct velocity +12 bonus
    const brightAccompBonus = brightness > 0.6 ? 12 : 0;
    const applyVel = (notes: NoteEvent[]) => notes.map(n => ({
      ...n,
      // #4: apply dynamics multiplier to all channel velocities
      velocity: Math.max(30, Math.min(127, Math.round((n.velocity + velOffset) * dynamicsMultiplier))),
      duration: n.duration * articulationScale,
    }));
    // Accompaniment channels are 15 quieter than lead (velocity doc: melody -10 to -30 for accomp)
    const applyAccompVel = (notes: NoteEvent[]) => applyVel(notes).map(n => ({
      ...n, velocity: Math.max(20, Math.min(127, n.velocity - 15 + brightAccompBonus)),
    }));

    prevMidi = mel.lastMidi;
    melPrevDelta = (mel as any).lastDelta ?? 0;

    // Cadence: on bar 3, nudge prevMidi toward leading tone for resolution feel
    if (isCadenceBar(bar) && rng.next() < 0.55) {
      prevMidi = leadingTone(nextChordRoots[bar]);
    }
    // Anticipation: add a pickup note in the last 8th of cadence bars pointing to next chord root
    if (isCadenceBar(bar) && rng.next() < 0.30 && !isSilenceBar) {
      const nextRoot = nextChordRoots[bar];
      const pickupTime = barStart + 3.75 * beatDur;
      if (pickupTime < barStart + 4 * beatDur - 0.01) {
        const pickupMidi = Math.abs(nextRoot - 1 - prevMidi) < Math.abs(nextRoot + 1 - prevMidi)
          ? nextRoot - 1 : nextRoot + 1;
        pulse1.push({ time: pickupTime, duration: beatDur * 0.22, midi: Math.max(0, Math.min(127, pickupMidi)), velocity: 72 });
      }
    }
    // Resolution: on bar 0 of each phrase (after first), snap to chord root for a clean landing
    if (isResolutionBar(bar) && rng.next() < 0.50) {
      prevMidi = scaleMidi(activeKey, activeOct, scale, chordDeg);
    }

    const pulse1Active = sp1 < 1 && arrRng.next() > sp1 * 0.7;
    // Suppres unused variable warning
    void meodlySparse;

    // Locked motif: repeat at the start of every phrase (bar 0, 4, 8…).
    // Transpose each degree up by the current chord root offset so it stays
    // harmonically in context while the notes themselves stay the same pattern.
    const seedNotes: NoteEvent[] = [];
    if (config.motifSeed && config.motifSeed.length > 0 && phrasePos === 0 && !isSilenceBar) {
      const chordRootOffset = scaleMidi(activeKey, activeOct, scale, chordDeg) - scaleMidi(activeKey, activeOct, scale, 0);
      const seedDur = Math.min(config.motifSeed.length, 8); // allow up to 8-note archetypes
      const seedRhythms: { v: number; w: number }[] = [
        { v: 0.5, w: 2 }, { v: 0.75, w: 3 }, { v: 1.0, w: 4 }, { v: 1.5, w: 1 },
      ];
      let seedT = barStart;
      for (let si = 0; si < seedDur; si++) {
        const baseMidi = scaleMidi(activeKey, activeOct, scale, (config.motifSeed[si] ?? config.motifSeed[0]) + motifOffset);
        const midi = Math.max(0, Math.min(127, baseMidi + chordRootOffset));
        const noteDur = rng.weighted(seedRhythms.map(r => ({ value: r.v * beatDur, w: r.w })));
        if (seedT + noteDur > barStart + 4 * beatDur + 0.01) break;
        seedNotes.push({ time: seedT, duration: noteDur * 0.85, midi, velocity: 88 + rng.int(10) + (si === 0 ? 8 : 0) });
        seedT += noteDur;
      }
      prevMidi = seedNotes[seedNotes.length - 1].midi;
    }
    // When locked motif is active, replace generated mel/motif for phrase-start bars
    const melNotes = (config.motifSeed && config.motifSeed.length > 0 && phrasePos === 0)
      ? [] : [...motifNotes, ...(cachedPhraseNotes ?? cachedPhraseBNotes ?? mel.notes)];
    if (!isSilenceBar && pulse1Active) {
      // ── Improvement #13: Pickup notes and phrase breath ───────────
      const finalMelNotes = [...seedNotes, ...melNotes];
      // Add pickup note at start of every phrase (phrasePos===0, bar>0) on LAST 8th of prev bar
      if (phrasePos === 0 && bar > 0 && !isSilenceBar) {
        const pickupTime = (bar - 1) * barDur + 3.5 * beatDur;
        const chordRoot = scaleMidi(activeKey, activeOct, scale, chordDeg);
        pulse1.push({ time: pickupTime, duration: beatDur * 0.3, midi: Math.max(0, Math.min(127, chordRoot)), velocity: 65 });
      }
      // Phrase breath: in phrasePos===3 last beat, remove notes after barStart+3*beatDur unless cadence
      if (phrasePos === 3) {
        const lastBeatStart = barStart + 3 * beatDur;
        // keep only up to last beat (cadence notes from guaranteed cadence pass stay)
        const breathedNotes = finalMelNotes.filter(n => n.time <= lastBeatStart + 0.01);
        // re-add cadence note if it was there
        const cadenceNote = finalMelNotes.find(n => n.time > lastBeatStart);
        if (cadenceNote) breathedNotes.push(cadenceNote);
        pulse1.push(...applyVel(breathedNotes));
      } else {
        pulse1.push(...applyVel(finalMelNotes));
      }

      // ── Improvement #1: Build phrase caches ──────────────────────
      // Cache A-section (bars 0-3) after processing
      if (bar < 4 && isASection) {
        const notesForCache = [...seedNotes, ...melNotes].filter(n => n.time >= barStart && n.time < barStart + barDur);
        if (phraseACache === null) phraseACache = [];
        phraseACache.push(...notesForCache);
        phraseACacheChordDeg = chordDeg;
      }
      // Mark end of A-cache after bar 3
      if (bar === 3) phraseACacheReplayCount = 0;
      // Increment replay count when replaying A
      if (isASection && bar >= 4 && phrasePos === 0 && phraseACache !== null) phraseACacheReplayCount++;
      // Cache B-section (bars 4-7, first B phrase)
      if (bar >= 4 && bar < 8 && !isASection) {
        const notesForCache = [...seedNotes, ...melNotes].filter(n => n.time >= barStart && n.time < barStart + barDur);
        if (phraseBCache === null) phraseBCache = [];
        phraseBCache.push(...notesForCache);
        phraseBCacheChordDeg = chordDeg;
      }
      if (bar === 7) phraseBCacheReplayCount = 0;
      if (!isASection && bar >= 8 && phrasePos === 0 && phraseBCache !== null) phraseBCacheReplayCount++;
    }

    // ── New #2: Money note — planned held climax ───────────────────
    // Bar 3 of every 8-bar section: add a held peak note on beat 1 of pulse1
    // (only when lead melody didn't already place a long note there)
    if (phrasePos === 2 && bar % 8 === 2 && !isSilenceBar && mel.notes.length > 0) {
      const moneyMidi = Math.min(barHi, versePeakMidi + (isChorus ? 3 : 1));
      const beatOneMelNote = mel.notes.find(n => n.time <= barStart + 0.12);
      if (!beatOneMelNote || beatOneMelNote.duration < beatDur * 1.2) {
        pulse1.push({
          time: barStart,
          duration: beatDur * 1.6,
          midi: Math.max(0, Math.min(127, moneyMidi)),
          velocity: Math.min(127, 88 + (isChorus ? 12 : 4)),
        });
      }
    }

    // Pulse2 — when arp style is forced, route through genArpBar for real variety
    // #4: drop section silences pulse2 entirely
    if (act.pulse2 && !isSilenceBar && !isDropBar) {
      if (isLowRegister) {
        const glk = genGlockenspielBar(rng, scale, activeKey, activeOct, chordDeg, beatDur, barStart, glockDeg);
        pulse2.push(...applyVel(glk.notes));
        glockDeg = glk.lastDeg;

      // ── New #3: Countermelody in chorus ──────────────────────────
      // Chorus bars: pulse2 plays a mirror figure (opposite direction to lead)
      } else if (isChorus && !arpOverride && mel.notes.length >= 2) {
        const leadPrev = leadNotesByBar.get(bar - 1) ?? [];
        const refNotes = leadPrev.length > 0 ? leadPrev : mel.notes;
        // Build a descending countermelody using chord tones, mirroring lead direction
        const cRoot  = scaleMidi(activeKey, accompOct, scale, chordDeg);
        const cThird = scaleMidi(activeKey, accompOct, scale, chordDeg + 2);
        const cFifth = scaleMidi(activeKey, accompOct, scale, chordDeg + 4);
        const cSev   = scaleMidi(activeKey, accompOct, scale, chordDeg + 6);
        // Determine lead direction from ref notes
        const leadDir = refNotes.length >= 2
          ? (refNotes[refNotes.length - 1].midi - refNotes[0].midi > 0 ? 1 : -1)
          : 1;
        // Counter goes opposite — use a simple descending/ascending chord tone figure
        const counterPitches = leadDir > 0
          ? [cSev, cFifth, cThird, cRoot]   // lead goes up → counter descends
          : [cRoot, cThird, cFifth, cSev];   // lead goes down → counter ascends
        counterPitches.forEach((midi, i) => {
          const t = barStart + i * beatDur;
          if (t < barStart + 4 * beatDur - 0.01) {
            pulse2.push({
              time: t,
              duration: beatDur * (globalGate - 0.08),
              midi: Math.max(0, Math.min(127, midi)),
              velocity: 48 + rng.int(12),
            });
          }
        });

      // ── New #1: Call-and-response ─────────────────────────────────
      // On phrasePos===1 (bar 2 of phrase), lead silence in beats 3-4 → pulse2 responds
      } else if (phrasePos === 1 && !arpOverride && mel.notes.length > 0) {
        const lastMelTime = mel.notes[mel.notes.length - 1].time;
        const silenceStart = lastMelTime + mel.notes[mel.notes.length - 1].duration;
        const silenceDur = (barStart + 4 * beatDur) - silenceStart;
        // If lead falls silent for at least 1 beat, pulse2 plays a short response
        if (silenceDur >= beatDur * 0.9) {
          const respRoot  = scaleMidi(activeKey, accompOct, scale, chordDeg);
          const respThird = scaleMidi(activeKey, accompOct, scale, chordDeg + 2);
          const respFifth = scaleMidi(activeKey, accompOct, scale, chordDeg + 4);
          // Short 3-note response figure: fall from 5th to root
          const respPattern = [respFifth, respThird, respRoot];
          const respStep = Math.min(beatDur * 0.45, silenceDur / 3);
          respPattern.forEach((midi, i) => {
            const t = silenceStart + i * respStep;
            if (t < barStart + 4 * beatDur - 0.01) {
              pulse2.push({
                time: t,
                duration: respStep * (globalGate - 0.05),
                midi: Math.max(0, Math.min(127, midi)),
                velocity: 55 + rng.int(14),
              });
            }
          });
        } else {
          // Lead is busy — fall back to arp
          pulse2.push(...applyAccompVel(genArpBar(rng, scale, activeKey, accompOct, chordDeg, beatDur, barStart, config.mode)));
        }

      } else if (arpOverride) {
        pulse2.push(...applyAccompVel(genArpBar(rng, scale, activeKey, accompOct, chordDeg, beatDur, barStart, config.mode, arpOverride)));
      } else if (pulse2Mode === 'arp') {
        // Route 'arp' to genArpBar (18 styles) — NOT genAccompBar (was a routing bug)
        // #5: busy melody → simpler arp (roots on beats 1&3); sparse melody → richer 16th arp
        if (melodyBusy) {
          // Simple: just roots on beats 1 and 3
          const root = scaleMidi(activeKey, accompOct, scale, chordDeg);
          [0, 2].forEach(b => pulse2.push({ time: barStart + b * beatDur, duration: beatDur * 0.85, midi: Math.max(0, Math.min(127, root)), velocity: 50 }));
        } else {
          pulse2.push(...applyAccompVel(genArpBar(rng, scale, activeKey, accompOct, chordDeg, beatDur, barStart, config.mode)));
        }
      } else if (pulse2Mode === 'echo') {
        const sourceNotes = [...motifNotes, ...mel.notes];
        if (phrasePos % 2 === 1 && sourceNotes.length > 0) {
          const echoNotes = sourceNotes
            .map(n => ({ ...n, time: n.time + beatDur * 0.5, midi: Math.max(0, Math.min(127, n.midi - 12)), velocity: Math.max(28, n.velocity - 18) }))
            .filter(n => n.time < barStart + 4 * beatDur);
          pulse2.push(...applyAccompVel(echoNotes));
        } else {
          pulse2.push(...applyAccompVel(genChordStabBar(rng, scale, activeKey, accompOct, chordDeg, beatDur, barStart)));
        }
      } else if (pulse2Mode === 'stab') {
        pulse2.push(...applyAccompVel(genChordStabBar(rng, scale, activeKey, accompOct, chordDeg, beatDur, barStart)));
      } else if (pulse2Mode === 'sparse') {
        // Sparse: stab only on phrase-start and mid-phrase bars for breathing room
        if (phrasePos === 0 || phrasePos === 2) {
          pulse2.push(...applyAccompVel(genChordStabBar(rng, scale, activeKey, accompOct, chordDeg, beatDur, barStart)));
        }
      } else {
        pulse2.push(...applyAccompVel(genAccompBar(rng, scale, activeKey, accompOct, chordDeg, beatDur, barStart, scaleType, prevAccompRoot)));
        prevAccompRoot = scaleMidi(activeKey, accompOct, scale, chordDeg);
      }
    }

    // #6: hold bar — reduce accomp density by 30% by removing ~30% of pulse2 notes just added
    if (isHoldBar && pulse2.length > 0) {
      // Remove notes added in this bar
      let barPulse2Start = -1;
      for (let i = pulse2.length - 1; i >= 0; i--) {
        if (pulse2[i].time < barStart) { barPulse2Start = i; break; }
      }
      for (let i = pulse2.length - 1; i > barPulse2Start; i--) {
        if (rng.next() < 0.30) pulse2.splice(i, 1);
      }
    }

    // Wave (bass)
    const useCompound = config.mode === 'battle' && (section === 'chorus' || section === 'verse') && rng.next() > 0.5;
    const waveBeforeLen = wave.length;
    if (act.wave) {
      // #12: section-level bass style (user override takes priority)
      const bassStyle = config.channelStyles?.wave ?? sectionBassStyle;
      const nextChordDeg = activeProg[(bar + 1) % activeProg.length];
      if (bassStyle === 'synco' || bassStyle === 'syncopated') {
        wave.push(...applyVel(genSyncopatedBassBar(rng, scale, config.key, bassOct, chordDeg, beatDur, barStart)));
      } else if (bassStyle === 'pedal') {
        wave.push(...applyVel(genPedalBassBar(rng, scale, config.key, bassOct, beatDur, barStart)));
      } else if (bassStyle === 'alberti') {
        wave.push(...applyVel(genAlbertiBar(rng, scale, config.key, bassOct, chordDeg, beatDur, barStart)));
      } else if (bassStyle === 'waltz') {
        wave.push(...applyVel(genWaltzBassBar(rng, scale, config.key, bassOct, chordDeg, beatDur, barStart)));
      } else if (bassStyle === 'walking') {
        wave.push(...applyVel(genWalkingBassBar(rng, scale, config.key, bassOct, chordDeg, nextChordDeg, beatDur, barStart)));
      } else if (bassStyle === 'march' || (bassStyle !== 'alberti' && bassStyle !== 'waltz' && bassStyle !== 'walking' && scaleType === 'minor' && config.mode === 'mid')) {
        wave.push(...applyVel(genMarchBassBar(rng, scale, config.key, bassOct, chordDeg, beatDur, barStart)));
      } else if (useCompound && config.mode === 'battle') {
        const sixteenth = beatDur * 0.25;
        const root = scaleMidi(config.key, bassOct, scale, chordDeg);
        const fifth = root + 7;
        const third = scaleMidi(config.key, bassOct, scale, chordDeg + 2);
        const approach = root - 1;
        const blazePat = [root, fifth, third, fifth, root, approach, fifth, third, root, fifth, third, approach, root, fifth, third, fifth];
        for (let i = 0; i < 16; i++) {
          const t = barStart + i * sixteenth;
          if (t >= barStart + 4 * beatDur - 0.01) break;
          const vel = i % 4 === 0 ? 95 + rng.int(10) : 72 + rng.int(15);
          wave.push({ time: t, duration: sixteenth * 0.85, midi: Math.max(0, Math.min(127, blazePat[i])), velocity: vel });
        }
      } else {
        wave.push(...applyVel(genBassBar(rng, scale, config.key, bassOct, chordDeg, beatDur, barStart, config.mode, scaleType, nextChordDeg)));
      }
    }
    // Bass leap protection: if downbeat jumps >7 semitones from previous bar, use third instead
    if (wave.length > waveBeforeLen) {
      const downbeat = wave[waveBeforeLen];
      if (prevBassRootMidi >= 0 && Math.abs(downbeat.midi - prevBassRootMidi) > 7) {
        const thirdMidi = scaleMidi(config.key, bassOct, scale, chordDeg + 2);
        wave[waveBeforeLen] = { ...downbeat, midi: Math.max(0, Math.min(127, thirdMidi)) };
      }
      prevBassRootMidi = wave[waveBeforeLen].midi;
    }

    // Noise (drums) — #7: pattern-based drums for non-special modes
    if (act.noise) {
      const isQuietSection = section === 'intro' || section === 'outro' || isDropBar;
      if (config.mode !== 'jazzy' && config.mode !== 'funky' && config.mode !== 'silly' && config.mode !== 'weird' && config.mode !== 'ambient') {
        // Pattern-based approach: kick 1&3, snare 2&4, hi-hat every 8th
        const KICK = 36, SNARE = 38, HAT = 42;
        const kickVel = (isQuietSection ? 72 : 90) + rng.int(15);
        const snareVel = (isQuietSection ? 58 : 75) + rng.int(15);
        // Kick on beats 1 and 3
        noise.push({ time: barStart,                duration: 0.1, midi: KICK, velocity: kickVel });
        noise.push({ time: barStart + 2 * beatDur,  duration: 0.1, midi: KICK, velocity: kickVel - rng.int(10) });
        // Snare on beats 2 and 4
        noise.push({ time: barStart + beatDur,      duration: 0.1, midi: SNARE, velocity: snareVel });
        noise.push({ time: barStart + 3 * beatDur,  duration: 0.1, midi: SNARE, velocity: snareVel - rng.int(8) });
        // Hi-hat every 8th note (skip in quiet sections)
        if (!isQuietSection) {
          for (let h = 0; h < 8; h++) {
            const hatVel = (45 + rng.int(20));
            noise.push({ time: barStart + h * beatDur * 0.5, duration: 0.05, midi: HAT, velocity: hatVel });
          }
          // Chorus accent hat on & of beat 4
          if (section === 'chorus') {
            noise.push({ time: barStart + 3.5 * beatDur, duration: 0.05, midi: HAT, velocity: 65 + rng.int(15) });
          }
          // ── New #5: Transition fill — drum fill on the bar before a new section
          if (isTransitionBar) {
            // Dense snare roll on beats 3-4: 16th notes with building velocity
            const FILL = 38;
            for (let f = 0; f < 8; f++) {
              const t = barStart + (f * 0.5 + 2) * beatDur; // fills beats 3-4
              if (t < barStart + 4 * beatDur - 0.01) {
                noise.push({ time: t, duration: 0.04, midi: FILL, velocity: 60 + f * 8 + rng.int(10) });
              }
            }
            // Extra kick on beat 4 for emphasis
            noise.push({ time: barStart + 3 * beatDur, duration: 0.1, midi: KICK, velocity: Math.min(127, kickVel + 12) });
          }
        } else {
          // Quiet: only on-beat hats, lower velocity
          for (let b = 0; b < 4; b++) {
            noise.push({ time: barStart + b * beatDur, duration: 0.05, midi: HAT, velocity: 28 + rng.int(14) });
          }
        }
      } else {
        noise.push(...genPercBar(rng, beatDur, barStart, config.mode, useCompound, bar));
        // Transition fill for other modes too
        if (isTransitionBar) {
          const FILL = 38;
          for (let f = 0; f < 4; f++) {
            const t = barStart + (f * 0.5 + 3) * beatDur;
            if (t < barStart + 4 * beatDur - 0.01)
              noise.push({ time: t, duration: 0.04, midi: FILL, velocity: 65 + f * 10 + rng.int(8) });
          }
        }
      }
    }

    // Pulse3 (arpeggio / countermelody)
    if (act.pulse3 && sp3 < 1 && arrRng.next() > sp3 * 0.7) {
      const styleP3 = config.channelStyles?.pulse3;
      // Auto mode: alternate between arp and countermelody every 2 bars for variety
      const useCounterMelody = styleP3 === 'melody' || (styleP3 !== 'arp' && bar % 4 >= 2 && arrRng.next() < 0.45);
      if (useCounterMelody) {
        // Parallel thirds: shift melody notes by a scale third for natural harmony
        const sourceNotes = [...motifNotes, ...mel.notes];
        const scaleThird = scale[2] - scale[0]; // semitones in a 3rd for this scale
        const thirdDir = rng.next() < 0.70 ? 1 : -1; // mostly above
        if (sourceNotes.length > 0) {
          const p3notes = sourceNotes.map(n => ({
            ...n,
            midi: Math.max(0, Math.min(127, snapToScale(n.midi + thirdDir * scaleThird, activeKey, scale))),
            velocity: Math.max(28, n.velocity - 16),
          }));
          pulse3.push(...applyAccompVel(p3notes));
        } else {
          const p3mel = genMelodyBar(rng, scale, activeKey, accompOct, chordDeg, beatDur, barStart, arcDir, prevMidi - scaleThird, config.mode, scaleType, rhythms, lo - 12, hi - 12, 4 * beatDur, restBias + 0.1, phrasePos, 'free', 0);
          pulse3.push(...applyAccompVel(p3mel.notes));
        }
      } else {
        // Quieter arp for pulse3 — it's background texture, not competing with melody
        const p3arp = genArpBar(rng, scale, activeKey, arpOct, chordDeg, beatDur, barStart, config.mode, arpOverride)
          .map(n => ({ ...n, velocity: Math.max(28, n.velocity - 22) }));
        pulse3.push(...applyAccompVel(p3arp));
      }
    }

    // Pad (harmony) — density cap: suppress when pulse1+pulse2+pulse3 all active (>3 layers)
    // #4: drop section silences pad entirely
    const harmonyLayers = (pulse1Active ? 1 : 0) + (act.pulse2 && !isSilenceBar ? 1 : 0) + (act.pulse3 && sp3 < 1 ? 1 : 0);
    if (act.pad && spad < 1 && arrRng.next() > spad * 0.7 && !isSilenceBar && harmonyLayers < 3 && !isDropBar) {
      pad.push(...applyAccompVel(genPadBar(rng, scale, activeKey, padOct, chordDeg, beatDur, barStart, scaleType)));
    }
  }

  // Extra channels — generate based on assigned role
  if (config.extraChannelRoles) {
    const extraIds = ['extra1', 'extra2', 'extra3'] as const;
    const extraArrays = { extra1, extra2, extra3 };
    const extraRoles = config.extraChannelRoles;
    for (const extId of extraIds) {
      const role = extraRoles[extId];
      if (!role || role === 'off') continue;
      const extraSparse = config.channelSparseness?.[extId] ?? 0.3;
      for (let bar = 0; bar < config.bars; bar++) {
        // Respect sparseness — skip bar probabilistically
        if (rng.next() < extraSparse) continue;
        const phraseIndex = Math.floor(bar / 4);
        const activeProg2 = phraseIndex % 2 === 0 ? progA : progB;
        const chordDeg2 = activeProg2[bar % activeProg2.length];
        const barStart2 = bar * barDur;
        const barSection = barSections[bar];
        const velOff = barSection === 'chorus' ? 10 : barSection === 'intro' ? -15 : barSection === 'outro' ? -20 : 0;
        const applyExtraVel = (notes: NoteEvent[]) => notes.map(n => ({
          ...n, velocity: Math.max(28, Math.min(127, n.velocity + velOff - 8)),
        }));
        if (role === 'bell') {
          const { notes: bellNotes } = genGlockenspielBar(rng, scale, config.key, melodyOct + 1, chordDeg2, beatDur, barStart2, 4);
          // Bell: drop every other note so it's less busy
          extraArrays[extId].push(...applyExtraVel(bellNotes.filter((_, i) => i % 2 === 0)));
        } else if (role === 'arp') {
          // Arp: use quarter-note arp style so it's not frantic 16th notes
          const arpNotes = genArpBar(rng, scale, config.key, accompOct, chordDeg2, beatDur, barStart2, config.mode, 'up');
          // Keep only downbeat notes (1 per beat) to thin out the density
          extraArrays[extId].push(...applyExtraVel(arpNotes.filter((_, i) => i % 2 === 0)));
        } else if (role === 'pad') {
          extraArrays[extId].push(...applyExtraVel(genPadBar(rng, scale, config.key, padOct, chordDeg2, beatDur, barStart2, scaleType)));
        } else if (role === 'bass') {
          extraArrays[extId].push(...applyExtraVel(genBassBar(rng, scale, config.key, bassOct, chordDeg2, beatDur, barStart2, config.mode, scaleType)));
        } else if (role === 'strum') {
          extraArrays[extId].push(...applyExtraVel(genChordStabBar(rng, scale, config.key, accompOct, chordDeg2, beatDur, barStart2)));
        }
      }
    }
  }

  // Enforce monophony on lead channel; quantize rhythmically-strict modes to 16th grid
  const strictMode = config.mode === 'battle' || config.mode === 'funky' || config.mode === 'silly' || config.mode === 'mid';
  const finalPulse1 = enforceMonophony(strictMode ? quantize16th(pulse1, beatDur) : pulse1);
  const finalPulse3 = enforceMonophony(strictMode ? quantize16th(pulse3, beatDur) : pulse3);

  // Repeated note velocity decay: consecutive same-pitch hits in lead lose 5 vel per repeat
  const applyRepeatDecay = (notes: NoteEvent[]): NoteEvent[] => {
    const sorted = [...notes].sort((a, b) => a.time - b.time);
    let lastMidi = -1, repeatCount = 0;
    return sorted.map(n => {
      if (n.midi === lastMidi) { repeatCount++; } else { repeatCount = 0; }
      lastMidi = n.midi;
      const decay = Math.min(repeatCount * 5, 20);
      return decay > 0 ? { ...n, velocity: Math.max(20, n.velocity - decay) } : n;
    });
  };

  // Per-channel velocity normalization: scale peaks to ≤120 to avoid SF2 clipping
  // (doc: "normalize per-track so highest stays ≤120")
  const normalizeVel = (notes: NoteEvent[]): NoteEvent[] => {
    if (notes.length === 0) return notes;
    const peak = Math.max(...notes.map(n => n.velocity));
    if (peak <= 120) return notes;
    const scale = 120 / peak;
    return notes.map(n => ({ ...n, velocity: Math.max(1, Math.round(n.velocity * scale)) }));
  };

  // Motif intervals for the inspector (degree offsets between consecutive notes)
  const motifIntervals = motif.notes.map((n, i) =>
    i === 0 ? n.degreeOffset : n.degreeOffset - motif.notes[i - 1].degreeOffset
  );

  // ── Post-generation quality passes ────────────────────────────

  // 1. Chord-tone enforcement on strong beats for accomp / arp channels.
  //    Notes landing within 50ms of a strong beat (beat 1 or 3) get snapped to the
  //    nearest chord tone when they're already within 2 semitones of one.
  const chordToneSnap = (notes: NoteEvent[]): NoteEvent[] => {
    if (notes.length === 0) return notes;
    return notes.map(n => {
      const beatPos = (n.time % barDur) / beatDur;
      const onStrong = beatPos < 0.15 || Math.abs(beatPos - 2.0) < 0.15;
      if (!onStrong) return n;
      // Find chord deg for this bar
      const bar = Math.floor(n.time / barDur);
      const pi = Math.floor(bar / 4);
      const prog = pi % 2 === 0 ? progA : progB;
      const cd = prog[bar % prog.length];
      const cr  = scaleMidi(config.key, accompOct, scale, cd);
      const ct3 = scaleMidi(config.key, accompOct, scale, cd + 2);
      const ct5 = scaleMidi(config.key, accompOct, scale, cd + 4);
      const tones = [cr, ct3, ct5, cr + 12, cr - 12, ct3 + 12, ct5 + 12];
      const closest = tones.reduce((b, t) => Math.abs(t - n.midi) < Math.abs(b - n.midi) ? t : b, tones[0]);
      if (Math.abs(closest - n.midi) <= 2) return { ...n, midi: Math.max(0, Math.min(127, closest)) };
      return n;
    });
  };

  // 2. Phrase-rest breathing: silence one non-lead channel for 2 bars in every 8-bar window.
  //    This creates natural dynamic contrast without touching the melody.
  const phraseRestBalance = (notes: NoteEvent[]): NoteEvent[] => {
    if (config.bars < 8 || notes.length === 0) return notes;
    // Pick a deterministic 2-bar rest window per 8-bar block using rng seed
    const restBarInBlock = 4 + Math.floor(rng.next() * 4); // bars 4-7 of each 8-bar block
    return notes.filter(n => {
      const bar = Math.floor(n.time / barDur);
      const posInBlock = bar % 8;
      return posInBlock !== restBarInBlock && posInBlock !== (restBarInBlock + 1) % 8;
    });
  };

  // 3. Guarantee beat-1 of bar 0 (the song's anchor) is a chord root on ALL channels.
  const anchorBeat1 = (notes: NoteEvent[], oct: number): NoteEvent[] => {
    if (notes.length === 0) return notes;
    return notes.map(n => {
      if (n.time < beatDur * 0.1) {
        const root = scaleMidi(config.key, oct, scale, 0);
        const candidates = [root, root + 12, root - 12];
        const best = candidates.reduce((b, c) => Math.abs(c - n.midi) < Math.abs(b - n.midi) ? c : b, root);
        if (Math.abs(best - n.midi) <= 5) return { ...n, midi: Math.max(0, Math.min(127, best)) };
      }
      return n;
    });
  };

  // 4. Note density throttle: mode-aware max notes per bar per channel.
  //    Ambient songs stay sparse; battle songs can be dense.
  const densityCap: Record<GenMode, number> = {
    ambient: 4, mid: 8, battle: 16, jazzy: 8, funky: 10, silly: 12, weird: 7,
  };
  const throttleDensity = (notes: NoteEvent[]): NoteEvent[] => {
    if (notes.length === 0) return notes;
    const cap = densityCap[config.mode];
    const byBar = new Map<number, NoteEvent[]>();
    for (const n of notes) {
      const bar = Math.floor(n.time / barDur);
      if (!byBar.has(bar)) byBar.set(bar, []);
      byBar.get(bar)!.push(n);
    }
    const out: NoteEvent[] = [];
    for (const barNotes of byBar.values()) {
      if (barNotes.length <= cap) { out.push(...barNotes); continue; }
      // Keep the notes on strong beats, then fill to cap from remaining
      const strong = barNotes.filter(n => {
        const bp = ((n.time % barDur) / beatDur);
        return bp < 0.15 || Math.abs(bp - 2.0) < 0.15;
      });
      const weak = barNotes.filter(n => !strong.includes(n));
      const keep = [...strong, ...weak].slice(0, cap);
      out.push(...keep);
    }
    return out.sort((a, b) => a.time - b.time);
  };

  const applyQualityPasses = (notes: NoteEvent[], snapChords: boolean, breathe: boolean, oct: number) => {
    let n = notes;
    if (snapChords) n = chordToneSnap(n);
    n = anchorBeat1(n, oct);
    n = throttleDensity(n);
    if (breathe) n = phraseRestBalance(n);
    return n;
  };

  // Apply to accomp/arp (pulse2), bass (wave), pad — not melody (pulse1/pulse3)
  const finalPulse2 = applyQualityPasses(pulse2, true, true, accompOct);
  const finalWave   = applyQualityPasses(wave,   true, false, bassOct);
  const finalPad    = applyQualityPasses(pad,    true, true,  padOct);

  return {
    channels: {
      pulse1: normalizeVel(applyRepeatDecay(finalPulse1)),
      pulse2: normalizeVel(finalPulse2),
      wave:   normalizeVel(finalWave),
      noise:  normalizeVel(noise),
      pulse3: normalizeVel(finalPulse3),
      pad:    normalizeVel(finalPad),
      extra1: normalizeVel(extra1), extra2: normalizeVel(extra2), extra3: normalizeVel(extra3),
    },
    duration: config.bars * barDur, bpm, seed, motifIntervals, metricMod: metricModActive,
  };
}
