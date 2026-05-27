import { PitchDetector } from 'pitchy';
import type { NoteEvent, ChannelId } from '../types';

async function filterBand(
  mono: Float32Array<ArrayBuffer>,
  sampleRate: number,
  type: BiquadFilterType,
  frequency: number,
  Q?: number
): Promise<Float32Array<ArrayBuffer>> {
  const ctx = new OfflineAudioContext(1, mono.length, sampleRate);
  const buf = ctx.createBuffer(1, mono.length, sampleRate);
  buf.copyToChannel(mono, 0);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  if (Q !== undefined) filter.Q.value = Q;
  src.connect(filter);
  filter.connect(ctx.destination);
  src.start();
  const rendered = await ctx.startRendering();
  return rendered.getChannelData(0);
}

function detectPitchNotes(
  signal: Float32Array<ArrayBuffer>,
  sampleRate: number,
  frameSize: number,
  hopSize: number
): NoteEvent[] {
  const detector = PitchDetector.forFloat32Array(frameSize);
  const notes: NoteEvent[] = [];
  let activeNote: { midi: number; startTime: number; startOffset: number; velocity: number } | null = null;

  for (let offset = 0; offset + frameSize <= signal.length; offset += hopSize) {
    const frame = signal.slice(offset, offset + frameSize);
    const [pitch, clarity] = detector.findPitch(frame, sampleRate);
    const currentTime = offset / sampleRate;

    // Calculate RMS for velocity
    let rmsSum = 0;
    for (let i = 0; i < frame.length; i++) rmsSum += frame[i] * frame[i];
    const rms = Math.sqrt(rmsSum / frame.length);
    const velocity = Math.max(40, Math.min(120, Math.round(rms * 2000)));

    if (clarity > 0.85 && pitch > 50 && pitch < 4000) {
      const midi = Math.round(12 * Math.log2(pitch / 440) + 69);
      // Clamp to valid MIDI range
      const clampedMidi = Math.max(0, Math.min(127, midi));

      if (activeNote && Math.abs(activeNote.midi - clampedMidi) <= 1) {
        // Continue current note (update velocity to latest frame)
      } else {
        if (activeNote) {
          const duration = currentTime - activeNote.startTime;
          if (duration >= 0.05) {
            notes.push({
              time: activeNote.startTime,
              duration,
              midi: activeNote.midi,
              velocity: activeNote.velocity,
            });
          }
        }
        activeNote = { midi: clampedMidi, startTime: currentTime, startOffset: offset, velocity };
      }
    } else {
      if (activeNote) {
        const duration = currentTime - activeNote.startTime;
        if (duration >= 0.05) {
          notes.push({
            time: activeNote.startTime,
            duration,
            midi: activeNote.midi,
            velocity: activeNote.velocity,
          });
        }
        activeNote = null;
      }
    }
  }

  // Close any remaining note
  if (activeNote) {
    const endTime = signal.length / sampleRate;
    const duration = endTime - activeNote.startTime;
    if (duration >= 0.05) {
      notes.push({
        time: activeNote.startTime,
        duration,
        midi: activeNote.midi,
        velocity: activeNote.velocity,
      });
    }
  }

  return notes;
}

function detectNoiseOnsets(signal: Float32Array<ArrayBuffer>, sampleRate: number): NoteEvent[] {
  const frameSize = 1024;
  const notes: NoteEvent[] = [];
  let prevRms = 0;

  for (let offset = 0; offset + frameSize <= signal.length; offset += frameSize) {
    let rmsSum = 0;
    for (let i = offset; i < offset + frameSize; i++) rmsSum += signal[i] * signal[i];
    const rms = Math.sqrt(rmsSum / frameSize);

    if (rms > prevRms * 2.5 && rms > 0.02) {
      const time = offset / sampleRate;
      const velocity = Math.max(40, Math.min(120, Math.round(rms * 1500)));
      notes.push({ time, duration: 0.1, midi: 38, velocity });
    }

    // Smoothed RMS tracking
    prevRms = rms * 0.3 + prevRms * 0.7;
  }

  return notes;
}

export async function analyzeMP3(
  file: File,
  audioCtx: AudioContext,
  onProgress?: (pct: number) => void
): Promise<{ channels: Record<ChannelId, NoteEvent[]>; duration: number; bpm: number }> {
  onProgress?.(5);
  const arrayBuffer = await file.arrayBuffer();
  onProgress?.(10);

  // Decode with a fresh AudioContext to avoid issues with closed contexts
  const decodeCtx = new AudioContext();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
  } finally {
    decodeCtx.close();
  }
  onProgress?.(20);

  // Mix to mono
  const mono = new Float32Array(audioBuffer.length);
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) mono[i] += data[i];
  }
  if (audioBuffer.numberOfChannels > 1) {
    for (let i = 0; i < mono.length; i++) mono[i] /= audioBuffer.numberOfChannels;
  }

  const sr = audioBuffer.sampleRate;
  onProgress?.(25);

  // Limit to first 120 seconds for performance
  const maxSamples = Math.min(mono.length, sr * 120);
  const monoTrimmed = new Float32Array(mono.buffer.slice(0, maxSamples * 4)) as Float32Array<ArrayBuffer>;

  const [bassSignal, midSignal, leadSignal] = await Promise.all([
    filterBand(monoTrimmed, sr, 'lowpass', 250),
    filterBand(monoTrimmed, sr, 'bandpass', 800, 1),
    filterBand(monoTrimmed, sr, 'bandpass', 3000, 1),
  ]);
  onProgress?.(60);

  const frameSize = 4096;
  const hopSize = 1024;

  const waveNotes = detectPitchNotes(bassSignal, sr, frameSize, hopSize);
  const pulse2Notes = detectPitchNotes(midSignal, sr, frameSize, hopSize);
  const pulse1Notes = detectPitchNotes(leadSignal, sr, frameSize, hopSize);
  onProgress?.(85);

  const noiseNotes = detectNoiseOnsets(monoTrimmed, sr);
  onProgress?.(95);

  // Estimate BPM from onset intervals
  const allOnsets = [...waveNotes, ...pulse1Notes, ...pulse2Notes]
    .map(n => n.time)
    .sort((a, b) => a - b);

  let bpm = 120;
  if (allOnsets.length > 4) {
    const intervals = allOnsets.slice(1)
      .map((t, i) => t - allOnsets[i])
      .filter(d => d > 0.1 && d < 2);
    if (intervals.length > 0) {
      const sorted = [...intervals].sort((a, b) => a - b);
      const medianInterval = sorted[Math.floor(sorted.length / 2)];
      bpm = Math.round(60 / medianInterval);
      bpm = Math.max(60, Math.min(200, bpm));
    }
  }

  onProgress?.(100);

  return {
    channels: {
      pulse1: pulse1Notes,
      pulse2: pulse2Notes,
      wave: waveNotes,
      noise: noiseNotes,
      pulse3: [],
      pad: [],
    },
    duration: audioBuffer.duration,
    bpm,
  };
}
