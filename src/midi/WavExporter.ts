import { SF2Sampler } from '../sf2/SF2Sampler';
import type { AppState, SF2ParsedData, ChannelId } from '../types';
import { CHANNELS } from '../types';

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numCh = 2;
  const sr = buffer.sampleRate;
  const len = buffer.length;
  const bps = 2;
  const dataSize = len * numCh * bps;
  const view = new DataView(new ArrayBuffer(44 + dataSize));

  const w = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true);
  w(8, 'WAVE'); w(12, 'fmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true); view.setUint32(28, sr * numCh * bps, true);
  view.setUint16(32, numCh * bps, true); view.setUint16(34, 16, true);
  w(36, 'data'); view.setUint32(40, dataSize, true);

  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : ch0;
  let off = 44;
  for (let i = 0; i < len; i++) {
    const s0 = Math.max(-1, Math.min(1, ch0[i]));
    const s1 = Math.max(-1, Math.min(1, ch1[i]));
    view.setInt16(off,     s0 < 0 ? s0 * 32768 : s0 * 32767, true);
    view.setInt16(off + 2, s1 < 0 ? s1 * 32768 : s1 * 32767, true);
    off += 4;
  }
  return view.buffer;
}

export async function exportWAV(
  state: AppState,
  channelVolumes: Record<string, number>,
  channelPans: Record<string, number>,
  masterVolume: number,
  reverbWet: number,
  reverbDecay: number,
  onProgress: (pct: number) => void,
  sf2List?: SF2ParsedData[],
  channelSF2Idx?: Partial<Record<ChannelId, number>>,
  filename?: string,
): Promise<void> {
  const primarySF2 = sf2List?.[0] ?? state.sf2;
  if (!primarySF2) throw new Error('No SF2 loaded');

  const sr = 44100;
  const renderDuration = state.duration + 2.5;
  const offlineCtx = new OfflineAudioContext(2, Math.ceil(sr * renderDuration), sr);
  const sampler = new SF2Sampler(offlineCtx as unknown as AudioContext, primarySF2);

  if (sf2List && sf2List.length > 1) {
    for (let i = 1; i < sf2List.length; i++) sampler.addSF2(sf2List[i]);
  }
  if (channelSF2Idx) {
    for (const [id, idx] of Object.entries(channelSF2Idx)) {
      if (idx != null) sampler.setChannelSF2(id as ChannelId, idx);
    }
  }

  sampler.setVolume(masterVolume);
  for (const id of CHANNELS) {
    sampler.setChannelVolume(id, channelVolumes[id] ?? 1);
    sampler.setChannelPan(id, channelPans[id] ?? 0);
  }
  if (reverbWet > 0) sampler.setReverbAmount(reverbWet, reverbDecay);

  let total = 0;
  for (const id of CHANNELS) total += state.channels[id]?.notes.length ?? 0;
  let scheduled = 0;

  for (const id of CHANNELS) {
    const ch = state.channels[id];
    if (!ch || ch.muted) continue;
    for (const note of ch.notes) {
      if (note.time < renderDuration) {
        sampler.playNote(ch.presetIndex, note.midi, note.velocity, note.time, note.duration, id);
      }
      scheduled++;
      if (scheduled % 200 === 0) onProgress(0.1 + (scheduled / total) * 0.4);
    }
  }

  onProgress(0.5);
  const buffer = await offlineCtx.startRendering();
  onProgress(0.85);

  const wavData = audioBufferToWav(buffer);
  const blob = new Blob([wavData], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename ?? `bloopmaker_${Date.now()}.wav`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  onProgress(1.0);
}
