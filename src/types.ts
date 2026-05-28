export interface NoteEvent {
  time: number;       // seconds from start
  duration: number;   // seconds
  midi: number;       // MIDI note 0-127
  velocity: number;   // 0-127
}

export type ChannelId = 'pulse1' | 'pulse2' | 'wave' | 'noise' | 'pulse3' | 'pad' | 'extra1' | 'extra2' | 'extra3';

export const CHANNELS: ChannelId[] = ['pulse1', 'pulse2', 'wave', 'noise', 'pulse3', 'pad', 'extra1', 'extra2', 'extra3'];

export const CHANNEL_META: Record<ChannelId, { label: string; emoji: string; color: string; glowColor: string; bgTint: string; defaultProgram: number }> = {
  pulse1: { label: 'PULSE 1', emoji: '', color: '#FF5FAE', glowColor: 'rgba(255,95,174,0.25)',  bgTint: 'rgba(255,95,174,0.06)',  defaultProgram: 80 },
  pulse2: { label: 'PULSE 2', emoji: '', color: '#3BBFED', glowColor: 'rgba(59,191,237,0.25)',  bgTint: 'rgba(59,191,237,0.06)',  defaultProgram: 81 },
  wave:   { label: 'WAVE',    emoji: '', color: '#3DD68C', glowColor: 'rgba(61,214,140,0.25)',  bgTint: 'rgba(61,214,140,0.06)',  defaultProgram: 38 },
  noise:  { label: 'NOISE',   emoji: '', color: '#FFB23F', glowColor: 'rgba(255,178,63,0.25)',  bgTint: 'rgba(255,178,63,0.06)',  defaultProgram: 118 },
  pulse3: { label: 'PULSE 3', emoji: '', color: '#B48EFF', glowColor: 'rgba(180,142,255,0.25)', bgTint: 'rgba(180,142,255,0.06)', defaultProgram: 73 },
  pad:    { label: 'PAD',     emoji: '', color: '#FF9E5E', glowColor: 'rgba(255,158,94,0.25)',  bgTint: 'rgba(255,158,94,0.06)',  defaultProgram: 89 },
  extra1: { label: 'EXTRA 1', emoji: '', color: '#F4D03F', glowColor: 'rgba(244,208,63,0.25)',  bgTint: 'rgba(244,208,63,0.06)',  defaultProgram: 11 },
  extra2: { label: 'EXTRA 2', emoji: '', color: '#52D9C1', glowColor: 'rgba(82,217,193,0.25)',  bgTint: 'rgba(82,217,193,0.06)',  defaultProgram: 46 },
  extra3: { label: 'EXTRA 3', emoji: '', color: '#E88DF7', glowColor: 'rgba(232,141,247,0.25)', bgTint: 'rgba(232,141,247,0.06)', defaultProgram: 98 },
};

export interface ChannelState {
  id: ChannelId;
  notes: NoteEvent[];
  presetIndex: number;
  muted: boolean;
}

export interface SF2Preset {
  name: string;
  bank: number;
  program: number;
  index: number;
  bagIndex: number;
}

export interface SF2SampleHeader {
  name: string;
  start: number;
  end: number;
  loopStart: number;
  loopEnd: number;
  sampleRate: number;
  originalPitch: number;
  pitchCorrection: number;
  sampleType: number;
}

export interface SF2Generator {
  oper: number;
  amount: number;
  amountLo: number;
  amountHi: number;
}

export interface SF2ParsedData {
  presets: SF2Preset[];
  presetBags: Array<{ genNdx: number; modNdx: number }>;
  presetGens: SF2Generator[];
  instruments: Array<{ name: string; bagIndex: number }>;
  instrumentBags: Array<{ genNdx: number; modNdx: number }>;
  instrumentGens: SF2Generator[];
  sampleHeaders: SF2SampleHeader[];
  sampleDataBuffer: ArrayBuffer;
  sampleDataOffset: number;
}

export interface ResolvedZone {
  sampleIndex: number;
  rootKey: number;
  fineTune: number;
  coarseTune: number;
  loopMode: number;
  scaleTuning: number;
  initialAttenuation: number;
  attackVolEnv: number;
  releaseVolEnv: number;
  loopStart: number;
  loopEnd: number;
}

export interface AppState {
  channels: Record<ChannelId, ChannelState>;
  duration: number;
  bpm: number;
  isPlaying: boolean;
  sf2: SF2ParsedData | null;
  inputType: 'none' | 'midi' | 'generated';
  assignmentMode: 'auto' | 'manual';
}
