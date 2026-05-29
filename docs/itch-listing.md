# Bloop Maker — itch.io Listing Kit

Everything you need to fill in the itch.io "Create new project" page. Copy-paste each
section into the matching field. Price: **$12.99 USD**.

---

## Project settings (top of the create page)

| Field | What to enter |
|-------|---------------|
| **Title** | `Bloop Maker` |
| **Project URL** | `bloop-maker` (so it becomes snckpck.itch.io/bloop-maker) |
| **Short description / tagline** | `Make original game music with zero copyright risk. No AI — just music theory in code. Runs offline.` |
| **Classification** | **Tools** (not "Game") |
| **Kind of project** | **Downloadable** |
| **Release status** | Released |
| **Pricing** | **Paid** — `$12.99` minimum (optionally allow "pay more if you want") |

---

## Short description (the tagline field, ~140 char limit)

```
Make original game music with zero copyright risk. No AI — just music theory in code. Runs offline. Exports MIDI + WAV.
```

---

## Full description (the big body field)

> **The MIDI music generator for people who can't risk AI.**
>
> Bloop Maker creates original chiptune and video game music right on your machine — no AI, no samples, no copyright headaches. Every song is generated from scratch by music theory rules written in code, the same way a game procedurally builds a level. The music is yours, free and clear.
>
> Perfect for **indie game developers**, **streamers**, **YouTubers**, and **game jams** who need original background music *now* and can't afford a takedown or a "was this AI?" rejection.
>
> ---
>
> **✦ No AI. No copyright risk.**
> Music is built by deterministic code — chord progressions, melody logic, motif repetition, drum patterns. No machine learning, no training data, nothing scraped. Use it in commercial games, monetized videos, and live streams without worrying.
>
> **✦ Actually a composer, not a toy.**
> Six independent channels. A full piano-roll editor. 50+ melodic archetypes, 28 arpeggio styles, six "steering" modes that push a song bright, dark, cozy, punchy, cinematic, or lo-fi. This isn't a one-button loop maker — it's a studio.
>
> **✦ Hear it, shape it, own it.**
> Generate a song, then sculpt it: simplify a part, swing the groove, add harmony, reverse a phrase, swell the dynamics. Regenerate any single channel while everything else stays locked. When it's right, export.
>
> **✦ Real export.**
> Save standard **MIDI** files that open in any DAW (FL Studio, Ableton, LMMS, Reaper…), or render straight to **WAV** audio using your own soundfonts.
>
> **✦ Runs 100% offline.**
> No account. No subscription. No internet after download. Your work never leaves your computer.
>
> ---
>
> **What you get**
> - Desktop app for **Windows, macOS, and Linux**
> - Unlimited song generation — no usage caps, no credits
> - Full piano-roll note editing
> - MIDI + WAV export
> - SoundFont (.sf2) support — bring any instrument set
> - Deterministic seeds: share a seed, get the exact same song
> - Free updates
>
> ---
>
> **Quick start**
> 1. Open Bloop Maker
> 2. Drag in a free SoundFont (.sf2) to hear audio — or skip it and export MIDI silently
> 3. Pick a mode, hit **Generate**
> 4. Shape it, then **Save MIDI** or **Save WAV**
>
> ---
>
> **Note on installation:** Builds are not code-signed (signing certificates are expensive for a solo dev). On macOS, right-click the app → **Open**. On Windows, click **More info → Run anyway**. This is normal for indie tools — the app is completely safe and runs entirely offline.
>
> ---
>
> *One-time purchase. Yours forever. No AI, no subscriptions, no nonsense.*

---

## Tags (itch allows up to 10 — use these)

```
music
midi
chiptune
generator
music-maker
gamedev
tool
procedural-generation
8-bit
composer
```

> In the **"Made with"** field (optional): you can leave blank or write "TypeScript, Electron".
> In **"Genre"**: there isn't a great fit for tools — leave it on "No genre" or "Other".

