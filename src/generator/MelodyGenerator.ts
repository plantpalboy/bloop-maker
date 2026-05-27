import type { NoteEvent, ChannelId } from '../types';

export type GenMode = 'ambient' | 'mid' | 'battle' | 'jazzy' | 'funky' | 'silly' | 'weird';
export type ScaleType =
  | 'minor' | 'mixolydian' | 'lydian' | 'major'
  | 'dorian' | 'pentatonicMinor' | 'pentatonicMajor' | 'wholeTone';

export interface GenConfig {
  mode: GenMode;
  key: number;
  octave: number;
  bars: number;
  bpm?: number;
  scaleType?: ScaleType;
  generateNoise?: boolean;
  sparseness?: number;
  channelSparseness?: { pulse1?: number; pulse2?: number; wave?: number; noise?: number; pulse3?: number; pad?: number };
  channelStyles?: { pulse1?: string; pulse2?: string; wave?: string; noise?: string; pulse3?: string; pad?: string };
}

export interface GenResult {
  channels: Record<ChannelId, NoteEvent[]>;
  duration: number;
  bpm: number;
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
};

const PROGRESSIONS: Record<ScaleType, number[][]> = {
  minor: [
    [0, 6, 5, 6],   // i – VII – VI – VII
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
];
const LEAD_REST_PROB: Record<GenMode, number> = { ambient: 0.48, mid: 0.38, battle: 0.28, jazzy: 0.35, funky: 0.28, silly: 0.20, weird: 0.40 };

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
};

// ── Motif system ─────────────────────────────────────────────

interface MotifNote { degreeOffset: number; beats: number; }
type MotifVariant = 'statement' | 'answer' | 'inversion';
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
  const contour = rng.int(4);

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
      deg += rng.next() < upBias ? 1 : -1;
      if (rng.next() < 0.25) deg += rng.next() < 0.5 ? 1 : -1;
    }
    deg = Math.max(-4, Math.min(8, deg));
  }
  if (notes.length === 0) { notes.push({ degreeOffset: 0, beats: 0.5 }); totalBeats = 0.5; }
  return { notes, totalBeats };
}

