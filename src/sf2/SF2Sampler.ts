import type { SF2ParsedData, ResolvedZone, ChannelId } from '../types';
import { CHANNELS } from '../types';

const GEN_KEY_RANGE           = 43;
const GEN_VEL_RANGE           = 44;
const GEN_INSTRUMENT          = 41;
const GEN_SAMPLE_ID           = 53;
const GEN_OVERRIDE_ROOT_KEY   = 58;
const GEN_FINE_TUNE           = 52;
const GEN_COARSE_TUNE         = 51;
const GEN_SAMPLE_MODES        = 54;
const GEN_SCALE_TUNING        = 56;
const GEN_INITIAL_ATTENUATION = 48;
const GEN_ATTACK_VOL_ENV      = 34;
const GEN_RELEASE_VOL_ENV     = 38;

function signedAmount(raw: number): number {
  return raw > 32767 ? raw - 65536 : raw;
}

function timecentsToSec(tc: number): number {
  return Math.pow(2, tc / 1200);
}

export class SF2Sampler {
  private ctx: AudioContext;
  // Multi-SF2: indexed array of soundfonts
  private sf2List: SF2ParsedData[] = [];
  // Per-channel SF2 index (default 0)
  private channelSF2Idx: Map<ChannelId, number> = new Map();
  // Per-SF2 audio buffer cache: sf2Idx -> (sampleIndex -> AudioBuffer)
  private audioBufferCaches: Map<number, Map<number, AudioBuffer>> = new Map();

  private activeNodes: AudioBufferSourceNode[] = [];
  private masterGain: GainNode;
  private compressor: DynamicsCompressorNode;
  private analyser: AnalyserNode;
  private channelGains: Map<ChannelId, GainNode>;
  private channelPans: Map<ChannelId, StereoPannerNode>;
  private reverbConvolver: ConvolverNode;
  private reverbWetGain: GainNode;

  constructor(ctx: AudioContext, initialSf2?: SF2ParsedData) {
    this.ctx = ctx;

    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value      = 6;
    this.compressor.ratio.value     = 8;
    this.compressor.attack.value    = 0.003;
    this.compressor.release.value   = 0.15;
    this.compressor.connect(ctx.destination);

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    this.analyser.connect(this.compressor);

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.75;
    this.masterGain.connect(this.analyser);

    this.reverbConvolver = ctx.createConvolver();
    this.reverbWetGain = ctx.createGain();
    this.reverbWetGain.gain.value = 0;
    this.masterGain.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbWetGain);
    this.reverbWetGain.connect(this.analyser);

    this.channelGains = new Map();
    this.channelPans = new Map();
    for (const id of CHANNELS) {
      const g = ctx.createGain();
      g.gain.value = 1.0;
      const pan = ctx.createStereoPanner();
      pan.pan.value = 0;
      g.connect(pan);
      pan.connect(this.masterGain);
      this.channelGains.set(id, g);
      this.channelPans.set(id, pan);
    }