---

## Upload files (drag these into the Uploads section)

From your GitHub Release (or local build), upload and tag each by OS:

| File | itch OS tag | Button label idea |
|------|-------------|-------------------|
| `Bloop-Maker-x.x.x-x64.exe` | Windows | Windows (.exe) |
| `Bloop-Maker-x.x.x-arm64.dmg` | macOS | macOS — Apple Silicon |
| `Bloop-Maker-x.x.x-x64.dmg` | macOS | macOS — Intel |
| `Bloop-Maker-x.x.x-x64.AppImage` | Linux | Linux (AppImage) |
| `Bloop-Maker-x.x.x-amd64.deb` | Linux | Linux (.deb) |

Mark each file's platform so itch shows the right download button automatically.
Set each as "this file will be sold" (included with purchase).

---

## Screenshots / media to capture (do this before publishing)

itch listings live or die on visuals. Capture from the app:

1. **The full app window mid-song** — channels lit up, oscilloscope moving. This is your hero shot / cover.
2. **The piano roll open** on a channel, showing notes.
3. **The Steer + Archetype controls** — shows depth.
4. **The export dialog / a MIDI opened in a DAW** — proves it's real output.
5. *(Optional but huge)* A **short GIF or 30-second video** of generating a song and playing it. itch supports embedding a YouTube link — even a screen recording with audio converts far better than stills.

**Cover image:** 630×500px (itch's recommended thumbnail size). Use the hero shot or a clean logo on the dark background.

---

## Suggested page theme (itch Edit Theme panel)

Match the app's retro-dark aesthetic. In itch: **Edit theme** on your project page.

| Setting | Value | Notes |
|---------|-------|-------|
| **Background** | `#15151f` | Near-black indigo, matches the app |
| **Page background / behind content** | `#0e0e16` | Slightly darker for contrast |
| **Text** | `#e8e8f0` | Soft off-white, easy to read |
| **Link color** | `#ff8a3d` | Warm orange — chiptune/retro energy, high contrast on dark |
| **Secondary / accent** | `#4de1c1` | Teal (the oscilloscope green-teal) for highlights |
| **Border / dividers** | `#2a2a3d` | Subtle |
| **Layout** | "Centered" or "Sidebar" | Sidebar shows the buy button higher up — better for sales |
| **Font** | Default itch font is fine | Or a rounded/pixel font if you add a custom banner |

**Banner image** (optional, big impact): a 960×200ish dark strip with "BLOOP MAKER" in a chunky rounded or pixel font, orange on the dark indigo, maybe a small oscilloscope wave. Matches the app's `Fredoka One` heading font.

**Vibe to aim for:** cozy retro game tool — dark, warm orange accents, a little pixel/chiptune flavor, clean and readable. Not corporate, not sterile.

---

## Pricing & payment notes

- **Price:** $12.99 one-time.
- itch lets buyers optionally pay more — leave that on; some people tip good tools.
- **Revenue share:** itch defaults to ~10% to them (you can adjust it, even to 0%, but 10% is fair and keeps them happy).
- **Payment mode:** "Direct to you" needs your own PayPal/Stripe; "collective" lets itch handle payouts. Either is fine to start.
- Consider a **launch discount** (e.g. 20% off for the first week) — itch has a built-in sale tool and it drives early sales + reviews.

---

## Pre-launch checklist

- [ ] Build all 3 platforms (GitHub Actions or local)
- [ ] Download + test at least one installer
- [ ] Capture 4–5 screenshots + ideally a 30s video
- [ ] Make 630×500 cover image
- [ ] Create itch project, set to **Tools / Paid / $12.99**
- [ ] Paste title, tagline, full description
- [ ] Add tags
- [ ] Upload installers, tag each by OS
- [ ] Set the theme colors above
- [ ] Set visibility to **Public**, publish
- [ ] Post in r/gamedev, r/IndieDev, r/chiptunes + a gamedev Discord
