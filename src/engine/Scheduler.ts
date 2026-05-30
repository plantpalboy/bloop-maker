import type { ChannelId, ChannelState, AppState } from '../types';
import { CHANNELS } from '../types';
import { SF2Sampler } from '../sf2/SF2Sampler';

const SCHEDULE_AHEAD_S = 0.5;
const TICK_INTERVAL_MS = 50;
const NEAR_END_THRESHOLD_S = 4;

export class Scheduler {
  private ctx: AudioContext;
  private sampler: SF2Sampler;
  private timerID: number | null = null;
  private startContextTime = 0;
  private startSongTime = 0;
  private noteScheduled: Set<string> = new Set();
  private channels: Record<ChannelId, ChannelState> = {} as Record<ChannelId, ChannelState>;
  private nearEndFired = false;
  private beatScheduled: Set<number> = new Set();
  bpm = 130;

  // Set before start() to enable swing (0 = off, 0.33 = max triplet swing)
  swingAmount = 0;
  // Metronome click track (synced to song beats)
  metronome = false;

  duration = 0;
  loop = false;
  onTimeUpdate?: (t: number) => void;
  onEnded?: () => void;
  onNearEnd?: () => void;
  onLoop?: () => void;

  constructor(ctx: AudioContext, sampler: SF2Sampler) {
    this.ctx = ctx;
    this.sampler = sampler;
  }

  async start(state: AppState, fromTime = 0): Promise<void> {
    await this.ctx.resume();
    this.channels = state.channels;
    this.duration = state.duration;
    this.bpm = state.bpm;
    this.startContextTime = this.ctx.currentTime;
    this.startSongTime = fromTime;
    this.noteScheduled.clear();
    this.beatScheduled.clear();
    this.nearEndFired = false;
    this.timerID = window.setInterval(() => this.tick(), TICK_INTERVAL_MS);
    this.tick(); // schedule immediately so notes at time=0 aren't missed
  }

  stop(): void {
    if (this.timerID !== null) { clearInterval(this.timerID); this.timerID = null; }
    this.sampler.stopAll();
  }

  extendDuration(newDuration: number): void {
    this.duration = newDuration;
    this.nearEndFired = false;
  }

  seek(time: number): void {
    this.sampler.stopAll();
    this.startContextTime = this.ctx.currentTime;
    this.startSongTime = time;
    this.noteScheduled.clear();
    this.beatScheduled.clear();
    if (this.duration - time > NEAR_END_THRESHOLD_S) this.nearEndFired = false;
  }

  get currentSongTime(): number {
    if (this.timerID === null) return this.startSongTime;
    return this.startSongTime + (this.ctx.currentTime - this.startContextTime);
  }

  get isRunning(): boolean { return this.timerID !== null; }

  private swingOffset(noteTime: number, chId: ChannelId): number {
    if (this.swingAmount === 0 || chId === 'noise') return 0;
    const beatDur = 60 / this.bpm;
    const posInBeat = noteTime % beatDur;
    const half = beatDur * 0.5;
    // Off-beat 8th note: within 15% of the half-beat position
    if (Math.abs(posInBeat - half) < half * 0.18) {
      return this.swingAmount * beatDur;
    }
    return 0;
  }

  private tick(): void {
    const songTime = this.currentSongTime;
    this.onTimeUpdate?.(songTime);

    if (!this.nearEndFired && this.duration - songTime < NEAR_END_THRESHOLD_S) {
      this.nearEndFired = true;
      this.onNearEnd?.();
    }

    if (songTime >= this.duration) {
      if (this.loop && this.duration > 0) {
        this.startContextTime += this.duration;
        this.noteScheduled.clear();
        this.beatScheduled.clear();
        this.nearEndFired = false;
        this.onLoop?.();
        this.tick();
        return;
      }
      this.stop(); this.onEnded?.(); return;
    }

    const scheduleUntil = songTime + SCHEDULE_AHEAD_S;

    for (const chId of CHANNELS) {
      const ch = this.channels[chId];
      if (!ch || ch.muted) continue;

      for (const note of ch.notes) {
        const noteKey = `${chId}:${note.time.toFixed(4)}:${note.midi}`;
        if (this.noteScheduled.has(noteKey)) continue;
        if (note.time < songTime - 0.1) continue;
        if (note.time > scheduleUntil) break;

        const swung = note.time + this.swingOffset(note.time, chId);
        const playAt = this.startContextTime + (swung - this.startSongTime);
        if (playAt >= this.ctx.currentTime - 0.01) {
          this.sampler.playNote(ch.presetIndex, note.midi, note.velocity, playAt, note.duration, chId);
          this.noteScheduled.add(noteKey);
        }
      }
    }

    // Metronome: schedule a click on every beat in the lookahead window. The
    // first beat of each 4/4 bar is accented.
    if (this.metronome) {
      const beatDur = 60 / this.bpm;
      for (let b = Math.floor(songTime / beatDur); b * beatDur <= scheduleUntil; b++) {
        const beatSong = b * beatDur;
        if (beatSong < songTime - 0.05 || beatSong >= this.duration) continue;
        if (this.beatScheduled.has(b)) continue;
        const playAt = this.startContextTime + (beatSong - this.startSongTime);
        if (playAt >= this.ctx.currentTime - 0.01) {
          Scheduler.click(this.ctx, playAt, b % 4 === 0);
          this.beatScheduled.add(b);
        }
      }
    }
  }

  // Synthesize a short metronome click (a quick filtered blip). Static so the
  // app can reuse it for the pre-record count-in.
  static click(ctx: AudioContext, atTime: number, accent: boolean): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = accent ? 1760 : 1100;
    const peak = accent ? 0.22 : 0.13;
    gain.gain.setValueAtTime(0.0001, atTime);
    gain.gain.exponentialRampToValueAtTime(peak, atTime + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, atTime + 0.045);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(atTime);
    osc.stop(atTime + 0.06);
  }
}
