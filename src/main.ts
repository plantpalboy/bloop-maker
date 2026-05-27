import './styles.css';
import type { AppState, ChannelId, NoteEvent } from './types';
import { CHANNELS, CHANNEL_META } from './types';
import { parseSF2 } from './sf2/SF2Parser';
import { SF2Sampler } from './sf2/SF2Sampler';
import { processMIDI } from './midi/MIDIProcessor';
import { buildMIDI, buildSingleChannelMIDI, downloadMIDI } from './midi/MIDIBuilder';
import { exportWAV } from './midi/WavExporter';
import { Scheduler } from './engine/Scheduler';
import { generate, type GenConfig, type GenMode, type ScaleType } from './generator/MelodyGenerator';
import { scramble, type ScramblerConfig } from './generator/MIDIScrambler';

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function formatPan(v: number): string {
  if (v === 0) return 'C';
  const pct = Math.abs(v);
  return v < 0 ? `${pct}L` : `${pct}R`;
}

interface GenPreset { label: string; mode: GenMode; bpm: number; scale: string; generateNoise: boolean; }
const GEN_PRESETS: GenPreset[] = [
  // ── Ambient / Chill ──
  { label: 'Peaceful Walk',        mode: 'ambient', bpm: 72,  scale: 'lydian',           generateNoise: false },
  { label: 'Home Theme',           mode: 'ambient', bpm: 76,  scale: 'major',            generateNoise: false },
  { label: 'Snowy Forest',         mode: 'ambient', bpm: 62,  scale: 'lydian',           generateNoise: false },
  { label: 'Lo-fi Chill',          mode: 'ambient', bpm: 82,  scale: 'mixolydian',       generateNoise: false },
  { label: 'Forest Walk',          mode: 'ambient', bpm: 68,  scale: 'pentatonicMajor',  generateNoise: false },
  { label: 'Dreamscape',           mode: 'ambient', bpm: 60,  scale: 'wholeTone',        generateNoise: false },
  { label: 'Waterfall',            mode: 'ambient', bpm: 70,  scale: 'minor',            generateNoise: false },
  { label: 'Ruins',                mode: 'ambient', bpm: 80,  scale: 'dorian',           generateNoise: false },
  { label: 'Mystery Cave',         mode: 'ambient', bpm: 55,  scale: 'minor',            generateNoise: false },
  { label: 'Starlit Ocean',        mode: 'ambient', bpm: 65,  scale: 'lydian',           generateNoise: false },
  { label: 'Sleepy Village',       mode: 'ambient', bpm: 58,  scale: 'major',            generateNoise: false },
  { label: 'Haunted Library',      mode: 'ambient', bpm: 52,  scale: 'minor',            generateNoise: false },
  { label: 'Cloud Kingdom',        mode: 'ambient', bpm: 72,  scale: 'lydian',           generateNoise: false },
  { label: 'Bamboo Grove',         mode: 'ambient', bpm: 78,  scale: 'pentatonicMajor',  generateNoise: false },
  { label: 'Desert Night',         mode: 'ambient', bpm: 63,  scale: 'pentatonicMinor',  generateNoise: false },
  { label: 'Coral Reef',           mode: 'ambient', bpm: 74,  scale: 'wholeTone',        generateNoise: false },
  { label: 'Ancient Shrine',       mode: 'ambient', bpm: 57,  scale: 'dorian',           generateNoise: false },
  { label: 'Cozy Cabin',           mode: 'ambient', bpm: 67,  scale: 'major',            generateNoise: false },
  { label: 'Twilight Plains',      mode: 'ambient', bpm: 70,  scale: 'mixolydian',       generateNoise: false },
  { label: 'Floating Islands',     mode: 'ambient', bpm: 76,  scale: 'lydian',           generateNoise: false },
  { label: 'Mushroom Forest',      mode: 'ambient', bpm: 84,  scale: 'major',            generateNoise: true  },
  { label: 'Rainy Town',           mode: 'ambient', bpm: 78,  scale: 'dorian',           generateNoise: true  },
  { label: 'Ice Palace',           mode: 'ambient', bpm: 60,  scale: 'minor',            generateNoise: false },
  // ── Mid / Town / Adventure ──
  { label: 'Town Theme',           mode: 'mid',     bpm: 110, scale: 'major',            generateNoise: true  },
  { label: 'Snowdin Town',         mode: 'mid',     bpm: 108, scale: 'mixolydian',       generateNoise: true  },
  { label: 'Underground Market',   mode: 'mid',     bpm: 120, scale: 'dorian',           generateNoise: true  },
  { label: 'Adventure',            mode: 'mid',     bpm: 130, scale: 'mixolydian',       generateNoise: true  },
  { label: 'Dungeon Crawl',        mode: 'mid',     bpm: 115, scale: 'dorian',           generateNoise: true  },
  { label: 'Jazz Cafe',            mode: 'mid',     bpm: 105, scale: 'dorian',           generateNoise: true  },
  { label: 'Boss Prelude',         mode: 'mid',     bpm: 140, scale: 'minor',            generateNoise: true  },
  { label: 'Ghost Fight',          mode: 'mid',     bpm: 150, scale: 'minor',            generateNoise: true  },
  { label: 'Bittersweet',          mode: 'mid',     bpm: 95,  scale: 'mixolydian',       generateNoise: false },
  { label: 'Castle Theme',         mode: 'mid',     bpm: 125, scale: 'minor',            generateNoise: true  },
  { label: 'Overworld Map',        mode: 'mid',     bpm: 118, scale: 'major',            generateNoise: true  },
  { label: 'Pirate Cove',          mode: 'mid',     bpm: 138, scale: 'mixolydian',       generateNoise: true  },
  { label: 'Volcano Zone',         mode: 'mid',     bpm: 145, scale: 'minor',            generateNoise: true  },
  { label: 'Sky Temple',           mode: 'mid',     bpm: 112, scale: 'lydian',           generateNoise: true  },
  { label: 'Circus Theme',         mode: 'mid',     bpm: 160, scale: 'major',            generateNoise: true  },
  { label: 'Harbor Town',          mode: 'mid',     bpm: 100, scale: 'major',            generateNoise: true  },
  { label: 'Witch Workshop',       mode: 'mid',     bpm: 122, scale: 'dorian',           generateNoise: true  },
  { label: 'Trading Post',         mode: 'mid',     bpm: 108, scale: 'pentatonicMajor',  generateNoise: true  },
  { label: 'Sewer Level',          mode: 'mid',     bpm: 130, scale: 'pentatonicMinor',  generateNoise: true  },
  { label: 'Miniboss',             mode: 'mid',     bpm: 148, scale: 'minor',            generateNoise: true  },
  { label: 'Tech Lab',             mode: 'mid',     bpm: 135, scale: 'wholeTone',        generateNoise: true  },
  { label: 'Kingdom March',        mode: 'mid',     bpm: 120, scale: 'major',            generateNoise: true  },
  { label: 'Goblin Market',        mode: 'mid',     bpm: 132, scale: 'mixolydian',       generateNoise: true  },
  { label: 'Puzzle Room',          mode: 'mid',     bpm: 96,  scale: 'dorian',           generateNoise: false },
  { label: 'Title Screen',         mode: 'mid',     bpm: 102, scale: 'major',            generateNoise: false },
  { label: 'Credits Roll',         mode: 'mid',     bpm: 88,  scale: 'lydian',           generateNoise: false },
  { label: 'Shop Theme',           mode: 'mid',     bpm: 115, scale: 'major',            generateNoise: true  },
  { label: 'Sad Ending',           mode: 'mid',     bpm: 80,  scale: 'minor',            generateNoise: false },
  // ── Battle / Boss ──
  { label: 'Enemy Approaching',    mode: 'battle',  bpm: 168, scale: 'minor',            generateNoise: true  },
  { label: 'Battle!',              mode: 'battle',  bpm: 183, scale: 'minor',            generateNoise: true  },
  { label: 'Heartache',            mode: 'battle',  bpm: 160, scale: 'minor',            generateNoise: true  },
  { label: 'Final Boss',           mode: 'battle',  bpm: 160, scale: 'minor',            generateNoise: true  },
  { label: 'Sky Chase',            mode: 'battle',  bpm: 200, scale: 'pentatonicMinor',  generateNoise: true  },
  { label: 'Megalovania Vibes',    mode: 'battle',  bpm: 210, scale: 'minor',            generateNoise: true  },
  { label: 'Panic Attack',         mode: 'battle',  bpm: 188, scale: 'dorian',           generateNoise: true  },
  { label: 'Dragon Boss',          mode: 'battle',  bpm: 175, scale: 'minor',            generateNoise: true  },
  { label: 'Cyber Boss',           mode: 'battle',  bpm: 195, scale: 'wholeTone',        generateNoise: true  },
  { label: 'True Final Boss',      mode: 'battle',  bpm: 220, scale: 'minor',            generateNoise: true  },
  { label: 'Rage Fight',           mode: 'battle',  bpm: 205, scale: 'pentatonicMinor',  generateNoise: true  },
  { label: 'Undyne Vibes',         mode: 'battle',  bpm: 178, scale: 'dorian',           generateNoise: true  },
  { label: 'Robot Army',           mode: 'battle',  bpm: 192, scale: 'minor',            generateNoise: true  },
  { label: 'Ice Queen',            mode: 'battle',  bpm: 165, scale: 'minor',            generateNoise: true  },
  { label: 'Chaos Theme',          mode: 'battle',  bpm: 215, scale: 'dorian',           generateNoise: true  },
  { label: 'Climax',               mode: 'battle',  bpm: 185, scale: 'lydian',           generateNoise: true  },
  // ── Jazzy ──
  { label: 'Jazz Lounge',          mode: 'jazzy',  bpm: 105, scale: 'dorian',           generateNoise: true  },
  { label: 'Bossa Nova Walk',      mode: 'jazzy',  bpm: 98,  scale: 'mixolydian',       generateNoise: true  },
  { label: 'Cool Cat Cafe',        mode: 'jazzy',  bpm: 112, scale: 'dorian',           generateNoise: true  },
  { label: 'Night Club',           mode: 'jazzy',  bpm: 108, scale: 'mixolydian',       generateNoise: true  },
  { label: 'Uptown Groove',        mode: 'jazzy',  bpm: 118, scale: 'dorian',           generateNoise: true  },
  { label: 'Bebop Alley',          mode: 'jazzy',  bpm: 130, scale: 'dorian',           generateNoise: true  },
  { label: 'Mellow Sax',           mode: 'jazzy',  bpm: 88,  scale: 'dorian',           generateNoise: false },
  { label: 'Late Night Drive',     mode: 'jazzy',  bpm: 92,  scale: 'mixolydian',       generateNoise: false },
  // ── Funky ──
  { label: 'Funky Town',           mode: 'funky',  bpm: 118, scale: 'dorian',           generateNoise: true  },
  { label: 'Groove Machine',       mode: 'funky',  bpm: 125, scale: 'dorian',           generateNoise: true  },
  { label: 'Bass Drop',            mode: 'funky',  bpm: 120, scale: 'dorian',           generateNoise: true  },
  { label: 'Chicken Scratch',      mode: 'funky',  bpm: 130, scale: 'mixolydian',       generateNoise: true  },
  { label: 'Wah Wah World',        mode: 'funky',  bpm: 115, scale: 'dorian',           generateNoise: true  },
  { label: 'Disco Fever',          mode: 'funky',  bpm: 128, scale: 'mixolydian',       generateNoise: true  },
  { label: 'Soul Kitchen',         mode: 'funky',  bpm: 110, scale: 'dorian',           generateNoise: true  },
  // ── Silly ──
  { label: 'Clown Car',            mode: 'silly',  bpm: 175, scale: 'major',            generateNoise: true  },
  { label: 'Rubber Ducky',         mode: 'silly',  bpm: 160, scale: 'lydian',           generateNoise: true  },
  { label: 'Banana Slip',          mode: 'silly',  bpm: 180, scale: 'major',            generateNoise: true  },
  { label: 'Circus Peanuts',       mode: 'silly',  bpm: 190, scale: 'pentatonicMajor',  generateNoise: true  },
  { label: 'Kazoo Hero',           mode: 'silly',  bpm: 165, scale: 'major',            generateNoise: true  },
  { label: 'Silly Walk',           mode: 'silly',  bpm: 170, scale: 'lydian',           generateNoise: false },
  { label: 'Toyland',              mode: 'silly',  bpm: 155, scale: 'major',            generateNoise: true  },
  // ── Weird ──
  { label: 'Haunted Attic',        mode: 'weird',  bpm: 85,  scale: 'wholeTone',        generateNoise: true  },
  { label: 'Glitch City',          mode: 'weird',  bpm: 110, scale: 'wholeTone',        generateNoise: true  },
  { label: 'Liminal Space',        mode: 'weird',  bpm: 72,  scale: 'wholeTone',        generateNoise: false },
  { label: 'Broken Robot',         mode: 'weird',  bpm: 100, scale: 'wholeTone',        generateNoise: true  },
  { label: 'Dream Sequence',       mode: 'weird',  bpm: 80,  scale: 'lydian',           generateNoise: false },
  { label: 'Eldritch Market',      mode: 'weird',  bpm: 95,  scale: 'wholeTone',        generateNoise: true  },
  { label: 'Void Theme',           mode: 'weird',  bpm: 65,  scale: 'wholeTone',        generateNoise: false },
];

interface HistoryEntry {
  channels: Record<ChannelId, NoteEvent[]>;
  duration: number;
  bpm: number;
}

interface BloopProject {
  version: number;
  bpm: number;
  duration: number;
  channels: Record<string, NoteEvent[]>;
  channelPresets?: Record<string, number>;
  channelPans?: Record<string, number>;
}

function makeDefaultState(): AppState {
  const channels = {} as AppState['channels'];
  for (const id of CHANNELS) channels[id] = { id, notes: [], presetIndex: 0, muted: false };
  return { channels, duration: 0, bpm: 130, isPlaying: false, sf2: null, inputType: 'none', assignmentMode: 'auto' };
}

