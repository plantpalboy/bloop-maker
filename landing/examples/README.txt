HOW TO ADD A SONG TO THE EXAMPLES PAGE
======================================

Every song is one set of files that SHARE THE SAME BASE NAME. Drop them in
this folder (landing/examples/) and run:

    npm run build:examples      (or just: npm run build:site)

…and the song appears on examples.html automatically. No HTML editing.

For a song with the base name "sunrise-overdrive" you can include:

  sunrise-overdrive.wav    (REQUIRED) the rendered audio — what plays + the
                           "Download WAV" button.
  sunrise-overdrive.mid    (optional) the raw MIDI notes Bloop Maker output —
                           the "Download MIDI" button. (.midi also works.)
  sunrise-overdrive.txt    (optional) plain-text notes about the song — the
                           "Download MIDI info" button.
  sunrise-overdrive.json   (optional) display info, any of:
                             {
                               "title": "Sunrise Overdrive",
                               "description": "A bright morning bop.",
                               "soundfont": "GameBoy.sf2"
                             }

If there's no .json, the title is just the base name prettified
("sunrise-overdrive" -> "Sunrise Overdrive").

Only the .wav is required. Missing files simply hide their download button.
Songs are listed in the order their .json "order" field says, then A→Z.
