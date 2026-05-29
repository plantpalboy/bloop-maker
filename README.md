# Bloop Maker

**Free procedural music composer for video games, streams, and indie projects. No AI. No copyright risk. Runs offline.**

Generate original chiptune and game music in your browser using rule-based music theory algorithms. Every song is built from scratch by code — chord progressions, melody contour, motif repetition, harmonic rhythm, bass logic, and drum patterns. Nothing sampled, nothing copied, no machine learning involved.

---

## No AI. No Copyright Risk.

This matters right now.

Game developers, indie studios, Twitch streamers, and YouTube creators are all navigating AI music concerns — platforms flag it, publishers ask about it, licensing gets complicated.

Bloop Maker generates music the same way a game procedurally generates a dungeon: **coded rules, deterministic logic, reproducible results**. The music is yours. The process is transparent. No AI was involved.

Every song comes from a seed number. The same seed always produces the same song. Share the seed with a collaborator and they get the exact same result. That's it — no black box, no model, no training data.

---

## What It Does

- Generates original multi-channel game music from scratch
- Full piano roll editor — add, remove, and extend individual notes
- Exports to standard MIDI (open in any DAW) and WAV audio
- 6 independent channels with solo, mute, per-channel regen, and instrument selection
- 50+ melodic archetypes, 28 arp styles, 6 steering modes
- 15 post-generation editing tools per channel and globally
- Deterministic seed system — same seed = same song, every time
- Runs completely offline once loaded — no account, no internet, no telemetry

---

## Who It's For

- **Indie game developers** who need original background music without copyright headaches
- **Game jam participants** who need music fast
- **Twitch streamers and YouTubers** who need safe background music
- **Hobbyist musicians** looking for composition starting points
- **Music students** exploring music theory through experimentation

---

## Getting Started

### Requirements

