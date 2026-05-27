import { Midi } from '@tonejs/midi';
import type { ChannelId, ChannelState } from '../types';
import { CHANNELS } from '../types';

const CHANNEL_MIDI_NUM: Record<ChannelId, number> = {
  pulse1: 0,
  pulse2: 1,
  wave: 2,
  noise: 9,
  pulse3: 3,
  pad: 4,
};

export function buildMIDI(
  channels: Record<ChannelId, ChannelState>,
  bpm: number
): Uint8Array {
  const midi = new Midi();
  midi.header.setTempo(bpm);

  for (const chId of CHANNELS) {
    const ch = channels[chId];
    if (ch.notes.length === 0) continue;

    const track = midi.addTrack();
    // @ts-ignore
    (track as any).channel = CHANNEL_MIDI_NUM[chId];

    if (chId !== 'noise') {
      track.instrument.number = ch.presetIndex % 128;
    }

    for (const note of ch.notes) {
      track.addNote({
        midi: Math.max(0, Math.min(127, note.midi)),
        time: note.time,
        duration: Math.max(0.01, note.duration),
        velocity: Math.max(0, Math.min(1, note.velocity / 127)),
      });
    }
  }

  return midi.toArray();
}

export function buildSingleChannelMIDI(
  channelId: ChannelId,
  channel: ChannelState,
  bpm: number
): Uint8Array {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  if (channel.notes.length === 0) return midi.toArray();

  const track = midi.addTrack();
  // @ts-ignore
  (track as any).channel = CHANNEL_MIDI_NUM[channelId];

  if (channelId !== 'noise') {
    track.instrument.number = channel.presetIndex % 128;
  }

  for (const note of channel.notes) {
    track.addNote({
      midi: Math.max(0, Math.min(127, note.midi)),
      time: note.time,
      duration: Math.max(0.01, note.duration),
      velocity: Math.max(0, Math.min(1, note.velocity / 127)),
    });
  }

  return midi.toArray();
}

export function downloadMIDI(data: Uint8Array, filename = 'output.mid'): void {
  const blob = new Blob([data.buffer as ArrayBuffer], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
