import { Midi } from '@tonejs/midi';
import type { NoteEvent, ChannelId } from '../types';

interface TrackFeatures {
  trackIndex: number;
  notes: NoteEvent[];
  avgPitch: number;
  pitchVariance: number;
  noteCount: number;
  polyphonyRatio: number;
  isPercussion: boolean;
  density: number;
  register: 'low' | 'mid' | 'high';
}

function analyzeTrack(track: { notes: any[]; channel: number; [key: string]: any }, trackIndex: number): TrackFeatures {
  if (!track.notes || track.notes.length === 0) {
    return {
      trackIndex,
      notes: [],
      avgPitch: 60,
      pitchVariance: 0,
      noteCount: 0,
      polyphonyRatio: 0,
      isPercussion: false,
      density: 0,
      register: 'mid',
    };
  }

  const isPercussion = track.channel === 9;
  const notes: NoteEvent[] = track.notes.map((n: any) => ({
    time: n.time,
    duration: Math.max(0.05, n.duration),
    midi: n.midi,
    velocity: Math.round(n.velocity * 127),
  }));

  const pitches = notes.map(n => n.midi);
  const avgPitch = pitches.reduce((a, b) => a + b, 0) / pitches.length;
  const pitchVariance = pitches.reduce((a, b) => a + (b - avgPitch) ** 2, 0) / pitches.length;

  // Count overlapping notes as measure of polyphony
  let overlaps = 0;
  for (let i = 0; i < notes.length - 1; i++) {
    if (notes[i].time + notes[i].duration > notes[i + 1].time) overlaps++;
  }
  const polyphonyRatio = notes.length > 1 ? overlaps / (notes.length - 1) : 0;

  const duration = notes[notes.length - 1].time + notes[notes.length - 1].duration;
  const density = notes.length / Math.max(1, duration);

  const register: 'low' | 'mid' | 'high' = avgPitch < 48 ? 'low' : avgPitch > 72 ? 'high' : 'mid';

  return {
    trackIndex,
    notes,
    avgPitch,
    pitchVariance,
    noteCount: notes.length,
    polyphonyRatio,
    isPercussion,
    density,
    register,
  };
}

export function processMIDI(arrayBuffer: ArrayBuffer): {
  channels: Record<ChannelId, NoteEvent[]>;
  duration: number;
  bpm: number;
} {
  const midi = new Midi(arrayBuffer);
  const bpm = midi.header.tempos.length > 0 ? midi.header.tempos[0].bpm : 120;

  // Filter and analyze tracks
  const trackFeatures = midi.tracks
    .map((t, i) => analyzeTrack(t as any, i))
    .filter(f => f.noteCount > 0);

  if (trackFeatures.length === 0) {
    return {
      channels: { pulse1: [], pulse2: [], wave: [], noise: [], pulse3: [], pad: [], extra1: [], extra2: [], extra3: [] },
      duration: 0,
      bpm,
    };
  }

  // Separate percussion from melodic tracks
  const percTracks = trackFeatures.filter(f => f.isPercussion);
  const melodicTracks = trackFeatures.filter(f => !f.isPercussion);

  // Sort melodic tracks by avg pitch descending (highest first)
  melodicTracks.sort((a, b) => b.avgPitch - a.avgPitch);

  const assigned: Record<ChannelId, TrackFeatures[]> = {
    pulse1: [],
    pulse2: [],
    wave: [],
    noise: [],
    pulse3: [],
    pad: [],
    extra1: [],
    extra2: [],
    extra3: [],
  };

  // Noise channel: use percussion tracks
  assigned.noise = percTracks;

  if (melodicTracks.length === 0) {
    // Nothing to assign
  } else if (melodicTracks.length === 1) {
    // Single melodic track: split by register
    const track = melodicTracks[0];
    const highNotes = track.notes.filter(n => n.midi >= 60);
    const lowNotes = track.notes.filter(n => n.midi < 60);
    if (highNotes.length > 0) {
      assigned.pulse1 = [{ ...track, notes: highNotes }];
    }
    if (lowNotes.length > 0) {
      assigned.wave = [{ ...track, notes: lowNotes }];
    }
    // If only one register, assign pulse1
    if (highNotes.length === 0 && lowNotes.length > 0) {
      assigned.pulse1 = assigned.wave;
      assigned.wave = [];
    }
  } else if (melodicTracks.length === 2) {
    // Two tracks: highest → pulse1, lowest → wave
    assigned.pulse1 = [melodicTracks[0]];
    assigned.wave = [melodicTracks[1]];
  } else {
    // 3+ tracks: lowest → wave, remaining sorted by polyphony
    assigned.wave = [melodicTracks[melodicTracks.length - 1]];
    const remaining = melodicTracks.slice(0, -1);
    // Sort by polyphony ascending (most monophonic first = lead)
    remaining.sort((a, b) => a.polyphonyRatio - b.polyphonyRatio);
    assigned.pulse1 = [remaining[0]];
    // Everything else → pulse2
    assigned.pulse2 = remaining.slice(1);
  }

  function mergeNotes(tracks: TrackFeatures[]): NoteEvent[] {
    return tracks
      .flatMap(t => t.notes)
      .sort((a, b) => a.time - b.time);
  }

  const duration = Math.max(
    ...trackFeatures.map(f =>
      f.notes.length > 0
        ? f.notes[f.notes.length - 1].time + f.notes[f.notes.length - 1].duration
        : 0
    ),
    0
  );

  return {
    channels: {
      pulse1: mergeNotes(assigned.pulse1),
      pulse2: mergeNotes(assigned.pulse2),
      wave: mergeNotes(assigned.wave),
      noise: mergeNotes(assigned.noise),
      pulse3: mergeNotes(assigned.pulse3),
      pad: mergeNotes(assigned.pad),
      extra1: mergeNotes(assigned.extra1),
      extra2: mergeNotes(assigned.extra2),
      extra3: mergeNotes(assigned.extra3),
    },
    duration,
    bpm,
  };
}