    if (initialSf2) {
      this.sf2List.push(initialSf2);
      this.audioBufferCaches.set(0, new Map());
    }
  }

  // Add an additional SF2 soundfont; returns its index
  addSF2(sf2: SF2ParsedData): number {
    const idx = this.sf2List.length;
    this.sf2List.push(sf2);
    this.audioBufferCaches.set(idx, new Map());
    return idx;
  }

  // Set which SF2 index a channel should use for playback
  setChannelSF2(channelId: ChannelId, sf2Index: number): void {
    if (sf2Index >= 0 && sf2Index < this.sf2List.length) {
      this.channelSF2Idx.set(channelId, sf2Index);
    }
  }

  getSF2Count(): number { return this.sf2List.length; }

  setVolume(v: number): void {
    this.masterGain.gain.value = Math.max(0, Math.min(1, v)) * 0.75;
  }

  setChannelVolume(id: ChannelId, v: number): void {
    const g = this.channelGains.get(id);
    if (g) g.gain.value = Math.max(0, Math.min(1, v));
  }

  setChannelPan(id: ChannelId, pan: number): void {
    const p = this.channelPans.get(id);
    if (p) p.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime, 0.05);
  }

  setReverbAmount(wet: number, decayTime = 1.5): void {
    if (decayTime > 0 && wet > 0) {
      this.reverbConvolver.buffer = this.buildReverbIR(decayTime, 3);
    }
    this.reverbWetGain.gain.setTargetAtTime(wet * 0.6, this.ctx.currentTime, 0.05);
  }

  private buildReverbIR(duration: number, decay: number): AudioBuffer {
    const sr = this.ctx.sampleRate;
    const len = Math.ceil(sr * duration);
    const buf = this.ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  getAnalyser(): AnalyserNode { return this.analyser; }

  async resume(): Promise<void> {
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }

  findZone(sf2: SF2ParsedData, presetIndex: number, midiNote: number, velocity: number): ResolvedZone | null {
    const { presets, presetBags, presetGens, instruments, instrumentBags, instrumentGens, sampleHeaders } = sf2;
    if (presetIndex < 0 || presetIndex >= presets.length) return null;
    const preset = presets[presetIndex];

    const bagStart = preset.bagIndex;
    const bagEnd   = presets[presetIndex + 1]?.bagIndex ?? presetBags.length;

    for (let bagIdx = bagStart; bagIdx < bagEnd; bagIdx++) {
      if (bagIdx >= presetBags.length) break;
      const genStart = presetBags[bagIdx].genNdx;
      const genEnd   = presetBags[bagIdx + 1]?.genNdx ?? presetGens.length;

      let instIdx = -1;
      for (let gi = genStart; gi < genEnd; gi++) {
        if (presetGens[gi]?.oper === GEN_INSTRUMENT) { instIdx = presetGens[gi].amount; break; }
      }
      if (instIdx < 0 || instIdx >= instruments.length) continue;

      const ibagStart = instruments[instIdx].bagIndex;
      const ibagEnd   = instruments[instIdx + 1]?.bagIndex ?? instrumentBags.length;

      for (let ibagIdx = ibagStart; ibagIdx < ibagEnd; ibagIdx++) {
        if (ibagIdx >= instrumentBags.length) break;
        const igenStart = instrumentBags[ibagIdx].genNdx;
        const igenEnd   = instrumentBags[ibagIdx + 1]?.genNdx ?? instrumentGens.length;

        const z = new Map<number, { amount: number; amountLo: number; amountHi: number }>();
        for (let gi = igenStart; gi < igenEnd; gi++) {
          const g = instrumentGens[gi];
          if (g) z.set(g.oper, g);
        }

        const kr = z.get(GEN_KEY_RANGE);
        if (kr && (midiNote < kr.amountLo || midiNote > kr.amountHi)) continue;

        const vr = z.get(GEN_VEL_RANGE);
        if (vr && (velocity < vr.amountLo || velocity > vr.amountHi)) continue;

        const sid = z.get(GEN_SAMPLE_ID);
        if (!sid || sid.amount >= sampleHeaders.length) continue;

        const sampleIndex = sid.amount;
        const hdr = sampleHeaders[sampleIndex];

        const rkGen = z.get(GEN_OVERRIDE_ROOT_KEY);
        const rootKey = (rkGen && rkGen.amount < 128 && rkGen.amount !== 255)
          ? rkGen.amount
          : hdr.originalPitch;

        return {
          sampleIndex,
          rootKey,
          fineTune:           signedAmount(z.get(GEN_FINE_TUNE)?.amount ?? 0),
          coarseTune:         signedAmount(z.get(GEN_COARSE_TUNE)?.amount ?? 0),
          loopMode:           z.get(GEN_SAMPLE_MODES)?.amount ?? 0,
          scaleTuning:        z.get(GEN_SCALE_TUNING)?.amount ?? 100,
          initialAttenuation: z.get(GEN_INITIAL_ATTENUATION)?.amount ?? 0,
          attackVolEnv:       signedAmount(z.get(GEN_ATTACK_VOL_ENV)?.amount ?? -12000),
          releaseVolEnv:      signedAmount(z.get(GEN_RELEASE_VOL_ENV)?.amount ?? -12000),
          loopStart: hdr.loopStart,
          loopEnd:   hdr.loopEnd,
        };
      }
    }
    return null;
  }

  private decodeZoneSample(sf2: SF2ParsedData, zone: ResolvedZone): AudioBuffer {
    const hdr = sf2.sampleHeaders[zone.sampleIndex];
    const len = hdr.end - hdr.start;
    if (len <= 0) return this.ctx.createBuffer(1, 1, 44100);

    const buf = this.ctx.createBuffer(1, len, hdr.sampleRate);
    const out = buf.getChannelData(0);
    const byteOffset = sf2.sampleDataOffset + hdr.start * 2;
    const available  = Math.floor((sf2.sampleDataBuffer.byteLength - byteOffset) / 2);
    const safeLen    = Math.min(len, available);
    const i16 = new Int16Array(sf2.sampleDataBuffer, byteOffset, safeLen);
    for (let i = 0; i < safeLen; i++) out[i] = i16[i] / 32768;
    return buf;
  }

  private getAudioBuffer(sf2Idx: number, sf2: SF2ParsedData, zone: ResolvedZone): AudioBuffer {
    let cache = this.audioBufferCaches.get(sf2Idx);
    if (!cache) { cache = new Map(); this.audioBufferCaches.set(sf2Idx, cache); }
    if (!cache.has(zone.sampleIndex)) {
      cache.set(zone.sampleIndex, this.decodeZoneSample(sf2, zone));
    }
    return cache.get(zone.sampleIndex)!;
  }

  playNote(presetIndex: number, midiNote: number, velocity: number, startTime: number, duration: number, channelId?: ChannelId): void {
    if (this.sf2List.length === 0) return;
    const sf2Idx = channelId ? (this.channelSF2Idx.get(channelId) ?? 0) : 0;
    const sf2 = this.sf2List[sf2Idx] ?? this.sf2List[0];

    const zone = this.findZone(sf2, presetIndex, midiNote, velocity);
    if (!zone) return;

    const hdr = sf2.sampleHeaders[zone.sampleIndex];
    let audioBuf: AudioBuffer;
    try { audioBuf = this.getAudioBuffer(sf2Idx, sf2, zone); }
    catch (e) { console.warn('SF2 decode failed', zone.sampleIndex, e); return; }

    const totalCents =
      (midiNote - zone.rootKey) * (zone.scaleTuning || 100) +
      zone.coarseTune * 100 +
      zone.fineTune +
      hdr.pitchCorrection;
    const playbackRate = Math.max(0.01, Math.min(64, Math.pow(2, totalCents / 1200)));

    const attackSec  = Math.max(0.001, Math.min(0.4,  timecentsToSec(zone.attackVolEnv)));
    const releaseSec = Math.max(0.02,  Math.min(1.5,  timecentsToSec(zone.releaseVolEnv)));

    const attGain   = Math.pow(10, -Math.min(960, zone.initialAttenuation) / 200);
    const gainValue = attGain * (velocity / 127);

    const noteEnd      = startTime + duration;
    const attackEnd    = startTime + Math.min(attackSec, duration * 0.25);
    const releaseStart = Math.max(attackEnd + 0.001, noteEnd - Math.min(releaseSec, duration * 0.5, 0.5));
    const releaseEnd   = releaseStart + Math.min(releaseSec, 1.0);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainValue, attackEnd);
    gain.gain.setValueAtTime(gainValue, releaseStart);
    gain.gain.linearRampToValueAtTime(0, releaseEnd);

    const dest = channelId ? (this.channelGains.get(channelId) ?? this.masterGain) : this.masterGain;
    gain.connect(dest);

    const src = this.ctx.createBufferSource();
    src.buffer = audioBuf;
    src.playbackRate.value = playbackRate;

    if (zone.loopMode & 1) {
      const lsFrames = zone.loopStart - hdr.start;
      const leFrames = zone.loopEnd   - hdr.start;
      if (lsFrames >= 0 && leFrames > lsFrames && leFrames <= audioBuf.length) {
        src.loop      = true;
        src.loopStart = lsFrames / hdr.sampleRate;
        src.loopEnd   = leFrames / hdr.sampleRate;
      }
    }

    src.connect(gain);
    src.start(startTime);
    src.stop(releaseEnd + 0.05);
    this.activeNodes.push(src);

    if (this.activeNodes.length > 512) this.activeNodes.splice(0, 128);
  }

  stopAll(): void {
    const t = this.ctx.currentTime + 0.05;
    this.activeNodes.forEach(n => { try { n.stop(t); } catch {} });
    this.activeNodes = [];
  }
}
