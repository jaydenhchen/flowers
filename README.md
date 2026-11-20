# Flowers for Samantha

**Live:** https://jaydenhchen.github.io/flowers/

A black screen with a centered, spinning ASCII bouquet. No caption, headings, cards, navigation, visible controls, or decorative website layout.

Six ruffled carnations and four cupped tulips in pastel pink, butter yellow, and baby blue, with foliage, baby's breath, folded paper, and a ribbon.

## Reference and license

Adapted from Alish Sharma's [Ascii-Flower-Bouquet-](https://github.com/alishsharma17/Ascii-Flower-Bouquet-) and its `bouquet3d.py` renderer, under the [MIT License](LICENSE).

The browser port retains the reference's golden-angle arrangement, rotating 3D point cloud, perspective projection, depth buffer, lighting, and camera-facing flower heads. The head silhouettes and textures are customized for carnations and tulips; the palette is customized for Samantha.

Flower heads remain readable as their positions rotate. Carnations use scalloped silhouettes with raised, irregular layers; tulips use curved cup surfaces with a three-point rim, recessed seams, and fine petal veins. Each bloom has a cached 128×128 relief map containing surface normals, height, and crease occlusion. Directional key lighting, rim lighting, and specular highlights shade each character; the depth buffer uses the petals' relief rather than a flat flower disc.

Tulip cups fan outward along their stems instead of sharing a fixed upright angle. Each cup's projected 3D base determines its screen-space tilt, foreshortening, and depth slope. Continuous tubular stems end at those bases, with small green calyces joining the stems to the petals; the attachment follows the same projection throughout a full rotation.

The terminal grid uses 9px glyphs on desktop and 6px on narrow or short screens. Each material has 64 tone-mapped shades, with pale highlights that preserve the pink, butter yellow, and baby blue palette. Canvas output consists only of individual monospace ASCII characters.

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

- `bouquet.js`: color palettes, petal relief, flower arrangement, glyph size, and `SPIN_SPEED`.
- `styles.css`: full-viewport black terminal surface.
- `app.js`: keyboard pause and reduced-motion preference.
- `index.html`: page metadata and accessible description.

Geometry and petal relief maps are built once. Typed-array character, 16-bit color, and depth buffers are reused. Surface normals are cached rather than recomputed every frame. Rendering is capped at 24 frames per second, suspended in hidden tabs, and only requested as needed while paused.

## Deploy

GitHub Pages publishes `main` from `/`. `.nojekyll` keeps this a plain static site. Push to `main` to update it.

No external fonts, analytics, audio, cookies, or private preference list. Only Samantha's first name appears publicly.
