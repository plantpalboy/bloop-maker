import type { NoteEvent, ChannelId } from '../types';
import type { ScaleType } from './MelodyGenerator';

export type { ScaleType };

export interface ScramblerConfig {
  transposeSteps: number;
  variationLevel: number;
  scaleSnap: boolean;
  scaleRoot: number;
  scaleType: ScaleType;
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

function snapToScale(midi: number, root: number, scale: number[]): number {
  const pc    = ((midi % 12) + 12) % 12;
  const relPc = ((pc - root) + 12) % 12;
  let bestDiff = 99, bestSnap = relPc;
  for (const s of scale) {
    const dist = Math.min(Math.abs(s - relPc), 12 - Math.abs(s - relPc));
    if (dist < Math.abs(bestDiff)) { bestDiff = s - relPc; bestSnap = s; }
  }
  return Math.max(0, Math.min(127, midi + bestDiff));
}

// Get the degree index of a MIDI note in a scale, or -1 if not found
function getScaleDeg(midi: number, root: number, scale: number[]): number {
  const relPc = ((midi % 12) - root + 24) % 12;
  const octShift = Math.floor(midi / 12) - Math.floor((root + 60) / 12);
  const idx = scale.indexOf(relPc);
  if (idx === -1) return -1;
  return idx + octShift * scale.length;
}

// Reconstruct a melody using music theory: preserve rhythm exactly but
// re-voice pitches using scale-aware transformations (inversion, sequence, transposition).
function reharmonize(notes: NoteEvent[], root: number, scale: number[], variationLevel: number): NoteEvent[] {
  if (notes.length === 0) return notes;
  if (variationLevel <= 0) return notes.map(n => ({ ...n }));

  // Snap all notes to scale first
  const snapped = notes.map(n => ({ ...n, midi: snapToScale(n.midi + 0, root, scale) }));

  // Choose a theory transform based on variation level:
  // low variation = small motif shift, high variation = inversion or sequence
  const roll = Math.random();

  if (roll < 0.3 || variationLevel < 0.2) {
    // Diatonic shift: move all pitches up/down by 1-3 scale steps
    const shift = Math.floor(Math.random() * 5) - 2; // -2 to +2 scale steps
    return snapped.map(n => {
      const relPc = ((n.midi % 12) - root + 24) % 12;
      const octBase = Math.floor(n.midi / 12);
      const idx = scale.indexOf(relPc);
      if (idx === -1) return n;
      const newIdx = ((idx + shift) % scale.length + scale.length) % scale.length;
      const octOff = Math.floor((idx + shift) / scale.length);
      const newMidi = (octBase + octOff) * 12 + root + scale[newIdx];
      return { ...n, midi: Math.max(0, Math.min(127, newMidi)) };
    });
  }

  if (roll < 0.6 || variationLevel < 0.5) {
    // Melodic inversion: mirror intervals around the first note
    const firstMidi = snapped[0].midi;
    return snapped.map((n, i) => {
      if (i === 0) return n;
      const interval = n.midi - firstMidi;
      const invMidi = snapToScale(firstMidi - interval, root, scale);
      return { ...n, midi: Math.max(0, Math.min(127, invMidi)) };
    });
  }

  if (roll < 0.8) {
    // Sequential fragmentation: take first 2-3 notes as a cell and repeat up/down
    const cellLen = Math.min(3, Math.floor(snapped.length / 2)) || 1;
    const result: NoteEvent[] = [];
    let offset = 0;
    for (let i = 0; i < snapped.length; i++) {
      const cellPos = i % cellLen;
      const cellRepeat = Math.floor(i / cellLen);
      // Shift each cell by 2 scale degrees
      const shiftDeg = cellRepeat * (Math.random() < 0.5 ? 2 : -2);
      const n = snapped[cellPos];
      const relPc = ((n.midi % 12) - root + 24) % 12;
      const octBase = Math.floor(n.midi / 12);
      const idx = scale.indexOf(relPc);
      if (idx === -1) { result.push({ ...n, time: i < snapped.length ? snapped[i].time : n.time, duration: snapped[i]?.duration ?? n.duration }); continue; }
      const newIdx = ((idx + shiftDeg) % scale.length + scale.length) % scale.length;
      const octOff = Math.floor((idx + shiftDeg) / scale.length);
      const newMidi = (octBase + octOff) * 12 + root + scale[newIdx];
      result.push({ ...snapped[i], midi: Math.max(0, Math.min(127, newMidi)) });
    }
    return result;
  }

  // Retrograde + inversion: reverse the pitch order, keep rhythm
  const pitches = snapped.map(n => n.midi).reverse();
  return snapped.map((n, i) => ({
    ...n,
    midi: snapToScale(pitches[i] ?? n.midi, root, scale),
  }));
}

export function scramble(
  channels: Record<ChannelId, NoteEvent[]>,
  config: ScramblerConfig,
): Record<ChannelId, NoteEvent[]> {
  const scale = SCALES[config.scaleType];
  const root  = config.scaleRoot;

  // Apply optional transpose, then snap to scale, then reharmonize using music theory
  const process = (notes: NoteEvent[]): NoteEvent[] => {
    const transposed = notes.map(n => ({ ...n, midi: Math.max(0, Math.min(127, n.midi + config.transposeSteps)) }));
    const snapped    = config.scaleSnap ? transposed.map(n => ({ ...n, midi: snapToScale(n.midi, root, scale) })) : transposed;
    return reharmonize(snapped, root, scale, config.variationLevel);
  };

  return {
    pulse1: process(channels.pulse1),
    pulse2: process(channels.pulse2),
    wave:   process(channels.wave),
    noise:  channels.noise, // preserve drums
    pulse3: process(channels.pulse3 ?? []),
    pad:    process(channels.pad    ?? []),
  };
}