class App {
  private state: AppState = makeDefaultState();
  private audioCtx: AudioContext | null = null;
  private sampler: SF2Sampler | null = null;
  private scheduler: Scheduler | null = null;
  private currentTime = 0;
  private isDraggingSeek = false;
  private lastGenConfig: GenConfig | null = null;
  private midiLoaded = false;
  private sf2FileName = '';
  private genMode: GenMode = 'mid';
  private currentSongTitle = '';

  // Solo
  private soloedChannel: ChannelId | null = null;
  private preSoloMutes: Record<ChannelId, boolean> | null = null;

  // Oscilloscope
  private oscRafId: number | null = null;
  private oscAnalyser: AnalyserNode | null = null;
  private matrixCanvas!: HTMLCanvasElement;
  private matrixRafId: number | null = null;

  // Undo/redo
  private history: HistoryEntry[] = [];
  private historyIndex = -1;
  private readonly MAX_HISTORY = 25;

  // Piano roll editor
  private editingChannels = new Set<ChannelId>();
  private channelPitchRanges = new Map<ChannelId, { lo: number; hi: number }>();
  // Scroll-wheel zoom per channel: {start, end} in seconds (undefined = full view)
  private pianoRollZoom = new Map<ChannelId, { start: number; end: number }>();

  // Per-channel pan values (-1 left, 0 center, 1 right)
  private channelPanValues: Record<ChannelId, number> = {} as Record<ChannelId, number>;
  // Per-channel sparseness (0 = always plays, 1 = very sparse)
  private channelSparseValues: Partial<Record<ChannelId, number>> = {};
  // Per-channel generation toggle (false = exclude from generation entirely)
  private channelGenEnabled: Partial<Record<ChannelId, boolean>> = {};
  // Per-channel lock (true = Regen skips this channel)
  private channelLocked: Partial<Record<ChannelId, boolean>> = {};
  // Per-channel style preset for generation
  private channelStyle: Partial<Record<ChannelId, string>> = {};
  // Multi-SF2 support
  private loadedSF2s: { name: string; sf2: ReturnType<typeof parseSF2> }[] = [];
  private channelSF2Idx: Partial<Record<ChannelId, number>> = {};

  // DOM refs
  private root: HTMLElement;
  private canvases:          Record<ChannelId, HTMLCanvasElement>  = {} as any;
  private selects:           Record<ChannelId, HTMLSelectElement>  = {} as any;
  private muteBtns:          Record<ChannelId, HTMLButtonElement>  = {} as any;
  private soloBtns:          Record<ChannelId, HTMLButtonElement>  = {} as any;
  private regenBtns:         Record<ChannelId, HTMLButtonElement>  = {} as any;
  private exportChBtns:      Record<ChannelId, HTMLButtonElement>  = {} as any;
  private editBtns:          Record<ChannelId, HTMLButtonElement>  = {} as any;
  private panValEls:         Record<ChannelId, HTMLElement>      = {} as any;
  private channelVolValues:  Record<ChannelId, number>            = {} as any;
  private noteCountEls:      Record<ChannelId, HTMLElement>        = {} as any;
  private statusEl!:         HTMLElement;
  private statusPanel!:      HTMLElement;
  private progressFill!:     HTMLElement;
  private progressWrap!:     HTMLElement;
  private playBtn!:          HTMLButtonElement;
  private stopBtn!:          HTMLButtonElement;
  private restartBtn!:       HTMLButtonElement;
  private seekSlider!:       HTMLInputElement;
  private timeDisplay!:      HTMLElement;
  private bpmInput!:         HTMLInputElement;
  private downloadBtn!:      HTMLButtonElement;
  private wavBtn!:           HTMLButtonElement;
  private sf2StatusEl!:      HTMLElement;
  private sf2DropZone!:      HTMLElement;
  private midiDropZone!:     HTMLElement;
  private scrambleBtn!:      HTMLButtonElement;
  private midiFileNameEl!:   HTMLElement;
  private sf2RandomBtn!:     HTMLButtonElement;
  private sf2ListEl!:        HTMLElement;
  private oscCanvas!:        HTMLCanvasElement;
  private undoBtn!:          HTMLButtonElement;
  private redoBtn!:          HTMLButtonElement;
  private humanizeBtn!:      HTMLButtonElement;
  private swingSlider!:      HTMLInputElement;
  private reverbWetSlider!:  HTMLInputElement;
  private reverbDecaySlider!: HTMLInputElement;
  private faqModal!:         HTMLElement;
  private projectLoadInput!: HTMLInputElement;

  constructor(rootEl: HTMLElement) {
    this.root = rootEl;
    for (const id of CHANNELS) { this.channelPanValues[id] = 0; this.channelVolValues[id] = 1; }
    this.render();
    this.bindEvents();
    this.drawOscIdle();
    this.startMatrixIdle();
    this.startBgGrid();
    // Restore dark mode preference
    if (localStorage.getItem('bloopDark') === '1') document.body.classList.add('dark');
  }

  // ── Render ────────────────────────────────────────────────────

