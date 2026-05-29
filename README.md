# Bloop Maker

A browser-based video game music composer and MIDI editor. Generates original chiptune-style songs using rule-based music theory algorithms — no AI, no internet required, runs entirely in your browser.

## What It Is

Bloop Maker is a **procedural music generator**. Every song is built from scratch using coded rules: chord progressions, melody contour, motif repetition, harmonic rhythm, bass line logic, drum patterns, and more. The output is deterministic from a seed — the same seed always produces the same song. Nothing is sampled or copied from existing music.

It runs fully offline. Once the page is loaded, no network connection is needed.

## Requirements

- [Node.js](https://nodejs.org/) v18 or newer
- npm (included with Node.js)
- A free `.sf2` soundfont file to hear audio (see below)

## Install & Run

```bash
git clone <this-repo>
cd midiplayer
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## Getting Audio: Soundfonts

Bloop Maker generates MIDI data. To hear sound, you need a **SoundFont (.sf2)** file — a standard audio format that maps MIDI notes to instrument samples.

Good free options:
- **GeneralUser GS** — search "GeneralUser GS sf2 download" (~30 MB)
- **FluidR3 GM** — search "FluidR3 GM sf2 download" (~140 MB)
- **MuseScore General** — search "MuseScore General sf2 download"

Drag the `.sf2` file into the **Soundfont** box in the app. You can load multiple soundfonts and assign different ones to each channel.

Without a soundfont you can still generate, edit, and export MIDI — you just won't hear playback inside the app.

## Generating Music

### Quick Start

1. Load a soundfont (drag `.sf2` into the box)
2. Pick a **Preset** from the dropdown (or set mode/BPM/key/scale manually)
3. Hit **Generate!**
4. Press **Space** or **>** to play

### Generator Settings

| Setting | What it does |
|---------|-------------|
| **Mode** | Overall character: Ambient, Mid, Battle, Jazzy, Funky, Silly, Weird |
| **BPM** | Tempo in beats per minute |
| **Key** | Root note (C through B) |
| **Scale** | Musical scale: Major, Minor, Lydian, Dorian, Mixolydian, Harmonic Minor, Pentatonic, Whole Tone |
| **Bars** | Length of the song (8–64 bars recommended) |
| **Sparseness** | How often channels rest (0% = constantly playing, 100% = very sparse) |

### Steering the Generation

Before hitting Generate, use the **Steer** buttons to constrain the output toward a feel:

| Button | Effect |
|--------|--------|
| **Bright** | Forces major/lydian scale, higher register, energetic accompaniment |
| **Focused** | Maximizes hook repetition, simple rhythm, strong chord-tone locking |
| **Cinematic** | Minor/harmonic-minor, pedal bass, slow BPM, no drums |
| **Lush** | Major/lydian, heavy pad, legato, BPM 80-100, no drums |
| **Punchy** | Staccato, hard downbeat accents, low sparseness, drums on |
| **Lofi** | Dorian/pentatonic minor, high sparseness, slow BPM, no drums |

Steer buttons are toggles — click to activate, click again to deactivate.

### Archetype (Motif Shape)

The **Archetype** dropdown sets a melodic shape that repeats throughout the song as the main hook. Options are grouped by length: 3-note (punchy), 4-note, 5-note, 6-note, and 8-note (flowing). The exact pitches shift based on key and chord, but the interval pattern stays recognizable.

Hit **Rnd** next to the dropdown to let Randomize Everything also pick a random archetype and arp style each time.

### Arp Style

The **Arp Style** dropdown controls how the harmony channel (Pulse 2) plays chords. Options are grouped:
- **Classic**: Up, Down, Alberti, Waltz, Bounce, etc.
- **Rhythmic**: Clave, Latin, Clockwork, Heartbeat, etc.
- **Harmonic**: Jazzy (7ths), Staircase, Spread, Stride, etc.
- **Texture**: Shimmer, Echo, Pluck, Trill, etc.

Auto (default) picks a style appropriate to the mode on each generation.

## How the Generator Works

The generator uses rule-based music theory, not machine learning or AI. Each generation:

1. **Picks a seed** — a number derived from the current time, key, and mode. The same seed always produces the same song.
2. **Builds a chord progression** — from a pool of diatonic progressions appropriate to the scale. Two progressions (A and B) alternate every 4 bars.
3. **Generates a motif** — a 2-6 note melodic cell with scored quality gating. Up to 3 attempts, keeping the best.
4. **Generates a signature rhythm** — a short rhythmic cell committed for the whole song so the melody has a consistent feel.
5. **Caches the first phrase** — bars 0-3 are saved. Subsequent matching sections replay that cached phrase, transposed for the chord, with small development on each repeat (exact → +1 semitone → parallel harmony).
6. **Plans the structure** — intro, build, verse, chorus, break, outro sections with velocity arcs, register shifts, and bass style changes per section.
7. **Fills each bar** — melody, arp, bass, drums, and pad generated bar by bar with chord-tone snapping, leap recovery, suspensions, ornaments, and phrase breathing.
8. **Post-processes** — chord-tone enforcement on strong beats, density throttling by mode, modal interchange (borrowed chords), chromatic approach tones, and transition fills.

## Channels

| Channel | Default Role |
|---------|-------------|
| Pulse 1 | Lead melody |
| Pulse 2 | Harmony / arpeggio / call-and-response |
| Wave | Bass line |
| Noise | Drums / percussion |
| Pulse 3 | Arpeggio / counter-melody |
| Pad | Sustained harmonic pad |
| Extra 1-3 | Optional additional channels |

Each channel has independent controls: SOLO, MUTE, Regen, lock, sparseness, style, soundfont, volume, pan, instrument, and transpose.

## Editing Notes

Click **Piano Roll** on any channel to expand the note editor.

- **Click empty space** — add a note
- **Click a note** — remove it
- **Drag right while placing** — extend the note duration
- **Scroll wheel** — zoom in/out on the timeline
- **Click piano keys on left** — preview that pitch

Notes snap to a 16th-note grid.

## Per-Channel Post-Gen Buttons

After generating, you can modify individual channels:

| Button | Effect |
|--------|--------|
| **Simplify** | Thins fast note runs, adds breathing room |
| **Ghost** | Drops all velocities by 25 (channel sits back in mix) |
| **Boost** | Raises all velocities by 20 (channel pushes forward) |
| **Stacc** | Cuts all durations to 40% — punchy and staccato |
| **Legato** | Extends all durations to 95% — smooth connected line |
| **Harm** | Adds a minor third below every note at lower velocity |
| **Retro** | Reverses note order in time |
| **Oct+ / Oct-** | Shifts all notes up or down one octave |

## Global Post-Gen Buttons

These affect all channels at once:

| Button | Effect |
|--------|--------|
| **Swing** | Toggle: delays off-beat notes by 30ms across all channels. Click again to remove. |
| **Compress** | Narrows velocity range — loud notes come down, quiet notes come up |
| **Swell** | Applies a volume crescendo: quiet start, loud end |
| **2x Time** | Halves all note timings — same song, twice as busy |
| **0.5x Time** | Doubles all note timings — same song, half as busy |

All post-gen operations are undoable (Ctrl+Z).

## Export

- **Save MIDI** — exports all channels as a standard `.mid` file. Open in any DAW, notation software, or MIDI device.
- **Save WAV** — renders to audio using the loaded soundfont. Requires a soundfont to be loaded.
- **Per-channel MIDI** — click the MIDI button on any channel row to export just that channel.

Everything you hear is what you get in the export. Post-gen edits, velocity changes, timing shifts — all written into the MIDI/WAV.

## Importing MIDI

Drop any `.mid` file into the **MIDI** drop zone to import it. Then use the Scramble controls (Transpose, Variation) to add variation, or edit notes directly in the piano roll.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| R | Restart and Play |
| F | Generate (same as clicking Generate!) |
| X | Randomize Everything and Generate |
| G | Randomize SF2 instrument presets |
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |
| Backspace | Rewind 5 seconds |
| Arrow Up / Down | BPM +1 / -1 (Shift = ±5) |

## Playback Modes

- **Normal** — plays once through, then stops
- **Loop** — replays the same bars seamlessly (click the ↻ button)
- **Infinite** — automatically generates and appends more bars before the end so the song never stops

## Build for Production

```bash
npm run build
```

Output goes to `dist/`. Serve with any static file server — no server-side code required.

## Technical Notes

- Written in TypeScript, built with Vite
- Audio rendered via Web Audio API with a custom SF2 sampler (no external audio libraries)
- MIDI export uses a hand-rolled MIDI writer
- WAV export renders samples directly from SF2 data
- No external API calls. No telemetry. Fully self-contained.