- [Node.js](https://nodejs.org/) v18 or newer
- npm (included with Node.js)
- A free `.sf2` soundfont file for audio playback (see below)

### Install & Run

```bash
git clone <this-repo>
cd midiplayer
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### Getting Audio: Soundfonts

Bloop Maker generates MIDI data. To hear audio in the browser, drag in a free **SoundFont (.sf2)** file:

- **GeneralUser GS** — search "GeneralUser GS sf2 download" (~30 MB)
- **FluidR3 GM** — search "FluidR3 GM sf2 download" (~140 MB)

Without a soundfont you can still generate, edit, and export MIDI — you just won't hear playback inside the app. The exported MIDI will play correctly in any DAW or MIDI player.

---

## How It Works

No AI. No samples from existing music. Each generation:

1. **Picks a seed** from the current time, key, and mode. The same seed always produces the same song.
2. **Builds chord progressions** from diatonic progression tables appropriate to the scale. Two progressions alternate every 4 bars.
3. **Generates a motif** — a 2-8 note melodic cell, quality-gated with up to 3 attempts.
4. **Commits a signature rhythm** — one rhythmic cell used throughout so the melody has a consistent feel.
5. **Caches the first phrase** — bars 0-3 are saved and replayed in subsequent matching sections, transposed for the current chord, with small development on each repeat.
6. **Plans song structure** — intro, build, verse, chorus, break, outro sections with velocity arcs, register shifts, and bass style changes per section.
7. **Fills each bar** — melody, arp, bass, drums, and pad generated bar by bar using chord-tone snapping, leap recovery, suspensions, ornaments, chromatic approach tones, call-and-response, and phrase breathing.
8. **Post-processes** — chord-tone enforcement on strong beats, density throttling by mode, modal interchange, transition fills, and a global dynamics curve.

---

## Generator Controls

### Mode

Overall character of the song:

| Mode | Character |
|------|-----------|
| Ambient | Slow, spacious, atmospheric |
| Mid | Balanced, town/exploration feel |
| Battle | Fast, energetic, tense |
| Jazzy | Swung rhythms, rich harmony |
| Funky | Syncopated, groove-based |
| Silly | Upbeat, bouncy, cartoonish |
| Weird | Unpredictable, experimental |

### Steer Buttons (Pre-Generation)

Click before hitting Generate to constrain the output toward a feel:

| Button | Effect |
|--------|--------|
| **Bright** | Forces major/lydian scale, higher register, energetic accompaniment |
| **Focused** | Maximizes hook repetition, simple rhythm, strong chord-tone locking |
| **Cinematic** | Minor/harmonic-minor, pedal bass, slow BPM, no drums |
| **Lush** | Major/lydian, heavy pad, legato, BPM 80-100, no drums |
| **Punchy** | Staccato, hard downbeat accents, low sparseness, drums on |
| **Lofi** | Dorian/pentatonic minor, high sparseness, slow BPM, no drums |

Steer buttons are toggles — click to activate, click again to turn off.

### Archetype

Sets a melodic shape that repeats as the main hook throughout the song. Options grouped by length: 3-note (punchy), 4-note, 5-note, 6-note, 8-note (flowing). The interval pattern stays recognizable across chord changes.

### Arp Style

Controls how the harmony channel plays chords. 28 styles grouped into Classic, Rhythmic, Harmonic, and Texture.

---

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

Each channel has: SOLO, MUTE, Regen (keeps the same chord progression as the original), Lock, sparseness slider, style selector, soundfont selector, volume, pan, instrument, and transpose.

---

## Post-Generation Editing

### Per-Channel Buttons

| Button | Effect |
|--------|--------|
| **Simplify** | Thins fast note runs, adds breathing room |
| **Ghost** | Drops velocities by 25 — sits back in the mix |
| **Boost** | Raises velocities by 20 — pushes forward |
| **Stacc** | Cuts durations to 40% — punchy and staccato |
| **Legato** | Extends durations to 95% — smooth connected line |
| **Harm** | Adds a minor third below every note |
| **Retro** | Reverses note order in time |
| **Oct+ / Oct-** | Shifts the channel up or down one octave |

### Global Buttons

| Button | Effect |
|--------|--------|
| **Swing** | Toggle — delays off-beat notes 30ms across all channels. Click again to remove. |
| **Compress** | Narrows the velocity range toward the average |
| **Swell** | Velocity crescendo from start to end |
| **2x Time** | Halves all timings — same song, twice as busy |
| **0.5x Time** | Doubles all timings — same song, half as busy |

All changes are undoable with Ctrl+Z and export correctly to MIDI and WAV.

---

## Export

- **Save MIDI** — standard `.mid` file, opens in any DAW, notation software, or MIDI device
- **Save WAV** — renders audio using the loaded soundfont
- **Per-channel MIDI** — individual channel export button on each channel row

Everything you hear is what you get. Post-gen edits, velocity changes, timing shifts — all written into the file.

---

## Importing MIDI

Drop any `.mid` file into the MIDI drop zone to import it. Edit notes in the piano roll, use Scramble controls to add variation, re-export.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| R | Restart and Play |
| F | Generate |
| X | Randomize Everything and Generate |
| G | Randomize SF2 instrument presets |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Backspace | Rewind 5 seconds |
| Arrow Up / Down | BPM ±1 (Shift = ±5) |

---

## Playback Modes

- **Normal** — plays once through
- **Loop** (↻) — replays the same bars seamlessly
- **Infinite** — auto-appends more bars before the end so the song never stops

---

## Build for Production

```bash
npm run build
```

Output goes to `dist/`. No server-side code required — serve with any static file host (Netlify, GitHub Pages, Vercel, etc.).

---

## Technical Notes

- Written in TypeScript, built with Vite
- Audio via Web Audio API with a custom SF2 sampler — no external audio libraries
- Custom MIDI writer and WAV renderer
- No external API calls. No telemetry. No accounts. Fully self-contained.
- Runs offline after initial page load.