  private render() {
    this.root.innerHTML = `
      ${this.renderFAQModal()}
      <input type="file" id="load-project-input" accept=".bloop" style="display:none">

          <div class="win-titlebar">
            <span class="win-title-text">${this.colorTitle('Bloop Maker')}</span>
          </div>

      <div class="win-menubar">
        <div class="win-menu-item" id="menu-file">File
          <div class="win-dropdown">
            <div class="win-dropdown-item" data-action="new-project">New Project</div>
            <div class="win-dropdown-item" data-action="load-project">Load Project...</div>
            <div class="win-dropdown-sep"></div>
            <div class="win-dropdown-item" data-action="save-project">Save Project As...</div>
          </div>
        </div>
        <div class="win-menu-item" id="menu-generate">Generate
          <div class="win-dropdown">
            <div class="win-dropdown-item" data-action="quick-ambient">Quick Ambient</div>
            <div class="win-dropdown-item" data-action="quick-battle">Quick Battle</div>
            <div class="win-dropdown-item" data-action="quick-town">Quick Town Theme</div>
            <div class="win-dropdown-item" data-action="quick-jazz">Jazz Vibes</div>
            <div class="win-dropdown-item" data-action="quick-dream">Dreamy Whole-Tone</div>
            <div class="win-dropdown-sep"></div>
            <div class="win-dropdown-item" data-action="more-bars">Add 16 More Bars</div>
            <div class="win-dropdown-item" data-action="random-preset">Randomize Everything</div>
          </div>
        </div>
        <div class="win-menu-item" id="menu-presets">Presets
          <div class="win-dropdown" id="presets-dropdown">
            ${(['ambient','mid','battle','jazzy','funky','silly','weird'] as GenMode[]).map(mode => {
              const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
              const presets = GEN_PRESETS.map((p, i) => ({ p, i })).filter(x => x.p.mode === mode);
              return `<div class="win-dropdown-submenu" data-mode="${mode}">${modeLabel} &#9658;<div class="win-submenu">${presets.map(({ p, i }) => `<div class="win-dropdown-item" data-preset-idx="${i}">${p.label}</div>`).join('')}</div></div>`;
            }).join('')}
          </div>
        </div>
        <div class="win-menu-item" id="menu-help">Help
          <div class="win-dropdown">
            <div class="win-dropdown-item" data-action="show-faq">FAQ / How to Use</div>
            <div class="win-dropdown-item" data-action="show-shortcuts">Keyboard Shortcuts</div>
          </div>
        </div>
      </div>

      <div class="win-toolbar">
        <button class="toolbar-btn" id="undo-btn" disabled>Undo</button>
        <button class="toolbar-btn" id="redo-btn" disabled>Redo</button>
        <div class="toolbar-sep"></div>
        <button class="toolbar-btn dark-toggle" id="dark-btn" title="Toggle dark mode">Dark</button>
        <div class="toolbar-sep"></div>
        <span style="font:11px Tahoma;color:var(--txt-dis)">Space = play/pause &nbsp;|&nbsp; R = restart &nbsp;|&nbsp; Ctrl+Z/Y = undo/redo</span>
      </div>

      <div class="win-body">

        <!-- Create -->
        <div class="card">
          <div class="card-title ct-create">Create Music</div>
          <div class="create-grid">
            <div>
              <div class="gen-row">
                <span class="gen-label">Preset</span>
                <select class="gen-select" id="gen-preset">
                  <option value="custom">-- Custom --</option>
                  ${GEN_PRESETS.map((p, i) => `<option value="${i}">${p.label}</option>`).join('')}
                </select>
              </div>
              <div class="gen-noise-row">
                <input type="checkbox" id="gen-noise" checked>
                <label for="gen-noise" style="cursor:pointer;font:12px Tahoma">Generate drums</label>
              </div>
              <div class="gen-row">
                <span class="gen-label">Key</span>
                <select class="gen-select" id="gen-key">
                  ${NOTE_NAMES.map((n, i) => `<option value="${i}"${i===0?' selected':''}>${n}</option>`).join('')}
                </select>
              </div>
              <div class="gen-row">
                <span class="gen-label">Scale</span>
                <select class="gen-select" id="gen-scale">
                  <option value="">Auto</option>
                  <option value="lydian">Lydian (bright / floating)</option>
                  <option value="major">Major (bright, resolved)</option>
                  <option value="mixolydian">Mixolydian (bittersweet)</option>
                  <option value="minor">Minor (dark, dramatic)</option>
                  <option value="dorian">Dorian (minor + bright 6th)</option>
                  <option value="pentatonicMinor">Penta Minor (5-note minor)</option>
                  <option value="pentatonicMajor">Penta Major (5-note major)</option>
                  <option value="wholeTone">Whole Tone (dreamy)</option>
                </select>
              </div>
              <div class="gen-row">
                <span class="gen-label">BPM</span>
                <input type="number" class="gen-input" id="gen-bpm" value="130" min="40" max="220">
                <button class="toolbar-btn" id="tap-tempo-btn" title="Tap to set BPM" style="margin-left:4px;padding:3px 7px;font-size:10px">Tap</button>
              </div>
              <div class="gen-row">
                <span class="gen-label">Bars</span>
                <input type="number" class="gen-input" id="gen-bars" value="32" min="4" max="128">
              </div>
              <div class="gen-row">
                <span class="gen-label">Sparse</span>
                <input type="range" class="gen-input" id="gen-sparseness" min="0" max="1" value="0.4" step="0.05" style="flex:1">
                <span class="scramble-val" id="gen-sparseness-val" style="min-width:42px">40%</span>
              </div>
              <button class="btn-generate" id="gen-btn">Generate!</button>
            </div>

            <div>
              <div class="drop-zone" id="midi-drop">
                <input type="file" id="midi-input" accept=".mid,.midi">
                <span class="drop-icon">MIDI</span>
                <div class="drop-label">Drop MIDI or click</div>
                <div class="drop-filename" id="midi-filename"></div>
              </div>
              <div class="scramble-row">
                <span class="scramble-label">Transpose</span>
                <input type="range" class="range-input" id="sc-transpose" min="-12" max="12" value="0" step="1">
                <span class="scramble-val" id="sc-transpose-val">0 oct</span>
              </div>
              <div class="scramble-row">
                <span class="scramble-label">Variation</span>
                <input type="range" class="range-input" id="sc-variation" min="0" max="1" value="0.3" step="0.05">
                <span class="scramble-val" id="sc-variation-val">0.3</span>
              </div>
              <div class="scramble-row" style="margin-bottom:8px">
                <label class="scramble-check">
                  <input type="checkbox" id="sc-snap" checked>
                  Scale snap
                </label>
                <select class="gen-select" id="sc-scale" style="flex:1;margin-left:8px">
                  <option value="minor">Minor</option>
                  <option value="mixolydian">Mixolydian</option>
                  <option value="lydian">Lydian</option>
                  <option value="major">Major</option>
                  <option value="dorian">Dorian</option>
                  <option value="pentatonicMinor">Penta Minor</option>
                  <option value="pentatonicMajor">Penta Major</option>
                  <option value="wholeTone">Whole Tone</option>
                </select>
              </div>
              <button class="btn-scramble" id="scramble-btn" disabled>Scramble MIDI!</button>
            </div>
          </div>
          <div class="progress-wrap" id="progress-wrap">
            <div class="progress-fill" id="progress-fill" style="width:0%"></div>
          </div>
        </div>

        <!-- Channels -->
        <div class="card">
          <div class="card-title ct-channels">Channels</div>
          <div class="channels-list" id="channels-list">
            ${CHANNELS.map(id => this.renderChannelRow(id)).join('')}
          </div>
        </div>

        <!-- SF2 -->
        <div class="card">
          <div class="card-title ct-sf2">Soundfont (SF2)</div>
          <div class="sf2-drop-zone" id="sf2-drop">
            <input type="file" id="sf2-input" accept=".sf2" multiple>
            <div class="sf2-status" id="sf2-status">Drop .sf2 soundfonts here (supports multiple fonts)</div>
          </div>
          <div class="progress-wrap" id="sf2-progress-wrap" style="margin-top:6px">
            <div class="progress-fill" id="sf2-progress-fill" style="width:0%"></div>
          </div>
          <div id="sf2-list" style="margin:4px 0;font:11px Tahoma;color:var(--txt-dis)"></div>
          <div class="sf2-actions">
            <button class="btn-random-sf2" id="sf2-random-btn" disabled>Random Presets</button>
          </div>
        </div>

        <!-- Post-processing -->
        <div class="card">
          <div class="card-title ct-pp">Post-Processing</div>
          <div class="pp-grid">
            <div>
              <div class="pp-row">
                <span class="pp-label">Swing</span>
                <input type="range" class="range-input" id="swing-slider" min="0" max="0.33" value="0" step="0.01">
                <span class="pp-val" id="swing-val">0%</span>
              </div>
              <div class="pp-note">Playback only, non-destructive</div>
            </div>
            <div>
              <div class="pp-row">
                <span class="pp-label">Humanize</span>
                <input type="range" class="range-input" id="humanize-amount" min="0" max="1" value="0.35" step="0.05">
                <span class="pp-val" id="humanize-val">35%</span>
              </div>
              <button class="btn-humanize" id="humanize-btn" disabled>Apply Humanize</button>
            </div>
            <div>
              <div class="pp-row">
                <span class="pp-label">Reverb</span>
                <input type="range" class="range-input" id="reverb-wet" min="0" max="1" value="0" step="0.05">
                <span class="pp-val" id="reverb-val">0%</span>
              </div>
              <div class="pp-row">
                <span class="pp-label">Decay</span>
                <input type="range" class="range-input" id="reverb-decay" min="0.3" max="5" value="1.5" step="0.1">
                <span class="pp-val" id="reverb-decay-val">1.5s</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Transport -->
        <div class="card">
          <div class="card-title ct-transport">Transport</div>
          <div class="transport-main">
            <div class="transport-controls">
              <div class="transport-row">
                <button class="btn-transport" id="restart-btn" disabled title="Back to start (R)">|&lt;</button>
                <button class="btn-transport" id="play-btn" disabled>&gt;</button>
                <button class="btn-transport" id="stop-btn" disabled>[]</button>
                <div class="seek-wrap">
                  <input type="range" class="seek-slider" id="seek-slider" min="0" max="300" value="0" step="0.1">
                </div>
                <div class="seek-time" id="time-display">00:00 / 00:00</div>
              </div>
              <div class="volume-row">
                <span class="gen-label">Volume</span>
                <input type="range" class="range-input" id="vol-slider" min="0" max="1" value="0.75" step="0.01">
                <span class="scramble-val" id="vol-val">75%</span>
              </div>
              <div class="transport-meta">
                <div class="bpm-control">
                  <span class="bpm-label">BPM</span>
                  <input type="number" class="bpm-input" id="bpm-input" value="--" min="20" max="300" title="Change BPM (rescales notes)">
                </div>
                <button class="btn-download" id="download-btn" disabled>Save MIDI</button>
                <button class="btn-download" id="wav-btn" disabled>Save WAV</button>
              </div>
            </div>
            <canvas id="osc-canvas" class="osc-canvas" width="220" height="108"></canvas>
          </div>
        </div>

        <canvas id="matrix-canvas" style="width:100%;height:80px;display:block;background:#010501;border-top:1px solid #1a2a1a;margin-top:4px" width="1200" height="80"></canvas>

      </div><!-- end win-body -->

      <div class="win-status" id="status-bar">
        <div class="win-status-panel" id="status-text">Ready — generate a song or drop a MIDI file.</div>
      </div>
    `;

    // DOM refs
    this.statusEl       = document.getElementById('status-bar')!;
    this.statusPanel    = document.getElementById('status-text')!;
    this.progressFill   = document.getElementById('progress-fill')!;
    this.progressWrap   = document.getElementById('progress-wrap')!;
    this.playBtn        = document.getElementById('play-btn')      as HTMLButtonElement;
    this.stopBtn        = document.getElementById('stop-btn')      as HTMLButtonElement;
    this.restartBtn     = document.getElementById('restart-btn')   as HTMLButtonElement;
    this.seekSlider     = document.getElementById('seek-slider')   as HTMLInputElement;
    this.timeDisplay    = document.getElementById('time-display')!;
    this.bpmInput       = document.getElementById('bpm-input')     as HTMLInputElement;
    this.downloadBtn    = document.getElementById('download-btn')  as HTMLButtonElement;
    this.wavBtn         = document.getElementById('wav-btn')       as HTMLButtonElement;
    this.sf2StatusEl    = document.getElementById('sf2-status')!;
    this.sf2DropZone    = document.getElementById('sf2-drop')!;
    this.midiDropZone   = document.getElementById('midi-drop')!;
    this.scrambleBtn    = document.getElementById('scramble-btn')  as HTMLButtonElement;
    this.midiFileNameEl = document.getElementById('midi-filename')!;
    this.sf2RandomBtn   = document.getElementById('sf2-random-btn') as HTMLButtonElement;
    this.sf2ListEl      = document.getElementById('sf2-list')!;
    this.oscCanvas      = document.getElementById('osc-canvas')    as HTMLCanvasElement;
    this.undoBtn        = document.getElementById('undo-btn')      as HTMLButtonElement;
    this.redoBtn        = document.getElementById('redo-btn')      as HTMLButtonElement;
    this.humanizeBtn    = document.getElementById('humanize-btn')  as HTMLButtonElement;
    this.swingSlider    = document.getElementById('swing-slider')  as HTMLInputElement;
    this.reverbWetSlider   = document.getElementById('reverb-wet')    as HTMLInputElement;
    this.reverbDecaySlider = document.getElementById('reverb-decay')  as HTMLInputElement;
    this.faqModal       = document.getElementById('faq-modal')!;
    this.projectLoadInput = document.getElementById('load-project-input') as HTMLInputElement;
    this.matrixCanvas     = document.getElementById('matrix-canvas')       as HTMLCanvasElement;

    for (const id of CHANNELS) {
      this.canvases[id]          = document.getElementById(`canvas-${id}`)     as HTMLCanvasElement;
      this.selects[id]           = document.getElementById(`select-${id}`)     as HTMLSelectElement;
      this.muteBtns[id]          = document.getElementById(`mute-${id}`)       as HTMLButtonElement;
      this.soloBtns[id]          = document.getElementById(`solo-${id}`)       as HTMLButtonElement;
      this.regenBtns[id]         = document.getElementById(`regen-${id}`)      as HTMLButtonElement;
      this.exportChBtns[id]      = document.getElementById(`export-ch-${id}`)  as HTMLButtonElement;
      this.editBtns[id]          = document.getElementById(`edit-${id}`)       as HTMLButtonElement;
      this.noteCountEls[id] = document.getElementById(`count-${id}`)!;
      this.panValEls[id]    = document.getElementById(`pan-val-${id}`)!;
    }
  }

  private renderChannelRow(id: ChannelId): string {
    const m = CHANNEL_META[id];
    return `
      <div class="channel-row" data-channel="${id}" id="row-${id}">
        <div class="ch-top">
          <div class="channel-label">${m.label}</div>
          <canvas class="channel-canvas" id="canvas-${id}" width="400" height="52"></canvas>
          <div class="channel-note-count" id="count-${id}">0 notes</div>
        </div>
        <div class="ch-controls">
          <div class="ch-btns">
            <button class="btn-solo"      id="solo-${id}">SOLO</button>
            <button class="btn-mute"      id="mute-${id}">MUTE</button>
            <button class="btn-regen"     id="regen-${id}"     disabled>Regen</button>
            <button class="btn-edit-roll" id="edit-${id}">Piano Roll</button>
            <div class="ch-transpose">
              <button class="btn-tr" id="tr-dn-${id}"     title="-1 semitone">-1</button>
              <button class="btn-tr" id="tr-up-${id}"     title="+1 semitone">+1</button>
              <button class="btn-tr" id="tr-oct-dn-${id}" title="-1 octave" style="width:26px;font-size:9px">-12</button>
              <button class="btn-tr" id="tr-oct-up-${id}" title="+1 octave" style="width:26px;font-size:9px">+12</button>
            </div>
            <button class="btn-export-ch" id="export-ch-${id}" disabled>MIDI</button>
            <button class="btn-lock" id="lock-${id}" title="Lock channel — Regen won't change it">LOCK</button>
            <div class="ch-sparse-wrap" title="Generation sparseness — how often this channel rests">
              <button class="btn-gen-toggle ${this.channelGenEnabled[id] !== false ? 'active' : ''}" id="gen-toggle-${id}" title="Toggle channel in generation">GEN</button>
              <input type="range" class="ch-sparse" id="sparse-${id}" min="0" max="1" value="${this.channelSparseValues[id] ?? 0}" step="0.05" ${this.channelGenEnabled[id] === false ? 'disabled' : ''}>
              <span class="ch-sparse-val" id="sparse-val-${id}">${Math.round((this.channelSparseValues[id] ?? 0) * 100)}%</span>
            </div>
            <select class="ch-style-select" id="style-${id}" title="Generation style for this channel">
              <option value="auto">Auto</option>
              ${id === 'pulse1' || id === 'pulse2' ? '<option value="melody">Melody</option><option value="accomp">Chords</option><option value="stab">Chord Stab</option>' : ''}
              ${id === 'pulse3' ? '<option value="arp">Arpeggio</option><option value="melody">Melody</option>' : ''}
              ${id === 'pad' ? '<option value="pad">Pad</option>' : ''}
              ${id === 'wave' ? '<option value="bass">Bass (Auto)</option><option value="march">March Bass</option><option value="walking">Walking Bass</option><option value="waltz">Waltz Bass</option><option value="alberti">Alberti Bass</option><option value="melody">Melody</option>' : ''}
              ${id === 'noise' ? '<option value="drums">Drums</option><option value="off">Off</option>' : ''}
            </select>
            <select class="ch-sf2-select" id="sf2-src-${id}" title="Which soundfont this channel uses" style="display:none;font:10px Tahoma;padding:1px 2px;max-width:80px">
            </select>
            <select class="instrument-select" id="select-${id}">
              <option value="0">-- No SF2 --</option>
            </select>
          </div>
          <div class="ch-sliders">
            <div class="ch-step-ctrl" title="Channel volume">
              <span class="ch-slider-lbl">VOL</span>
              <div class="ch-btn-group">
                <button class="btn-chstep" id="chvol-dn-${id}">-</button>
                <span class="ch-step-val" id="chvol-val-${id}">100%</span>
                <button class="btn-chstep" id="chvol-up-${id}">+</button>
              </div>
            </div>
            <div class="ch-step-ctrl" title="Pan: Left / Center / Right">
              <span class="ch-slider-lbl">PAN</span>
              <div class="ch-btn-group">
                <button class="btn-chstep" id="pan-dn-${id}">◄</button>
                <span class="ch-step-val ch-pan-val" id="pan-val-${id}">${formatPan(Math.round(this.channelPanValues[id] * 100))}</span>
                <button class="btn-chstep" id="pan-up-${id}">►</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderFAQModal(): string {
    return `
      <div id="faq-modal" class="modal-overlay">
        <div class="modal-window">
          <div class="modal-titlebar">
            <span class="modal-title-text">How to Use Bloop Maker</span>
            <button class="modal-close" id="faq-close">Close</button>
          </div>
          <div class="modal-body">
            <h3>Step 1: Get a Soundfont</h3>
            <p>You need a <strong>.sf2</strong> file to make actual sounds. Look up "GeneralUser GS" or "FluidR3 GM" — both are free and work great. Drag it into the Soundfont box.</p>
            <div class="tip">No SF2? You can still generate and export MIDI. You just won't hear anything. Sad but true.</div>

            <h3>Step 2: Make Some Music</h3>
            <p>Hit <strong>Generate!</strong> to create a random song. Pick a preset from the dropdown if you want a head start. Adjust the BPM, key, scale, and number of bars. Or drop a .mid file to import something from outside.</p>

            <h3>Step 3: Play It</h3>
            <p>Hit <strong>&gt;</strong> or press <strong>Space</strong> to play. The wiggly green lines are an oscilloscope. It doesn't do anything useful. It just looks extremely cool.</p>

            <h3>Step 4: Mess With It</h3>
            <p><strong>Swing</strong> adds jazzy groove. <strong>Humanize</strong> adds subtle timing and velocity differences so it sounds less like a robot. <strong>Reverb</strong> adds spaciousness (great for ambient stuff). Each channel has <strong>L / C / R</strong> pan buttons, volume, and instrument selector. SOLO plays one channel alone. MUTE silences one.</p>

            <h3>Step 5: Edit Notes</h3>
            <p>Click <strong>Piano Roll</strong> on any channel to expand it and see the notes. Click an empty spot to add a note. Click an existing note to remove it. Notes snap to 16th notes. The Regen button regenerates just that channel.</p>

            <h3>Step 6: Export</h3>
            <p><strong>Save MIDI</strong> exports the note data — open it in any DAW or music app. <strong>Save WAV</strong> renders actual audio you can play anywhere.</p>

            <h3>Keyboard Shortcuts</h3>
            <div class="tip">
              Space = Play / Pause &nbsp;&nbsp; R = Restart and Play<br>
              Ctrl+Z = Undo &nbsp;&nbsp; Ctrl+Y = Redo
            </div>

            <h3>Tips</h3>
            <p>Infinite mode: when playing a generated song, it automatically adds more bars before the end so it never stops. Change BPM in the transport to rescale all notes to a new tempo. Drop any .mid file to import and then scramble it.</p>
            <p style="margin-top:14px;color:var(--txt-dis);font-size:10px;text-align:center">Made with love, confusion, and way too many music theory decisions ~</p>
          </div>
          <div class="modal-footer">
            <button id="faq-close-btn">Got it!</button>
          </div>
        </div>
      </div>
    `;
  }

  // ── Events ────────────────────────────────────────────────────

  private bindEvents() {
    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); this.togglePlay(); }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); this.restartAndPlay(); }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.undo(); }
      if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) { e.preventDefault(); this.redo(); }
      if (e.key === 'Backspace') {
        e.preventDefault();
        const newTime = Math.max(0, this.currentTime - 5);
        if (this.state.isPlaying) this.seekTo(newTime);
        else this.currentTime = newTime;
      }
    });

    // Close dropdowns on outside click
    document.addEventListener('click', e => {
      if (!(e.target as HTMLElement).closest('.win-menu-item')) {
        document.querySelectorAll('.win-menu-item.open').forEach(el => el.classList.remove('open'));
      }
    });

    // Menu items
    document.querySelectorAll('.win-menu-item').forEach(item => {
      item.addEventListener('click', e => {
        e.stopPropagation();
        const wasOpen = item.classList.contains('open');
        document.querySelectorAll('.win-menu-item.open').forEach(el => el.classList.remove('open'));
        if (!wasOpen) item.classList.add('open');
      });
    });

    // Dropdown actions
    document.querySelectorAll('.win-dropdown-item').forEach(item => {
      item.addEventListener('click', e => {
        e.stopPropagation();
        document.querySelectorAll('.win-menu-item.open').forEach(el => el.classList.remove('open'));
        const action = (item as HTMLElement).dataset.action;
        if (action) this.handleMenuAction(action);
      });
    });

    // Undo/redo buttons
    this.undoBtn.addEventListener('click', () => this.undo());
    this.redoBtn.addEventListener('click', () => this.redo());

    // Dark mode
    document.getElementById('dark-btn')!.addEventListener('click', () => this.toggleDarkMode());

    // Preset dropdown
    document.getElementById('gen-preset')!.addEventListener('change', e => {
      const val = (e.target as HTMLSelectElement).value;
      if (val === 'custom') return;
      const p = GEN_PRESETS[parseInt(val, 10)];
      if (!p) return;
      this.applyPreset(p);
    });

    // Presets submenu items
    document.querySelectorAll('[data-preset-idx]').forEach(item => {
      item.addEventListener('click', e => {
        e.stopPropagation();
        document.querySelectorAll('.win-menu-item.open').forEach(el => el.classList.remove('open'));
        const idx = parseInt((item as HTMLElement).dataset.presetIdx!, 10);
        const p = GEN_PRESETS[idx];
        if (p) this.applyPreset(p);
      });
    });

    document.getElementById('gen-btn')!.addEventListener('click', () => this.runGenerator());

    // Tap tempo
    let tapTimes: number[] = [];
    document.getElementById('tap-tempo-btn')!.addEventListener('click', () => {
      const now = Date.now();
      tapTimes = tapTimes.filter(t => now - t < 3000);
      tapTimes.push(now);
      if (tapTimes.length >= 2) {
        const intervals = tapTimes.slice(1).map((t, i) => t - tapTimes[i]);
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const bpm = Math.round(60000 / avgInterval);
        const clamped = Math.max(40, Math.min(220, bpm));
        (document.getElementById('gen-bpm') as HTMLInputElement).value = String(clamped);
      }
    });

    const sparseSlider = document.getElementById('gen-sparseness') as HTMLInputElement;
    sparseSlider.addEventListener('input', () => {
      const v = parseFloat(sparseSlider.value);
      document.getElementById('gen-sparseness-val')!.textContent = `${Math.round(v * 100)}%`;
    });

    // MIDI drop zone
    this.setupDropZone(this.midiDropZone, files => { if (files[0]) void this.loadMIDI(files[0]); });
    document.getElementById('midi-input')!.addEventListener('change', e => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) void this.loadMIDI(f);
    });

    // SF2 drop zone — supports multiple files at once
    this.setupDropZone(this.sf2DropZone, async files => {
      for (let i = 0; i < files.length; i++) {
        if (files[i].name.toLowerCase().endsWith('.sf2')) await this.loadSF2(files[i]);
      }
    });
    document.getElementById('sf2-input')!.addEventListener('change', async e => {
      const files = (e.target as HTMLInputElement).files;
      if (files) for (let i = 0; i < files.length; i++) await this.loadSF2(files[i]);
      (e.target as HTMLInputElement).value = '';
    });
    this.sf2RandomBtn.addEventListener('click', () => this.randomizeSF2Presets());

    // Scramble sliders
    const trSlider = document.getElementById('sc-transpose') as HTMLInputElement;
    const vaSlider = document.getElementById('sc-variation') as HTMLInputElement;
    trSlider.addEventListener('input', () => {
      const v = parseInt(trSlider.value, 10);
      document.getElementById('sc-transpose-val')!.textContent = `${v > 0 ? '+' : ''}${v} oct`;
    });
    vaSlider.addEventListener('input', () => {
      document.getElementById('sc-variation-val')!.textContent = vaSlider.value;
    });
    this.scrambleBtn.addEventListener('click', () => this.runScrambler());

    // Swing slider
    this.swingSlider.addEventListener('input', () => {
      const v = parseFloat(this.swingSlider.value);
      const pct = Math.round(v / 0.33 * 100);
      document.getElementById('swing-val')!.textContent = `${pct}%`;
      if (this.scheduler) this.scheduler.swingAmount = v;
    });

    // Humanize
    document.getElementById('humanize-amount')!.addEventListener('input', e => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      document.getElementById('humanize-val')!.textContent = `${Math.round(v * 100)}%`;
    });
    this.humanizeBtn.addEventListener('click', () => this.applyHumanize());

    // Reverb
    this.reverbWetSlider.addEventListener('input', () => {
      const wet = parseFloat(this.reverbWetSlider.value);
      document.getElementById('reverb-val')!.textContent = `${Math.round(wet * 100)}%`;
      const decay = parseFloat(this.reverbDecaySlider.value);
      this.sampler?.setReverbAmount(wet, decay);
    });
    this.reverbDecaySlider.addEventListener('input', () => {
      const decay = parseFloat(this.reverbDecaySlider.value);
      document.getElementById('reverb-decay-val')!.textContent = `${decay.toFixed(1)}s`;
      const wet = parseFloat(this.reverbWetSlider.value);
      if (wet > 0) this.sampler?.setReverbAmount(wet, decay);
    });

    // BPM input (rescale notes on change)
    this.bpmInput.addEventListener('change', () => {
      const newBPM = parseInt(this.bpmInput.value, 10);
      if (!isNaN(newBPM) && newBPM >= 20 && newBPM <= 300) this.rescaleBPM(newBPM);
    });
    this.bpmInput.addEventListener('keydown', e => { if (e.key === 'Enter') this.bpmInput.blur(); });

    // Transport
    this.restartBtn.addEventListener('click', () => this.restartPlayback());
    this.playBtn.addEventListener('click',    () => this.togglePlay());
    this.stopBtn.addEventListener('click',    () => this.stopPlayback());
    this.downloadBtn.addEventListener('click', () => this.runDownload());
    this.wavBtn.addEventListener('click',     () => void this.runWAVExport());

    this.seekSlider.addEventListener('mousedown',  () => { this.isDraggingSeek = true; });
    this.seekSlider.addEventListener('touchstart', () => { this.isDraggingSeek = true; }, { passive: true });
    this.seekSlider.addEventListener('input', () => this.updateTimeDisplay(parseFloat(this.seekSlider.value)));
    this.seekSlider.addEventListener('change', () => {
      this.isDraggingSeek = false;
      this.seekTo(parseFloat(this.seekSlider.value));
    });

    const volSlider = document.getElementById('vol-slider') as HTMLInputElement;
    volSlider.addEventListener('input', () => {
      const v = parseFloat(volSlider.value);
      document.getElementById('vol-val')!.textContent = `${Math.round(v * 100)}%`;
      this.sampler?.setVolume(v);
    });

    // FAQ modal close
    const closeFAQ = () => this.faqModal.classList.remove('open');
    document.getElementById('faq-close')!.addEventListener('click', closeFAQ);
    document.getElementById('faq-close-btn')!.addEventListener('click', closeFAQ);
    this.faqModal.addEventListener('click', e => { if (e.target === this.faqModal) closeFAQ(); });

    // Project load input
    this.projectLoadInput.addEventListener('change', e => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) void this.loadProject(f);
    });

    // Channel controls
    for (const id of CHANNELS) {
      this.muteBtns[id].addEventListener('click',     () => this.toggleMute(id));
      this.soloBtns[id].addEventListener('click',     () => this.toggleSolo(id));
      this.regenBtns[id].addEventListener('click',    () => this.regenChannel(id));
      this.exportChBtns[id].addEventListener('click', () => this.exportChannel(id));
      this.editBtns[id].addEventListener('click',     () => this.toggleChannelEdit(id));
      const lockBtn = document.getElementById(`lock-${id}`) as HTMLButtonElement;
      lockBtn?.addEventListener('click', () => {
        this.channelLocked[id] = !this.channelLocked[id];
        lockBtn.classList.toggle('active', !!this.channelLocked[id]);
      });
      const volValEl = document.getElementById(`chvol-val-${id}`)!;
      const adjVol = (delta: number) => {
        this.channelVolValues[id] = Math.max(0, Math.min(1, (this.channelVolValues[id] ?? 1) + delta));
        volValEl.textContent = `${Math.round(this.channelVolValues[id] * 100)}%`;
        this.sampler?.setChannelVolume(id, this.channelVolValues[id]);
      };
      document.getElementById(`chvol-dn-${id}`)!.addEventListener('click', () => adjVol(-0.05));
      document.getElementById(`chvol-up-${id}`)!.addEventListener('click', () => adjVol(0.05));
      const sparseEl    = document.getElementById(`sparse-${id}`) as HTMLInputElement;
      const sparseValEl = document.getElementById(`sparse-val-${id}`)!;
      const genToggleEl = document.getElementById(`gen-toggle-${id}`) as HTMLButtonElement;
      sparseEl?.addEventListener('input', () => {
        const v = parseFloat(sparseEl.value);
        this.channelSparseValues[id] = v;
        sparseValEl.textContent = `${Math.round(v * 100)}%`;
      });
      genToggleEl?.addEventListener('click', () => {
        const enabled = this.channelGenEnabled[id] !== false;
        this.channelGenEnabled[id] = !enabled;
        genToggleEl.classList.toggle('active', !enabled);
        // Don't disable the slider — just visually dim it so user can still read/change the value
        sparseEl.style.opacity = enabled ? '0.4' : '1';
        genToggleEl.title = enabled ? 'Channel excluded from generation (click to enable)' : 'Toggle channel in generation';
      });
      // Per-channel SF2 source
      const sf2SrcEl = document.getElementById(`sf2-src-${id}`) as HTMLSelectElement;
      sf2SrcEl?.addEventListener('change', () => {
        const idx = parseInt(sf2SrcEl.value, 10);
        this.channelSF2Idx[id] = idx;
        this.sampler?.setChannelSF2(id, idx);
        this.updateChannelInstrumentSelector(id);
      });
      document.getElementById(`tr-up-${id}`)!.addEventListener('click',     () => this.transposeChannel(id, 1));
      document.getElementById(`tr-dn-${id}`)!.addEventListener('click',     () => this.transposeChannel(id, -1));
      document.getElementById(`tr-oct-up-${id}`)!.addEventListener('click', () => this.transposeChannel(id, 12));
      document.getElementById(`tr-oct-dn-${id}`)!.addEventListener('click', () => this.transposeChannel(id, -12));
      this.selects[id].addEventListener('change', e => {
        this.state.channels[id].presetIndex = parseInt((e.target as HTMLSelectElement).value, 10);
      });
      // Channel style select
      const styleEl = document.getElementById(`style-${id}`) as HTMLSelectElement;
      if (styleEl) {
        styleEl.value = this.channelStyle[id] ?? 'auto';
        styleEl.addEventListener('change', () => { this.channelStyle[id] = styleEl.value; });
      }
      // Pan buttons
      const adjPan = (delta: number) => {
        const cur = Math.round((this.channelPanValues[id] ?? 0) * 100);
        const next = Math.max(-100, Math.min(100, cur + delta));
        this.channelPanValues[id] = next / 100;
        this.panValEls[id].textContent = formatPan(next);
        this.sampler?.setChannelPan(id, next / 100);
      };
      document.getElementById(`pan-dn-${id}`)!.addEventListener('click', () => adjPan(-10));
      document.getElementById(`pan-up-${id}`)!.addEventListener('click', () => adjPan(10));
    }
  }

  // ── Menu action dispatch ───────────────────────────────────────

  private handleMenuAction(action: string) {
    switch (action) {
      case 'new-project':      this.newProject(); break;
      case 'load-project':     this.projectLoadInput.click(); break;
      case 'save-project':     this.saveProject(); break;
      case 'quick-ambient':    this.quickGenerate({ mode:'ambient', bpm:72,  scale:'lydian',          generateNoise:false }); break;
      case 'quick-battle':     this.quickGenerate({ mode:'battle',  bpm:183, scale:'minor',            generateNoise:true  }); break;
      case 'quick-town':       this.quickGenerate({ mode:'mid',     bpm:110, scale:'major',            generateNoise:true  }); break;
      case 'quick-jazz':       this.quickGenerate({ mode:'mid',     bpm:105, scale:'dorian',           generateNoise:true  }); break;
      case 'quick-dream':      this.quickGenerate({ mode:'ambient', bpm:60,  scale:'wholeTone',        generateNoise:false }); break;
      case 'more-bars':        this.addMoreBars(16); break;
      case 'random-preset':    this.randomAndGenerate(); break;
      case 'show-faq':         this.faqModal.classList.add('open'); break;
      case 'show-shortcuts':   this.showShortcuts(); break;
    }
  }

  // ── Dark mode ────────────────────────────────────────────────

  private toggleDarkMode() {
    document.body.classList.toggle('dark');
    localStorage.setItem('bloopDark', document.body.classList.contains('dark') ? '1' : '0');
  }

  // ── BPM rescaling ────────────────────────────────────────────

  private rescaleBPM(newBPM: number) {
    const oldBPM = this.state.bpm;
    if (newBPM === oldBPM) return;
    this.pushHistory();
    const scale = oldBPM / newBPM;
    for (const id of CHANNELS) {
      this.state.channels[id].notes = this.state.channels[id].notes.map(n => ({
        ...n,
        time:     Math.max(0, n.time * scale),
        duration: Math.max(0.01, n.duration * scale),
      }));
    }
    this.state.duration *= scale;
    this.state.bpm = newBPM;
    if (this.scheduler) { this.scheduler.stop(); this.state.isPlaying = false; }
    this.currentTime = 0;
    this.seekSlider.max   = String(this.state.duration);
    this.seekSlider.value = '0';
    this.updateAllCanvases();
    this.updateNoteCountBadges();
    this.updateTransportButtons();
    this.updateTimeDisplay(0);
    this.setStatus('ok', `BPM changed to ${newBPM} -- notes rescaled. Hit play!`);
  }

  // ── Channel pan ───────────────────────────────────────────────

  private setChannelPan(id: ChannelId, pan: number) {
    const clamped = Math.max(-1, Math.min(1, pan));
    this.channelPanValues[id] = clamped;
    this.sampler?.setChannelPan(id, clamped);
    const intVal = Math.round(clamped * 100);
    if (this.panValEls[id])  this.panValEls[id].textContent = formatPan(intVal);
  }

  private applyAllPans() {
    for (const id of CHANNELS) {
      this.sampler?.setChannelPan(id, this.channelPanValues[id]);
    }
  }

  // ── Project save / load / new ─────────────────────────────────

  private newProject() {
    const hasNotes = CHANNELS.some(id => this.state.channels[id].notes.length > 0);
    if (hasNotes && !confirm('Start a new project? Your current work will be lost (unless saved).')) return;
    this.pushHistory();
    this.state = makeDefaultState();
    this.bpmInput.value = '--';
    this.seekSlider.max   = '300';
    this.seekSlider.value = '0';
    this.updateAllCanvases();
    this.updateNoteCountBadges();
    this.updateTransportButtons();
    this.updateTimeDisplay(0);
    this.currentTime = 0;
    this.lastGenConfig = null;
    this.updateSongTitle();
    this.setStatus('ok', 'New project started!');
  }

  private saveProject() {
    const hasNotes = CHANNELS.some(id => this.state.channels[id].notes.length > 0);
    if (!hasNotes) { this.setStatus('err', 'Nothing to save yet!'); return; }
    const project: BloopProject = {
      version: 1,
      bpm: this.state.bpm,
      duration: this.state.duration,
      channels: {} as Record<string, NoteEvent[]>,
      channelPresets: {} as Record<string, number>,
      channelPans: {} as Record<string, number>,
    };
    for (const id of CHANNELS) {
      project.channels[id]       = this.state.channels[id].notes;
      project.channelPresets![id] = this.state.channels[id].presetIndex;
      project.channelPans![id]    = this.channelPanValues[id];
    }
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `bloopmaker_${Date.now()}.bloop`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.setStatus('ok', 'Project saved as .bloop file!');
  }

  private async loadProject(file: File) {
    try {
      const text = await file.text();
      const project: BloopProject = JSON.parse(text);
      if (project.version !== 1 || !project.channels || !project.bpm) {
        throw new Error('Invalid .bloop file format');
      }
      this.pushHistory();
      this.state.bpm      = project.bpm;
      this.state.duration = project.duration;
      for (const id of CHANNELS) {
        this.state.channels[id].notes = (project.channels[id] ?? []).map(n => ({ ...n }));
        if (project.channelPresets?.[id] != null) {
          this.state.channels[id].presetIndex = project.channelPresets[id];
          this.selects[id].value = String(project.channelPresets[id]);
        }
        if (project.channelPans?.[id] != null) {
          this.setChannelPan(id, project.channelPans[id]);
        }
      }
      this.bpmInput.value   = String(Math.round(project.bpm));
      this.seekSlider.max   = String(project.duration);
      this.seekSlider.value = '0';
      this.updateAllCanvases();
      this.updateNoteCountBadges();
      this.updateTransportButtons();
      this.updateTimeDisplay(0);
      this.currentTime = 0;
      this.setStatus('ok', `Loaded: ${file.name} -- ${Math.round(project.bpm)} BPM`);
    } catch (err) {
      this.setStatus('err', `Failed to load project: ${(err as Error).message}`);
    }
    this.projectLoadInput.value = '';
  }

  // ── Quick generate / add bars ─────────────────────────────────

  private applyPreset(p: GenPreset) {
    this.genMode = p.mode;
    (document.getElementById('gen-bpm')   as HTMLInputElement).value = String(p.bpm);
    (document.getElementById('gen-scale') as HTMLSelectElement).value = p.scale;
    (document.getElementById('gen-noise') as HTMLInputElement).checked = p.generateNoise;
  }

  private quickGenerate(opts: Partial<GenConfig> & { mode: GenMode; bpm: number; scale: string; generateNoise: boolean }) {
    this.genMode = opts.mode;
    (document.getElementById('gen-bpm')   as HTMLInputElement).value  = String(opts.bpm);
    (document.getElementById('gen-scale') as HTMLSelectElement).value = opts.scale;
    (document.getElementById('gen-noise') as HTMLInputElement).checked = opts.generateNoise;
    (document.getElementById('gen-preset') as HTMLSelectElement).value = 'custom';
    // Apply a sensible default sparseness for the mode
    const sparDefault = opts.mode === 'ambient' ? 0.5 : opts.mode === 'battle' ? 0.1 : opts.mode === 'jazzy' ? 0.35 : opts.mode === 'funky' ? 0.25 : opts.mode === 'silly' ? 0.15 : opts.mode === 'weird' ? 0.40 : 0.4;
    const sparEl = document.getElementById('gen-sparseness') as HTMLInputElement;
    sparEl.value = String(sparDefault);
    document.getElementById('gen-sparseness-val')!.textContent = `${Math.round(sparDefault * 100)}%`;
    this.runGenerator();
  }

  private randomAndGenerate() {
    const p = GEN_PRESETS[Math.floor(Math.random() * GEN_PRESETS.length)];
    this.quickGenerate(p);
  }

  private addMoreBars(bars = 16) {
    if (!this.lastGenConfig) { this.setStatus('err', 'Generate something first!'); return; }
    this.pushHistory();
    const extra = generate({ ...this.lastGenConfig, bars });
    const offset = this.state.duration;
    for (const id of CHANNELS) {
      const shifted = extra.channels[id].map(n => ({ ...n, time: n.time + offset }));
      this.state.channels[id].notes.push(...shifted);
    }
    this.state.duration += extra.duration;
    this.seekSlider.max = String(this.state.duration);
    this.scheduler?.extendDuration(this.state.duration);
    this.updateAllCanvases();
    this.updateNoteCountBadges();
    this.setStatus('ok', `Added ${bars} more bars!`);
  }

  private showShortcuts() {
    const msg = [
      'Space = Play / Pause',
      'R = Restart and Play',
      'Ctrl+Z = Undo',
      'Ctrl+Y = Redo',
    ].join('\n');
    alert(msg);
  }

  // ── Helpers ──────────────────────────────────────────────────

  private generateSongTitle(): string {
    const ADJ  = ['Cosmic','Dizzy','Frozen','Glowing','Haunted','Jiggly','Lazy','Mega','Noodle','Puffy','Squishy','Tiny','Wiggly','Zesty','Bouncy','Chunky','Fluffy','Goofy','Lumpy','Wobbly'];
    const NOUN = ['Bloop','Bonk','Boop','Chomp','Clonk','Donk','Florp','Gloop','Honk','Mlem','Plonk','Skronk','Splat','Squonk','Thwump','Toot','Whump','Wonk','Zorp','Bworp'];
    const TYPE = ['Ballad','Banger','Ditty','Groove','Jam','March','Polka','Riff','Sonata','Theme','Tune','Waltz','Anthem','Lullaby','Opus'];
    const SUFF = ['','','','in Space','Forever','No. 7','Deluxe','Reprise','(Sad Version)','ft. Goose','for Piano','Extreme','2000'];
    const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const title = `${pick(ADJ)} ${pick(NOUN)} ${pick(TYPE)}`;
    const suff  = pick(SUFF);
    return suff ? `${title} ${suff}` : title;
  }

  private updateSongTitle() {
    this.currentSongTitle = this.generateSongTitle();
    const el = document.getElementById('song-subtitle');
    if (el) el.textContent = this.currentSongTitle;
  }

  private colorTitle(text: string): string {
    const COLORS = ['#e63030','#1a8fff','#e8b800','#22aa44','#e63030','#1a8fff','#e8b800','#22aa44'];
    let ci = 0;
    return [...text].map(ch => {
      if (ch === ' ') return '<span style="display:inline-block;width:0.3em"></span>';
      return `<span class="title-letter" style="color:${COLORS[ci++ % COLORS.length]}">${ch}</span>`;
    }).join('');
  }

  private setupDropZone(el: HTMLElement, handler: (files: FileList) => void) {
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', e => {
      e.preventDefault(); el.classList.remove('drag-over');
      if (e.dataTransfer?.files?.length) handler(e.dataTransfer.files);
    });
  }

  // ── Undo/Redo ─────────────────────────────────────────────────

  private pushHistory() {
    this.history.splice(this.historyIndex + 1);
    const snapshot: HistoryEntry = {
      channels: {} as Record<ChannelId, NoteEvent[]>,
      duration: this.state.duration,
      bpm: this.state.bpm,
    };
    for (const id of CHANNELS) snapshot.channels[id] = [...this.state.channels[id].notes];
    this.history.push(snapshot);
    if (this.history.length > this.MAX_HISTORY) this.history.shift();
    this.historyIndex = this.history.length - 1;
    this.updateHistoryButtons();
  }

  private undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.restoreHistoryEntry(this.history[this.historyIndex]);
  }

  private redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.restoreHistoryEntry(this.history[this.historyIndex]);
  }

  private restoreHistoryEntry(entry: HistoryEntry) {
    for (const id of CHANNELS) this.state.channels[id].notes = [...entry.channels[id]];
    this.state.duration = entry.duration;
    this.state.bpm = entry.bpm;
    this.bpmInput.value = String(Math.round(entry.bpm));
    this.seekSlider.max = String(entry.duration);
    this.updateAllCanvases();
    this.updateNoteCountBadges();
    this.updateTransportButtons();
    this.updateHistoryButtons();
  }

  private updateHistoryButtons() {
    this.undoBtn.disabled = this.historyIndex <= 0;
    this.redoBtn.disabled = this.historyIndex >= this.history.length - 1;
  }

  // ── Generator ────────────────────────────────────────────────

  private runGenerator() {
    const key           = parseInt((document.getElementById('gen-key')   as HTMLInputElement).value, 10);
    const bpm           = parseInt((document.getElementById('gen-bpm')   as HTMLInputElement).value, 10) || 130;
    const bars          = parseInt((document.getElementById('gen-bars')  as HTMLInputElement).value, 10) || 32;
    const scaleRaw      = (document.getElementById('gen-scale') as HTMLSelectElement).value as ScaleType | '';
    const generateNoise = (document.getElementById('gen-noise') as HTMLInputElement).checked;

    const sparseness = parseFloat((document.getElementById('gen-sparseness') as HTMLInputElement).value);
    const channelSparseness = {
      pulse1: this.channelGenEnabled['pulse1'] === false ? 1 : (this.channelSparseValues['pulse1'] ?? 0),
      pulse2: this.channelGenEnabled['pulse2'] === false ? 1 : (this.channelSparseValues['pulse2'] ?? 0),
      wave:   this.channelGenEnabled['wave']   === false ? 1 : (this.channelSparseValues['wave']   ?? 0),
      noise:  this.channelGenEnabled['noise']  === false ? 1 : (this.channelSparseValues['noise']  ?? 0),
      pulse3: this.channelGenEnabled['pulse3'] === false ? 1 : (this.channelSparseValues['pulse3'] ?? 0),
      pad:    this.channelGenEnabled['pad']    === false ? 1 : (this.channelSparseValues['pad']    ?? 0),
    };
    const channelStyles = {
      pulse1: this.channelStyle['pulse1'] ?? 'auto',
      pulse2: this.channelStyle['pulse2'] ?? 'auto',
      wave:   this.channelStyle['wave']   ?? 'auto',
      noise:  this.channelStyle['noise']  ?? 'auto',
      pulse3: this.channelStyle['pulse3'] ?? 'auto',
      pad:    this.channelStyle['pad']    ?? 'auto',
    };
    const config: GenConfig = { mode: this.genMode, key, octave: 4, bars, bpm, scaleType: scaleRaw || undefined, generateNoise, sparseness, channelSparseness, channelStyles };
    this.lastGenConfig = config;
    this.setStatus('busy', `Generating ${bars} bars...`);

    setTimeout(() => {
      try {
        this.pushHistory();
        const result = generate(config);
        this.applyResult(result.channels, result.duration, result.bpm);
        this.state.inputType = 'generated';
        this.updateSongTitle();
        this.setStatus('ok', `Generated! ${bars} bars -- ${NOTE_NAMES[key]} -- ${Math.round(result.bpm)} BPM -- infinite mode active`);
      } catch (err) {
        this.setStatus('err', `Generator error: ${(err as Error).message}`);
        console.error(err);
      }
    }, 10);
  }

  private regenChannel(id: ChannelId) {
    if (this.channelLocked[id]) return;
    if (!this.lastGenConfig) return;
    this.pushHistory();
    const beatDur = 60 / this.state.bpm;
    const bars = Math.max(this.lastGenConfig.bars, Math.ceil(this.state.duration / (beatDur * 4)));
    const chSparse = this.channelSparseValues[id] ?? 0;
    const channelSparseness = {
      pulse1: id === 'pulse1' ? chSparse : 0,
      pulse2: id === 'pulse2' ? chSparse : 0,
      wave:   id === 'wave'   ? chSparse : 0,
      noise:  id === 'noise'  ? chSparse : 0,
      pulse3: id === 'pulse3' ? chSparse : 0,
      pad:    id === 'pad'    ? chSparse : 0,
    };
    const result = generate({ ...this.lastGenConfig, bars, sparseness: 0, channelSparseness });
    this.state.channels[id].notes = result.channels[id];
    this.drawPianoRoll(id, this.currentTime);
    const c = result.channels[id].length;
    this.noteCountEls[id].textContent = `${c} note${c !== 1 ? 's' : ''}`;
    this.setStatus('ok', `Regenned ${id}!`);
  }

  // ── Humanize ─────────────────────────────────────────────────

  private applyHumanize() {
    const amount = parseFloat((document.getElementById('humanize-amount') as HTMLInputElement).value);
    this.pushHistory();
    for (const id of CHANNELS) {
      this.state.channels[id].notes = this.state.channels[id].notes.map(n => {
        const timeJitter = (Math.random() - 0.5) * 0.04 * amount;
        const velJitter  = Math.round((Math.random() - 0.5) * 18 * amount);
        return {
          ...n,
          time:     Math.max(0, n.time + timeJitter),
          velocity: Math.max(1, Math.min(127, n.velocity + velJitter)),
        };
      });
    }
    this.updateAllCanvases();
    this.setStatus('ok', `Humanized! Amount: ${Math.round(amount * 100)}%`);
  }

  // ── Channel transpose ─────────────────────────────────────────

  private transposeChannel(id: ChannelId, semitones: number) {
    this.pushHistory();
    this.state.channels[id].notes = this.state.channels[id].notes.map(n => ({
      ...n, midi: Math.max(0, Math.min(127, n.midi + semitones)),
    }));
    this.drawPianoRoll(id, this.currentTime);
  }

  // ── Piano roll editor ─────────────────────────────────────────

  private toggleChannelEdit(id: ChannelId) {
    const canvas = this.canvases[id];
    const btn    = this.editBtns[id];
    if (this.editingChannels.has(id)) {
      this.editingChannels.delete(id);
      canvas.height = 52;
      canvas.classList.remove('editing');
      btn.classList.remove('active');
      canvas.style.cursor = 'default';
      canvas.removeEventListener('mousedown', (canvas as any)._editHandler);
      canvas.removeEventListener('wheel', (canvas as any)._wheelHandler);
      this.pianoRollZoom.delete(id);
    } else {
      this.editingChannels.add(id);
      canvas.height = 200;
      canvas.classList.add('editing');
      btn.classList.add('active');
      canvas.style.cursor = 'crosshair';
      const handler = (e: MouseEvent) => this.handleCanvasMouseDown(id, e);
      (canvas as any)._editHandler = handler;
      canvas.addEventListener('mousedown', handler);
      const wheelHandler = (e: WheelEvent) => {
        e.preventDefault();
        const duration = this.state.duration;
        if (!duration) return;
        const zoom = this.pianoRollZoom.get(id) ?? { start: 0, end: duration };
        const rect  = canvas.getBoundingClientRect();
        const pivot = zoom.start + ((e.clientX - rect.left) / rect.width) * (zoom.end - zoom.start);
        const factor = e.deltaY > 0 ? 1.25 : 0.8;
        let newStart = pivot - (pivot - zoom.start) * factor;
        let newEnd   = pivot + (zoom.end - pivot) * factor;
        const minSpan = 60 / (this.state.bpm || 130) * 2; // at least 2 beats
        if (newEnd - newStart < minSpan) { const c = (newStart + newEnd) / 2; newStart = c - minSpan / 2; newEnd = c + minSpan / 2; }
        newStart = Math.max(0, newStart);
        newEnd   = Math.min(duration, newEnd);
        if (newEnd - newStart < minSpan) newEnd = Math.min(duration, newStart + minSpan);
        if (newStart === 0 && newEnd === duration) this.pianoRollZoom.delete(id);
        else this.pianoRollZoom.set(id, { start: newStart, end: newEnd });
        this.drawPianoRoll(id, this.currentTime);
      };
      (canvas as any)._wheelHandler = wheelHandler;
      canvas.addEventListener('wheel', wheelHandler, { passive: false });
    }
    this.drawPianoRoll(id, this.currentTime);
  }

  private handleCanvasMouseDown(id: ChannelId, e: MouseEvent) {
    const canvas   = this.canvases[id];
    const rect     = canvas.getBoundingClientRect();
    const xNorm    = (e.clientX - rect.left) / rect.width;
    const yNorm    = (e.clientY - rect.top)  / rect.height;
    const duration = this.state.duration;
    const range    = this.channelPitchRanges.get(id);
    if (!duration || !range) return;

    const KW = 20; // piano key strip width in canvas pixels (matches drawPianoRoll)
    const { lo, hi } = range;
    const W = canvas.width, H = canvas.height;
    // Click inside the piano key strip → preview that pitch
    if (xNorm * W < KW && this.sampler) {
      const clickMidi = Math.round(lo + (1 - yNorm) * (hi - lo + 1));
      if (clickMidi >= 0 && clickMidi <= 127) {
        this.sampler.playNote(this.state.channels[id].presetIndex, clickMidi, 100, 0, 0.4, id);
      }
      return;
    }

    const zoom      = this.pianoRollZoom.get(id);
    const viewStart = zoom ? zoom.start : 0;
    const viewEnd   = zoom ? zoom.end   : duration;
    const viewSpan  = viewEnd - viewStart;

    const noteH  = Math.max(2, H / (hi - lo + 1));
    const notes  = this.state.channels[id].notes;
    const beatDur  = 60 / this.state.bpm;
    const snapUnit = beatDur * 0.25;

    const timeToX = (t: number) => ((t - viewStart) / viewSpan) * W;

    // Hit-test existing notes
    const hitIdx = notes.findIndex(n => {
      const nx1 = timeToX(n.time);
      const nx2 = timeToX(n.time + n.duration);
      const ny  = H - ((n.midi - lo + 1) / (hi - lo + 1)) * H;
      const cx  = xNorm * W, cy = yNorm * H;
      return cx >= nx1 - 1 && cx <= nx2 + 1 && Math.abs(cy - ny) <= noteH / 2 + 2;
    });

    if (hitIdx >= 0) {
      // Click existing note → delete it
      this.pushHistory();
      notes.splice(hitIdx, 1);
      this.drawPianoRoll(id, this.currentTime);
      this.updateNoteCountBadges();
      this.updateTransportButtons();
      return;
    }

    // Click empty space → start drag to create note
    const clickTime = viewStart + xNorm * viewSpan;
    const noteTime  = Math.max(0, Math.round(clickTime / snapUnit) * snapUnit);
    const clickMidi = Math.round(lo + (1 - yNorm) * (hi - lo + 1));
    if (clickMidi < 0 || clickMidi > 127) return;

    this.pushHistory();
    const newNote = { time: noteTime, duration: snapUnit, midi: clickMidi, velocity: 90 };
    notes.push(newNote);
    notes.sort((a, b) => a.time - b.time);
    this.drawPianoRoll(id, this.currentTime);

    // Preview the placed note through the sampler
    if (this.sampler) {
      const previewDur = Math.max(0.12, snapUnit);
      this.sampler.playNote(this.state.channels[id].presetIndex, clickMidi, 90, 0, previewDur, id);
    }

    const onMove = (me: MouseEvent) => {
      const r     = canvas.getBoundingClientRect();
      const xN2   = (me.clientX - r.left) / r.width;
      const dragTime = Math.max(0, viewStart + xN2 * viewSpan);
      const rawDur   = dragTime - noteTime;
      newNote.duration = Math.max(snapUnit, Math.round(rawDur / snapUnit) * snapUnit);
      this.drawPianoRoll(id, this.currentTime);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      this.updateNoteCountBadges();
      this.updateTransportButtons();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // ── MIDI / SF2 loaders ────────────────────────────────────────

  private async loadMIDI(file: File) {
    this.setStatus('busy', `Loading ${file.name}...`);
    try {
      const buf = await file.arrayBuffer();
      const result = processMIDI(buf);
      this.midiFileNameEl.textContent = file.name;
      this.midiDropZone.classList.add('loaded');
      this.pushHistory();
      this.applyResult(result.channels, result.duration, result.bpm);
      this.state.inputType = 'midi';
      this.midiLoaded = true;
      this.scrambleBtn.disabled = false;
      this.setStatus('ok', `Loaded: ${file.name} -- ${Math.round(result.bpm)} BPM -- ${this.formatTime(result.duration)}`);
    } catch (err) {
      this.setStatus('err', `Failed to load MIDI: ${(err as Error).message}`);
    }
  }

  private runScrambler() {
    if (!this.midiLoaded && this.state.inputType !== 'generated') {
      this.setStatus('err', 'Load a MIDI file or generate something first!'); return;
    }
    const transpose = parseInt((document.getElementById('sc-transpose') as HTMLInputElement).value, 10) * 12;
    const variation = parseFloat((document.getElementById('sc-variation') as HTMLInputElement).value);
    const scaleSnap = (document.getElementById('sc-snap') as HTMLInputElement).checked;
    const scaleType = (document.getElementById('sc-scale') as HTMLSelectElement).value as ScaleType;
    const key       = parseInt((document.getElementById('gen-key') as HTMLInputElement).value, 10);

    const cfg: ScramblerConfig = { transposeSteps: transpose, variationLevel: variation, scaleSnap, scaleRoot: key, scaleType };
    const original = {} as Record<ChannelId, NoteEvent[]>;
    for (const id of CHANNELS) original[id] = [...this.state.channels[id].notes];

    this.pushHistory();
    const scrambled = scramble(original, cfg);
    for (const id of CHANNELS) this.state.channels[id].notes = scrambled[id];

    this.updateAllCanvases();
    this.updateNoteCountBadges();
    this.setStatus('ok', `Scrambled! Transpose: ${transpose / 12 >= 0 ? '+' : ''}${transpose / 12} oct  Variation: ${variation}`);
  }

  private async loadSF2(file: File) {
    this.sf2FileName = file.name;
    const sfProg = document.getElementById('sf2-progress-fill')! as HTMLElement;
    const sfWrap = document.getElementById('sf2-progress-wrap')! as HTMLElement;
    sfWrap.classList.add('visible'); sfProg.style.width = '10%';
    this.sf2StatusEl.textContent = `Parsing ${file.name}...`;

    try {
      const buf = await file.arrayBuffer();
      sfProg.style.width = '55%';
      const sf2 = parseSF2(buf);
      sfProg.style.width = '100%';

      // Append to loaded fonts list (don't replace)
      this.loadedSF2s.push({ name: file.name, sf2 });
      const sf2Idx = this.loadedSF2s.length - 1;
      this.state.sf2 = this.loadedSF2s[0].sf2; // primary SF2

      setTimeout(() => { sfWrap.classList.remove('visible'); sfProg.style.width = '0%'; }, 600);
      this.sf2StatusEl.textContent = `${this.loadedSF2s.length} font(s) loaded — ${sf2.presets.length} presets in ${file.name}`;
      this.sf2StatusEl.classList.add('loaded');
      this.sf2DropZone.classList.add('loaded');

      this.ensureAudioContext();
      if (this.audioCtx) {
        if (!this.sampler) {
          this.sampler = new SF2Sampler(this.audioCtx, sf2);
        } else {
          this.sampler.addSF2(sf2);
        }
        this.oscAnalyser = this.sampler.getAnalyser();
        this.applyChannelVolumes();
        this.applyAllPans();
      }

      this.populateInstrumentSelectors();
      this.updateSF2List();
      this.sf2RandomBtn.disabled = false;
      this.wavBtn.disabled = false;
      this.updateTransportButtons();
    } catch (err) {
      sfWrap.classList.remove('visible');
      this.sf2StatusEl.textContent = `Error: ${(err as Error).message}`;
      this.sf2StatusEl.classList.remove('loaded');
      console.error(err);
    }
  }

  private updateSF2List(): void {
    if (!this.sf2ListEl) return;
    if (this.loadedSF2s.length === 0) { this.sf2ListEl.innerHTML = ''; return; }
    this.sf2ListEl.innerHTML = this.loadedSF2s.map((f, i) =>
      `<span style="margin-right:8px;padding:1px 4px;background:var(--btn-hi1);border:1px solid var(--b-btn);border-radius:3px;cursor:pointer" title="Click to remove" data-sf2-remove="${i}">SF${i + 1}: ${f.name.replace(/\.sf2$/i, '')} (${f.sf2.presets.length})</span>`
    ).join('');
    this.sf2ListEl.querySelectorAll('[data-sf2-remove]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt((el as HTMLElement).dataset.sf2Remove!, 10);
        this.removeSF2(idx);
      });
    });
    // Update per-channel SF2 pickers
    for (const id of CHANNELS) {
      const sel = document.getElementById(`sf2-src-${id}`) as HTMLSelectElement;
      if (!sel) continue;
      if (this.loadedSF2s.length <= 1) {
        sel.style.display = 'none';
      } else {
        sel.style.display = '';
        const curVal = sel.value;
        sel.innerHTML = this.loadedSF2s.map((f, i) => `<option value="${i}"${i === (this.channelSF2Idx[id] ?? 0) ? ' selected' : ''}>SF${i + 1}: ${f.name.replace(/\.sf2$/i, '')}</option>`).join('');
        if (curVal) sel.value = curVal;
      }
    }
  }

  private removeSF2(idx: number): void {
    this.loadedSF2s.splice(idx, 1);
    if (this.loadedSF2s.length === 0) {
      this.state.sf2 = null;
      this.sampler = null;
      this.sf2StatusEl.textContent = 'Drop a .sf2 soundfont here to enable playback';
      this.sf2StatusEl.classList.remove('loaded');
      this.sf2DropZone.classList.remove('loaded');
      this.sf2RandomBtn.disabled = true;
    } else {
      this.state.sf2 = this.loadedSF2s[0].sf2;
      // Re-create sampler with remaining fonts
      if (this.audioCtx) {
        this.sampler = new SF2Sampler(this.audioCtx, this.loadedSF2s[0].sf2);
        for (let i = 1; i < this.loadedSF2s.length; i++) this.sampler.addSF2(this.loadedSF2s[i].sf2);
        for (const id of CHANNELS) {
          const sidx = this.channelSF2Idx[id] ?? 0;
          if (sidx < this.loadedSF2s.length) this.sampler.setChannelSF2(id, sidx);
          else { this.channelSF2Idx[id] = 0; this.sampler.setChannelSF2(id, 0); }
        }
        this.oscAnalyser = this.sampler.getAnalyser();
        this.applyChannelVolumes();
        this.applyAllPans();
      }
      this.populateInstrumentSelectors();
      this.sf2StatusEl.textContent = `${this.loadedSF2s.length} font(s) loaded`;
    }
    this.updateSF2List();
    this.updateTransportButtons();
  }

  private updateChannelInstrumentSelector(id: ChannelId): void {
    const sf2Idx = this.channelSF2Idx[id] ?? 0;
    if (sf2Idx >= this.loadedSF2s.length) return;
    const { sf2 } = this.loadedSF2s[sf2Idx];
    const sel = this.selects[id];
    const prev = this.state.channels[id].presetIndex;
    sel.innerHTML = '';
    sf2.presets.forEach((p, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `${i.toString().padStart(3,'0')} ${p.bank === 128 ? '🥁 ' : ''}${p.name}`;
      sel.appendChild(opt);
    });
    const defaultProg = CHANNEL_META[id].defaultProgram;
    let bestIdx = 0, bestDist = 999;
    if (id === 'noise') {
      const drumIdx = sf2.presets.findIndex(p => p.bank === 128);
      bestIdx = drumIdx >= 0 ? drumIdx : 0;
    } else {
      sf2.presets.forEach((p, i) => {
        if (p.bank === 128) return;
        const d = Math.abs(p.program - defaultProg);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      });
    }
    const finalIdx = prev < sf2.presets.length ? prev : bestIdx;
    sel.value = String(finalIdx);
    this.state.channels[id].presetIndex = finalIdx;
  }

  private populateInstrumentSelectors(): void {
    for (const id of CHANNELS) this.updateChannelInstrumentSelector(id);
  }

  private randomizeSF2Presets() {
    if (this.loadedSF2s.length === 0) return;
    for (const id of CHANNELS) {
      // Pick a random SF2 for this channel
      const sf2Idx = Math.floor(Math.random() * this.loadedSF2s.length);
      const { sf2 } = this.loadedSF2s[sf2Idx];
      if (this.channelSF2Idx[id] !== sf2Idx) {
        this.channelSF2Idx[id] = sf2Idx;
        this.sampler?.setChannelSF2(id, sf2Idx);
        // Update instrument selector to show this SF2's presets
        this.updateChannelInstrumentSelector(id);
      }
      // For noise: prefer drum bank
      if (id === 'noise') {
        const drumIdx = sf2.presets.findIndex(p => p.bank === 128);
        if (drumIdx >= 0) { this.selects[id].value = String(drumIdx); this.state.channels[id].presetIndex = drumIdx; continue; }
      }
      const melodicPresets = sf2.presets.map((p, i) => ({ p, i })).filter(x => x.p.bank !== 128);
      if (melodicPresets.length > 0) {
        const pick = melodicPresets[Math.floor(Math.random() * melodicPresets.length)];
        this.selects[id].value = String(pick.i);
        this.state.channels[id].presetIndex = pick.i;
      }
    }
    // Update SF2 list pickers
    this.updateSF2List();
    this.setStatus('ok', `Random presets from ${this.loadedSF2s.length} font(s)!`);
  }

  private applyChannelVolumes() {
    if (!this.sampler) return;
    for (const id of CHANNELS) {
      const v = this.channelVolValues[id] ?? 1;
      this.sampler.setChannelVolume(id, v);
    }
    const mv = parseFloat((document.getElementById('vol-slider') as HTMLInputElement)?.value ?? '0.75');
    this.sampler.setVolume(mv);
  }

  // ── Result application ────────────────────────────────────────

  private applyResult(channels: Record<ChannelId, NoteEvent[]>, duration: number, bpm: number) {
    this.state.duration = duration;
    this.state.bpm      = bpm;
    this.bpmInput.value = String(Math.round(bpm));
    for (const id of CHANNELS) this.state.channels[id].notes = channels[id];
    this.seekSlider.max   = String(duration);
    this.seekSlider.value = '0';
    this.updateAllCanvases();
    this.updateNoteCountBadges();
    this.updateTransportButtons();
    this.updateTimeDisplay(0);
    this.currentTime = 0;
    this.humanizeBtn.disabled = false;
  }

  // ── Playback ─────────────────────────────────────────────────

  private ensureAudioContext() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') this.audioCtx = new AudioContext();
  }

  private togglePlay() {
    if (this.state.isPlaying) this.pausePlayback(); else void this.startPlayback();
  }

  private restartAndPlay() {
    if (!CHANNELS.some(id => this.state.channels[id].notes.length > 0)) return;
    if (this.state.isPlaying) { this.seekTo(0); }
    else { this.currentTime = 0; void this.startPlayback(); }
  }

  private async startPlayback() {
    if (this.loadedSF2s.length === 0) { this.setStatus('err', 'Load an SF2 soundfont to enable playback!'); return; }
    const total = CHANNELS.reduce((s, id) => s + this.state.channels[id].notes.length, 0);
    if (total === 0) { this.setStatus('err', 'No notes yet -- generate something or load a MIDI!'); return; }

    this.ensureAudioContext();
    if (!this.audioCtx) return;
    if (!this.sampler) {
      const primarySF2 = this.loadedSF2s[0]?.sf2 ?? this.state.sf2;
      if (!primarySF2) return;
      this.sampler = new SF2Sampler(this.audioCtx, primarySF2);
      for (let i = 1; i < this.loadedSF2s.length; i++) this.sampler.addSF2(this.loadedSF2s[i].sf2);
      for (const id of CHANNELS) {
        const idx = this.channelSF2Idx[id] ?? 0;
        this.sampler.setChannelSF2(id, idx);
      }
      this.oscAnalyser = this.sampler.getAnalyser();
      this.applyChannelVolumes();
      this.applyAllPans();
    }
    if (this.scheduler) this.scheduler.stop();

    this.scheduler = new Scheduler(this.audioCtx, this.sampler);
    this.scheduler.swingAmount = parseFloat(this.swingSlider.value);

    // Apply reverb if set
    const wet = parseFloat(this.reverbWetSlider.value);
    const decay = parseFloat(this.reverbDecaySlider.value);
    if (wet > 0) this.sampler.setReverbAmount(wet, decay);

    this.scheduler.onTimeUpdate = t => {
      this.currentTime = t;
      if (!this.isDraggingSeek) { this.seekSlider.value = String(t); this.updateTimeDisplay(t); }
      if (Math.round(t * 5) % 4 === 0) this.updateAllCanvases();
    };

    this.scheduler.onEnded = () => {
      this.state.isPlaying = false;
      this.currentTime = 0;
      this.seekSlider.value = '0';
      this.updateTransportButtons();
      this.updateAllCanvases();
      this.updateTimeDisplay(0);
      this.stopOscilloscope();
    };

    if (this.state.inputType === 'generated' && this.lastGenConfig) {
      this.scheduler.onNearEnd = () => {
        if (!this.lastGenConfig) return;
        const extra = generate({ ...this.lastGenConfig, bars: 16 });
        const offset = this.state.duration;
        for (const id of CHANNELS) {
          const shifted = extra.channels[id].map(n => ({ ...n, time: n.time + offset }));
          this.state.channels[id].notes.push(...shifted);
        }
        this.state.duration += extra.duration;
        this.seekSlider.max = String(this.state.duration);
        this.scheduler?.extendDuration(this.state.duration);
      };
    }

    this.state.isPlaying = true;
    this.updateTransportButtons();
    this.startOscilloscope();
    await this.scheduler.start(this.state, this.currentTime);
  }

  private pausePlayback() {
    if (this.scheduler) this.currentTime = this.scheduler.currentSongTime;
    this.scheduler?.stop();
    this.state.isPlaying = false;
    this.updateTransportButtons();
    this.stopOscilloscope();
  }

  private stopPlayback() {
    this.scheduler?.stop();
    this.state.isPlaying = false;
    this.currentTime = 0;
    this.seekSlider.value = '0';
    this.updateTransportButtons();
    this.updateTimeDisplay(0);
    this.updateAllCanvases();
    this.stopOscilloscope();
  }

  private restartPlayback() {
    if (this.state.isPlaying) { this.seekTo(0); }
    else { this.currentTime = 0; this.seekSlider.value = '0'; this.updateTimeDisplay(0); this.updateAllCanvases(); }
  }

  private seekTo(time: number) {
    this.currentTime = time;
    if (this.scheduler?.isRunning) this.scheduler.seek(time);
    this.updateTimeDisplay(time);
    this.updateAllCanvases();
  }

  // ── Mute / Solo ───────────────────────────────────────────────

  private toggleMute(id: ChannelId) {
    if (this.soloedChannel !== null && id !== this.soloedChannel) return;
    this.state.channels[id].muted = !this.state.channels[id].muted;
    const muted = this.state.channels[id].muted;
    document.getElementById(`row-${id}`)!.classList.toggle('muted', muted);
    this.muteBtns[id].classList.toggle('active', muted);
    this.muteBtns[id].textContent = muted ? 'UNMUTE' : 'MUTE';
  }

  private toggleSolo(id: ChannelId) {
    if (this.soloedChannel === id) {
      this.soloedChannel = null;
      if (this.preSoloMutes) {
        for (const ch of CHANNELS) {
          this.state.channels[ch].muted = this.preSoloMutes[ch];
          document.getElementById(`row-${ch}`)!.classList.toggle('muted', this.preSoloMutes[ch]);
          this.muteBtns[ch].classList.toggle('active', this.preSoloMutes[ch]);
          this.muteBtns[ch].textContent = this.preSoloMutes[ch] ? 'UNMUTE' : 'MUTE';
        }
        this.preSoloMutes = null;
      }
      this.soloBtns[id].classList.remove('active');
    } else {
      this.preSoloMutes = {} as Record<ChannelId, boolean>;
      for (const ch of CHANNELS) this.preSoloMutes[ch] = this.state.channels[ch].muted;
      if (this.soloedChannel) this.soloBtns[this.soloedChannel].classList.remove('active');
      this.soloedChannel = id;
      for (const ch of CHANNELS) {
        const shouldMute = ch !== id;
        this.state.channels[ch].muted = shouldMute;
        document.getElementById(`row-${ch}`)!.classList.toggle('muted', shouldMute);
        this.muteBtns[ch].classList.toggle('active', shouldMute);
        this.muteBtns[ch].textContent = shouldMute ? 'UNMUTE' : 'MUTE';
      }
      this.soloBtns[id].classList.add('active');
    }
  }

  // ── Export ────────────────────────────────────────────────────

  private runDownload() {
    const total = CHANNELS.reduce((s, id) => s + this.state.channels[id].notes.length, 0);
    if (total === 0) { this.setStatus('err', 'Nothing to export yet!'); return; }
    try {
      const keyName = NOTE_NAMES[parseInt((document.getElementById('gen-key') as HTMLInputElement).value, 10)] || 'C';
      const bpm = Math.round(this.state.bpm);
      downloadMIDI(buildMIDI(this.state.channels, this.state.bpm), `bloop_${bpm}bpm_${keyName}.mid`);
      this.setStatus('ok', 'MIDI exported!');
    } catch (err) { this.setStatus('err', `Export failed: ${(err as Error).message}`); }
  }

  private exportChannel(id: ChannelId) {
    const ch = this.state.channels[id];
    if (ch.notes.length === 0) { this.setStatus('err', `${id} has no notes!`); return; }
    try {
      downloadMIDI(buildSingleChannelMIDI(id, ch, this.state.bpm), `bloopmaker_${id}_${Date.now()}.mid`);
      this.setStatus('ok', `Exported ${id} track!`);
    } catch (err) { this.setStatus('err', `Export failed: ${(err as Error).message}`); }
  }

  private async runWAVExport() {
    if (this.loadedSF2s.length === 0) { this.setStatus('err', 'Load an SF2 soundfont first!'); return; }
    const total = CHANNELS.reduce((s, id) => s + (this.state.channels[id]?.notes.length ?? 0), 0);
    if (total === 0) { this.setStatus('err', 'No notes to export!'); return; }
    this.wavBtn.disabled = true;
    this.setStatus('busy', 'Rendering WAV...');
    this.progressWrap.classList.add('visible');
    try {
      const channelVols: Record<string, number> = {};
      const channelPans: Record<string, number> = {};
      for (const id of CHANNELS) {
        channelVols[id] = this.channelVolValues[id] ?? 1;
        channelPans[id] = this.channelPanValues[id] ?? 0;
      }
      const masterVol   = parseFloat((document.getElementById('vol-slider') as HTMLInputElement).value);
      const reverbWet   = parseFloat(this.reverbWetSlider.value);
      const reverbDecay = parseFloat(this.reverbDecaySlider.value);
      const sf2List = this.loadedSF2s.map(f => f.sf2);
      const keyName = NOTE_NAMES[parseInt((document.getElementById('gen-key') as HTMLInputElement).value, 10)] || 'C';
      const bpm = Math.round(this.state.bpm);
      await exportWAV(this.state, channelVols, channelPans, masterVol, reverbWet, reverbDecay, pct => {
        this.progressFill.style.width = `${Math.round(pct * 100)}%`;
      }, sf2List, this.channelSF2Idx, `bloop_${bpm}bpm_${keyName}.wav`);
      this.setStatus('ok', 'WAV exported!');
    } catch (err) {
      this.setStatus('err', `WAV export failed: ${(err as Error).message}`);
    } finally {
      this.wavBtn.disabled = false;
      setTimeout(() => { this.progressWrap.classList.remove('visible'); this.progressFill.style.width = '0%'; }, 800);
    }
  }

  // ── Oscilloscope ──────────────────────────────────────────────

  private startOscilloscope() {
    if (!this.oscAnalyser || !this.oscCanvas) return;
    this.stopOscilloscope();
    this.startMatrixOsc();
    const canvas = this.oscCanvas;
    const ctx    = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    const bufLen = this.oscAnalyser.frequencyBinCount;
    const data   = new Float32Array(bufLen);
    let hue = 0;
    const sparks: { x: number; y: number; vx: number; vy: number; life: number; h: number }[] = [];

    const draw = () => {
      this.oscRafId = requestAnimationFrame(draw);
      this.oscAnalyser!.getFloatTimeDomainData(data);
      hue = (hue + 1.2) % 360;

      // Translucent trail for motion blur feel
      ctx.fillStyle = 'rgba(4,2,18,0.72)';
      ctx.fillRect(0, 0, W, H);

      // Subtle grid in current hue color
      ctx.strokeStyle = `hsla(${hue},80%,65%,0.10)`;
      ctx.lineWidth = 0.5;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(0, (H / 4) * i); ctx.lineTo(W, (H / 4) * i); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();

      // Glow pass — fat, soft halo
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0,    `hsla(${hue},100%,70%,0.18)`);
      grad.addColorStop(0.25, `hsla(${(hue+60)%360},100%,70%,0.18)`);
      grad.addColorStop(0.5,  `hsla(${(hue+120)%360},100%,72%,0.18)`);
      grad.addColorStop(0.75, `hsla(${(hue+200)%360},100%,70%,0.18)`);
      grad.addColorStop(1,    `hsla(${(hue+300)%360},100%,70%,0.18)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 7;
      ctx.beginPath();
      for (let i = 0; i < bufLen; i++) {
        const x = (i / bufLen) * W;
        const y = H / 2 + data[i] * H * 0.44;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Sharp waveform line with rainbow gradient
      const grad2 = ctx.createLinearGradient(0, 0, W, 0);
      grad2.addColorStop(0,    `hsl(${hue},100%,80%)`);
      grad2.addColorStop(0.25, `hsl(${(hue+72)%360},100%,82%)`);
      grad2.addColorStop(0.5,  `hsl(${(hue+144)%360},100%,80%)`);
      grad2.addColorStop(0.75, `hsl(${(hue+216)%360},100%,82%)`);
      grad2.addColorStop(1,    `hsl(${(hue+288)%360},100%,80%)`);
      ctx.strokeStyle = grad2;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i < bufLen; i++) {
        const x = (i / bufLen) * W;
        const y = H / 2 + data[i] * H * 0.44;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        // Spawn spark at amplitude peaks
        if (i % 8 === 0 && Math.abs(data[i]) > 0.5) {
          sparks.push({ x, y, vx: (Math.random()-0.5)*2, vy: (Math.random()-1)*2.5, life: 1, h: (hue+i)%360 });
        }
      }
      ctx.stroke();

      // Sparks
      for (let si = sparks.length - 1; si >= 0; si--) {
        const s = sparks[si];
        s.x += s.vx; s.y += s.vy; s.vy += 0.12; s.life -= 0.055;
        if (s.life <= 0) { sparks.splice(si, 1); continue; }
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.5 * s.life, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.h},100%,80%,${s.life})`;
        ctx.fill();
      }
      if (sparks.length > 120) sparks.splice(0, sparks.length - 120);
    };
    draw();
  }

  private stopOscilloscope() {
    if (this.oscRafId !== null) { cancelAnimationFrame(this.oscRafId); this.oscRafId = null; }
    if (this.matrixRafId !== null) { cancelAnimationFrame(this.matrixRafId); this.matrixRafId = null; }
    this.startOscIdle();
    this.startMatrixIdle();
  }

  private startOscIdle() {
    const canvas = this.oscCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    let hue = 200;
    const draw = () => {
      this.oscRafId = requestAnimationFrame(draw);
      hue = (hue + 0.4) % 360;
      const t = Date.now() / 1200;
      ctx.fillStyle = 'rgba(4,2,18,1)';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = `hsla(${hue},60%,60%,0.09)`;
      ctx.lineWidth = 0.5;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(0, (H / 4) * i); ctx.lineTo(W, (H / 4) * i); ctx.stroke();
      }
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0,   `hsla(${hue},100%,70%,0.45)`);
      grad.addColorStop(0.5, `hsla(${(hue+80)%360},100%,72%,0.45)`);
      grad.addColorStop(1,   `hsla(${(hue+160)%360},100%,70%,0.45)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= W; x++) {
        const y = H / 2 + Math.sin((x / W) * Math.PI * 4 + t) * H * 0.07;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    draw();
  }

  private drawOscIdle() { this.startOscIdle(); }

  // ── Matrix oscilloscope ──────────────────────────────────────

  private startMatrixOsc() {
    if (!this.oscAnalyser || !this.matrixCanvas) return;
    if (this.matrixRafId !== null) { cancelAnimationFrame(this.matrixRafId); this.matrixRafId = null; }
    const canvas = this.matrixCanvas;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    const bufLen = this.oscAnalyser.fftSize >> 1;
    const freqData = new Uint8Array(bufLen);
    const colW = Math.max(2, Math.floor(W / 64));
    const numCols = Math.floor(W / colW);

    const draw = () => {
      this.matrixRafId = requestAnimationFrame(draw);
      this.oscAnalyser!.getByteFrequencyData(freqData);

      // Fade background
      ctx.fillStyle = 'rgba(1, 5, 1, 0.25)';
      ctx.fillRect(0, 0, W, H);

      for (let col = 0; col < numCols; col++) {
        const binIdx = Math.floor((col / numCols) * (bufLen * 0.75));
        const magnitude = freqData[binIdx] / 255;
        const barH = Math.floor(magnitude * H);

        if (barH > 0) {
          const green = Math.round(80 + magnitude * 175);
          const alpha = 0.5 + magnitude * 0.5;
          ctx.fillStyle = `rgba(0,${green},0,${alpha})`;
          ctx.fillRect(col * colW, H - barH, colW - 1, barH);

          // Bright top pixel
          if (magnitude > 0.3) {
            ctx.fillStyle = `rgba(180,255,180,${alpha})`;
            ctx.fillRect(col * colW, H - barH, colW - 1, 2);
          }
        }
      }

      // Scanline effect
      for (let y = 0; y < H; y += 4) {
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(0, y, W, 1);
      }
    };
    draw();
  }

  private startMatrixIdle() {
    if (!this.matrixCanvas) return;
    if (this.matrixRafId !== null) { cancelAnimationFrame(this.matrixRafId); this.matrixRafId = null; }
    const canvas = this.matrixCanvas;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    let t = 0;

    const draw = () => {
      this.matrixRafId = requestAnimationFrame(draw);
      t++;
      ctx.fillStyle = 'rgba(1, 5, 1, 0.18)';
      ctx.fillRect(0, 0, W, H);

      // Pulsing random static noise
      if (t % 3 === 0) {
        for (let i = 0; i < 12; i++) {
          const x = Math.random() * W;
          const y = Math.random() * H;
          const bright = Math.random();
          ctx.fillStyle = `rgba(0,${Math.round(60 + bright * 80)},0,${0.3 + bright * 0.4})`;
          ctx.fillRect(x, y, 2 + Math.random() * 6, 2);
        }
      }

      // Slow sine wave outline
      ctx.strokeStyle = 'rgba(0,120,0,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const y = H / 2 + Math.sin((x / W) * Math.PI * 6 + t * 0.02) * H * 0.12;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Scanlines
      for (let y = 0; y < H; y += 4) {
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(0, y, W, 1);
      }
    };
    draw();
  }

  // ── Vector grid background ────────────────────────────────────

  private startBgGrid() {
    const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let angle = 0;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2, cy = H / 2;
      const spacing = 52;
      const cols = Math.ceil(W / spacing) + 4;
      const rows = Math.ceil(H / spacing) + 4;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      const dark = document.body.classList.contains('dark');
      const hColor = dark ? '#00ffee' : '#1a8fff';
      const vColor = dark ? '#ff00cc' : '#e63030';

      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 1;

      // Horizontal lines
      ctx.strokeStyle = hColor;
      ctx.shadowColor = hColor;
      ctx.shadowBlur = dark ? 4 : 0;
      for (let r = -rows; r <= rows; r++) {
        const y = r * spacing;
        ctx.beginPath();
        ctx.moveTo(-cols * spacing, y);
        ctx.lineTo(cols * spacing, y);
        ctx.stroke();
      }

      // Vertical lines
      ctx.strokeStyle = vColor;
      ctx.shadowColor = vColor;
      ctx.shadowBlur = dark ? 4 : 0;
      for (let c = -cols; c <= cols; c++) {
        const x = c * spacing;
        ctx.beginPath();
        ctx.moveTo(x, -rows * spacing);
        ctx.lineTo(x, rows * spacing);
        ctx.stroke();
      }

      ctx.restore();

      // Slow circular rotation — full rotation every ~60 seconds
      angle += 0.00017;
      requestAnimationFrame(draw);
    };
    draw();
  }

  // ── Piano Roll drawing ────────────────────────────────────────

  private updateAllCanvases() {
    for (const id of CHANNELS) this.drawPianoRoll(id, this.currentTime);
  }

  private drawPianoRoll(id: ChannelId, playheadTime: number) {
    const canvas = this.canvases[id];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    const notes    = this.state.channels[id].notes;
    const duration = this.state.duration;
    const color    = CHANNEL_META[id].color;
    const isEditing = this.editingChannels.has(id);
    const zoom     = this.pianoRollZoom.get(id);
    const viewStart = zoom ? zoom.start : 0;
    const viewEnd   = zoom ? zoom.end   : duration;
    const viewSpan  = viewEnd - viewStart;

    const timeToX = (t: number) => ((t - viewStart) / viewSpan) * W;

    if (notes.length === 0 || duration <= 0) {
      ctx.fillStyle = '#f8f8ff';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = color + '88';
      ctx.font = `bold ${isEditing ? 13 : 11}px Tahoma, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('no notes yet', W / 2, H / 2 + 4);
      return;
    }

    let lo = 127, hi = 0;
    for (const n of notes) { if (n.midi < lo) lo = n.midi; if (n.midi > hi) hi = n.midi; }
    const span = Math.max(isEditing ? 24 : 12, hi - lo + 4);
    const mid  = (lo + hi) / 2;
    lo = Math.max(0, Math.floor(mid - span / 2));
    hi = Math.min(127, Math.ceil(mid + span / 2));
    this.channelPitchRanges.set(id, { lo, hi });

    if (isEditing && this.state.bpm > 0) {
      const beatDur = 60 / this.state.bpm;
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 0.5;
      for (let t = viewStart; t <= viewEnd + beatDur; t += beatDur) {
        const x = timeToX(t);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.16)';
      ctx.lineWidth = 1;
      for (let t = Math.floor(viewStart / (beatDur * 4)) * beatDur * 4; t <= viewEnd + beatDur * 4; t += beatDur * 4) {
        const x = timeToX(t);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(80,80,200,0.10)';
      ctx.lineWidth = 0.5;
      for (let p = lo; p <= hi; p++) {
        if (p % 12 === 0) {
          const y = H - ((p - lo + 1) / (hi - lo + 1)) * H;
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }
      }
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 0.5;
      for (let p = lo; p <= hi; p += 12) {
        const y = H - ((p - lo) / (hi - lo + 1)) * H;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    }

    const noteH = Math.max(2, H / (hi - lo + 1));
    for (const n of notes) {
      const x = timeToX(n.time);
      const w = Math.max(2, (n.duration / viewSpan) * W);
      const y = H - ((n.midi - lo + 1) / (hi - lo + 1)) * H;
      const a = 0.4 + (n.velocity / 127) * 0.55;
      ctx.fillStyle = color + Math.round(a * 255).toString(16).padStart(2, '0');
      ctx.fillRect(x, y - noteH / 2, w, noteH);
      if (isEditing && noteH >= 4) {
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y - noteH / 2, w, noteH);
      }
    }

    if (isEditing) {
      const KW = 20;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, KW, H);
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 0.5;
      for (let p = lo; p <= hi; p++) {
        const pc = p % 12;
        const y  = H - ((p - lo + 1) / (hi - lo + 1)) * H;
        const nh = H / (hi - lo + 1);
        if ([1, 3, 6, 8, 10].includes(pc)) {
          ctx.fillStyle = '#2a2a2a';
          ctx.fillRect(0, y - nh / 2, KW * 0.65, nh);
        }
        if (pc === 0) {
          ctx.fillStyle = '#333';
          ctx.font = '7px Tahoma';
          ctx.textAlign = 'right';
          ctx.fillText(`C${Math.floor(p / 12) - 1}`, KW - 1, y + 2.5);
        }
      }
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, KW, H);
    }

    if (duration > 0 && (this.state.isPlaying || playheadTime > 0)) {
      const px = timeToX(playheadTime);
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2;
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // ── UI Helpers ────────────────────────────────────────────────

  private updateNoteCountBadges() {
    for (const id of CHANNELS) {
      const c = this.state.channels[id].notes.length;
      this.noteCountEls[id].textContent = `${c} note${c !== 1 ? 's' : ''}`;
    }
  }

  private setStatus(type: 'ok' | 'busy' | 'err', text: string) {
    this.statusEl.className  = `win-status ${type}`;
    this.statusPanel.textContent = text;
  }

  private formatTime(s: number): string {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }

  private updateTimeDisplay(t: number) {
    this.timeDisplay.textContent = `${this.formatTime(t)} / ${this.formatTime(this.state.duration)}`;
  }

  private updateTransportButtons() {
    const hasNotes = CHANNELS.some(id => this.state.channels[id].notes.length > 0);
    const hasSF2   = this.state.sf2 !== null;
    const canRegen = this.lastGenConfig !== null;
    this.playBtn.disabled    = !hasNotes || !hasSF2;
    this.stopBtn.disabled    = !this.state.isPlaying;
    this.restartBtn.disabled = !hasNotes;
    this.downloadBtn.disabled= !hasNotes;
    this.wavBtn.disabled     = !hasNotes || !hasSF2;
    this.humanizeBtn.disabled= !hasNotes;
    this.playBtn.textContent = this.state.isPlaying ? '||' : '>';
    this.playBtn.classList.toggle('playing', this.state.isPlaying);
    for (const id of CHANNELS) {
      this.regenBtns[id].disabled    = !canRegen;
      this.exportChBtns[id].disabled = !hasNotes;
    }
  }
}

const appEl = document.getElementById('app');
if (!appEl) throw new Error('No #app element');
new App(appEl);
