import type { ChannelId } from './types';
import { CHANNELS } from './types';

export interface Keypoint { time: number; vol: number; } // time 0..duration, vol 0..1

export class VolumeAutomation {
  private lanes = new Map<ChannelId, Keypoint[]>();
  private canvases = new Map<ChannelId, HTMLCanvasElement>();
  private dragging: { id: ChannelId; idx: number } | null = null;
  private duration = 0;
  private onChangeCallback?: () => void;

  constructor() {
    for (const id of CHANNELS) this.lanes.set(id, []);
  }

  setDuration(d: number): void {
    this.duration = d;
    this.redrawAll();
  }

  onChange(cb: () => void): void { this.onChangeCallback = cb; }

  /** Returns interpolated volume (0–1) for a channel at time t. 1 if no keypoints. */
  getVolume(id: ChannelId, t: number): number {
    const pts = this.lanes.get(id);
    if (!pts || pts.length === 0) return 1;
    if (pts.length === 1) return pts[0].vol;
    if (t <= pts[0].time) return pts[0].vol;
    if (t >= pts[pts.length - 1].time) return pts[pts.length - 1].vol;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (t >= a.time && t <= b.time) {
        const f = (t - a.time) / (b.time - a.time);
        return a.vol + (b.vol - a.vol) * f;
      }
    }
    return 1;
  }

  hasAutomation(id: ChannelId): boolean {
    return (this.lanes.get(id)?.length ?? 0) > 0;
  }

  reset(): void {
    for (const id of CHANNELS) this.lanes.set(id, []);
    this.redrawAll();
  }

  serialize(): Record<string, Keypoint[]> {
    const out: Record<string, Keypoint[]> = {};
    for (const [id, pts] of this.lanes) if (pts.length) out[id] = pts;
    return out;
  }

  deserialize(data: Record<string, Keypoint[]>): void {
    for (const id of CHANNELS) {
      this.lanes.set(id, data[id] ? [...data[id]] : []);
    }
    this.redrawAll();
  }

  // ── Canvas binding ──────────────────────────────────────────

  bindCanvas(id: ChannelId, canvas: HTMLCanvasElement): void {
    this.canvases.set(id, canvas);
    this.draw(id);

    canvas.addEventListener('mousedown', e => this.onDown(id, e));
    canvas.addEventListener('mousemove', e => this.onMove(id, e));
    canvas.addEventListener('mouseup',   e => this.onUp(id, e));
    canvas.addEventListener('mouseleave',() => { if (this.dragging?.id === id) this.dragging = null; });
    canvas.addEventListener('dblclick',  e => this.onDblClick(id, e));
    canvas.addEventListener('contextmenu', e => { e.preventDefault(); this.onDblClick(id, e); });
  }

  private toCanvas(id: ChannelId, time: number, vol: number): { x: number; y: number } {
    const c = this.canvases.get(id)!;
    const W = c.width, H = c.height;
    const dur = this.duration || 1;
    return { x: (time / dur) * W, y: H - vol * H };
  }

  private fromCanvas(id: ChannelId, cx: number, cy: number): Keypoint {
    const c = this.canvases.get(id)!;
    const W = c.width, H = c.height;
    const dur = this.duration || 1;
    return {
      time: Math.max(0, Math.min(dur, (cx / W) * dur)),
      vol:  Math.max(0, Math.min(1, 1 - cy / H)),
    };
  }

  private hitTest(id: ChannelId, cx: number, cy: number): number {
    const pts = this.lanes.get(id)!;
    const RADIUS = 7;
    for (let i = 0; i < pts.length; i++) {
      const p = this.toCanvas(id, pts[i].time, pts[i].vol);
      if (Math.hypot(p.x - cx, p.y - cy) <= RADIUS) return i;
    }
    return -1;
  }

  private onDown(id: ChannelId, e: MouseEvent): void {
    const { x, y } = this.mousePos(id, e);
    const hit = this.hitTest(id, x, y);
    if (hit >= 0) {
      this.dragging = { id, idx: hit };
    } else {
      const pts = this.lanes.get(id)!;
      const kp = this.fromCanvas(id, x, y);
      pts.push(kp);
      pts.sort((a, b) => a.time - b.time);
      const newIdx = pts.indexOf(kp);
      this.dragging = { id, idx: newIdx };
      this.draw(id);
      this.onChangeCallback?.();
    }
  }

  private onMove(id: ChannelId, e: MouseEvent): void {
    const canvas = this.canvases.get(id)!;
    const { x, y } = this.mousePos(id, e);

    if (this.dragging?.id === id) {
      const pts = this.lanes.get(id)!;
      const kp = this.fromCanvas(id, x, y);
      pts[this.dragging.idx] = kp;
      pts.sort((a, b) => a.time - b.time);
      this.dragging.idx = pts.indexOf(kp);
      this.draw(id);
      this.onChangeCallback?.();
    } else {
      const hit = this.hitTest(id, x, y);
      canvas.style.cursor = hit >= 0 ? 'grab' : 'crosshair';
    }
  }

  private onUp(_id: ChannelId, _e: MouseEvent): void {
    this.dragging = null;
  }

  private onDblClick(id: ChannelId, e: MouseEvent): void {
    const { x, y } = this.mousePos(id, e);
    const hit = this.hitTest(id, x, y);
    if (hit >= 0) {
      const pts = this.lanes.get(id)!;
      pts.splice(hit, 1);
      this.draw(id);
      this.onChangeCallback?.();
    }
  }

  private mousePos(id: ChannelId, e: MouseEvent): { x: number; y: number } {
    const c = this.canvases.get(id)!;
    const r = c.getBoundingClientRect();
    const scaleX = c.width / r.width;
    const scaleY = c.height / r.height;
    return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
  }

  // ── Drawing ─────────────────────────────────────────────────

  private redrawAll(): void {
    for (const id of CHANNELS) this.draw(id);
  }

  draw(id: ChannelId): void {
    const canvas = this.canvases.get(id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    const pts = this.lanes.get(id)!;

    ctx.clearRect(0, 0, W, H);

    if (pts.length === 0) {
      // Flat line at 100% — always visible so user knows the lane is there
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(W, 1); ctx.stroke();
      ctx.setLineDash([]);
      return;
    }

    const first = this.toCanvas(id, pts[0].time, pts[0].vol);
    const last  = this.toCanvas(id, pts[pts.length - 1].time, pts[pts.length - 1].vol);

    // Line only — no fill
    ctx.beginPath();
    ctx.moveTo(0, first.y);
    for (const p of pts) {
      const cp = this.toCanvas(id, p.time, p.vol);
      ctx.lineTo(cp.x, cp.y);
    }
    ctx.lineTo(W, last.y);
    ctx.strokeStyle = 'rgba(120,200,255,0.85)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.stroke();

    // Keypoint dots
    for (const p of pts) {
      const cp = this.toCanvas(id, p.time, p.vol);
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,200,255,0.9)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}
