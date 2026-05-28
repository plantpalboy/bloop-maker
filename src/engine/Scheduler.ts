import type { ChannelId, ChannelState, AppState } from '../types';
import { CHANNELS } from '../types';
import { SF2Sampler } from '../sf2/SF2Sampler';

const SCHEDULE_AHEAD_S = 0.2;
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
  bpm = 130;

  // Set before start() to enable swing (0 = off, 0.33 = max triplet swing)
  swingAmount = 0;

  duration = 0;
  // When true the song wraps back to the top at the end instead of stopping (seamless game loop).
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
        // Wrap back to bar 1 without stopping audio: shift the time origin forward by one
        // loop length so currentSongTime rolls over to ~0, then reschedule from the top.
        this.startContextTime += this.duration;
        this.noteScheduled.clear();
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
  }
}
