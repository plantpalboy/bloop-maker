// Demo-build configuration.
//
// The demo build is produced with VITE_DEMO=true (see `npm run build:demo`).
// When IS_DEMO is true, the app limits features to create a "try before you buy"
// version: fewer presets/arps/archetypes, 4 channels, single soundfont, no WAV export.
//
// The full (paid) desktop build leaves VITE_DEMO unset, so IS_DEMO is false and
// every feature is available.

import type { ChannelId } from './types';

export const IS_DEMO: boolean = (import.meta as any).env?.VITE_DEMO === 'true';

// The 4 channels available in the demo (lead, harmony, bass, drums).
export const DEMO_CHANNELS: ChannelId[] = ['pulse1', 'pulse2', 'wave', 'noise'];

// Modes shown in the demo's Presets menu (fewer than the full version's 7).
export const DEMO_MODES = ['ambient', 'mid', 'battle', 'jazzy'];

// Number of preset entries to show per mode in the demo.
export const DEMO_PRESETS_PER_MODE = 1;

// Arp styles available in the demo dropdown (the rest are full-version only).
export const DEMO_ARP_STYLES = new Set(['auto', 'up', 'down', 'broken', 'alberti', 'bounce']);

// Archetypes available in the demo dropdown (the rest are full-version only).
export const DEMO_ARCHETYPES = new Set([
  'motif-preset-hook', 'motif-preset-hero', 'motif-preset-sad',
  'motif-preset-bounce', 'motif-preset-jazz', 'motif-preset-wave',
]);

// Steering modes available in the demo (the other 3 are full-version only).
export const DEMO_STEER_MODES = new Set(['bright', 'focused', 'cinematic']);

// Maximum song length in the demo (full version goes much longer).
export const DEMO_MAX_BARS = 16;

// Where the "Get the full version" links point.
export const FULL_VERSION_URL = 'https://plantpalboy.itch.io/';

// The set of actions blocked in the demo — used for consistent upgrade messaging.
// Exporting/saving files is the paid deliverable: the demo lets you fully experience
// generating, editing, steering, and hearing Bloop Maker, but not take files home.
export const DEMO_GATES = {
  exportMidi: true,        // Save MIDI
  exportChannelMidi: true, // per-channel MIDI export
  exportWav: true,         // Save WAV
  exportJson: true,        // JSON metadata export
  saveProject: true,       // .bloop project save
  importMidi: true,        // dropping in your own MIDI
  addMoreBars: true,       // "Add 16 More Bars"
};

