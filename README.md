# Flowers for Samantha

**Live:** https://jaydenhchen.github.io/flowers/

A black screen with a centered, spinning ASCII bouquet and **I love you Samantha!** beneath it. Small shimmering character-art hearts and twinkling ASCII stars surround the flowers. No headings, cards, navigation, visible controls, or decorative website layout.

Eight ruffled carnations and six cupped tulips form a full, closely clustered dome in pastel pink, butter yellow, and baby blue, with foliage, baby's breath, a warm kraft-paper sleeve, and a ribbon.

## Reference and license

Adapted from Alish Sharma's [Ascii-Flower-Bouquet-](https://github.com/alishsharma17/Ascii-Flower-Bouquet-) and its `bouquet3d.py` renderer, under the [MIT License](LICENSE).

The browser port retains the reference's golden-angle arrangement, perspective projection, depth buffer, and terminal presentation. Flower heads are now actual indexed 3D petal meshes, not camera-facing stamps or relief-map billboards. They turn with the bouquet, exposing different sides, overlapping petals, and cup interiors.

Tulips have six long oval petals in two staggered whorls, a tapered foot, a fuller lower-middle belly, and rounded tips that close toward a modest scalloped opening. Their cups are about 60% of the carnations' width. A lifted tulip lighting bias matches the carnations' pastel brightness while retaining darker seams and interiors. Carnations have five layers of curled, ruffled petals. Cached world-space vertices and surface normals rotate together; perspective-correct triangle rasterization and the shared depth buffer handle shading and occlusion.

Each bloom's local axis runs from its stem attachment toward its center. Tulips fan outward on those axes, including an off-center central tulip that leans and moves as the bouquet turns. Cubic Bézier stalks rise from the tied bundle with gentle inward and sideways bows. Tangent-aligned tube sections follow each curve, and the final tangent meets the calyx and petal base smoothly. The short exposed stem ends also bend slightly below the paper.

Crowded flower pairs are separated locally inside a compact radial constraint, using conservative 1.2-radius petal bounds. Inner blooms sit higher to form a dome and let outward-fanning stalks pass underneath. A final uniform correction guarantees a small positive gap between every pair of enclosing petal spheres. Shared rigid rotation preserves those clearances; flowers can overlap in perspective without their meshes intersecting.

The paper sleeve retains its original fixed dimensions: bottom radius `0.06`, opening radius `0.36`, and height `0.50` in scene units. The arrangement moves closer together instead of enlarging the paper. Petals clear the folded lip, and curved stalks remain inside the sleeve below its opening.

Per-vertex bloom identities let the renderer darken the foreground contour where different heads meet in projection, keeping their edges distinct without flattening the flowers or changing their size. Exact full-turn projection bounds keep the complete bouquet and dedication inside the viewport.

The terminal grid uses 9px glyphs on desktop and 6px on narrow or short screens. Each material has 64 tone-mapped shades, with pale highlights that preserve the pink, butter yellow, and baby blue palette. Canvas output consists only of individual monospace ASCII characters.

Small, fixed 5-column, 4-row ASCII hearts have two solid lobes, a central notch, and a pointed base. They do not spin or sway: each rises on a fixed vertical path, including across fade-out and wraparound. Symmetric glints shimmer across the face without shifting its visible horizontal center. Background stars pulse softly between dots, crosses, and asterisks. Both effects render behind the bouquet and share its animation clock, so pause and reduced motion stop all automatic movement, not just the bouquet's spin.

## Run locally

No build step, packages, or external services.

```sh
python3 -m http.server 4173
```

Open http://localhost:4173. Use HTTP rather than opening `index.html` directly, because the renderer is an ES module.

## Interaction

- Bouquet rotation, straight-up shimmering hearts, and star twinkles start automatically unless reduced motion is requested.
- Drag horizontally to turn the bouquet, even while paused.
- Tab to the canvas, then press Space to pause or resume the entire animation.
- Reduced-motion changes are respected without losing an explicit manual pause.

There are no on-screen controls. A screen-reader description provides the bouquet description and keyboard instructions. The black canvas fits the viewport without page scrolling, in portrait or landscape.

## Customize

- `bouquet.js`: color palettes, flower arrangement, lighting, glyph size, `SPIN_SPEED`, and the visible `MESSAGE`.
- `flowers.js`: world-space tulip and carnation petal geometry, surface normals, and bloom identities.
- `ambience.js`: filled 5×4 ASCII hearts, symmetric shimmer, vertical paths, and star twinkles.
- `styles.css`: full-viewport black terminal surface.
- `app.js`: keyboard pause and reduced-motion preference.
- `index.html`: page metadata and accessible description; keep its message in sync when changing `MESSAGE`.

Geometry and local surface normals are built once. Typed-array vertex transforms, bloom-identity, character, 16-bit color, and depth buffers are reused. Triangle coverage is evaluated directly on the character grid rather than rendering a pixel-resolution image first. Rendering is capped at 24 frames per second, suspended in hidden tabs, and only requested as needed while paused.

## Deploy

GitHub Pages publishes `main` from `/`. `.nojekyll` keeps this a plain static site. Push to `main` to update it.

No external fonts, analytics, audio, cookies, or private preference list. Only Samantha's first name appears publicly.
