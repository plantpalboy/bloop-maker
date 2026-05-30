// Assembles the public website folder `demo/` for the public GitHub Pages repo.
//
// Run with: npm run build:site
// (which first runs `build:demo` to produce dist-demo/, then this script.)
//
// Output structure (this is exactly what you push to the PUBLIC demo repo):
//   demo/
//     index.html        ← the landing page (from landing/index.html)
//     app-screenshot.png ← optional, copied if landing/app-screenshot.png exists
//     app/              ← the playable, minified demo build (from dist-demo/)
//     CNAME             ← custom domain for GitHub Pages
//
// Your TypeScript source is NEVER copied here — only built/minified output.

import { cpSync, rmSync, mkdirSync, existsSync, writeFileSync, readdirSync } from 'node:fs';

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

// Landing page
if (!existsSync('landing/index.html')) {
  console.error('Missing landing/index.html — cannot build site.');
  process.exit(1);
}
cpSync('landing/index.html', 'demo/index.html');

// Optional media folder (gallery video + screenshots) for the landing page
if (existsSync('landing/media')) {
  cpSync('landing/media', 'demo/media', { recursive: true });
}

// Playable demo build
if (!existsSync('dist-demo')) {
  console.error('Missing dist-demo/ — run `npm run build:demo` first (npm run build:site does this for you).');
  process.exit(1);
}
cpSync('dist-demo', 'demo/app', { recursive: true });

// Custom domain file for GitHub Pages
writeFileSync('demo/CNAME', CUSTOM_DOMAIN + '\n');

console.log('✓ Assembled demo/');
console.log('  demo/index.html      (landing page → bloopmaker.net)');
console.log('  demo/app/            (playable demo → bloopmaker.net/app/)');
console.log('  demo/CNAME           (' + CUSTOM_DOMAIN + ')');
console.log('');
console.log('Next: push the demo/ folder to your PUBLIC repo (see docs/deploy-demo.md).');
