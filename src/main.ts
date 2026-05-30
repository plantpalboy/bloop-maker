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
import {
  IS_DEMO, DEMO_CHANNELS, DEMO_MODES, DEMO_PRESETS_PER_MODE, DEMO_ARP_STYLES,
  DEMO_ARCHETYPES, DEMO_STEER_MODES, DEMO_MAX_BARS, FULL_VERSION_URL,
} from './demo';

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function formatPan(v: number): string {
  if (v === 0) return 'C';
  const pct = Math.abs(v);
  return v < 0 ? `${pct}L` : `${pct}R`;
}

interface GenPreset { label: string; mode: GenMode; bpm: number; scale: string; generateNoise: boolean; sparseness?: number; }
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
  // ── Game Roles (from role mapping doc) ──
  { label: 'Menu Screen',          mode: 'ambient', bpm: 68,  scale: 'major',            generateNoise: false, sparseness: 0.4 },
  { label: 'Save Room',            mode: 'ambient', bpm: 55,  scale: 'lydian',           generateNoise: false, sparseness: 0.5 },
  { label: 'Game Over',            mode: 'ambient', bpm: 60,  scale: 'minor',            generateNoise: false, sparseness: 0.3 },
  { label: 'Exploration',          mode: 'mid',     bpm: 95,  scale: 'pentatonicMajor',  generateNoise: false, sparseness: 0.2 },
  { label: 'Field Theme',          mode: 'mid',     bpm: 100, scale: 'major',            generateNoise: true,  sparseness: 0.1 },
  { label: 'Dungeon Explore',      mode: 'mid',     bpm: 88,  scale: 'dorian',           generateNoise: false, sparseness: 0.2 },
  { label: 'Boss Intro',           mode: 'battle',  bpm: 145, scale: 'minor',            generateNoise: true,  sparseness: 0   },
  { label: 'Final Confrontation',  mode: 'battle',  bpm: 172, scale: 'minor',            generateNoise: true,  sparseness: 0   },
  { label: 'Eastern Boss',         mode: 'battle',  bpm: 158, scale: 'harmonicMinor',   generateNoise: true,  sparseness: 0   },
  { label: 'Victory Fanfare',      mode: 'mid',     bpm: 140, scale: 'major',            generateNoise: true,  sparseness: 0   },
  { label: 'Cutscene Drama',       mode: 'ambient', bpm: 72,  scale: 'minor',            generateNoise: false, sparseness: 0.3 },
  // ── Undertale/Deltarune style (quirky nostalgic) ──
  { label: 'Quirky Nostalgic',     mode: 'jazzy',   bpm: 92,  scale: 'dorian',           generateNoise: false, sparseness: 0.3 },
  { label: 'Wistful Town',         mode: 'jazzy',   bpm: 84,  scale: 'dorian',           generateNoise: true,  sparseness: 0.25 },
  { label: 'Tense Dungeon',        mode: 'ambient', bpm: 78,  scale: 'harmonicMinor',   generateNoise: false, sparseness: 0.35 },
  { label: 'Bittersweet Journey',  mode: 'mid',     bpm: 108, scale: 'mixolydian',       generateNoise: false, sparseness: 0.2 },
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

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => { const k = (n + h * 12) % 12; return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255); };
  return [f(0), f(8), f(4)];
}

// ── ASCII art pools for the visualizer ───────────────────────
const ASCII_POOLS: string[][] = [
  // cats
  ['ฅ^•ﻌ•^ฅ','(^._.^)','=^..^=','(=^･ω･^=)','ฅ(^ω^ฅ)','(=ↀωↀ=)','>^.^<','(^◡^✿)'],
  // dogs & bears
  ['▼・ᴥ・▼','U・ᴥ・U','ʕ•ᴥ•ʔ','ʕ•̫͡•ʕ','ʕ≧ᴥ≦ʔ','(ᵕ◡ᵕ)','ʕっ•ᴥ•ʔっ'],
  // bugs & silly
  ['(ᵒ̤̑ ₀̑ ᵒ̤̑)','(¬‿¬)','(◣_◢)','ε=┌(;￣▽￣)┘','ᕙ(⇀‸↼)ᕗ','(⌐■_■)','ლ(ಠ益ಠლ)'],
  // music
  ['♪(●′▽‵●)♬','(♩‿♪)','(ノ♪)ノ','♬♩♭♪','(◕‿◕)♬','♪♫♬♩'],
  // cute & love (user additions)
  ['(◍•ᴗ•◍)♡','(˘▾˘✿)','(≧◡≦)','(｡♥‿♥｡)','(✿◠‿◠)','(*˘︶˘*)','∩｡•ᵕ•｡∩♡'],
  // hearts & love kaomoji
  ['(◍＞◡＜◍)⋈✧♡','(ღ˘⌣˘)♥','♡(˘⌣˘)♡','٩(*❛⊰❛)～❤','♥‿♥','(灬♥ω♥灬)','ෆ╹.̮╹ෆ'],
  ['(っ˘з(˘⌣˘)','(˵ ͡°͜ʖ ͡°˵)♡','(づ ￣³￣)づ','(∩˃o˂∩)♡','( ♥3♥)','໒(♥◡♥)७~♪'],
  ['(ﾉ◕ヮ◕)ﾉ*❤','(✿´⌣`✿)╯♡','(•ε•)','(˶˘³˘)♡','♡ⓛⓞⓥⓔ♡','꒒০⌵୧♡'],
  // sparkle
  ['✦ ✧ ✦','⋆｡°✩','✨(◕‿◕)✨','☆*:.｡(˘▾˘)','(>^o^)><(^o^<)','(/^-^(^ ^)/'],
];

const VIZ_SCHEMES: { r: number; g: number; b: number }[] = [
  { r:0,   g:200, b:0   }, // green
  { r:200, g:0,   b:255 }, // neon purple
  { r:0,   g:200, b:255 }, // cyan
  { r:255, g:160, b:0   }, // amber
  { r:255, g:50,  b:150 }, // pink
  { r:140, g:200, b:255 }, // ice blue
  { r:255, g:255, b:100 }, // yellow
  { r:-1,  g:-1,  b:-1  }, // rainbow (cycling)
];