function renderMotifVariant(
  motif: Motif, variant: MotifVariant, rng: RNG,
  scale: number[], key: number, oct: number,
  chordDeg: number, beatDur: number, startTime: number,
): NoteEvent[] {
  const out: NoteEvent[] = [];
  let t = startTime;
  const answerShift = variant === 'answer' ? 3 : 0;
  for (let i = 0; i < motif.notes.length; i++) {
    const mn = motif.notes[i];
    let degOff = mn.degreeOffset + answerShift;
    if (variant === 'inversion' && i > 0) {
      const firstDeg = motif.notes[0].degreeOffset;
      degOff = firstDeg - (mn.degreeOffset - firstDeg) + answerShift;
    }
    const midi = scaleMidi(key, oct, scale, chordDeg + degOff);
    const dur = mn.beats * beatDur;
    out.push({ time: t, duration: dur * 0.82, midi: Math.max(0, Math.min(127, midi)), velocity: 76 + rng.int(24) });
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

// ── Melody bar ────────────────────────────────────────────────

function genMelodyBar(
  rng: RNG, scale: number[], key: number, oct: number, chordDeg: number,
  beatDur: number, barStart: number, direction: 'up' | 'down' | 'free',
  prevMidi: number, mode: GenMode, scaleType: ScaleType,
  rhythms: { beats: number; w: number }[],
  lo: number, hi: number,
  overrideDuration?: number, restBias = 0,
): { notes: NoteEvent[]; lastMidi: number } {
  const notes: NoteEvent[] = [];
  let t = barStart;
  const barEnd = barStart + (overrideDuration ?? 4 * beatDur);
  let cur = prevMidi;
  let noteRun = 0;

  const chordTones = [
    scaleMidi(key, oct, scale, chordDeg),
    scaleMidi(key, oct, scale, chordDeg + 2),
    scaleMidi(key, oct, scale, chordDeg + 4),
    scaleMidi(key, oct + 1, scale, chordDeg),
  ];

  while (t < barEnd - 0.01) {
    const remaining = barEnd - t;
    const eligible = rhythms.filter(r => r.beats * beatDur <= remaining + 0.01);
    if (eligible.length === 0) break;
    const rhythmEntry = rng.weighted(eligible.map(r => ({ value: r.beats, w: r.w })));
    const dur = rhythmEntry * beatDur;

    const restProb = BASE_REST_PROB[mode] + restBias + (noteRun >= 3 ? 0.20 : 0) + (noteRun >= 6 ? 0.15 : 0);
    if (rng.next() < restProb) { noteRun = 0; t += dur; continue; }

    const isBattle = mode === 'battle';
    const isLyrical = scaleType === 'dorian' || scaleType === 'minor';
    const intervals: { delta: number; w: number }[] = [
      { delta: -2, w: 22 },
      { delta: 2,  w: 16 },
      { delta: 0,  w: 7  },
      { delta: -3, w: direction === 'down' ? 14 : 7  },
      { delta: 3,  w: direction === 'up'   ? 14 : 7  },
      { delta: -5, w: 10 },
      { delta: 7,  w: 7  },
      { delta: -7, w: 8  },
      { delta: 5,  w: 5  },
      { delta: -4, w: direction === 'down' ? 10 : 5  },
      { delta: 4,  w: direction === 'up'   ? 8  : 4  },
      { delta: 1,  w: isLyrical ? 8  : 2 },
      { delta: -1, w: isLyrical ? 10 : 3 },
      { delta: 12, w: isBattle ? 12 : 2 },
      { delta: -12,w: isBattle ? 16 : 3 },
    ];

    const delta = rng.weighted(intervals.map(i => ({ value: i.delta, w: i.w })));
    let next = snapToScale(cur + delta, key, scale);

    // Secondary dominant approach tone
    const nextPc = ((next % 12) + 12) % 12;
    const targetPc4th = (key + 5) % 12, targetPc5th = (key + 7) % 12;
    if ((nextPc === targetPc4th || nextPc === targetPc5th) && rng.next() < 0.22) next = next - 1;

    // Mode mixture
    if (rng.next() < 0.10) {
      if (scaleType === 'major' || scaleType === 'mixolydian') {
        const leadingTone = (key + 11) % 12;
        if (nextPc === leadingTone) next = next - 1;
      } else if (scaleType === 'minor' || scaleType === 'dorian') {
        const minorSixth = (key + 8) % 12;
        if (nextPc === minorSixth) next = next + 1;
      }
    }
    while (next < lo) next += 12;
    while (next > hi) next -= 12;

    if (rng.next() < 0.30) {
      const closest = chordTones.reduce((b, ct) => Math.abs(ct - next) < Math.abs(b - next) ? ct : b, chordTones[0]);
      if (Math.abs(closest - next) <= 1) next = closest;
    }

    notes.push({ time: t, duration: Math.max(dur * 0.85, 0.05), midi: Math.max(0, Math.min(127, next)), velocity: 72 + rng.int(32) });
    cur = next; noteRun++; t += dur;
  }

  return { notes, lastMidi: cur };
}

// ── Accompaniment / harmony ────────────────────────────────────

function genAccompBar(
  rng: RNG, scale: number[], key: number, oct: number, chordDeg: number,
  beatDur: number, barStart: number, scaleType: ScaleType,
): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const barDur = 4 * beatDur;

  const root    = scaleMidi(key, oct, scale, chordDeg);
  const third   = scaleMidi(key, oct, scale, chordDeg + 2);
  const fifth   = scaleMidi(key, oct, scale, chordDeg + 4);
  const seventh = scaleMidi(key, oct, scale, chordDeg + 6);
  const ninth   = scaleMidi(key, oct, scale, chordDeg + 1);
  const eleventh= scaleMidi(key, oct, scale, chordDeg + 3);

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
    pattern = voicingRoll < 0.5
      ? [root, fifth, seventh, fifth, root, fifth, seventh, fifth]
      : [root, third, seventh, fifth, root, third, seventh, fifth];
  } else if (scaleType === 'dorian') {
    pattern = voicingRoll < 0.5
      ? [root, fifth, seventh, fifth, root, fifth, seventh, fifth]
      : [root, third, fifth, seventh, root, third, fifth, seventh];
  } else {
    // minor
    pattern = voicingRoll < 0.4
      ? [root, fifth, seventh, fifth, root, fifth, seventh, fifth]
      : voicingRoll < 0.7
      ? [root, third, fifth, third, root, third, fifth, third]
      : [root, fifth, root + 12, fifth, root, fifth, root + 12, fifth];
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

// Arpeggio bar for pulse3 channel
function genArpBar(
  rng: RNG, scale: number[], key: number, oct: number, chordDeg: number,
  beatDur: number, barStart: number, mode: GenMode,
): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const root  = scaleMidi(key, oct, scale, chordDeg);
  const third = scaleMidi(key, oct, scale, chordDeg + 2);
  const fifth = scaleMidi(key, oct, scale, chordDeg + 4);
  const high  = root + 12;

  // Various arp shapes — picked randomly per bar so it's not always up-down
  const patterns: number[][] = [
    [root, third, fifth, high, fifth, third, root, third],   // up-down arch
    [root, fifth, high, fifth, root, fifth, high, fifth],    // root-octave bounce
    [root, third, fifth, third, root, third, fifth, third],  // simple 4-note
    [high, fifth, third, root, high, fifth, third, root],    // descending
    [root, fifth, third, fifth, high, fifth, third, root],   // mountain shape
    [root, root + 7, root + 4, root + 12, root, root + 7, root + 4, root + 7], // fourths/fifths
  ];
  const pattern = rng.pick(patterns);

  const noteLen = mode === 'battle' ? beatDur * 0.25 : beatDur * 0.5;
  const velBase = mode === 'ambient' ? 42 : 58;

  for (let i = 0; i < pattern.length; i++) {
    const t = barStart + i * noteLen;
    if (t >= barStart + 4 * beatDur - 0.01) break;
    if (mode === 'ambient' && rng.next() < 0.25) continue; // ambient: sparse
    notes.push({
      time: t,
      duration: noteLen * 0.82,
      midi: Math.max(0, Math.min(127, pattern[i])),
      velocity: velBase + (i % 2 === 0 ? rng.int(14) : rng.int(8)),
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
): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const root  = scaleMidi(key, oct, scale, chordDeg);
  const fifth = root + 7;
  const third = scaleMidi(key, oct, scale, chordDeg + 2);
  const chromatic = root + (rng.next() > 0.5 ? 1 : -1);

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

function genPercBar(rng: RNG, beatDur: number, barStart: number, mode: GenMode, useCompound = false): NoteEvent[] {
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
    [0, 2].forEach(b => notes.push({ time: barStart + b * beatDur, duration: 0.1, midi: KICK, velocity: 90 }));
    [1, 3].forEach(b => notes.push({ time: barStart + b * beatDur, duration: 0.1, midi: SNARE, velocity: 80 }));
    for (let b = 0; b < 4; b++) {
      if (rng.next() > 0.3) {
        notes.push({ time: barStart + b * beatDur, duration: 0.05, midi: HIHAT, velocity: 50 + rng.int(25) });
        if (rng.next() > 0.5) notes.push({ time: barStart + (b + 0.5) * beatDur, duration: 0.05, midi: HIHAT, velocity: 40 + rng.int(20) });
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
  intro:  { pulse2: false, wave: false, noise: false, pulse3: false, pad: true  },
  build:  { pulse2: false, wave: true,  noise: true,  pulse3: false, pad: true  },
  verse:  { pulse2: true,  wave: true,  noise: true,  pulse3: true,  pad: true  },
  chorus: { pulse2: true,  wave: true,  noise: true,  pulse3: true,  pad: true  },
  break:  { pulse2: false, wave: true,  noise: false, pulse3: false, pad: true  },
  outro:  { pulse2: false, wave: false, noise: false, pulse3: false, pad: false },
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
      noise:  generateNoise && sn < 1 && rng.next() > sn * 0.6 && (base.noise || rng.next() > 0.55),
      pulse3: sp3  < 1 && rng.next() > sp3 * 0.65  && (base.pulse3  || rng.next() > 0.65),
      pad:    spad < 1 && (base.pad    || rng.next() > 0.60),
    });
  }
  return out;
}

// ── Main export ───────────────────────────────────────────────

export function generate(config: GenConfig): GenResult {
  // High-entropy seed: time + random + key + mode hash
  const modeHash = config.mode === 'ambient' ? 1 : config.mode === 'mid' ? 2 : config.mode === 'battle' ? 3 : config.mode === 'jazzy' ? 4 : config.mode === 'funky' ? 5 : config.mode === 'silly' ? 6 : 7;
  const rng = new RNG(
    (Date.now() ^ (config.key * 1337) ^ (Math.random() * 0xFFFF | 0) ^ (modeHash * 999)) >>> 0
  );

  const DEFAULT_BPM_MAP: Record<GenMode, number> = { ambient: 65, mid: 130, battle: 183, jazzy: 105, funky: 120, silly: 170, weird: 100 };
  const baseBpm = config.bpm ?? DEFAULT_BPM_MAP[config.mode];
  const bpmJitter = (rng.next() - 0.5) * baseBpm * 0.10; // ±10% jitter
  const bpm = Math.round(baseBpm + bpmJitter);
  const beatDur = 60 / bpm;
  const barDur  = 4 * beatDur;

  const DEFAULT_SCALE: Record<GenMode, ScaleType> = { ambient: 'lydian', mid: 'mixolydian', battle: 'minor', jazzy: 'dorian', funky: 'dorian', silly: 'major', weird: 'wholeTone' };
  const scaleType: ScaleType = config.scaleType ?? DEFAULT_SCALE[config.mode];
  const scale = SCALES[scaleType];

  // A/B progressions: alternate between two different progressions every 4 bars
  const allProgs = PROGRESSIONS[scaleType];
  const progA = rng.pick(allProgs);
  const progBCandidates = allProgs.filter(p => p !== progA);
  const progB = progBCandidates.length > 0 ? rng.pick(progBCandidates) : progA;

  const rhythms = rng.pick(RHYTHM_PROFILES[config.mode]);
  const leadRhythms = rng.pick(LEAD_RHYTHM_PROFILES);
  const leadRestProb = LEAD_REST_PROB[config.mode];

  const sparseness = Math.max(0, Math.min(1, config.sparseness ?? 0));
  const generateNoise = config.generateNoise !== false;
  const sp1  = Math.max(0, Math.min(1, config.channelSparseness?.pulse1 ?? 0));
  const sp3  = Math.max(0, Math.min(1, config.channelSparseness?.pulse3 ?? 0));
  const spad = Math.max(0, Math.min(1, config.channelSparseness?.pad    ?? 0));

  const arrRng = new RNG(Math.floor(rng.next() * 0xFFFFFFFF));
  const arrangement = buildArrangement(config.bars, config.mode, sparseness, generateNoise, arrRng, config.channelSparseness);

  const pulse1: NoteEvent[] = [], pulse2: NoteEvent[] = [], wave: NoteEvent[] = [], noise: NoteEvent[] = [];
  const pulse3: NoteEvent[] = [], pad: NoteEvent[] = [];

  const melodyOctAdj = config.mode === 'ambient'
    ? (scaleType === 'wholeTone' || scaleType === 'lydian') ? 1
      : scaleType === 'minor' ? -1 : 0
    : 0;
  const isLowRegister = melodyOctAdj < 0;
  const melodyOct = config.octave + melodyOctAdj;
  const accompOct = config.octave - 1;
  const bassOct   = config.octave - 3;
  const arpOct    = config.octave;
  const padOct    = config.octave - 2;

  // Variable pitch range per song: 8–16 semitones
  const pitchSpan = 8 + rng.int(9);
  const lo = (melodyOct + 1) * 12 + config.key;
  const hi = lo + pitchSpan;

  // Random starting pitch: root, 3rd, or 5th
  const startDeg = rng.weighted([{ value: 0, w: 5 }, { value: 2, w: 2 }, { value: 4, w: 2 }]);
  let prevMidi = scaleMidi(config.key, melodyOct, scale, startDeg);
  let glockDeg = 4;

  type Dir = 'up' | 'down' | 'free';
  const dirPool: Dir[] = ['free', 'free', 'free', 'down', 'up'];
  const dirPattern: Dir[] = Array.from({ length: 4 }, () => rng.pick(dirPool));

  const restBias = (rng.next() - 0.5) * 0.15;

  const motif  = genMotif(rng, config.mode, scaleType);
  const bMotif = genMotif(rng, config.mode, scaleType);
  const motifVariants: MotifVariant[] = ['statement', 'answer', 'statement', 'inversion'];

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
  const pulse2Mode = rng.pick(['arp', 'arp', 'stab', 'stab', 'sparse', 'echo']);

  for (let bar = 0; bar < config.bars; bar++) {
    const barStart = bar * barDur;
    // A/B alternating progression: even 4-bar phrases use progA, odd use progB
    const phraseIndex = Math.floor(bar / 4);
    const activeProg = phraseIndex % 2 === 0 ? progA : progB;
    const chordDeg = activeProg[bar % activeProg.length];

    const phrasePos = bar % 4;
    const act = arrangement[Math.floor(bar / 4)];
    const section = barSections[bar];

    const velArc: Record<SectionType, number> = {
      intro: -15, build: -8, verse: 0, chorus: 10, break: -6, outro: -20,
    };
    const velOffset = velArc[section];

    const isChorus = section === 'chorus';
    const activeKey = isChorus ? (config.key + modulationSemitones) % 12 : config.key;
    const activeOct = isChorus ? melodyOct + (config.key + modulationSemitones >= 12 ? 1 : 0) : melodyOct;

    const pitchArcBias = PITCH_ARC[section];
    const arcDir: 'up' | 'down' | 'free' =
      pitchArcBias > 3 ? 'up' : pitchArcBias < -3 ? 'down' : dirPattern[phrasePos];

    const articulationScale = config.mode === 'battle' && isChorus ? 0.65
      : config.mode === 'ambient' && (section === 'break' || section === 'outro') ? 1.1 : 1.0;

    const isSilenceBar = bar === firstChorusBar;

    const isContrastPhrase = config.bars >= 8 && phraseIndex % 2 === 1;
    const isContrastBar = isContrastPhrase && phrasePos >= 2;
    const activeMotif = isContrastPhrase ? bMotif : motif;
    const useMotif = !isContrastBar && !isSilenceBar && rng.next() < 0.60;
    const variant = motifVariants[Math.floor(bar / 2) % 4];

    const augmentFactor = section === 'outro' ? 2
      : config.mode === 'battle' && (section === 'chorus' || section === 'verse') ? 0.5 : 1;

    const motifNotes = useMotif
      ? renderMotifVariant(activeMotif, variant, rng, scale, activeKey, activeOct, chordDeg, beatDur * augmentFactor, barStart)
      : [];
    const motifDur = useMotif ? activeMotif.totalBeats * beatDur * augmentFactor : 0;

    if (motifNotes.length > 0) prevMidi = motifNotes[motifNotes.length - 1].midi;

    const breathGap   = motifNotes.length > 0 && rng.next() < 0.50 ? beatDur : 0;
    const freeStart   = barStart + motifDur + breathGap;
    const freeDuration = Math.max(0, 4 * beatDur - motifDur - breathGap);

    const mel = !isSilenceBar && freeDuration > beatDur * 0.5
      ? genMelodyBar(rng, scale, activeKey, activeOct, chordDeg, beatDur, freeStart, arcDir, prevMidi, config.mode, scaleType, leadRhythms, lo, hi, freeDuration, leadRestProb - BASE_REST_PROB[config.mode] + restBias)
      : { notes: [], lastMidi: prevMidi };

    const applyVel = (notes: NoteEvent[]) => notes.map(n => ({
      ...n,
      velocity: Math.max(30, Math.min(127, n.velocity + velOffset)),
      duration: n.duration * articulationScale,
    }));

    prevMidi = mel.lastMidi;
    const pulse1Active = sp1 < 1 && arrRng.next() > sp1 * 0.7;
    if (!isSilenceBar && pulse1Active) pulse1.push(...applyVel([...motifNotes, ...mel.notes]));

    // Pulse2 — varied generation mode picked per song
    if (act.pulse2 && !isSilenceBar) {
      if (isLowRegister) {
        const glk = genGlockenspielBar(rng, scale, activeKey, activeOct, chordDeg, beatDur, barStart, glockDeg);
        pulse2.push(...applyVel(glk.notes));
        glockDeg = glk.lastDeg;
      } else if (pulse2Mode === 'echo' && (Math.floor(bar / 2) % 2 === 1) && motifNotes.length > 0) {
        // Call and response echo
        const echoNotes = [...motifNotes, ...mel.notes]
          .map(n => ({ ...n, time: n.time + beatDur, midi: Math.max(0, Math.min(127, n.midi - 12)), velocity: Math.max(30, n.velocity - 20) }))
          .filter(n => n.time < barStart + 4 * beatDur);
        pulse2.push(...applyVel(echoNotes));
      } else if (pulse2Mode === 'stab') {
        pulse2.push(...applyVel(genChordStabBar(rng, scale, activeKey, accompOct, chordDeg, beatDur, barStart)));
      } else {
        pulse2.push(...applyVel(genAccompBar(rng, scale, activeKey, accompOct, chordDeg, beatDur, barStart, scaleType)));
      }
    }

    // Wave (bass)
    const useCompound = config.mode === 'battle' && (section === 'chorus' || section === 'verse') && rng.next() > 0.5;
    if (act.wave) {
      const bassStyle = config.channelStyles?.wave;
      const nextChordDeg = activeProg[(bar + 1) % activeProg.length];
      if (bassStyle === 'alberti') {
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
        wave.push(...applyVel(genBassBar(rng, scale, config.key, bassOct, chordDeg, beatDur, barStart, config.mode, scaleType)));
      }
    }

    // Noise (drums)
    if (act.noise) noise.push(...genPercBar(rng, beatDur, barStart, config.mode, useCompound));

    // Pulse3 (arpeggio)
    if (act.pulse3 && sp3 < 1 && arrRng.next() > sp3 * 0.7) {
      const styleP3 = config.channelStyles?.pulse3;
      if (styleP3 === 'melody') {
        // Pulse3 as melody (countermelody)
        const p3mel = genMelodyBar(rng, scale, activeKey, arpOct, chordDeg, beatDur, barStart, arcDir, prevMidi, config.mode, scaleType, rhythms, lo - 12, hi - 12, 4 * beatDur, restBias + 0.1);
        pulse3.push(...applyVel(p3mel.notes));
      } else {
        pulse3.push(...applyVel(genArpBar(rng, scale, activeKey, arpOct, chordDeg, beatDur, barStart, config.mode)));
      }
    }

    // Pad (harmony)
    if (act.pad && spad < 1 && arrRng.next() > spad * 0.7 && !isSilenceBar) {
      pad.push(...applyVel(genPadBar(rng, scale, activeKey, padOct, chordDeg, beatDur, barStart, scaleType)));
    }
  }

  return { channels: { pulse1, pulse2, wave, noise, pulse3, pad }, duration: config.bars * barDur, bpm };
}
