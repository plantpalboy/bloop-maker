// Assembles the public website folder `demo/` for the public GitHub Pages repo.
//
// Run with: npm run build:site
// (which first runs `build:demo` to produce dist-demo/, then this script.)
//
// Output structure (this is exactly what you push to the PUBLIC demo repo):
//   demo/
//     index.html          landing page          → bloopmaker.net
//     how-it-works.html   detailed SEO page     → bloopmaker.net/how-it-works.html
//     faq.html            detailed FAQ page     → bloopmaker.net/faq.html
//     site.css            shared page styles
//     robots.txt, sitemap.xml   search-engine files
//     media/              landing gallery video + screenshots
//     app/                the playable, minified demo build
//     CNAME               custom domain
//
// Your TypeScript source is NEVER copied here — only built/minified output.

import { cpSync, rmSync, mkdirSync, existsSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';

const CUSTOM_DOMAIN = 'bloopmaker.net'; // change or delete demo/CNAME if not using a custom domain

// Clean demo/ contents but PRESERVE .git — so the public repo's history survives
// every rebuild and you can just commit + push updates.
if (existsSync('demo')) {
  for (const entry of readdirSync('demo')) {
    if (entry === '.git') continue;
    rmSync(`demo/${entry}`, { recursive: true, force: true });
  }
} else {
  mkdirSync('demo', { recursive: true });
}

// Copy every file in landing/ (pages, css, robots.txt, sitemap.xml, media/),
// skipping README notes.
if (!existsSync('landing/index.html')) {
  console.error('Missing landing/index.html — cannot build site.');
  process.exit(1);
}
for (const entry of readdirSync('landing')) {
  if (/readme/i.test(entry)) continue;
  cpSync(`landing/${entry}`, `demo/${entry}`, { recursive: true });
}

// Playable demo build
if (!existsSync('dist')) {
  console.error('Missing dist/ — run `npm run build` first (npm run build:site does this for you).');
  process.exit(1);
}
cpSync('dist', 'demo/app', { recursive: true });

// Give the demo app page its own SEO meta (it inherits the full app's index.html).
const appIndex = 'demo/app/index.html';
if (existsSync(appIndex)) {
  let html = readFileSync(appIndex, 'utf8');
  html = html.replace(/<title>[\s\S]*?<\/title>/,
    '<title>Bloop Maker — Generative Music Program | Free In-Browser Game Music Generator</title>');
  html = html.replace(/(<meta name="description" content=")[^"]*(")/,
    '$1Use Bloop Maker free in your browser — a no-AI game music generator built on music-theory rules. Generate original chiptune and video game music and export MIDI and WAV. Desktop app also available.$2');
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/,
    '$1https://bloopmaker.net/app/$2');
  writeFileSync(appIndex, html);
}

// Custom domain file for GitHub Pages
writeFileSync('demo/CNAME', CUSTOM_DOMAIN + '\n');

console.log('✓ Assembled demo/');
console.log('  demo/index.html        (landing → bloopmaker.net)');
console.log('  demo/how-it-works.html (→ bloopmaker.net/how-it-works.html)');
console.log('  demo/faq.html          (→ bloopmaker.net/faq.html)');
console.log('  demo/app/              (playable demo → bloopmaker.net/app/)');
console.log('  demo/robots.txt, sitemap.xml, site.css, media/, CNAME');
console.log('');
console.log('Next: push the demo/ folder to your PUBLIC repo (see docs/deploy-demo.md).');
