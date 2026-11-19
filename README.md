# Flowers for Samantha

**Live:** https://jaydenhchen.github.io/flowers/

A black screen with a centered, spinning ASCII bouquet. No headings, cards, navigation, visible controls, or decorative website layout. The only visible text is `for Samantha, with love` beneath the flowers.

Six ruffled carnations and four cupped tulips in pastel pink, butter yellow, and baby blue, with foliage, baby's breath, folded paper, and a ribbon.

## Reference and license

Adapted from Alish Sharma's [Ascii-Flower-Bouquet-](https://github.com/alishsharma17/Ascii-Flower-Bouquet-) and its `bouquet3d.py` renderer, under the [MIT License](LICENSE).

The browser port retains the reference's golden-angle arrangement, rotating 3D point cloud, perspective projection, depth buffer, lighting, and camera-facing flower heads. The head silhouettes and textures are customized for carnations and tulips; the palette is customized for Samantha.

Flower heads remain readable as their positions rotate. Carnations use filled, scalloped shapes with layered irregular folds, not daisy centers or wireframe petals. Tulips use filled cup silhouettes with a three-point rim and shaded petal seams. Canvas output is a grid of actual monospace ASCII glyphs.

## Run locally

No build step, packages, or external services.

```sh
python3 -m http.server 4173
```

Open http://localhost:4173. Use HTTP rather than opening `index.html` directly, because the renderer is an ES module.

## Interaction

- Rotation starts automatically unless reduced motion is requested.
- Drag horizontally to turn the bouquet, even while paused.
- Tab to the canvas, then press Space to pause or resume.
- Reduced-motion changes are respected without losing an explicit manual pause.

There are no on-screen controls. A screen-reader description provides the bouquet description and keyboard instructions. The black canvas fits the viewport without page scrolling, in portrait or landscape.

## Customize

- `bouquet.js`: `MESSAGE`, color palettes, flower arrangement, head drawing, and `SPIN_SPEED`.
- `styles.css`: full-viewport black terminal surface.
- `app.js`: keyboard pause and reduced-motion preference.
- `index.html`: page metadata and accessible description.

Geometry is built once. Typed-array character, color, and depth buffers are reused. Rendering is capped at 24 frames per second, suspended in hidden tabs, and only requested as needed while paused.

## Deploy

GitHub Pages publishes `main` from `/`. `.nojekyll` keeps this a plain static site. Push to `main` to update it.

No external fonts, analytics, audio, cookies, or private preference list. Only Samantha's first name appears publicly.
