# For Samantha

A little bouquet that never has to say goodbye.

**Site:** https://jaydenhchen.github.io/flowers/

A spinning, three-dimensional ASCII arrangement of five tulips and four carnations in pastel pink, butter yellow, and baby blue, with curved stems, leaves, paper wrapping, and a ribbon. Made for Samantha, from Jayden.

## Run locally

No build step, packages, or external services.

```sh
python3 -m http.server 4173
```

Open http://localhost:4173. Serve the files over HTTP rather than opening `index.html` directly, because the renderer uses an ES module.

## Interactions

- The bouquet rotates automatically. Drag horizontally to turn it by hand, including while paused.
- Use **Pause rotation / Resume rotation** to control motion.
- A reduced-motion preference starts the bouquet paused and is respected when it changes. An explicit manual pause is retained.
- Open **A small note for you** with a click, Enter, or Space.

The canvas includes a text description; the controls and note are keyboard accessible. The layout adapts to phone and desktop screens.

## Personalize

- `index.html`: recipient, note, signature, and page copy.
- `styles.css`: stationery layout and colors.
- `bouquet.js`: flower arrangement, ASCII materials, geometry, and rotation speed.
- `app.js`: motion-control and reduced-motion state.

The bouquet's surfaces are sampled once, then rotated, lit, and projected into a depth-buffered grid of ASCII glyphs. Animation is capped at 30 frames per second and suspended in hidden tabs; paused scenes draw only when needed.

## Publish

GitHub Pages publishes the repository's `main` branch from `/`. `.nojekyll` keeps it a plain static site. Commit and push changes to `main` to update the gift.

Public content uses Samantha's first name only. No analytics, cookies, audio, external fonts, or personal preference list.
