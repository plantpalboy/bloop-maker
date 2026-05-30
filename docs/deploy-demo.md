# Deploying the Demo + Landing Page (public GitHub Pages repo)

This publishes your **landing page** and **playable demo** to a NEW public repo, served
on GitHub Pages at **bloopmaker.net**. Your source code stays in the private repo — only
the built/minified output goes public.

---

## What gets published

Running `npm run build:site` produces the `demo/` folder:

```
demo/
  index.html        landing page  →  bloopmaker.net
  app/              playable demo →  bloopmaker.net/app/
  CNAME             custom domain (bloopmaker.net)
```

No `.ts` source is ever copied here — only the minified build.

---

## One-time setup

### 1. Build the site folder

```bash
npm run build:site
```

### 2. Create the public repo on GitHub

Go to **github.com/new** and make a repo:
- Name: `bloopmaker-site` (or anything)
- Visibility: **Public**
- Do NOT add a README/.gitignore (keep it empty)

### 3. Push the demo/ folder to it

```bash
cd demo
git init
git add -A
git commit -m "Bloop Maker — landing page + playable demo"
git branch -M main
git remote add origin git@github.com:plantpalboy/bloopmaker-site.git
git push -u origin main
cd ..
```

> If `git@github.com:...` (SSH) gives a permission error, use the HTTPS URL instead:
> `git remote add origin https://github.com/plantpalboy/bloopmaker-site.git`

### 4. Turn on GitHub Pages

In the new repo: **Settings → Pages**
- **Source:** Deploy from a branch
- **Branch:** `main`, folder `/ (root)` → Save

Wait ~1 minute. It'll give you a live URL like `https://plantpalboy.github.io/bloopmaker-site/`.
Open it — landing page should load, and the "Try the free demo" button opens the app.

### 5. Connect bloopmaker.net (GoDaddy)

In **Settings → Pages → Custom domain**, enter `bloopmaker.net` → Save.
(The `CNAME` file is already in the repo, so this should match automatically.)

Then in **GoDaddy → your domain → DNS**, add these records:

| Type  | Name | Value             |
|-------|------|-------------------|
| A     | @    | `185.199.108.153` |
| A     | @    | `185.199.109.153` |
| A     | @    | `185.199.110.153` |
| A     | @    | `185.199.111.153` |
| CNAME | www  | `plantpalboy.github.io` |

- Delete any existing default "Parked" A record GoDaddy added.
- DNS takes minutes to a few hours. GitHub then auto-issues HTTPS (check
  "Enforce HTTPS" in Pages settings once it's available).

Done — bloopmaker.net shows your landing page, bloopmaker.net/app/ is the playable demo.

---

## Updating the demo later (after the first setup)

Whenever you change the app or landing page:

```bash
npm run build:site          # rebuilds demo/ (keeps its git history)
cd demo
git add -A
git commit -m "Update demo"
git push
cd ..
```

GitHub Pages redeploys automatically within a minute.

---

## Before you publish — fill in these placeholders

1. **itch.io link** — `landing/index.html` and `src/demo.ts` both contain
   `https://YOUR-USERNAME.itch.io/bloop-maker`. Replace with your real itch URL,
   then re-run `npm run build:site`.
2. **Screenshot** — drop `app-screenshot.png` into `landing/` so it appears in the
   landing hero (then rebuild). Optional but big for conversions.

---

## Linking it from itch.io

On your itch project page, set the **"Demo" / external link** to either:
- `https://bloopmaker.net` (landing page), or
- `https://bloopmaker.net/app/` (straight into the playable demo).