// Multi-line ASCII art — rendered as fading background pieces on the canvas
const ASCII_ART_BIG: string[][] = [
  ['   ___', ' __/ _`.  .-"-.',  ' \\_,` | \\-\'  )`-\')', '  "") `"`  \\  ((`"`', '  ___Y  ,   .\'7 /|', '(_,___/...-` (_/_/'],
  [' /\\︵-︵/\\', '|(◉)(◉)|', '\\ ︶V︶ /', '/ ↺↺↺↺ \\', '↺↺↺↺↺|', '\\↺↺↺↺/', '¯¯/\\¯/\\¯'],
  ['  __    __', "o-''))_____\\\\", '  "--__/ * * *)', ' c_c__/-c____/'],
  [' ^..^      /', '/_/\\_____/', '   /\\   /\\', '  /  \\ /  \\'],
  ['  ||  ||', '  \\\\()//', '//(__)\\\\', '  ||    ||'],
  [' /^-----^\\', 'V  o o  V', ' |  Y  |', '  \\ Q /', '  / - \\', ' |    \\'],
  ['       (\\/)','        \\/','  (\\/)  .-.  .-.',"   \\/  ((`-)(-`))","        \\\\    //", ' .="""=._))((_.="""=.'],
  ['        (','         )','        (','   /\\  .-"""-. /\\', '  //\\\\ ,,,  //\\\\', '  |/\\|,;;;;;,|/\\|', ' //\\\\;-"""-;///\\\\'],
  ['    __    __', "  o-''))_____\\\\", '  "--__/ * * *)', '   c_c__/-c____/'],
  [' ,_     _', ' |\\_,-~/', ' / _  _ |  ,--.', '(  @  @ )  / ,-\'', ' \\  _T_/-._( ('],
  ['        ,-._', "    _.-'  '--.", "  .'      _  -`\\_", " / .----.`_.'----'", ' ;/     `', ' /_; '],
];

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

  // Energy curve (20 points, 0=silent 1=full)
  private energyCurve: number[] = [];
  // Locked motif (scale degree indices 0-6)
  private lockedMotif: number[] = [];
  // Arp style override ('auto' = random per song)
  private arpStyleOverride = 'auto';
  // When true, Randomize Everything also picks a random archetype + arp style
  private randomizeArchAndArp = false;
  // Steering mode
  private steeringMode: 'bright' | 'focused' | 'cinematic' | 'lush' | 'punchy' | 'lofi' | null = null;
  // Swing toggle state
  private swingActive = false;
  // Last generation metadata for inspector + JSON export
  private lastSeed = 0;
  private sillyPrefix = 'bloop';
  private activeExtraChannels: Set<ChannelId> = new Set();
  private extraChannelRoles: Partial<Record<ChannelId, string>> = {};
  private bpmLocked = false;
  private loopEnabled = false;
  private currentTheme = 'aero';
  private vizColorIdx = 0;
  private vizCharPool: string[] = [];
  private lastMotifIntervals: number[] = [];

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
  private bloopBuffer = '';

  constructor(rootEl: HTMLElement) {
    this.root = rootEl;
    for (const id of CHANNELS) { this.channelPanValues[id] = 0; this.channelVolValues[id] = 1; }
    this.render();
    this.bindEvents();
    this.drawOscIdle();
    this.startMatrixIdle();
    this.startBgGrid();
    // Restore dark mode and theme preference
    if (localStorage.getItem('bloopDark') === '1') document.body.classList.add('dark');
    this.vizCharPool = ASCII_POOLS[0].concat(ASCII_POOLS[4]);
    const savedTheme = localStorage.getItem('bloopTheme') ?? 'aero';
    this.applyTheme(savedTheme, false);
    this.injectSidePanels();
    this.applyDemoLimits();
    this.injectDemoBanner();
  }

  // Top banner shown only in the demo build: a note plus Buy + Back-to-homepage buttons.
  private injectDemoBanner() {
    if (!IS_DEMO) return;
    const bar = document.createElement('div');
    bar.id = 'demo-banner';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#ff8a3d;color:#1a1a1a;'
      + 'font:700 12px/1.4 Tahoma,sans-serif;display:flex;align-items:center;gap:8px;padding:6px 10px;'
      + 'box-shadow:0 2px 8px rgba(0,0,0,.3)';
    const btn = 'display:inline-block;padding:4px 12px;border-radius:8px;border:2px solid #1a1a1a;'
      + 'font-weight:800;text-decoration:none;color:#1a1a1a;white-space:nowrap';
    bar.innerHTML =
      `<span style="flex:1;min-width:0">You're using the <b>Bloop Maker demo</b> — 4 channels, limited features, no file export.</span>`
      + `<a href="${FULL_VERSION_URL}" target="_blank" rel="noopener" style="${btn}background:#ffe14a">Buy — $12.99</a>`
      + `<a href="../" style="${btn}background:#36e0c4">Back to homepage</a>`;
    document.body.appendChild(bar);
    document.body.style.paddingTop = '34px';
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
            ${(IS_DEMO
                ? (DEMO_MODES as GenMode[])
                : (['ambient','mid','battle','jazzy','funky','silly','weird'] as GenMode[])
              ).map(mode => {
              const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
              let presets = GEN_PRESETS.map((p, i) => ({ p, i })).filter(x => x.p.mode === mode);
              if (IS_DEMO) presets = presets.slice(0, DEMO_PRESETS_PER_MODE);
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
        <button class="toolbar-btn" id="hotkeys-btn" title="Keyboard shortcuts">? Keys</button>
      </div>

      <div class="win-body">

        <!-- Create -->
        <div class="card">
          <div class="card-title ct-create">Create Music</div>
          <div class="create-grid">
            <div>
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
                  <option value="harmonicMinor">Harmonic Minor (eastern / tense)</option>
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
                <button class="toolbar-btn" id="gen-bpm-lock" title="Lock BPM — presets won't change it" style="margin-left:2px;padding:3px 7px;font-size:10px">LOCK</button>
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
              <div class="gen-row" style="align-items:center">
                <span class="gen-label">Energy</span>
                <canvas id="energy-canvas" width="200" height="40" style="cursor:crosshair;border:1px solid #555;background:#1a1a1a"></canvas>
                <button id="energy-reset" class="btn-sm" style="margin-left:4px">&#8635;</button>
              </div>
              <div class="gen-row" style="align-items:center;gap:6px">
                <span class="gen-label">Arp Style</span>
                <select id="arp-style-sel" class="gen-input" style="font-size:11px;flex:1">
                  <option value="auto">Auto (random per song)</option>
                  <optgroup label="Classic">
                    <option value="up">Up</option>
                    <option value="down">Down</option>
                    <option value="updown">Up-Down</option>
                    <option value="broken">Broken</option>
                    <option value="alberti">Alberti</option>
                    <option value="waltz">Waltz</option>
                    <option value="pinned">Pinned</option>
                    <option value="bounce">Bounce</option>
                  </optgroup>
                  <optgroup label="Rhythmic">
                    <option value="clave">Clave</option>
                    <option value="doubletime">2x Time</option>
                    <option value="latin">Latin</option>
                    <option value="riff">Riff</option>
                    <option value="clockwork">Clockwork</option>
                    <option value="heartbeat">Heartbeat</option>
                    <option value="barrel">Barrel</option>
                    <option value="gallop">Gallop (dotted)</option>
                  </optgroup>
                  <optgroup label="Harmonic">
                    <option value="jazzy">Jazzy (7ths)</option>
                    <option value="staircase">Staircase (7th chord)</option>
                    <option value="spread">Spread (wide)</option>
                    <option value="stride">Stride (piano)</option>
                    <option value="open5">Open 5ths</option>
                    <option value="cascading">Cascading</option>
                    <option value="cross">Cross voice</option>
                  </optgroup>
                  <optgroup label="Texture">
                    <option value="shimmer">Shimmer (add9)</option>
                    <option value="echo">Echo</option>
                    <option value="pluck">Pluck</option>
                    <option value="sweep">Sweep</option>
                    <option value="trill">Trill</option>
                    <option value="spiral">Spiral</option>
                  </optgroup>
                </select>
              </div>
              <div class="gen-row" style="align-items:center">
                <span class="gen-label">Motif Lock</span>
                <div id="motif-btns" style="display:inline-flex;gap:2px"></div>
                <button id="motif-clear" class="btn-sm" style="margin-left:4px">&#10005;</button>
                <canvas id="motif-canvas" width="120" height="22" style="margin-left:6px;border:1px solid #444;background:#111;vertical-align:middle"></canvas>
              </div>
              <div class="gen-row" style="align-items:center;gap:6px">
                <span class="gen-label">Archetype</span>
                <select id="archetype-sel" class="gen-input" style="font-size:11px;flex:1" title="Select a motif archetype — sets the repeating melodic shape for the whole song">
                  <option value="">None (free generation)</option>
                  <optgroup label="3-note (Short &amp; punchy)">
                    <option value="motif-preset-jab">Jab — root, 5th, back</option>
                    <option value="motif-preset-sigh">Sigh — gentle fall 5th to root</option>
                    <option value="motif-preset-call">Call — three rising steps</option>
                    <option value="motif-preset-drop">Drop — big fall 7th to root</option>
                    <option value="motif-preset-ping">Ping — root, leap, settle on 5th</option>
                  </optgroup>
                  <optgroup label="4-note">
                    <option value="motif-preset-hook">Hook — leap to 5th, descent</option>
                    <option value="motif-preset-hero">Hero — rising stepwise to 5th</option>
                    <option value="motif-preset-sad">Sad — descending 5th to root</option>
                    <option value="motif-preset-bounce">Bounce — root-5th ostinato</option>
                    <option value="motif-preset-march">March — repeated note then rise</option>
                    <option value="motif-preset-jazz">Jazz — maj7 arpeggio</option>
                  </optgroup>
                  <optgroup label="5-note">
                    <option value="motif-preset-wave">Wave — arch up and back</option>
                    <option value="motif-preset-fanfare">Fanfare — arpeggio through 7th</option>
                    <option value="motif-preset-quest">Quest — rise, lands on 6th</option>
                    <option value="motif-preset-boss">Boss — 7th drops to root</option>
                    <option value="motif-preset-chase">Chase — leaping root to 7th</option>
                    <option value="motif-preset-skip">Skip — alternating leaps</option>
                    <option value="motif-preset-lullaby">Lullaby — gentle rocking 3rd-root</option>
                    <option value="motif-preset-tumble">Tumble — long fall 5th to root</option>
                    <option value="motif-preset-taunt">Taunt — repeated jab, 4th drop</option>
                    <option value="motif-preset-lament">Lament — chromatic descent</option>
                    <option value="motif-preset-creep">Creep — neighbor tone oscillation</option>
                    <option value="motif-preset-boing">Boing — giant root/7th bounces</option>
                    <option value="motif-preset-backwards">Backwards — reversed arch</option>
                    <option value="motif-preset-cry">Cry — falling, each note lower</option>
                  </optgroup>
                  <optgroup label="6-note">
                    <option value="motif-preset-spiral">Spiral — winding upward</option>
                    <option value="motif-preset-triumph">Triumph — 5th then descend</option>
                    <option value="motif-preset-panic">Panic — wild jagged leaps</option>
                    <option value="motif-preset-hiccup">Hiccup — stuttery with leaps</option>
                    <option value="motif-preset-wobbly">Wobbly — wobbles up by step</option>
                    <option value="motif-preset-dizzy">Dizzy — spins, never settles</option>
                    <option value="motif-preset-glitch">Glitch — high/low extremes</option>
                    <option value="motif-preset-alien">Alien — whole-tone oscillation</option>
                    <option value="motif-preset-trance">Trance — hypnotic then leap</option>
                    <option value="motif-preset-dream">Dream — floaty unresolved shimmer</option>
                    <option value="motif-preset-clock">Clock — tick-tock alternating</option>
                    <option value="motif-preset-prayer">Prayer — symmetrical arch</option>
                    <option value="motif-preset-stomp">Stomp — three root hits, leap</option>
                    <option value="motif-preset-moonwalk">Moonwalk — gliding around 5th</option>
                    <option value="motif-preset-stutter">Stutter — repeats then step-up</option>
                    <option value="motif-preset-sneak">Sneak — creep up, leap down</option>
                    <option value="motif-preset-dance">Dance — bright upward staircase</option>
                    <option value="motif-preset-signal">Signal — call and response</option>
                    <option value="motif-preset-pendulum">Pendulum — swinging around 3rd</option>
                    <option value="motif-preset-gallop">Gallop — dotted-rhythm feel</option>
                  </optgroup>
                  <optgroup label="8-note (Long &amp; flowing)">
                    <option value="motif-preset-journey">Journey — rise to 5th then full descent</option>
                    <option value="motif-preset-thunder">Thunder — doubled hits, climax, resolve</option>
                    <option value="motif-preset-hymn">Hymn — chorale arch with 7th peak</option>
                    <option value="motif-preset-river">River — stepwise flowing upward</option>
                    <option value="motif-preset-orbit">Orbit — wide spiral back to root</option>
                    <option value="motif-preset-groove">Groove — funky repeats with movement</option>
                  </optgroup>
                </select>
                <button id="arch-rand-toggle" class="btn-sm" style="font-size:10px;opacity:0.5;white-space:nowrap" title="When lit, Randomize Everything also picks a random archetype and arp style">Rnd</button>
                <button id="arch-clear" class="btn-sm" style="font-size:10px" title="Clear archetype and motif lock">X</button>
                <canvas id="motif-canvas" width="80" height="22" style="border:1px solid #444;background:#111;vertical-align:middle"></canvas>
              </div>
              <div class="gen-row" style="align-items:center;gap:6px">
                <span class="gen-label">Inspector</span>
                <span id="seed-display" style="font-size:10px;opacity:0.6;font-family:monospace">seed: —</span>
                <span id="motif-inspector" style="font-size:10px;opacity:0.6;font-family:monospace">motif: —</span>
                <button id="copy-seed-btn" class="btn-sm" style="font-size:10px">copy seed</button>
                <button id="export-json-btn" class="btn-sm" style="font-size:10px">JSON</button>
              </div>
              <div class="gen-row" style="align-items:center;gap:4px;flex-wrap:wrap">
                <span class="gen-label">Steer</span>
                <button id="steer-bright"    class="btn-sm" style="font-size:10px;opacity:0.45" title="Force major/lydian, high register, bright accompaniment">Bright</button>
                <button id="steer-focused"   class="btn-sm" style="font-size:10px;opacity:0.45" title="Simple rhythm, max phrase repetition, hard chord-tone snap — very hooky">Focused</button>
                <button id="steer-cinematic" class="btn-sm" style="font-size:10px;opacity:0.45" title="Minor/harmonic-minor, pedal bass, wide dynamics, no drums">Cinematic</button>
                <button id="steer-lush"      class="btn-sm" style="font-size:10px;opacity:0.45" title="Major/lydian, heavy pad, legato, BPM 80-100, no drums — warm and cozy">Lush</button>
                <button id="steer-punchy"    class="btn-sm" style="font-size:10px;opacity:0.45" title="Staccato, hard downbeat accents, no pad, low sparseness — tight and energetic">Punchy</button>
                <button id="steer-lofi"      class="btn-sm" style="font-size:10px;opacity:0.45" title="Dorian/pentatonic minor, high sparseness, slow BPM, no drums — intimate and sad">Lofi</button>
              </div>
              <div class="gen-row" style="align-items:center;gap:4px;flex-wrap:wrap">
                <span class="gen-label">Post-gen</span>
                <button id="global-swing"    class="btn-sm" style="font-size:10px" title="Toggle swing: delay all off-beat notes by 15ms across every channel">Swing</button>
                <button id="global-compress" class="btn-sm" style="font-size:10px" title="Compress velocities: bring loud notes down and quiet notes up toward the middle">Compress</button>
                <button id="global-swell"    class="btn-sm" style="font-size:10px" title="Swell: quiet start, loud end — velocity crescendo across the whole song">Swell</button>
                <button id="global-doubletime" class="btn-sm" style="font-size:10px" title="Double Time: halve all note timings so the song plays twice as busy at the same BPM">2x Time</button>
                <button id="global-halftime"   class="btn-sm" style="font-size:10px" title="Half Time: double all note timings for a slow dramatic weight">0.5x Time</button>
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
                  <option value="harmonicMinor">Harmonic Minor</option>
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
            ${this.visibleChannelIds().map(id => this.renderChannelRow(id)).join('')}
            ${IS_DEMO ? `
            <div style="margin-top:6px;font:10px Tahoma;color:var(--txt-dis)">Demo: 4 channels — the full version adds arp, pad, and 3 extra channels.</div>
            ` : `
            <div style="margin-top:6px;display:flex;gap:6px;align-items:center">
              <button class="toolbar-btn" id="add-channel-btn" title="Add an extra instrument channel">+ Add Channel</button>
              <span id="extra-ch-hint" style="font:10px Tahoma;color:var(--txt-dis)">${this.activeExtraChannels.size === 0 ? 'Up to 3 extra channels' : `${this.activeExtraChannels.size}/3 added`}</span>
            </div>
            `}
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
              <label style="display:inline-flex;align-items:center;gap:4px;font:11px Tahoma;margin-left:6px;cursor:pointer"><input type="checkbox" id="auto-humanize"> Auto</label>
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

        <!-- Theme selector -->
        <div class="card" style="padding:6px 10px">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span style="font:11px Tahoma;opacity:0.7;flex-shrink:0">Theme:</span>
            <button class="btn-theme active" id="theme-aero"  data-theme="aero">Aero</button>
            <button class="btn-theme"        id="theme-neon"  data-theme="neon">Neon</button>
            <button class="btn-theme"        id="theme-amber" data-theme="amber">Amber</button>
            <button class="btn-theme"        id="theme-green" data-theme="green">Forest</button>
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
                <button class="btn-transport" id="loop-btn" title="Loop: replay bars seamlessly (off = infinite mode)" style="font-size:13px">↻</button>
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
                <input type="text" id="export-name" placeholder="file name (auto)" title="Custom export file name — leave blank for auto" style="font:10px Tahoma;padding:2px 4px;width:100px;background:#222;color:#ccc;border:1px solid #444;border-radius:2px">
                <button class="btn-download" id="download-btn" disabled>Save MIDI</button>
                <button class="btn-download" id="wav-btn" disabled>Save WAV</button>
              </div>
            </div>
            <canvas id="osc-canvas" class="osc-canvas" width="220" height="108"></canvas>
          </div>
        </div>

        <div style="position:relative;width:100%;margin-top:4px">
          <canvas id="matrix-canvas" style="width:100%;height:80px;display:block;background:transparent;border-top:1px solid rgba(0,0,0,0.12)" width="1200" height="80"></canvas>
          <button id="ascii-rand-btn" title="Randomize creatures and colors" style="position:absolute;top:4px;right:6px;font:10px Tahoma;padding:2px 7px;cursor:pointer;z-index:2;background:rgba(0,0,0,0.35);color:rgba(255,255,255,0.7);border:1px solid rgba(255,255,255,0.2);border-radius:4px">🎲 New!</button>
        </div>

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
            <button class="btn-simplify"  id="simplify-${id}"    disabled title="Simplify: thin fast runs, add breathing room">Simplify</button>
            <button class="btn-sm"        id="ghost-${id}"      disabled title="Ghost: drop all velocities by 25 — sits back in the mix" style="font-size:10px">Ghost</button>
            <button class="btn-sm"        id="boost-${id}"      disabled title="Boost: raise all velocities by 20 — pushes channel forward" style="font-size:10px">Boost</button>
            <button class="btn-sm"        id="staccato-${id}"   disabled title="Staccato: cut all note durations to 40% — punchy and separated" style="font-size:10px">Stacc</button>
            <button class="btn-sm"        id="legato-${id}"     disabled title="Legato: extend all note durations to 95% — smooth connected line" style="font-size:10px">Legato</button>
            <button class="btn-sm"        id="harmonize-${id}"  disabled title="Harmonize: add a scale-third below every note at -15 velocity" style="font-size:10px">Harm</button>
            <button class="btn-sm"        id="retrograde-${id}" disabled title="Retrograde: reverse the order of all notes in time" style="font-size:10px">Retro</button>
            <button class="btn-sm"        id="oct-up-${id}"     disabled title="Shift all notes up one octave" style="font-size:10px">Oct+</button>
            <button class="btn-sm"        id="oct-dn-${id}"     disabled title="Shift all notes down one octave" style="font-size:10px">Oct-</button>
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
              ${id === 'wave' ? '<option value="bass">Bass (Auto)</option><option value="pedal">Pedal Bass</option><option value="synco">Synco Bass</option><option value="march">March Bass</option><option value="walking">Walking Bass</option><option value="waltz">Waltz Bass</option><option value="alberti">Alberti Bass</option><option value="melody">Melody</option>' : ''}
              ${id === 'noise' ? '<option value="drums">Drums</option><option value="off">Off</option>' : ''}
              ${['extra1','extra2','extra3'].includes(id) ? '<option value="arp">Arpeggio</option><option value="bell">Bells</option><option value="pad">Pad</option><option value="strum">Chord Strum</option><option value="bass">Bass</option><option value="off">Off</option>' : ''}
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
            ${['extra1','extra2','extra3'].includes(id) ? `<button class="btn-remove-ch" id="remove-ch-${id}" title="Remove this channel" style="margin-left:auto;padding:2px 7px;font-size:10px;background:#c0392b;color:#fff;border:none;border-radius:3px;cursor:pointer">✕ Remove</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  private renderFAQModal(): string {
    return `
      <div id="faq-modal" class="modal-overlay">
        <div class="modal-window" style="max-width:600px">
          <div class="modal-titlebar">
            <span class="modal-title-text">Bloop Maker — Help & FAQ</span>
            <button class="modal-close" id="faq-close">Close</button>
          </div>
          <div class="modal-body" style="font-size:12px;line-height:1.6">

            <h3>What is this?</h3>
            <p>Bloop Maker is a <strong>procedural MIDI composer</strong>. It generates original video game style music from scratch using coded music theory rules — chord progressions, melody contour, motif repetition, harmonic rhythm, bass logic, and drum patterns. No AI. No internet. No samples copied from other music. Everything runs in your browser.</p>

            <h3>Step 1 — Get a Soundfont</h3>
            <p>To hear audio you need a free <strong>.sf2 soundfont file</strong>. Search for <em>GeneralUser GS sf2</em> or <em>FluidR3 GM sf2</em> — both are free and work well. Drag the file into the Soundfont box. Without a soundfont you can still generate and export MIDI, you just won't hear playback inside the app.</p>

            <h3>Step 2 — Generate a Song</h3>
            <p>Pick a <strong>Preset</strong> from the dropdown for a quick start, or set Mode / BPM / Key / Scale manually. Hit <strong>Generate!</strong>. Press <strong>Space</strong> or the play button to hear it.</p>
            <p>Use the <strong>Steer</strong> buttons before generating to push toward a feel: <em>Bright</em> forces cheerful major/lydian songs, <em>Cinematic</em> forces dark minor with no drums, <em>Lush</em> makes warm cozy music, <em>Punchy</em> makes tight energetic songs, <em>Lofi</em> makes sparse slow intimate songs, <em>Focused</em> maximises hook repetition.</p>

            <h3>Step 3 — Shape It</h3>
            <p><strong>Archetype</strong> — pick a motif shape from the dropdown (3, 4, 5, 6, or 8 notes). This pattern repeats as the main hook throughout the song, transposed to each chord. <strong>Arp Style</strong> controls how the harmony channel plays chords — try different ones to change the texture completely.</p>
            <p><strong>Regen</strong> on any channel regenerates just that one channel while keeping everything else. It uses the same seed as the original generation so the result stays in key and in the same chord progression.</p>

            <h3>Step 4 — Refine with Post-Gen Buttons</h3>
            <p>Per-channel: <strong>Simplify</strong> thins fast runs · <strong>Ghost</strong> pulls the channel back in the mix · <strong>Boost</strong> pushes it forward · <strong>Stacc</strong> makes notes punchy and short · <strong>Legato</strong> makes them smooth and connected · <strong>Harm</strong> adds a harmony note below every note · <strong>Retro</strong> reverses the note order · <strong>Oct+ / Oct-</strong> shifts the whole channel up or down an octave.</p>
            <p>Global: <strong>Swing</strong> delays off-beat notes 30ms across all channels (toggle — click again to remove) · <strong>Compress</strong> narrows the velocity range · <strong>Swell</strong> adds a volume crescendo from start to end · <strong>2x Time</strong> halves all timings (twice as busy) · <strong>0.5x Time</strong> doubles all timings (half as busy).</p>

            <h3>Step 5 — Edit Notes</h3>
            <p>Click <strong>Piano Roll</strong> on any channel to open the note editor. Click empty space to add a note. Click a note to remove it. Drag right while placing to extend the duration. Scroll wheel to zoom. Click the piano keys on the left to preview pitches.</p>

            <h3>Step 6 — Export</h3>
            <p><strong>Save MIDI</strong> — exports a standard .mid file. Open it in any DAW, notation software, or MIDI device. What you hear is what you get — all edits and post-gen changes are included.</p>
            <p><strong>Save WAV</strong> — renders to audio using the loaded soundfont. Requires a soundfont.</p>
            <p>Each channel also has its own MIDI export button for exporting just that channel.</p>

            <h3>Playback Modes</h3>
            <p>Normal = plays once · Loop (↻) = replays the same bars seamlessly · Infinite = auto-appends more bars so the song never ends.</p>

            <h3>Keyboard Shortcuts</h3>
            <div class="tip" style="font-size:11px">
              <strong>Space</strong> Play / Pause &nbsp;·&nbsp;
              <strong>R</strong> Restart and Play &nbsp;·&nbsp;
              <strong>F</strong> Generate &nbsp;·&nbsp;
              <strong>X</strong> Randomize Everything and Generate<br>
              <strong>G</strong> Randomize instrument presets &nbsp;·&nbsp;
              <strong>Ctrl+Z</strong> Undo &nbsp;·&nbsp;
              <strong>Ctrl+Y</strong> Redo &nbsp;·&nbsp;
              <strong>↑ / ↓</strong> BPM ±1 (Shift = ±5)
            </div>

            <h3>FAQ</h3>
            <p><strong>Does this use AI?</strong> No. Music is generated entirely by coded music theory rules — chord progression tables, melody algorithms, motif logic, and pattern generators written in TypeScript. No machine learning, no neural networks, no external APIs.</p>
            <p><strong>Does it need the internet?</strong> No. Once the page loads it runs completely offline. No data leaves your machine.</p>
            <p><strong>Why does it sound dark/weird sometimes?</strong> Some modes and scales skew that way by design. Use the <em>Bright</em> or <em>Lush</em> steer button before generating to push toward cheerful results. The <em>Focused</em> steer makes hooks more repetitive and recognisable.</p>
            <p><strong>How do I get the same song again?</strong> Copy the seed from the Inspector row (or the Copy Seed button) and share it. The same seed + same settings always produces the same song.</p>
            <p><strong>Why does per-channel Regen sound different from the original?</strong> It uses the same seed and same chord progression as the original, but some randomness (ornaments, rhythm variation) changes per call. It will always be in the same key and scale.</p>
            <p><strong>Can I import my own MIDI?</strong> Yes — drop any .mid file into the MIDI drop zone. Then edit, scramble, or re-export it.</p>

            <p style="margin-top:16px;color:var(--txt-dis);font-size:10px;text-align:center">Bloop Maker — procedural game music composer · runs offline · no AI</p>
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
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); this.runGenerator(); }
      if (e.key === 'g' || e.key === 'G') { e.preventDefault(); this.randomizeSF2Presets(); }
      if (e.key === 'x' || e.key === 'X') { e.preventDefault(); this.randomAndGenerate(); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const bpmEl = document.getElementById('gen-bpm') as HTMLInputElement;
        const step = e.shiftKey ? 5 : 1;
        const cur = parseInt(bpmEl.value, 10) || 130;
        bpmEl.value = String(Math.max(40, Math.min(220, cur + (e.key === 'ArrowUp' ? step : -step))));
      }
      // Easter egg: type "bloop"
      if (e.key.length === 1) {
        this.bloopBuffer = (this.bloopBuffer + e.key.toLowerCase()).slice(-5);
        if (this.bloopBuffer === 'bloop') { this.bloopBuffer = ''; this.triggerBloopEasterEgg(); }
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

    // Theme buttons
    document.querySelectorAll('.btn-theme').forEach(btn => {
      btn.addEventListener('click', () => this.applyTheme((btn as HTMLElement).dataset.theme ?? 'aero', true));
    });

    // ASCII randomizer
    document.getElementById('ascii-rand-btn')?.addEventListener('click', () => {
      const poolA = ASCII_POOLS[Math.floor(Math.random() * ASCII_POOLS.length)];
      const poolB = ASCII_POOLS[Math.floor(Math.random() * ASCII_POOLS.length)];
      this.vizCharPool = [...new Set([...poolA, ...poolB])];
      this.vizColorIdx = (this.vizColorIdx + 1) % VIZ_SCHEMES.length;
      this.updateSidePanelColors();
      if (this.oscAnalyser) { this.startMatrixOsc(); } else { this.startMatrixIdle(); }
    });
    document.getElementById('hotkeys-btn')!.addEventListener('click', (e) => { e.stopPropagation(); this.showShortcuts(); });
    document.getElementById('add-channel-btn')?.addEventListener('click', () => {
      const extras: ChannelId[] = ['extra1', 'extra2', 'extra3'];
      const next = extras.find(e => !this.activeExtraChannels.has(e));
      if (!next) return;
      this.activeExtraChannels.add(next);
      this.extraChannelRoles[next] = 'arp';
      this.rerenderChannelsList();
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

    // BPM input (rescale notes on change, including arrow keys)
    let bpmDebounce: number | null = null;
    const applyBPMChange = () => {
      const newBPM = parseInt(this.bpmInput.value, 10);
      if (!isNaN(newBPM) && newBPM >= 20 && newBPM <= 300) {
        const wasPlaying = this.state.isPlaying;
        this.rescaleBPM(newBPM);
        if (wasPlaying) this.startPlayback();
      }
    };
    this.bpmInput.addEventListener('change', applyBPMChange);
    this.bpmInput.addEventListener('input', () => {
      if (bpmDebounce) clearTimeout(bpmDebounce);
      bpmDebounce = window.setTimeout(applyBPMChange, 250);
    });
    this.bpmInput.addEventListener('keydown', e => { if (e.key === 'Enter') this.bpmInput.blur(); });

    // Gen BPM lock button
    const genBpmLockBtn = document.getElementById('gen-bpm-lock') as HTMLButtonElement;
    genBpmLockBtn?.addEventListener('click', () => {
      this.bpmLocked = !this.bpmLocked;
      genBpmLockBtn.classList.toggle('active', this.bpmLocked);
      genBpmLockBtn.style.background = this.bpmLocked ? '#c8a020' : '';
      genBpmLockBtn.style.color = this.bpmLocked ? '#000' : '';
    });

    // Transport
    this.restartBtn.addEventListener('click', () => this.restartPlayback());
    this.playBtn.addEventListener('click',    () => this.togglePlay());
    this.stopBtn.addEventListener('click',    () => this.stopPlayback());
    const loopBtn = document.getElementById('loop-btn') as HTMLButtonElement;
    loopBtn?.addEventListener('click', () => {
      this.loopEnabled = !this.loopEnabled;
      loopBtn.classList.toggle('active', this.loopEnabled);
      if (this.scheduler) this.scheduler.loop = this.loopEnabled;
      this.setStatus('ok', this.loopEnabled ? 'Loop ON — replays bars seamlessly.' : 'Loop OFF — infinite mode, generates new bars.');
    });
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
    this.bindChannelRowEvents();

    // Energy canvas wiring
    this.bindEnergyCanvas();

    // Motif lock wiring
    this.bindMotifLock();
  }

  private bindEnergyCanvas() {
    const canvas = document.getElementById('energy-canvas') as HTMLCanvasElement;
    const POINTS = 20;
    let painting = false;

    const getX = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return Math.max(0, Math.min(POINTS - 1, Math.floor((e.clientX - rect.left) / canvas.width * POINTS)));
    };
    const getY = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / canvas.height));
    };
    const paintPoint = (e: MouseEvent) => {
      const xi = getX(e);
      if (this.energyCurve.length !== POINTS) {
        this.energyCurve = new Array(POINTS).fill(1);
      }
      this.energyCurve[xi] = getY(e);
      this.drawEnergyCanvas();
    };
    canvas.addEventListener('mousedown', e => { painting = true; paintPoint(e); });
    canvas.addEventListener('mousemove', e => { if (painting) paintPoint(e); });
    document.addEventListener('mouseup', () => { painting = false; });

    document.getElementById('energy-reset')!.addEventListener('click', () => {
      this.energyCurve = [];
      this.drawEnergyCanvas();
    });

    this.drawEnergyCanvas();
  }

  private drawEnergyCanvas() {
    const canvas = document.getElementById('energy-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, W, H);

    const POINTS = 20;
    const curve = this.energyCurve.length === POINTS ? this.energyCurve : new Array(POINTS).fill(1);
    const stepW = W / POINTS;

    ctx.strokeStyle = '#4af';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < POINTS; i++) {
      const x = i * stepW + stepW / 2;
      const y = H - curve[i] * H;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw dots
    ctx.fillStyle = '#4af';
    for (let i = 0; i < POINTS; i++) {
      const x = i * stepW + stepW / 2;
      const y = H - curve[i] * H;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private getEnergyMultiplier(barIndex: number, totalBars: number): number {
    if (this.energyCurve.length !== 20) return 1.0;
    const t = totalBars <= 1 ? 0 : barIndex / (totalBars - 1);
    const pos = t * 19; // 0..19
    const lo = Math.floor(pos);
    const hi = Math.min(19, lo + 1);
    const frac = pos - lo;
    return this.energyCurve[lo] * (1 - frac) + this.energyCurve[hi] * frac;
  }

  private bindMotifLock() {
    const container = document.getElementById('motif-btns')!;
    const canvas = document.getElementById('motif-canvas') as HTMLCanvasElement;
    const DEGREE_NAMES = ['1','2','3','4','5','6','7'];
    const DEGREE_COLORS = ['#e87','#eb7','#af7','#7cf','#87e','#f7a','#7ea'];

    const drawMotifCanvas = () => {
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (this.lockedMotif.length === 0) {
        ctx.fillStyle = '#444'; ctx.font = '9px sans-serif';
        ctx.fillText('no motif', 4, 14); return;
      }
      const w = canvas.width / Math.max(this.lockedMotif.length, 4);
      this.lockedMotif.forEach((deg, i) => {
        // Map degree 0-6 to vertical position (higher degree = higher)
        const y = canvas.height - 4 - (deg / 6) * (canvas.height - 8);
        ctx.fillStyle = DEGREE_COLORS[deg];
        ctx.fillRect(i * w + 1, y - 3, w - 2, 6);
        // Connect dots with a line
        if (i > 0) {
          const prevDeg = this.lockedMotif[i - 1];
          const py = canvas.height - 4 - (prevDeg / 6) * (canvas.height - 8);
          ctx.strokeStyle = '#666'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo((i - 0.5) * w, py); ctx.lineTo((i + 0.5) * w, y); ctx.stroke();
        }
      });
    };

    for (let i = 0; i < 7; i++) {
      const btn = document.createElement('button');
      btn.textContent = DEGREE_NAMES[i];
      btn.className = 'btn-sm';
      btn.style.cssText = `min-width:20px;padding:1px 4px;font-size:11px;background:${DEGREE_COLORS[i]}22;border-color:${DEGREE_COLORS[i]}88`;
      btn.addEventListener('click', () => {
        if (this.lockedMotif.length >= 8) return;
        this.lockedMotif.push(i);
        drawMotifCanvas();
      });
      container.appendChild(btn);
    }

    // motif-clear is now arch-clear (wired below after ARCHETYPES map)

    // Preset archetypes: one-click motif patterns
    const ARCHETYPES: Record<string, number[]> = {
      'motif-preset-hook':     [0, 4, 3, 2],       // leap to 5th, stepwise descent
      'motif-preset-hero':     [0, 1, 2, 4],       // rising stepwise to 5th
      'motif-preset-sad':      [4, 2, 1, 0],       // descending from 5th to root
      'motif-preset-wave':     [0, 2, 4, 2, 0],    // arch up and back
      'motif-preset-fanfare':  [0, 2, 4, 6, 4],    // arpeggio up through 7th, partial descent
      'motif-preset-quest':    [0, 1, 2, 3, 5],    // stepwise rise, lands on 6th (unresolved)
      'motif-preset-boss':     [6, 4, 0, 6, 4],    // dark — starts on 7th, drops to root, repeats
      'motif-preset-chase':    [0, 4, 2, 6, 4],    // active leaping: root→5th→3rd→7th→5th
      'motif-preset-bounce':   [0, 4, 0, 4],       // root-5th ostinato
      'motif-preset-march':    [0, 0, 2, 4],       // repeated note then rise (march feel)
      'motif-preset-jazz':     [0, 2, 4, 6],       // maj7 arpeggio outline
      'motif-preset-skip':     [0, 3, 1, 4, 2],    // playful alternating leaps
      'motif-preset-lullaby':  [2, 1, 0, 1, 2],    // gentle rocking: 3rd→2nd→root→2nd→3rd
      'motif-preset-tumble':   [4, 6, 3, 1, 0],    // long fall from 5th through 7th down to root
      'motif-preset-spiral':   [0, 2, 1, 3, 2, 4], // winding upward: step up, step back, repeat
      'motif-preset-taunt':    [0, 0, 3, 2, 0],    // repeated root jab then 4th drop (nyah-nyah)
      'motif-preset-triumph':  [0, 4, 4, 6, 5, 4], // 5th, sustained, then descend with flair
      'motif-preset-lament':   [0, 6, 5, 3, 2],    // chromatic descent using 7th-6th-4th-3rd
      'motif-preset-panic':    [0, 4, 1, 5, 2, 6], // wild alternating leaps — jagged, tense
      'motif-preset-creep':    [0, 1, 0, 6, 0],    // neighbor tone oscillation around root
      // silly
      'motif-preset-hiccup':   [0, 0, 4, 0, 0, 6], // stuttery repeats with surprise leaps
      'motif-preset-boing':    [0, 6, 0, 6, 0],    // giant bounces between root and 7th
      'motif-preset-wobbly':   [0, 1, 0, 2, 0, 3], // wobbles up one step at a time from root
      'motif-preset-dizzy':    [0, 3, 5, 2, 0, 3], // spins in circles, never settles
      // weird
      'motif-preset-glitch':   [0, 6, 1, 5, 2, 4], // alternates between high and low extremes
      'motif-preset-alien':    [0, 3, 6, 3, 6, 3], // tritone / whole-tone oscillation
      'motif-preset-trance':   [0, 0, 0, 0, 5, 0], // hypnotic repeats then sudden 6th jump
      'motif-preset-backwards':[6, 4, 2, 0, 2, 4], // descends then climbs back — reversed arch
      // new
      'motif-preset-dream':    [0, 2, 5, 4, 6, 4], // floaty: root→3rd→6th→5th→7th→5th
      'motif-preset-clock':    [0, 2, 0, 2, 0, 4], // tick-tock: alternating root + step
      'motif-preset-prayer':   [4, 3, 2, 0, 2, 4], // arch resolving to root — reverent
      'motif-preset-stomp':    [0, 0, 0, 4, 0, 0], // grounded: three root hits, leap, return
      'motif-preset-moonwalk': [4, 3, 2, 3, 4, 3], // gliding back-and-forth around the 5th
      'motif-preset-stutter':  [0, 0, 2, 0, 0, 4], // two quick repeats then a step-up pair
      'motif-preset-sneak':    [0, 1, 2, 1, 0, 6], // creeping up then sudden leap down
      'motif-preset-cry':      [4, 4, 3, 2, 1, 0], // falling from 5th, each note lower
      'motif-preset-dance':    [0, 2, 4, 2, 4, 6], // bright upward staircase
      'motif-preset-signal':   [0, 4, 0, 4, 6, 4], // call-and-response
      'motif-preset-pendulum': [2, 4, 2, 0, 2, 4], // swinging around the 3rd
      'motif-preset-gallop':   [0, 0, 4, 0, 0, 6], // dotted-rhythm feel
      // 3-note (short, punchy)
      'motif-preset-jab':      [0, 4, 0],           // root → 5th → back, one punch
      'motif-preset-sigh':     [4, 2, 0],           // gentle fall from 5th to root
      'motif-preset-call':     [0, 2, 4],           // three rising steps, open question
      'motif-preset-drop':     [6, 3, 0],           // big drop from 7th through 4th to root
      'motif-preset-ping':     [0, 6, 4],           // root, leap high, settle on 5th
      // 8-note (long flowing phrases)
      'motif-preset-journey':  [0, 1, 2, 4, 3, 2, 1, 0], // rise to 5th then full descent
      'motif-preset-thunder':  [0, 0, 4, 4, 0, 0, 6, 4], // doubled heavy hits, climax, resolve
      'motif-preset-hymn':     [0, 2, 4, 3, 2, 4, 6, 4], // chorale arch with 7th peak
      'motif-preset-river':    [0, 2, 1, 3, 2, 4, 3, 5], // stepwise flowing upward
      'motif-preset-orbit':    [0, 3, 6, 4, 2, 5, 3, 0], // wide spiral back to root
      'motif-preset-groove':   [0, 0, 4, 2, 0, 0, 6, 4], // funky repeats with inner movement
    };

    // Wire archetype dropdown
    const archetypeSel = document.getElementById('archetype-sel') as HTMLSelectElement;
    archetypeSel.addEventListener('change', () => {
      const key = archetypeSel.value;
      if (!key || !ARCHETYPES[key]) {
        this.lockedMotif = [];
      } else {
        this.lockedMotif = [...ARCHETYPES[key]];
      }
      drawMotifCanvas();
    });

    // Wire arp style dropdown
    const arpSelEl = document.getElementById('arp-style-sel') as HTMLSelectElement;
    arpSelEl.addEventListener('change', () => {
      this.arpStyleOverride = arpSelEl.value || 'auto';
    });

    // Wire arch+arp randomize toggle
    const archRandBtn = document.getElementById('arch-rand-toggle') as HTMLButtonElement;
    const updateArchRandBtn = () => {
      archRandBtn.style.opacity = this.randomizeArchAndArp ? '1' : '0.45';
      archRandBtn.style.outline = this.randomizeArchAndArp ? '1px solid #aaa' : 'none';
    };
    archRandBtn.addEventListener('click', () => {
      this.randomizeArchAndArp = !this.randomizeArchAndArp;
      updateArchRandBtn();
    });
    updateArchRandBtn();

    // Wire clear button (clears both dropdown selection and manual motif lock)
    document.getElementById('arch-clear')!.addEventListener('click', () => {
      this.lockedMotif = [];
      archetypeSel.value = '';
      drawMotifCanvas();
    });

    drawMotifCanvas();

    // Steering buttons — Bright / Focused / Cinematic / Lush / Punchy / Lofi
    const steerButtons: Record<string, 'bright' | 'focused' | 'cinematic' | 'lush' | 'punchy' | 'lofi'> = {
      'steer-bright':    'bright',
      'steer-focused':   'focused',
      'steer-cinematic': 'cinematic',
      'steer-lush':      'lush',
      'steer-punchy':    'punchy',
      'steer-lofi':      'lofi',
    };

    // Global post-gen buttons
    // Swing is a real toggle — lights up when active, removes swing when clicked again
    const swingBtn = document.getElementById('global-swing') as HTMLButtonElement;
    const updateSwingBtn = () => {
      swingBtn.style.opacity  = this.swingActive ? '1'   : '0.55';
      swingBtn.style.outline  = this.swingActive ? '1px solid #aaa' : 'none';
      swingBtn.style.background = this.swingActive ? 'rgba(255,255,255,0.15)' : '';
    };
    swingBtn.addEventListener('click', () => { this.globalSwing(); updateSwingBtn(); });

    // One-shot buttons flash briefly on click to confirm the action
    const flashBtn = (id: string, action: () => void) => {
      const btn = document.getElementById(id) as HTMLButtonElement | null;
      if (!btn) return;
      btn.addEventListener('click', () => {
        action();
        btn.style.outline   = '1px solid #aaa';
        btn.style.background = 'rgba(255,255,255,0.15)';
        setTimeout(() => {
          btn.style.outline   = '';
          btn.style.background = '';
        }, 500);
      });
    };
    flashBtn('global-compress',   () => this.globalCompress());
    flashBtn('global-swell',      () => this.globalSwell());
    flashBtn('global-doubletime', () => this.globalTimeStretch(0.5, '2x Time'));
    flashBtn('global-halftime',   () => this.globalTimeStretch(2.0, 'Half Time'));
    const updateSteerBtns = () => {
      for (const [id, mode] of Object.entries(steerButtons)) {
        const btn = document.getElementById(id) as HTMLButtonElement;
        const active = this.steeringMode === mode;
        btn.style.opacity = active ? '1' : '0.45';
        btn.style.outline = active ? '1px solid #aaa' : 'none';
      }
    };
    for (const [id, mode] of Object.entries(steerButtons)) {
      document.getElementById(id)!.addEventListener('click', () => {
        this.steeringMode = this.steeringMode === mode ? null : mode;
        updateSteerBtns();
        this.setStatus('ok', this.steeringMode
          ? `Steering: ${this.steeringMode} — next Generate will apply this bias`
          : 'Steering off — fully random generation');
      });
    }
    updateSteerBtns();

    // Inspector + export buttons
    document.getElementById('copy-seed-btn')!.addEventListener('click', () => {
      navigator.clipboard.writeText(String(this.lastSeed)).catch(() => {});
      this.setStatus('ok', `Seed ${this.lastSeed} copied! Use it to reproduce this song.`);
    });
    document.getElementById('export-json-btn')!.addEventListener('click', () => this.exportJSON());
  }

  private updateInspector() {
    const arrowMap: [number, string][] = [[-3,'↓↓'],[-2,'↓'],[-1,'↘'],[0,'→'],[1,'↗'],[2,'↑'],[3,'↑↑']];
    const arrow = (v: number) => arrowMap.find(([k]) => k === v)?.[1] ?? (v > 0 ? `+${v}` : `${v}`);
    const motifStr = this.lastMotifIntervals.map(arrow).join(' ');
    (document.getElementById('seed-display') as HTMLElement).textContent = `seed: ${this.lastSeed}`;
    (document.getElementById('motif-inspector') as HTMLElement).textContent = `motif: ${motifStr || '—'}`;
  }

  private exportJSON() {
    if (this.demoGate('JSON export')) return;
    const NOTE_NAMES_FULL = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    if (!this.lastGenConfig) { this.setStatus('err', 'Generate something first!'); return; }
    const meta = {
      seed: this.lastSeed,
      bpm: this.state.bpm,
      key: NOTE_NAMES_FULL[this.lastGenConfig.key],
      mode: this.lastGenConfig.mode,
      scale: this.lastGenConfig.scaleType ?? 'default',
      bars: this.lastGenConfig.bars,
      motifIntervals: this.lastMotifIntervals,
      motifSeed: this.lastGenConfig.motifSeed ?? null,
      sparseness: this.lastGenConfig.sparseness ?? 0,
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bloop_${meta.bpm}bpm_${meta.key}_seed${meta.seed}.json`;
    a.click();
    this.setStatus('ok', 'Metadata JSON exported!');
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

  private bindChannelRowEvents() {
    const visibleChannels = this.visibleChannelIds();
    for (const id of visibleChannels) {
      this.muteBtns[id]?.addEventListener('click',     () => this.toggleMute(id));
      this.soloBtns[id]?.addEventListener('click',     () => this.toggleSolo(id));
      this.regenBtns[id]?.addEventListener('click',    () => this.regenChannel(id));
      document.getElementById(`simplify-${id}`)?.addEventListener('click',   () => this.simplifyChannel(id));
      document.getElementById(`ghost-${id}`)?.addEventListener('click',      () => this.channelVelocityShift(id, -25, 'Ghosted'));
      document.getElementById(`boost-${id}`)?.addEventListener('click',      () => this.channelVelocityShift(id, +20, 'Boosted'));
      document.getElementById(`staccato-${id}`)?.addEventListener('click',   () => this.channelGate(id, 0.40, 'Staccato'));
      document.getElementById(`legato-${id}`)?.addEventListener('click',     () => this.channelGate(id, 0.95, 'Legato'));
      document.getElementById(`harmonize-${id}`)?.addEventListener('click',  () => this.harmonizeChannel(id));
      document.getElementById(`retrograde-${id}`)?.addEventListener('click', () => this.retrogradeChannel(id));
      document.getElementById(`oct-up-${id}`)?.addEventListener('click',     () => this.channelOctave(id, +12));
      document.getElementById(`oct-dn-${id}`)?.addEventListener('click',     () => this.channelOctave(id, -12));
      this.exportChBtns[id]?.addEventListener('click', () => this.exportChannel(id));
      this.editBtns[id]?.addEventListener('click',     () => this.toggleChannelEdit(id));
      const lockBtn = document.getElementById(`lock-${id}`) as HTMLButtonElement;
      lockBtn?.addEventListener('click', () => {
        this.channelLocked[id] = !this.channelLocked[id];
        lockBtn.classList.toggle('active', !!this.channelLocked[id]);
      });
      const volValEl = document.getElementById(`chvol-val-${id}`);
      if (volValEl) {
        const adjVol = (delta: number) => {
          this.channelVolValues[id] = Math.max(0, Math.min(1, (this.channelVolValues[id] ?? 1) + delta));
          volValEl.textContent = `${Math.round(this.channelVolValues[id] * 100)}%`;
          this.sampler?.setChannelVolume(id, this.channelVolValues[id]);
        };
        document.getElementById(`chvol-dn-${id}`)?.addEventListener('click', () => adjVol(-0.05));
        document.getElementById(`chvol-up-${id}`)?.addEventListener('click', () => adjVol(0.05));
      }
      const sparseEl    = document.getElementById(`sparse-${id}`) as HTMLInputElement;
      const sparseValEl = document.getElementById(`sparse-val-${id}`);
      const genToggleEl = document.getElementById(`gen-toggle-${id}`) as HTMLButtonElement;
      sparseEl?.addEventListener('input', () => {
        const v = parseFloat(sparseEl.value);
        this.channelSparseValues[id] = v;
        if (sparseValEl) sparseValEl.textContent = `${Math.round(v * 100)}%`;
      });
      genToggleEl?.addEventListener('click', () => {
        const enabled = this.channelGenEnabled[id] !== false;
        this.channelGenEnabled[id] = !enabled;
        genToggleEl.classList.toggle('active', !enabled);
        sparseEl.style.opacity = enabled ? '0.4' : '1';
        genToggleEl.title = enabled ? 'Channel excluded from generation (click to enable)' : 'Toggle channel in generation';
      });
      const sf2SrcEl = document.getElementById(`sf2-src-${id}`) as HTMLSelectElement;
      sf2SrcEl?.addEventListener('change', () => {
        const idx = parseInt(sf2SrcEl.value, 10);
        this.channelSF2Idx[id] = idx;
        this.sampler?.setChannelSF2(id, idx);
        this.updateChannelInstrumentSelector(id);
      });
      document.getElementById(`tr-up-${id}`)?.addEventListener('click',     () => this.transposeChannel(id, 1));
      document.getElementById(`tr-dn-${id}`)?.addEventListener('click',     () => this.transposeChannel(id, -1));
      document.getElementById(`tr-oct-up-${id}`)?.addEventListener('click', () => this.transposeChannel(id, 12));
      document.getElementById(`tr-oct-dn-${id}`)?.addEventListener('click', () => this.transposeChannel(id, -12));
      this.selects[id]?.addEventListener('change', e => {
        this.state.channels[id].presetIndex = parseInt((e.target as HTMLSelectElement).value, 10);
      });
      const styleEl = document.getElementById(`style-${id}`) as HTMLSelectElement;
      if (styleEl) {
        styleEl.value = this.channelStyle[id] ?? 'auto';
        styleEl.addEventListener('change', () => {
          this.channelStyle[id] = styleEl.value;
          if (['extra1','extra2','extra3'].includes(id)) {
            this.extraChannelRoles[id] = styleEl.value;
          }
        });
      }
      const adjPan = (delta: number) => {
        const cur = Math.round((this.channelPanValues[id] ?? 0) * 100);
        const next = Math.max(-100, Math.min(100, cur + delta));
        this.channelPanValues[id] = next / 100;
        if (this.panValEls[id]) this.panValEls[id].textContent = formatPan(next);
        this.sampler?.setChannelPan(id, next / 100);
      };
      document.getElementById(`pan-dn-${id}`)?.addEventListener('click', () => adjPan(-10));
      document.getElementById(`pan-up-${id}`)?.addEventListener('click', () => adjPan(10));
      if (['extra1','extra2','extra3'].includes(id)) {
        document.getElementById(`remove-ch-${id}`)?.addEventListener('click', () => this.removeChannel(id));
      }
    }
  }

  private removeChannel(id: ChannelId) {
    this.activeExtraChannels.delete(id);
    delete this.extraChannelRoles[id as keyof typeof this.extraChannelRoles];
    this.state.channels[id].notes = [];
    // Clear stale DOM refs
    (this.selects as Record<string,unknown>)[id] = null;
    (this.muteBtns as Record<string,unknown>)[id] = null;
    (this.soloBtns as Record<string,unknown>)[id] = null;
    (this.regenBtns as Record<string,unknown>)[id] = null;
    (this.exportChBtns as Record<string,unknown>)[id] = null;
    (this.editBtns as Record<string,unknown>)[id] = null;
    this.rerenderChannelsList();
    this.updateAllCanvases();
    this.updateNoteCountBadges();
  }

  private rerenderChannelsList() {
    const list = document.getElementById('channels-list');
    if (!list) return;
    const allAdded = this.activeExtraChannels.size >= 3;
    list.innerHTML = CHANNELS
      .filter(id => !['extra1','extra2','extra3'].includes(id) || this.activeExtraChannels.has(id))
      .map(id => this.renderChannelRow(id)).join('') +
      `<div style="margin-top:6px;display:flex;gap:6px;align-items:center">
        ${allAdded ? '' : `<button class="toolbar-btn" id="add-channel-btn" title="Add an extra instrument channel">+ Add Channel</button>`}
        <span id="extra-ch-hint" style="font:10px Tahoma;color:var(--txt-dis)">${this.activeExtraChannels.size}/3 extra channels</span>
      </div>`;
    // Re-cache DOM refs for newly rendered channels
    for (const id of CHANNELS) {
      const canvas = document.getElementById(`canvas-${id}`) as HTMLCanvasElement;
      if (canvas) this.canvases[id] = canvas;
      const sel = document.getElementById(`select-${id}`) as HTMLSelectElement;
      if (sel) this.selects[id] = sel;
      const mute = document.getElementById(`mute-${id}`) as HTMLButtonElement;
      if (mute) this.muteBtns[id] = mute;
      const solo = document.getElementById(`solo-${id}`) as HTMLButtonElement;
      if (solo) this.soloBtns[id] = solo;
      const regen = document.getElementById(`regen-${id}`) as HTMLButtonElement;
      if (regen) this.regenBtns[id] = regen;
      const exportCh = document.getElementById(`export-ch-${id}`) as HTMLButtonElement;
      if (exportCh) this.exportChBtns[id] = exportCh;
      const edit = document.getElementById(`edit-${id}`) as HTMLButtonElement;
      if (edit) this.editBtns[id] = edit;
      const noteCount = document.getElementById(`count-${id}`);
      if (noteCount) this.noteCountEls[id] = noteCount;
      const panVal = document.getElementById(`pan-val-${id}`);
      if (panVal) this.panValEls[id] = panVal;
    }
    this.bindChannelRowEvents();
    this.populateInstrumentSelectors();
    this.updateSF2List();
    document.getElementById('add-channel-btn')?.addEventListener('click', () => {
      const extras: ChannelId[] = ['extra1', 'extra2', 'extra3'];
      const next = extras.find(e => !this.activeExtraChannels.has(e));
      if (!next) return;
      this.activeExtraChannels.add(next);
      this.extraChannelRoles[next] = 'arp';
      this.rerenderChannelsList();
    });
  }

  // ── Dark mode ────────────────────────────────────────────────

  private toggleDarkMode() {
    document.body.classList.toggle('dark');
    localStorage.setItem('bloopDark', document.body.classList.contains('dark') ? '1' : '0');
  }

  private applyTheme(theme: string, save: boolean) {
    this.currentTheme = theme;
    document.body.classList.remove('theme-neon', 'theme-amber', 'theme-green');
    if (theme !== 'aero') document.body.classList.add(`theme-${theme}`);
    document.querySelectorAll('.btn-theme').forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.theme === theme);
    });
    this.updateSidePanelColors();
    if (save) localStorage.setItem('bloopTheme', theme);
  }

  private injectSidePanels() {
    const makePanel = (side: 'left' | 'right') => {
      const div = document.createElement('div');
      div.className = `ascii-side ascii-side-${side}`;
      div.id = `ascii-side-${side}`;
      const chars = this.vizCharPool.slice(0, 7);
      chars.forEach((ch, i) => {
        const span = document.createElement('span');
        span.textContent = ch;
        span.style.animationDelay = `${(i / chars.length) * 4}s`;
        span.style.animationDuration = `${3 + i * 0.4}s`;
        div.appendChild(span);
      });
      document.body.appendChild(div);
    };
    makePanel('left');
    makePanel('right');
    this.updateSidePanelColors();
  }

  private updateSidePanelColors() {
    const scheme = VIZ_SCHEMES[this.vizColorIdx];
    const [r, g, b] = scheme.r < 0
      ? [100, 200, 255]
      : [scheme.r, scheme.g, scheme.b];
    const color = `rgba(${r},${g},${b},0.35)`;
    document.querySelectorAll('.ascii-side span').forEach(s => {
      (s as HTMLElement).style.color = color;
    });
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
    if (this.demoGate('Project save')) return;
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
    if (p.sparseness != null) {
      const sparEl = document.getElementById('gen-sparseness') as HTMLInputElement;
      sparEl.value = String(p.sparseness);
      document.getElementById('gen-sparseness-val')!.textContent = `${Math.round(p.sparseness * 100)}%`;
    }
  }

  private quickGenerate(opts: Partial<GenConfig> & { mode: GenMode; bpm: number; scale: string; generateNoise: boolean }) {
    this.genMode = opts.mode;
    if (!this.bpmLocked) (document.getElementById('gen-bpm') as HTMLInputElement).value = String(opts.bpm);
    (document.getElementById('gen-scale') as HTMLSelectElement).value = opts.scale;
    (document.getElementById('gen-noise') as HTMLInputElement).checked = opts.generateNoise;
    // Apply preset sparseness if provided, otherwise use mode default
    const sparDefault = opts.sparseness ?? (opts.mode === 'ambient' ? 0.5 : opts.mode === 'battle' ? 0.1 : opts.mode === 'jazzy' ? 0.35 : opts.mode === 'funky' ? 0.25 : opts.mode === 'silly' ? 0.15 : opts.mode === 'weird' ? 0.40 : 0.4);
    const sparEl = document.getElementById('gen-sparseness') as HTMLInputElement;
    sparEl.value = String(sparDefault);
    document.getElementById('gen-sparseness-val')!.textContent = `${Math.round(sparDefault * 100)}%`;
    this.runGenerator();
  }

  private randomAndGenerate() {
    if (this.randomizeArchAndArp) {
      // Pick a random archetype (all archetypes — 3-note, 4-note, 6-note, 8-note)
      const archetypeValues = [
        // 3-note
        [0, 4, 0], [4, 2, 0], [0, 2, 4], [6, 3, 0], [0, 6, 4],
        // 4-note
        [0, 4, 3, 2], [0, 1, 2, 4], [4, 2, 1, 0], [0, 2, 4, 6], [0, 0, 2, 4],
        [0, 4, 0, 4], [6, 4, 0, 4], [0, 0, 0, 4], [0, 4, 2, 0], [4, 3, 2, 0],
        // 5-6-note
        [0, 2, 4, 2, 0], [0, 2, 4, 6, 4], [0, 1, 2, 3, 5], [6, 4, 0, 6, 4],
        [0, 4, 2, 6, 4], [0, 3, 1, 4, 2], [2, 1, 0, 1, 2], [4, 6, 3, 1, 0],
        [0, 2, 1, 3, 2, 4], [0, 0, 3, 2, 0], [0, 4, 4, 6, 5, 4], [0, 6, 5, 3, 2],
        [0, 4, 1, 5, 2, 6], [0, 1, 0, 6, 0], [0, 0, 4, 0, 0, 6], [0, 6, 0, 6, 0],
        [0, 1, 0, 2, 0, 3], [0, 3, 5, 2, 0, 3], [0, 6, 1, 5, 2, 4], [0, 3, 6, 3, 6, 3],
        [0, 0, 0, 0, 5, 0], [6, 4, 2, 0, 2, 4], [0, 2, 5, 4, 6, 4], [0, 2, 0, 2, 0, 4],
        [4, 3, 2, 0, 2, 4], [0, 0, 0, 4, 0, 0], [4, 3, 2, 3, 4, 3], [0, 0, 2, 0, 0, 4],
        [0, 1, 2, 1, 0, 6], [4, 4, 3, 2, 1, 0], [0, 2, 4, 2, 4, 6], [0, 4, 0, 4, 6, 4],
        [2, 4, 2, 0, 2, 4], [0, 0, 4, 0, 0, 6],
        // 8-note
        [0, 1, 2, 4, 3, 2, 1, 0], [0, 0, 4, 4, 0, 0, 6, 4], [0, 2, 4, 3, 2, 4, 6, 4],
        [0, 2, 1, 3, 2, 4, 3, 5], [0, 3, 6, 4, 2, 5, 3, 0], [0, 0, 4, 2, 0, 0, 6, 4],
      ];
      this.lockedMotif = [...archetypeValues[Math.floor(Math.random() * archetypeValues.length)]];
      // Pick a random arp style
      const arpStyles = ['auto', 'up', 'down', 'updown', 'broken', 'alberti', 'bounce', 'waltz',
        'cascading', 'pinned', 'clave', 'doubletime', 'jazzy', 'spread', 'stride', 'riff', 'spiral', 'latin', 'open5'];
      this.arpStyleOverride = arpStyles[Math.floor(Math.random() * arpStyles.length)];
      // Sync dropdowns
      const arpSel = document.getElementById('arp-style-sel') as HTMLSelectElement | null;
      if (arpSel) arpSel.value = this.arpStyleOverride;
      // Reset archetype dropdown to blank (random pick doesn't map cleanly to a named preset)
      const archSel = document.getElementById('archetype-sel') as HTMLSelectElement | null;
      if (archSel) archSel.value = '';
    }

    // Bias toward low BPM — presets under 90 bpm get 5x weight, 90-110 get 2x, 110+ get 0.5x
    const weights = GEN_PRESETS.map(p => p.bpm < 90 ? 5 : p.bpm < 110 ? 2 : 0.5);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < GEN_PRESETS.length; i++) {
      r -= weights[i];
      if (r <= 0) { this.quickGenerate(GEN_PRESETS[i]); return; }
    }
    this.quickGenerate(GEN_PRESETS[GEN_PRESETS.length - 1]);
  }

  private addMoreBars(bars = 16) {
    if (this.demoGate('Adding more bars')) return;
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

  private triggerBloopEasterEgg() {
    const DOG = [
      '  / \\__',
      ' (    @\\___',
      ' /         O',
      '/   (_____/',
      '/_____/   U',
    ];
    const RAINBOW = ['#ff4444','#ff9900','#ffee00','#44dd44','#4488ff','#9944ff','#ff44cc'];
    // Fly all cards off screen
    const cards = Array.from(document.querySelectorAll('.card, .win-toolbar, .win-menubar, .win-body > *')) as HTMLElement[];
    const cardData: {el: HTMLElement; origTransform: string; origOpacity: string}[] = [];
    cards.forEach((el, i) => {
      cardData.push({ el, origTransform: el.style.transform, origOpacity: el.style.opacity });
      const angle = (i / cards.length) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 800 + Math.random() * 400;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      const rot = (Math.random() - 0.5) * 720;
      el.style.transition = `transform 0.6s cubic-bezier(0.55,0,1,0.45) ${i * 0.04}s, opacity 0.5s ease ${i * 0.04}s`;
      el.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
      el.style.opacity = '0';
    });
    // Show dog overlay
    const overlay = document.createElement('div');
    overlay.id = 'bloop-dog-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: '99999', pointerEvents: 'none',
      flexDirection: 'column', gap: '0',
    });
    const dogDiv = document.createElement('pre');
    Object.assign(dogDiv.style, {
      fontFamily: 'monospace', fontSize: '20px', lineHeight: '1.4',
      textAlign: 'left', opacity: '0', transition: 'opacity 0.4s ease 0.5s',
      userSelect: 'none',
    });
    let frame = 0;
    const colorInterval = setInterval(() => {
      dogDiv.innerHTML = DOG.map(line =>
        [...line].map(ch => {
          const color = RAINBOW[(frame++) % RAINBOW.length];
          return `<span style="color:${color}">${ch === ' ' ? '&nbsp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch}</span>`;
        }).join('')
      ).join('\n');
      frame++;
    }, 80);
    overlay.appendChild(dogDiv);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => { dogDiv.style.opacity = '1'; });
    // Restore after 2 seconds
    setTimeout(() => {
      clearInterval(colorInterval);
      dogDiv.style.transition = 'opacity 0.3s ease';
      dogDiv.style.opacity = '0';
      cardData.forEach(({ el, origTransform }) => {
        el.style.transition = `transform 0.7s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.5s ease`;
        el.style.transform = origTransform || '';
        el.style.opacity = '';
      });
      setTimeout(() => {
        overlay.remove();
        cardData.forEach(({ el }) => { el.style.transition = ''; });
      }, 800);
    }, 2000);
  }

  private showShortcuts() {
    let tip = document.getElementById('hotkeys-tip');
    if (tip) { tip.remove(); return; }
    tip = document.createElement('div');
    tip.id = 'hotkeys-tip';
    tip.innerHTML = `
      <div style="font-weight:bold;margin-bottom:6px;font-size:11px;text-transform:uppercase;letter-spacing:1px">Keyboard Shortcuts</div>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:2px 10px 2px 0;font-weight:bold">Space</td><td>Play / Pause</td></tr>
        <tr><td style="padding:2px 10px 2px 0;font-weight:bold">R</td><td>Restart &amp; Play</td></tr>
        <tr><td style="padding:2px 10px 2px 0;font-weight:bold">F</td><td>Generate music</td></tr>
        <tr><td style="padding:2px 10px 2px 0;font-weight:bold">G</td><td>Randomize SF2 presets</td></tr>
        <tr><td style="padding:2px 10px 2px 0;font-weight:bold">X</td><td>Randomize &amp; Generate</td></tr>
        <tr><td style="padding:2px 10px 2px 0;font-weight:bold">↑ / ↓</td><td>BPM +1 / −1 (Shift ±5)</td></tr>
        <tr><td style="padding:2px 10px 2px 0;font-weight:bold">Backspace</td><td>Seek back 5 sec</td></tr>
        <tr><td style="padding:2px 10px 2px 0;font-weight:bold">Ctrl+Z</td><td>Undo</td></tr>
        <tr><td style="padding:2px 10px 2px 0;font-weight:bold">Ctrl+Y</td><td>Redo</td></tr>
      </table>
      <div style="margin-top:6px;font-size:10px;opacity:0.6">Click anywhere to close</div>
    `;
    Object.assign(tip.style, {
      position: 'fixed', top: '40px', left: '50%', transform: 'translateX(-50%)',
      background: 'var(--card-bg)', border: '1px solid var(--b-btn)',
      borderRadius: '8px', padding: '12px 16px', zIndex: '9999',
      fontFamily: 'Tahoma, Arial, sans-serif', fontSize: '12px',
      color: 'var(--txt)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      minWidth: '240px', cursor: 'pointer',
    });
    tip.addEventListener('click', () => tip!.remove());
    document.body.appendChild(tip);
    setTimeout(() => document.addEventListener('click', function h() { tip?.remove(); document.removeEventListener('click', h); }, { once: true }), 10);
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
    this.sillyPrefix = this.generateSillyPrefix();
    const el = document.getElementById('song-subtitle');
    if (el) el.textContent = this.currentSongTitle;
  }

  private generateSillyPrefix(): string {
    const WORDS = [
      'bloop','bonk','boop','wiggly','squishy','chunky','fluffy','goopy','jiggly','wobbly',
      'bouncy','lumpy','noodly','ploppy','gloopy','squelchy','funky','wriggly','sloshy','zippy',
      'snorky','doinky','blorp','zappy','chompy','flubby','warply','bibble','splorp','gonky',
      'yoinkle','blobby','twisty','gurgly','flappy','snappy','zoinky','munchie','plonky','durpy',
    ];
    return WORDS[Math.floor(Math.random() * WORDS.length)];
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
    let   bars          = parseInt((document.getElementById('gen-bars')  as HTMLInputElement).value, 10) || 32;
    const scaleRaw      = (document.getElementById('gen-scale') as HTMLSelectElement).value as ScaleType | '';
    const generateNoise = (document.getElementById('gen-noise') as HTMLInputElement).checked;

    // Demo: cap song length.
    if (IS_DEMO && bars > DEMO_MAX_BARS) bars = DEMO_MAX_BARS;

    const sparseness = parseFloat((document.getElementById('gen-sparseness') as HTMLInputElement).value);
    const channelSparseness = {
      pulse1: this.channelGenEnabled['pulse1'] === false ? 1 : (this.channelSparseValues['pulse1'] ?? 0),
      pulse2: this.channelGenEnabled['pulse2'] === false ? 1 : (this.channelSparseValues['pulse2'] ?? 0),
      wave:   this.channelGenEnabled['wave']   === false ? 1 : (this.channelSparseValues['wave']   ?? 0),
      noise:  this.channelGenEnabled['noise']  === false ? 1 : (this.channelSparseValues['noise']  ?? 0),
      // Demo: only 4 channels — pulse3 (arp) and pad never generate.
      pulse3: IS_DEMO ? 1 : (this.channelGenEnabled['pulse3'] === false ? 1 : (this.channelSparseValues['pulse3'] ?? 0)),
      pad:    IS_DEMO ? 1 : (this.channelGenEnabled['pad']    === false ? 1 : (this.channelSparseValues['pad']    ?? 0)),
      extra1: this.channelGenEnabled['extra1'] === false ? 1 : (this.channelSparseValues['extra1'] ?? 0.3),
      extra2: this.channelGenEnabled['extra2'] === false ? 1 : (this.channelSparseValues['extra2'] ?? 0.3),
      extra3: this.channelGenEnabled['extra3'] === false ? 1 : (this.channelSparseValues['extra3'] ?? 0.3),
    };
    const channelStyles = {
      pulse1: this.channelStyle['pulse1'] ?? 'auto',
      pulse2: this.channelStyle['pulse2'] ?? 'auto',
      wave:   this.channelStyle['wave']   ?? 'auto',
      noise:  this.channelStyle['noise']  ?? 'auto',
      pulse3: this.channelStyle['pulse3'] ?? 'auto',
      pad:    this.channelStyle['pad']    ?? 'auto',
    };

    // Apply steering mode overrides before building config
    let steeredScale = scaleRaw || undefined as ScaleType | undefined;
    let steeredSparseness = sparseness;
    let steeredBpm = bpm;
    let steeredChannelStyles = { ...channelStyles };
    if (this.steeringMode === 'bright') {
      // Force a bright scale if none set or a dark one is set
      const darkScales = ['minor', 'harmonicMinor', 'dorian'];
      if (!steeredScale || darkScales.includes(steeredScale)) {
        const brightScales: ScaleType[] = ['major', 'lydian', 'pentatonicMajor', 'mixolydian'];
        steeredScale = brightScales[Math.floor(Math.random() * brightScales.length)];
        (document.getElementById('gen-scale') as HTMLSelectElement).value = steeredScale;
      }
      // Nudge BPM up slightly if very slow — bright songs need some energy
      if (steeredBpm < 90) { steeredBpm = 95 + Math.floor(Math.random() * 20); }
      steeredSparseness = Math.min(steeredSparseness, 0.25);
    } else if (this.steeringMode === 'focused') {
      // Keep existing scale; sparseness moderate; nothing else — let phrase caching + signature rhythm do the work
      steeredSparseness = Math.min(steeredSparseness, 0.30);
    } else if (this.steeringMode === 'cinematic') {
      const cinematicScales: ScaleType[] = ['minor', 'harmonicMinor', 'dorian'];
      if (!steeredScale || !cinematicScales.includes(steeredScale)) {
        steeredScale = cinematicScales[Math.floor(Math.random() * cinematicScales.length)];
        (document.getElementById('gen-scale') as HTMLSelectElement).value = steeredScale;
      }
      steeredChannelStyles = { ...steeredChannelStyles, wave: 'pedal' };
      if (steeredBpm > 100) { steeredBpm = 72 + Math.floor(Math.random() * 24); }
      steeredSparseness = Math.max(steeredSparseness, 0.35);
      (document.getElementById('gen-noise') as HTMLInputElement).checked = false;
    } else if (this.steeringMode === 'lush') {
      // Warm cozy: major/lydian, heavy pad, legato gate, moderate BPM, no drums
      const lushScales: ScaleType[] = ['major', 'lydian', 'pentatonicMajor'];
      if (!steeredScale || ['minor','harmonicMinor'].includes(steeredScale)) {
        steeredScale = lushScales[Math.floor(Math.random() * lushScales.length)];
        (document.getElementById('gen-scale') as HTMLSelectElement).value = steeredScale;
      }
      if (steeredBpm > 105) { steeredBpm = 80 + Math.floor(Math.random() * 26); }
      steeredSparseness = Math.min(steeredSparseness, 0.20);
      steeredChannelStyles = { ...steeredChannelStyles, pad: 'pad', wave: 'pedal' };
      (document.getElementById('gen-noise') as HTMLInputElement).checked = false;
    } else if (this.steeringMode === 'punchy') {
      // Tight energetic: mid/battle mode, low sparseness, no pad
      if (this.genMode === 'ambient') this.genMode = 'mid';
      if (steeredBpm < 110) { steeredBpm = 120 + Math.floor(Math.random() * 40); }
      steeredSparseness = Math.min(steeredSparseness, 0.10);
      // Suppress pad so staccato lead sits clean
      steeredChannelStyles = { ...steeredChannelStyles };
      (document.getElementById('gen-noise') as HTMLInputElement).checked = true;
    } else if (this.steeringMode === 'lofi') {
      // Sad intimate: dorian/pentatonicMinor, slow, very sparse, no drums
      const lofiScales: ScaleType[] = ['dorian', 'pentatonicMinor', 'minor'];
      if (!steeredScale || !lofiScales.includes(steeredScale)) {
        steeredScale = lofiScales[Math.floor(Math.random() * lofiScales.length)];
        (document.getElementById('gen-scale') as HTMLSelectElement).value = steeredScale;
      }
      if (steeredBpm > 85) { steeredBpm = 60 + Math.floor(Math.random() * 26); }
      steeredSparseness = Math.max(steeredSparseness, 0.50);
      (document.getElementById('gen-noise') as HTMLInputElement).checked = false;
    }

    const config: GenConfig = { mode: this.genMode, key, octave: 4, bars, bpm: steeredBpm, scaleType: steeredScale, generateNoise: this.steeringMode === 'cinematic' ? false : generateNoise, sparseness: steeredSparseness, channelSparseness, channelStyles: steeredChannelStyles, motifSeed: this.lockedMotif.length > 0 ? [...this.lockedMotif] : undefined, arpStyle: this.arpStyleOverride,
      extraChannelRoles: Object.fromEntries(
        (['extra1','extra2','extra3'] as ChannelId[])
          .filter(id => this.activeExtraChannels.has(id))
          .map(id => [id, this.extraChannelRoles[id] ?? 'arp'])
      ) as { extra1?: string; extra2?: string; extra3?: string },
    };
    this.lastGenConfig = config;
    this.setStatus('busy', `Generating ${bars} bars...`);

    setTimeout(() => {
      try {
        this.pushHistory();
        const result = generate(config);
        this.applyResult(result.channels, result.duration, result.bpm);
        // Apply energy curve scaling
        if (this.energyCurve.length === 20) {
          const barDur = (60 / result.bpm) * 4;
          for (const id of CHANNELS) {
            this.state.channels[id].notes = this.state.channels[id].notes.map(n => {
              const barIdx = Math.floor(n.time / barDur);
              const mult = this.getEnergyMultiplier(barIdx, bars);
              return { ...n, velocity: Math.max(1, Math.min(127, Math.round(n.velocity * mult))) };
            });
          }
        }
        if ((document.getElementById('auto-humanize') as HTMLInputElement).checked) {
          this.applyHumanize();
        }
        this.state.inputType = 'generated';
        this.lastSeed = result.seed;
        this.lastMotifIntervals = result.motifIntervals;
        this.updateInspector();
        this.updateSongTitle();
        const metricTag = result.metricMod ? ' — 2× chorus' : '';
        this.setStatus('ok', `Generated! ${bars} bars — ${NOTE_NAMES[key]} — ${Math.round(result.bpm)} BPM — seed: ${result.seed}${metricTag}`);
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
    // Force all other channels maximally sparse so only the target channel generates.
    // Pass the original seed so chord progressions, motif shape, and arrangement
    // are identical to the original song — only the target channel's notes differ.
    const channelSparseness = {
      pulse1: id === 'pulse1' ? chSparse : 1,
      pulse2: id === 'pulse2' ? chSparse : 1,
      wave:   id === 'wave'   ? chSparse : 1,
      noise:  id === 'noise'  ? chSparse : 1,
      pulse3: id === 'pulse3' ? chSparse : 1,
      pad:    id === 'pad'    ? chSparse : 1,
    };
    const result = generate({ ...this.lastGenConfig, bars, sparseness: 0, channelSparseness, seed: this.lastSeed });
    this.state.channels[id].notes = result.channels[id];
    this.drawPianoRoll(id, this.currentTime);
    const c = result.channels[id].length;
    if (this.noteCountEls[id]) this.noteCountEls[id].textContent = `${c} note${c !== 1 ? 's' : ''}`;
    this.setStatus('ok', `Regenned ${id} — same key, scale, and progressions as the original song`);
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

  // ── Simplify channel ──────────────────────────────────────────

  private simplifyChannel(id: ChannelId) {
    const notes = this.state.channels[id].notes;
    if (notes.length === 0) return;
    this.pushHistory();

    const beatDur = 60 / this.state.bpm;
    const shortThreshold = beatDur * 0.42; // notes shorter than ~dotted-8th are "fast"
    const sorted = [...notes].sort((a, b) => a.time - b.time);
    const result: NoteEvent[] = [];
    let i = 0;

    while (i < sorted.length) {
      const note = sorted[i];

      // Detect a run: 3+ consecutive short notes with tiny gaps between them
      if (note.duration < shortThreshold) {
        let runEnd = i;
        while (runEnd + 1 < sorted.length) {
          const gap = sorted[runEnd + 1].time - (sorted[runEnd].time + sorted[runEnd].duration);
          if (sorted[runEnd + 1].duration < shortThreshold && gap < beatDur * 0.18) {
            runEnd++;
          } else break;
        }

        const runLen = runEnd - i + 1;
        if (runLen >= 3) {
          // Keep roughly every other note; always keep the first (musical anchor)
          const runNotes = sorted.slice(i, runEnd + 1);
          const spanEnd  = runNotes[runLen - 1].time + runNotes[runLen - 1].duration;
          const spanStart = runNotes[0].time;
          const keepIdx: number[] = [];
          for (let k = 0; k < runLen; k += 2) keepIdx.push(k);
          // Distribute the span evenly across kept notes
          const slotDur = (spanEnd - spanStart) / keepIdx.length;
          for (let k = 0; k < keepIdx.length; k++) {
            const orig = runNotes[keepIdx[k]];
            result.push({
              ...orig,
              time:     spanStart + k * slotDur,
              duration: slotDur * 0.80,
            });
          }
          i = runEnd + 1;
          continue;
        }
      }

      result.push(note);
      i++;
    }

    // Breathe pass: add a small gap before notes that are back-to-back
    const breathed = result.map((note, idx) => {
      if (idx === 0) return note;
      const prev = result[idx - 1];
      const gap = note.time - (prev.time + prev.duration);
      if (gap < 0.02 && prev.duration > beatDur * 0.3) {
        return { ...prev, duration: Math.max(prev.duration * 0.78, beatDur * 0.15) };
      }
      return note;
    });

    this.state.channels[id].notes = breathed.sort((a, b) => a.time - b.time);
    this.updateAllCanvases();
    this.updateNoteCountBadges();
    this.setStatus('ok', `Simplified ${id} — thinned fast runs and added breathing room.`);
  }

  // ── Per-channel post-gen operations ───────────────────────────

  private channelVelocityShift(id: ChannelId, delta: number, label: string) {
    const notes = this.state.channels[id].notes;
    if (notes.length === 0) return;
    this.pushHistory();
    this.state.channels[id].notes = notes.map(n => ({
      ...n, velocity: Math.max(1, Math.min(127, n.velocity + delta)),
    }));
    this.updateAllCanvases();
    this.setStatus('ok', `${label} ${id}`);
  }

  private channelGate(id: ChannelId, gateRatio: number, label: string) {
    const notes = this.state.channels[id].notes;
    if (notes.length === 0) return;
    this.pushHistory();
    const beatDur = 60 / this.state.bpm;
    this.state.channels[id].notes = notes.map(n => {
      // Gate is relative to the note's own spacing — keep at least 0.03s
      const nextNoteGap = beatDur * 0.5; // approximate available space
      return { ...n, duration: Math.max(0.03, Math.min(n.duration, nextNoteGap) * gateRatio) };
    });
    this.updateAllCanvases();
    this.setStatus('ok', `${label} applied to ${id}`);
  }

  private channelOctave(id: ChannelId, semitones: number) {
    const notes = this.state.channels[id].notes;
    if (notes.length === 0) return;
    this.pushHistory();
    this.state.channels[id].notes = notes.map(n => ({
      ...n, midi: Math.max(0, Math.min(127, n.midi + semitones)),
    }));
    this.updateAllCanvases();
    this.setStatus('ok', `${id} shifted ${semitones > 0 ? 'up' : 'down'} one octave`);
  }

  private harmonizeChannel(id: ChannelId) {
    const notes = this.state.channels[id].notes;
    if (notes.length === 0) return;
    this.pushHistory();
    const harmony: NoteEvent[] = notes.map(n => ({
      ...n,
      midi: Math.max(0, Math.min(127, n.midi - 4)), // minor 3rd below
      velocity: Math.max(1, n.velocity - 15),
    }));
    this.state.channels[id].notes = [...notes, ...harmony].sort((a, b) => a.time - b.time);
    this.updateAllCanvases();
    this.updateNoteCountBadges();
    this.setStatus('ok', `Harmonized ${id} — added scale-third below each note`);
  }

  private retrogradeChannel(id: ChannelId) {
    const notes = this.state.channels[id].notes;
    if (notes.length === 0) return;
    this.pushHistory();
    const sorted = [...notes].sort((a, b) => a.time - b.time);
    const totalDur = sorted[sorted.length - 1].time + sorted[sorted.length - 1].duration;
    // Mirror each note's time around the midpoint
    this.state.channels[id].notes = sorted
      .map(n => ({ ...n, time: totalDur - n.time - n.duration }))
      .sort((a, b) => a.time - b.time);
    this.updateAllCanvases();
    this.setStatus('ok', `Retrograded ${id} — note order reversed in time`);
  }

  // ── Global post-gen operations ─────────────────────────────────

  private globalSwing() {
    const hasNotes = CHANNELS.some(id => this.state.channels[id].notes.length > 0);
    if (!hasNotes) return;
    this.pushHistory();
    const beatDur = 60 / this.state.bpm;
    const eighth = beatDur * 0.5;
    const swingMs = 0.030;
    // Toggle: if swing is on, reverse it (subtract offset); if off, apply it (add offset)
    const delta = this.swingActive ? -swingMs : swingMs;
    this.swingActive = !this.swingActive;
    for (const id of CHANNELS) {
      this.state.channels[id].notes = this.state.channels[id].notes.map(n => {
        const eighthPos = Math.round(n.time / eighth);
        if (eighthPos % 2 === 1) return { ...n, time: Math.max(0, n.time + delta) };
        return n;
      });
    }
    this.updateAllCanvases();
    this.setStatus('ok', this.swingActive ? 'Swing ON — off-beat notes shifted +30ms' : 'Swing OFF — timing restored');
  }

  private globalCompress() {
    const hasNotes = CHANNELS.some(id => this.state.channels[id].notes.length > 0);
    if (!hasNotes) return;
    this.pushHistory();
    for (const id of CHANNELS) {
      const notes = this.state.channels[id].notes;
      if (notes.length === 0) continue;
      const velocities = notes.map(n => n.velocity);
      const avg = velocities.reduce((a, b) => a + b, 0) / velocities.length;
      // Pull each note 40% toward the average velocity
      this.state.channels[id].notes = notes.map(n => ({
        ...n, velocity: Math.max(1, Math.min(127, Math.round(n.velocity + (avg - n.velocity) * 0.4))),
      }));
    }
    this.updateAllCanvases();
    this.setStatus('ok', 'Compressed — velocities narrowed toward average');
  }

  private globalSwell() {
    const hasNotes = CHANNELS.some(id => this.state.channels[id].notes.length > 0);
    if (!hasNotes) return;
    this.pushHistory();
    const totalDur = this.state.duration || 1;
    for (const id of CHANNELS) {
      this.state.channels[id].notes = this.state.channels[id].notes.map(n => {
        const progress = n.time / totalDur; // 0 = start, 1 = end
        // Scale velocity: start at 60% of original, end at 115%
        const multiplier = 0.60 + progress * 0.55;
        return { ...n, velocity: Math.max(1, Math.min(127, Math.round(n.velocity * multiplier))) };
      });
    }
    this.updateAllCanvases();
    this.setStatus('ok', 'Swell applied — quiet start, loud end');
  }

  private globalTimeStretch(factor: number, label: string) {
    const hasNotes = CHANNELS.some(id => this.state.channels[id].notes.length > 0);
    if (!hasNotes) return;
    this.pushHistory();
    for (const id of CHANNELS) {
      this.state.channels[id].notes = this.state.channels[id].notes.map(n => ({
        ...n,
        time:     n.time * factor,
        duration: n.duration * factor,
      }));
    }
    this.state.duration = this.state.duration * factor;
    if (this.seekSlider) this.seekSlider.max = String(this.state.duration);
    this.scheduler?.extendDuration(this.state.duration);
    this.updateAllCanvases();
    this.setStatus('ok', `${label} — all timings ${factor < 1 ? 'halved' : 'doubled'}`);
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
    if (this.demoGate('Importing MIDI')) return;
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

      // Full version: append to the loaded fonts list. Demo: only 1 font at a time,
      // so replace any existing font instead of stacking them.
      if (IS_DEMO) this.loadedSF2s = [{ name: file.name, sf2 }];
      else this.loadedSF2s.push({ name: file.name, sf2 });
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
    if (!sel) return;
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
    if (this.loadedSF2s.length === 0) { this.setStatus('err', 'Load an SF2 soundfont first!'); return; }
    for (const id of CHANNELS) {
      // Pick a random SF2 for this channel
      const sf2Idx = Math.floor(Math.random() * this.loadedSF2s.length);
      const { sf2 } = this.loadedSF2s[sf2Idx];

      // Always update SF2 index, sampler, selector, and the sf2-src dropdown
      this.channelSF2Idx[id] = sf2Idx;
      this.sampler?.setChannelSF2(id, sf2Idx);
      const sf2SrcEl = document.getElementById(`sf2-src-${id}`) as HTMLSelectElement | null;
      if (sf2SrcEl) sf2SrcEl.value = String(sf2Idx);

      // Rebuild instrument list for this SF2
      this.updateChannelInstrumentSelector(id);

      // For noise: prefer drum bank
      const chSel = this.selects[id];
      if (!chSel) continue;
      if (id === 'noise') {
        const drumIdx = sf2.presets.findIndex(p => p.bank === 128);
        if (drumIdx >= 0) { chSel.value = String(drumIdx); this.state.channels[id].presetIndex = drumIdx; continue; }
      }
      const melodicPresets = sf2.presets.map((p, i) => ({ p, i })).filter(x => x.p.bank !== 128);
      if (melodicPresets.length > 0) {
        const pick = melodicPresets[Math.floor(Math.random() * melodicPresets.length)];
        chSel.value = String(pick.i);
        this.state.channels[id].presetIndex = pick.i;
      }
    }
    // Update SF2 list pickers
    this.updateSF2List();
    const names = [...new Set(Object.values(this.channelSF2Idx).map(i => this.loadedSF2s[i ?? 0]?.name.replace(/\.sf2$/i,'') ?? ''))].join(', ');
    this.setStatus('ok', `Randomized all channels — fonts: ${names}`);
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
    // Reset swing toggle state when a new song is generated
    if (this.swingActive) {
      this.swingActive = false;
      const swingBtn = document.getElementById('global-swing') as HTMLButtonElement | null;
      if (swingBtn) {
        swingBtn.style.opacity   = '0.55';
        swingBtn.style.outline   = 'none';
        swingBtn.style.background = '';
      }
    }
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

    this.scheduler.loop = this.loopEnabled;
    this.scheduler.onLoop = () => {
      this.currentTime = 0;
      this.seekSlider.value = '0';
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

    if (this.lastGenConfig) {
      this.scheduler.onNearEnd = () => {
        if (this.loopEnabled) return;  // loop mode handles the end
        if (!this.lastGenConfig) return;
        try {
          // bars:8 keeps totalPhrases<=2, forcing all bars to 'chorus' activity
          // — avoids intro/outro silence gaps that make infinite mode feel broken
          const extra = generate({ ...this.lastGenConfig, bars: 8 });
          const offset = this.state.duration;
          for (const id of CHANNELS) {
            const shifted = extra.channels[id].map(n => ({ ...n, time: n.time + offset }));
            this.state.channels[id].notes.push(...shifted);
          }
          this.state.duration += extra.duration;
          this.seekSlider.max = String(this.state.duration);
          this.scheduler?.extendDuration(this.state.duration);
        } catch (e) {
          console.error('Infinite mode extension error:', e);
          this.scheduler?.extendDuration(this.state.duration + 30);
        }
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
          document.getElementById(`row-${ch}`)?.classList.toggle('muted', this.preSoloMutes[ch]);
          this.muteBtns[ch]?.classList.toggle('active', this.preSoloMutes[ch]);
          if (this.muteBtns[ch]) this.muteBtns[ch].textContent = this.preSoloMutes[ch] ? 'UNMUTE' : 'MUTE';
        }
        this.preSoloMutes = null;
      }
      this.soloBtns[id]?.classList.remove('active');
    } else {
      this.preSoloMutes = {} as Record<ChannelId, boolean>;
      for (const ch of CHANNELS) this.preSoloMutes[ch] = this.state.channels[ch].muted;
      if (this.soloedChannel) this.soloBtns[this.soloedChannel]?.classList.remove('active');
      this.soloedChannel = id;
      for (const ch of CHANNELS) {
        const shouldMute = ch !== id;
        this.state.channels[ch].muted = shouldMute;
        document.getElementById(`row-${ch}`)?.classList.toggle('muted', shouldMute);
        this.muteBtns[ch]?.classList.toggle('active', shouldMute);
        if (this.muteBtns[ch]) this.muteBtns[ch].textContent = shouldMute ? 'UNMUTE' : 'MUTE';
      }
      this.soloBtns[id]?.classList.add('active');
    }
  }

  // ── Export ────────────────────────────────────────────────────

  private runDownload() {
    if (this.demoGate('MIDI export')) return;
    const total = CHANNELS.reduce((s, id) => s + this.state.channels[id].notes.length, 0);
    if (total === 0) { this.setStatus('err', 'Nothing to export yet!'); return; }
    try {
      const keyName = NOTE_NAMES[parseInt((document.getElementById('gen-key') as HTMLInputElement).value, 10)] || 'C';
      const bpm = Math.round(this.state.bpm);
      const customName = (document.getElementById('export-name') as HTMLInputElement)?.value.trim();
      const baseName = customName || `${this.sillyPrefix}_${bpm}bpm_${keyName}`;
      downloadMIDI(buildMIDI(this.state.channels, this.state.bpm, this.channelVolValues), `${baseName}.mid`);
      this.exportSF2Info(baseName);
      this.setStatus('ok', 'MIDI + SF2 info exported!');
    } catch (err) { this.setStatus('err', `Export failed: ${(err as Error).message}`); }
  }

  private exportSF2Info(baseName = 'bloop_session') {
    const NOTE_NAMES_FULL = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const keyVal = parseInt((document.getElementById('gen-key') as HTMLInputElement)?.value ?? '0', 10);
    const keyName = NOTE_NAMES_FULL[keyVal] ?? 'C';
    const bpm = Math.round(this.state.bpm);
    const mode = (document.getElementById('gen-mode') as HTMLSelectElement)?.value ?? '—';
    const scale = (document.getElementById('gen-scale') as HTMLSelectElement)?.value ?? '—';
    const bars = (document.getElementById('gen-bars') as HTMLInputElement)?.value ?? '—';
    const now = new Date().toLocaleString();

    const CHANNEL_LABELS: Record<string, string> = {
      pulse1: 'Lead Melody',
      pulse2: 'Harmony / Accomp',
      wave:   'Bass',
      noise:  'Drums',
      pulse3: 'Arpeggio / Counter',
      pad:    'Pad',
    };

    const lines: string[] = [
      'bloop-maker session info',
      `Generated : ${now}`,
      `BPM       : ${bpm}`,
      `Key       : ${keyName}`,
      `Mode      : ${mode}`,
      `Scale     : ${scale}`,
      `Bars      : ${bars}`,
      `Seed      : ${this.lastSeed || '—'}`,
      '',
      'Channel Assignments',
      '─'.repeat(72),
      `${'Channel'.padEnd(8)} │ ${'Role'.padEnd(20)} │ ${'SF2 File'.padEnd(22)} │ ${'Preset'.padEnd(24)} │ Idx`,
      '─'.repeat(72),
    ];

    for (const id of CHANNELS) {
      const sfIdx    = this.channelSF2Idx[id] ?? 0;
      const sfName   = this.loadedSF2s[sfIdx]?.name ?? '(no SF2)';
      const sel      = this.selects[id];
      const preset   = sel?.selectedOptions[0]?.text ?? '—';
      const pIdx     = this.state.channels[id]?.presetIndex ?? 0;
      const role     = CHANNEL_LABELS[id] ?? id;
      const noteCount = this.state.channels[id]?.notes.length ?? 0;
      const activeTag = noteCount > 0 ? '' : ' (silent)';
      lines.push(
        `${id.padEnd(8)} │ ${role.padEnd(20)} │ ${sfName.padEnd(22)} │ ${preset.padEnd(24)} │ ${pIdx}${activeTag}`
      );
    }

    lines.push('─'.repeat(72));

    if (this.loadedSF2s.length > 1) {
      lines.push('');
      lines.push('Loaded Soundfonts');
      this.loadedSF2s.forEach((sf, i) => lines.push(`  [${i}] ${sf.name}`));
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${baseName}_info.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  private exportChannel(id: ChannelId) {
    if (this.demoGate('Channel MIDI export')) return;
    const ch = this.state.channels[id];
    if (ch.notes.length === 0) { this.setStatus('err', `${id} has no notes!`); return; }
    try {
      downloadMIDI(buildSingleChannelMIDI(id, ch, this.state.bpm), `bloopmaker_${id}_${Date.now()}.mid`);
      this.setStatus('ok', `Exported ${id} track!`);
    } catch (err) { this.setStatus('err', `Export failed: ${(err as Error).message}`); }
  }

  private async runWAVExport() {
    if (this.demoGate('WAV export')) return;
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
      const customName = (document.getElementById('export-name') as HTMLInputElement)?.value.trim();
      const exportFilename = (customName || `${this.sillyPrefix}_${bpm}bpm_${keyName}`) + '.wav';
      await exportWAV(this.state, channelVols, channelPans, masterVol, reverbWet, reverbDecay, pct => {
        this.progressFill.style.width = `${Math.round(pct * 100)}%`;
      }, sf2List, this.channelSF2Idx, exportFilename);
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
    const timeData = new Uint8Array(this.oscAnalyser.fftSize);
    const freqData = new Uint8Array(bufLen);

    // ASCII creatures that bounce to the music
    const CHARS = this.vizCharPool.length > 0 ? this.vizCharPool : ASCII_POOLS[0];
    const NUM = Math.min(CHARS.length, 10);
    type Creature = { x: number; vx: number; charIdx: number; bobPhase: number; bobSpeed: number; };
    const creatures: Creature[] = Array.from({ length: NUM }, (_, i) => ({
      x: (i / NUM) * W + W / NUM / 2,
      vx: (Math.random() - 0.5) * 0.4,
      charIdx: i % CHARS.length,
      bobPhase: Math.random() * Math.PI * 2,
      bobSpeed: 0.04 + Math.random() * 0.03,
    }));
    let t = 0;

    const draw = () => {
      this.matrixRafId = requestAnimationFrame(draw);
      t++;
      this.oscAnalyser!.getByteFrequencyData(freqData);
      this.oscAnalyser!.getByteTimeDomainData(timeData);

      // Overall amplitude (0–1)
      let sum = 0;
      for (let i = 0; i < timeData.length; i++) sum += Math.abs(timeData[i] - 128);
      const amp = Math.min(1, (sum / timeData.length) / 40);

      // Per-creature frequency band (spread creatures across freq spectrum)
      ctx.clearRect(0, 0, W, H);

      // Slowly cycle big ASCII art in the background
      const artIdx = Math.floor(t / 420) % ASCII_ART_BIG.length;
      const artLines = ASCII_ART_BIG[artIdx];
      const artFade = Math.sin((t % 420) / 420 * Math.PI) * 0.18;
      if (artFade > 0.01) {
        const sc = VIZ_SCHEMES[this.vizColorIdx];
        const [ar, ag, ab] = sc.r < 0 ? [80, 160, 255] : [sc.r, sc.g, sc.b];
        ctx.font = '9px monospace';
        ctx.textBaseline = 'top';
        artLines.forEach((line, li) => {
          ctx.fillStyle = `rgba(${ar},${ag},${ab},${artFade})`;
          ctx.fillText(line, W / 2 - ctx.measureText(line).width / 2, li * 11 + (H - artLines.length * 11) / 2);
        });
      }

      for (let ci = 0; ci < creatures.length; ci++) {
        const c = creatures[ci];

        // Each creature listens to its own freq band
        const binStart = Math.floor((ci / NUM) * bufLen * 0.6);
        const binEnd   = Math.floor(((ci + 1) / NUM) * bufLen * 0.6);
        let bandSum = 0;
        for (let b = binStart; b < binEnd; b++) bandSum += freqData[b];
        const bandAmp = Math.min(1, (bandSum / ((binEnd - binStart) * 255)) * 3.5);

        // Move and bounce off walls
        c.x += c.vx * (1 + bandAmp * 3);
        if (c.x < 20) { c.x = 20; c.vx = Math.abs(c.vx); }
        if (c.x > W - 20) { c.x = W - 20; c.vx = -Math.abs(c.vx); }

        // Bob up and down with the beat
        c.bobPhase += c.bobSpeed + amp * 0.12;
        const bob = Math.sin(c.bobPhase) * (6 + bandAmp * 18);
        const y = H / 2 + bob;

        // Size pulses with its band amplitude
        const fontSize = Math.round(11 + bandAmp * 14);
        const alpha = 0.55 + bandAmp * 0.45;
        const scheme = VIZ_SCHEMES[this.vizColorIdx];
        let cr: number, cg: number, cb: number;
        if (scheme.r < 0) {
          // Rainbow: cycle hue per creature + time
          const hue = ((ci / NUM) * 360 + t * 0.5) % 360;
          const [hr, hg, hb] = hslToRgb(hue / 360, 1, 0.55 + bandAmp * 0.25);
          cr = hr; cg = hg; cb = hb;
        } else {
          const lo = 0.45, hi = 1.0;
          cr = Math.round(scheme.r * (lo + bandAmp * (hi - lo)));
          cg = Math.round(scheme.g * (lo + bandAmp * (hi - lo)));
          cb = Math.round(scheme.b * (lo + bandAmp * (hi - lo)));
        }
        ctx.font = `${fontSize}px monospace`;
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(CHARS[c.charIdx % CHARS.length], c.x, y);

        // Tiny sparkle on loud hits
        if (bandAmp > 0.7) {
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${bandAmp - 0.4})`;
          ctx.font = `${Math.round(fontSize * 0.55)}px monospace`;
          ctx.fillText('✦', c.x + fontSize * 0.8, y - fontSize * 0.7);
        }
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

    const CHARS = this.vizCharPool.length > 0 ? this.vizCharPool : ASCII_POOLS[0];
    type IdleCreature = { x: number; y: number; vx: number; charIdx: number; phase: number; };
    const creatures: IdleCreature[] = Array.from({ length: 7 }, (_, i) => ({
      x: (i / 7) * W, y: H / 2, vx: 0.18 + Math.random() * 0.12,
      charIdx: i % CHARS.length, phase: (i / 7) * Math.PI * 2,
    }));
    let t = 0;

    const draw = () => {
      this.matrixRafId = requestAnimationFrame(draw);
      t++;
      ctx.clearRect(0, 0, W, H);

      // Big art cycles slowly in idle
      const artIdx = Math.floor(t / 360) % ASCII_ART_BIG.length;
      const artLines = ASCII_ART_BIG[artIdx];
      const artFade = Math.sin((t % 360) / 360 * Math.PI) * 0.14;
      if (artFade > 0.01) {
        const sc = VIZ_SCHEMES[this.vizColorIdx];
        const [ar, ag, ab] = sc.r < 0 ? [80, 160, 255] : [sc.r, sc.g, sc.b];
        ctx.font = '9px monospace'; ctx.textBaseline = 'top';
        artLines.forEach((line, li) => {
          ctx.fillStyle = `rgba(${ar},${ag},${ab},${artFade})`;
          ctx.fillText(line, W / 2 - ctx.measureText(line).width / 2, li * 11 + (H - artLines.length * 11) / 2);
        });
      }

      for (const c of creatures) {
        c.x = (c.x + c.vx + W) % W;
        c.phase += 0.025;
        const y = H / 2 + Math.sin(c.phase) * 10;
        const sc = VIZ_SCHEMES[this.vizColorIdx];
        const pulse = 0.4 + Math.sin(c.phase) * 0.12;
        const [ir, ig, ib] = sc.r < 0 ? [80, 180, 255] : [Math.round(sc.r * pulse), Math.round(sc.g * pulse), Math.round(sc.b * pulse)];
        ctx.font = '11px monospace';
        ctx.fillStyle = `rgba(${ir},${ig},${ib},0.55)`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(CHARS[c.charIdx % CHARS.length], c.x, y);
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
      // Extra channels (extra1-3) only have a row/badge when active, so the element
      // may not exist — guard against null instead of crashing the generator.
      const el = this.noteCountEls[id];
      if (el) el.textContent = `${c} note${c !== 1 ? 's' : ''}`;
    }
  }

  private setStatus(type: 'ok' | 'busy' | 'err', text: string) {
    this.statusEl.className  = `win-status ${type}`;
    this.statusPanel.textContent = text;
  }

  // ── Demo gating helpers ───────────────────────────────────────

  // The channels visible/usable in this build (4 in the demo, all in full).
  private visibleChannelIds(): ChannelId[] {
    if (IS_DEMO) return CHANNELS.filter(id => DEMO_CHANNELS.includes(id));
    return CHANNELS.filter(id => !['extra1','extra2','extra3'].includes(id) || this.activeExtraChannels.has(id));
  }

  // Call at the top of a gated action. Returns true (and shows an upgrade prompt)
  // if this is the demo build, meaning the caller should stop.
  private demoGate(actionLabel: string): boolean {
    if (!IS_DEMO) return false;
    this.setStatus('err', `${actionLabel} is available in the full version of Bloop Maker — get it at ${FULL_VERSION_URL.replace(/^https?:\/\//, '')}`);
    return true;
  }

  // In the demo, trim the arp + archetype dropdowns to the allowed subsets and
  // cap the bars input. Runs once after the UI is built.
  private applyDemoLimits() {
    if (!IS_DEMO) return;

    const trimSelect = (id: string, allowed: Set<string>, keepEmpty: boolean) => {
      const sel = document.getElementById(id) as HTMLSelectElement | null;
      if (!sel) return;
      sel.querySelectorAll('option').forEach(opt => {
        if (keepEmpty && opt.value === '') return;
        if (!allowed.has(opt.value)) opt.remove();
      });
      // Drop any optgroups left empty after trimming.
      sel.querySelectorAll('optgroup').forEach(g => {
        if (g.querySelectorAll('option').length === 0) g.remove();
      });
    };
    trimSelect('arp-style-sel', DEMO_ARP_STYLES, false);
    trimSelect('archetype-sel', DEMO_ARCHETYPES, true);

    // Cap the bars input.
    const barsEl = document.getElementById('gen-bars') as HTMLInputElement | null;
    if (barsEl) {
      barsEl.max = String(DEMO_MAX_BARS);
      if (parseInt(barsEl.value, 10) > DEMO_MAX_BARS) barsEl.value = String(DEMO_MAX_BARS);
      barsEl.title = `Demo limited to ${DEMO_MAX_BARS} bars`;
    }

    // Hide the full-version-only steer buttons.
    for (const id of ['steer-lush', 'steer-punchy', 'steer-lofi']) {
      const btn = document.getElementById(id);
      if (btn && !DEMO_STEER_MODES.has(id.replace('steer-', ''))) btn.style.display = 'none';
    }

    // Hide the WAV export button entirely (paid feature).
    if (this.wavBtn) this.wavBtn.style.display = 'none';
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
      if (this.regenBtns[id])    this.regenBtns[id].disabled    = !canRegen;
      if (this.exportChBtns[id]) this.exportChBtns[id].disabled = !hasNotes;
      const chHasNotes = this.state.channels[id].notes.length > 0;
      for (const name of ['simplify','ghost','boost','staccato','legato','harmonize','retrograde','oct-up','oct-dn']) {
        const btn = document.getElementById(`${name}-${id}`) as HTMLButtonElement | null;
        if (btn) btn.disabled = !chHasNotes;
      }
    }
    // Enable global post-gen buttons when any notes exist
    for (const name of ['global-swing','global-compress','global-swell','global-doubletime','global-halftime']) {
      const btn = document.getElementById(name) as HTMLButtonElement | null;
      if (btn) btn.disabled = !hasNotes;
    }
  }
}

const appEl = document.getElementById('app');
if (!appEl) throw new Error('No #app element');
new App(appEl);
