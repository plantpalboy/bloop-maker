# Bloop Maker

A browser-based video game music generator and editor. Generate chiptune-style songs, edit notes in a piano roll, and export to MIDI or WAV.

## Requirements

- [Node.js](https://nodejs.org/) v18 or newer
- npm (included with Node.js)

## Install & Run

```bash
git clone <this-repo>
cd midiplayer
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

## How to Use

### 1. Get a Soundfont (.sf2)

You need a free `.sf2` soundfont file to hear audio. Good options:
- **GeneralUser GS** — search "GeneralUser GS sf2 download"
- **FluidR3 GM** — search "FluidR3 GM sf2 download"

Drag the `.sf2` file into the **Soundfont (SF2)** box. You can load multiple fonts — each channel can use a different one.

### 2. Generate Music

1. Pick a **Preset** (or set mode/BPM/key/scale manually)
2. Hit **Generate!**
3. Press **Space** or the **>** button to play

### 3. Edit Notes

- Click **Piano Roll** on any channel to expand it
- Click empty space to add a note, click a note to delete it
- Drag right while placing to extend note duration
- Scroll wheel to zoom in/out on the timeline
- Click the piano keys on the left to preview pitches

### 4. Per-Channel Controls

Each of the 6 channels has:
- **SOLO / MUTE** — isolate or silence a channel
- **Regen** — regenerate just that channel
- **GEN toggle** — include/exclude channel from generation
- **Sparse slider** — how often the channel rests (0% = always plays, 100% = very sparse)
- **Style select** — generation style (auto, melody, chords, bass, arpeggio, etc.)
- **SF2 source** — which loaded soundfont this channel uses (visible when 2+ fonts loaded)
- **VOL / PAN** — volume and stereo position
- **Instrument selector** — pick any preset from the loaded soundfont
- **Transpose buttons** — shift notes by semitone or octave

### 5. Channels

| Channel | Default Role |
|---------|-------------|
| PULSE 1 | Lead melody |
| PULSE 2 | Harmony / chords |
| WAVE    | Bass line |
| NOISE   | Drums / percussion |
| PULSE 3 | Arpeggio / counter-melody |
| PAD     | Sustained harmonic pad |

### 6. Post-Processing

- **Swing** — adds jazzy groove (playback only, non-destructive)
- **Humanize** — adds subtle timing/velocity variation
- **Reverb** — adds room reverb with adjustable decay

### 7. Export

- **Save MIDI** — exports all channels as a standard MIDI file
- **Save WAV** — renders to audio using the loaded soundfont(s)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| R | Restart and Play |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |

## Build for Production

```bash
npm run build
```

Output goes to `dist/`. Serve with any static file server.

## Tips

- **Infinite mode**: generated songs auto-extend before they end
- **Multiple SF2s**: drop several `.sf2` files and use "Random Presets" to get a mashup of instruments
- **BPM field**: changing the transport BPM rescales all note timings
- **Add 16 More Bars**: Generate menu → "Add 16 More Bars" to extend the current song
- **Load MIDI**: drop any `.mid` file to import and edit it, then use Scramble to add variation
