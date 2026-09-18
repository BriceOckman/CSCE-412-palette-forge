# Palette Forge

A tiny static site that forges harmonious 5-color palettes. No build step, no frameworks, no external assets — just `index.html`, `styles.css`, and `app.js`.

## Features

- **Harmonious palette generation** — picks a base hue and applies one of several color-theory schemes (analogous, complementary, split-complementary, triadic, monochrome) with a balanced lightness ramp so palettes are pleasant by construction.
- **Click to copy** — click any swatch to copy its hex code (uses `navigator.clipboard` with a `textarea`/`execCommand` fallback), with a toast confirmation.
- **Lock & regenerate** — each swatch has a lock button (revealed on hover / always visible when locked or on mobile). Press <kbd>Space</kbd> or the **Regenerate** button to reroll only the unlocked colors; locked ones stay put.
- **Saved palettes** — name and save the current palette; saved palettes persist in `localStorage` and appear as swatch strips with **Apply** (loads back onto the main swatches) and **Delete** actions.
- **Responsive** — swatches stack vertically on small screens; locks stay reachable.
- **Keyboard hint** — a visible hint that <kbd>Space</kbd> regenerates unlocked colors.

## Run locally

Any static file server works. From this directory:

```bash
# Python 3
python3 -m http.server 8000

# or Node
npx serve .
```

Then open <http://localhost:8000> in a browser.

## Files

- `index.html` — page structure; links `styles.css` and `app.js` via relative paths.
- `styles.css` — dark, modern styling with hover/focus states and a mobile breakpoint.
- `app.js` — palette generation (HSL math), clipboard copy, locking, spacebar regenerate, and `localStorage` save/apply/delete.

## Deploying

All asset paths are relative, so the site works when served from any base path, e.g. GitHub Pages at `https://briceockman.github.io/palette-forge/`.
