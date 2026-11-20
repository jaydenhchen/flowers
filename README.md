# Flowers for Samantha

**Live:** https://jaydenhchen.github.io/flowers/

A black screen with a centered, spinning ASCII bouquet and **I love you Samantha!** beneath it. Floating character-art hearts and small twinkling ASCII stars surround the flowers. No headings, cards, navigation, visible controls, or decorative website layout.

Six ruffled carnations and four cupped tulips in pastel pink, butter yellow, and baby blue, with foliage, baby's breath, folded paper, and a ribbon.

## Reference and license

Adapted from Alish Sharma's [Ascii-Flower-Bouquet-](https://github.com/alishsharma17/Ascii-Flower-Bouquet-) and its `bouquet3d.py` renderer, under the [MIT License](LICENSE).

The browser port retains the reference's golden-angle arrangement, perspective projection, depth buffer, and terminal presentation. Flower heads are now actual indexed 3D petal meshes, not camera-facing stamps or relief-map billboards. They turn with the bouquet, exposing different sides, overlapping petals, and cup interiors.

Tulips have six broad, rounded petals in two staggered whorls, a tapered base, a gently narrowed open crown, and fine veins. Carnations have five layers of curled, ruffled petals. Cached world-space vertices and surface normals rotate together; perspective-correct triangle rasterization and the shared depth buffer handle shading and occlusion.

Each bloom's local axis runs from its stem attachment toward its center. Tulips fan outward on those axes, including an off-center central tulip that leans and moves as the bouquet turns. Continuous tubular stems and small green calyces meet the petal bases in the same 3D coordinate system.

The terminal grid uses 9px glyphs on desktop and 6px on narrow or short screens. Each material has 64 tone-mapped shades, with pale highlights that preserve the pink, butter yellow, and baby blue palette. Canvas output consists only of individual monospace ASCII characters.

Hearts use multi-line ASCII silhouettes in the same pastel palette, drifting upward with a gentle sway. Background stars pulse softly between dots, crosses, and asterisks. Both effects render behind the bouquet and share its animation clock, so pause and reduced motion stop all automatic movement, not just the spin.

## Run locally

No build step, packages, or external services.

```sh
python3 -m http.server 4173
```

Open http://localhost:4173. Use HTTP rather than opening `index.html` directly, because the renderer is an ES module.

## Interaction

- Rotation, floating hearts, and star twinkles start automatically unless reduced motion is requested.
- Drag horizontally to turn the bouquet, even while paused.
- Tab to the canvas, then press Space to pause or resume the entire animation.
- Reduced-motion changes are respected without losing an explicit manual pause.

There are no on-screen controls. A screen-reader description provides the bouquet description and keyboard instructions. The black canvas fits the viewport without page scrolling, in portrait or landscape.

## Customize

- `bouquet.js`: color palettes, flower arrangement, lighting, glyph size, `SPIN_SPEED`, and the visible `MESSAGE`.
- `flowers.js`: world-space tulip and carnation petal geometry and surface normals.
- `ambience.js`: ASCII heart silhouettes, drift, and star twinkles.
- `styles.css`: full-viewport black terminal surface.
- `app.js`: keyboard pause and reduced-motion preference.
- `index.html`: page metadata and accessible description; keep its message in sync when changing `MESSAGE`.

Geometry and local surface normals are built once. Typed-array vertex transforms, character, 16-bit color, and depth buffers are reused. Triangle coverage is evaluated directly on the character grid rather than rendering a pixel-resolution image first. Rendering is capped at 24 frames per second, suspended in hidden tabs, and only requested as needed while paused.

## Deploy

GitHub Pages publishes `main` from `/`. `.nojekyll` keeps this a plain static site. Push to `main` to update it.

No external fonts, analytics, audio, cookies, or private preference list. Only Samantha's first name appears publicly.
