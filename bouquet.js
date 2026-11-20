/*
 * Adapted from bouquet3d.py by Alish Sharma (MIT License).
 * https://github.com/alishsharma17/Ascii-Flower-Bouquet-
 * Copyright (c) 2026 Alish Sharma. See LICENSE.
 * Browser port, pastel palette, and carnation heads customized for Samantha.
 */
const TAU = Math.PI * 2;
const TILT = 0.30;
const CAM_DIST = 4;
const SPIN_SPEED = 0.6;
const FPS = 24;
const GLYPHS = ' .,:;-=+*#%@';
const SURFACE_SHADE = '.,:;-=+*#%@';
const PETAL_SHADE = '-=+*#%@';
const SHADES = 64;
const RELIEF_SIZE = 128;
const RELIEF_EXTENT = 1.05;
const RELIEF_STRIDE = 5;
const MATERIALS = [
  [255, 188, 215], // pastel pink
  [255, 236, 164], // butter yellow
  [174, 218, 255], // baby blue
  [115, 190, 110], // foliage
  [227, 221, 181], // paper
  [239, 154, 190], // ribbon
  [226, 236, 229], // baby's breath
];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const ct = Math.cos(TILT);
const st = Math.sin(TILT);
const glyph = (char) => GLYPHS.indexOf(char);
const gaussian = (n) => Math.exp(-n * n);

function tulipWidth(v) {
  return 0.87 * Math.sin(Math.PI * 0.5 * Math.min(1, v * 1.5 + 0.05));
}

function petalHeight(x, y, tulip, seed) {
  if (tulip) {
    const v = clamp((1 - y) / 2, 0, 1);
    const xn = x / Math.max(0.04, tulipWidth(v));
    const leftSeam = gaussian((xn + 0.34) / 0.065);
    const rightSeam = gaussian((xn - 0.34) / 0.065);
    const rim = 0.72 + 0.28 * Math.cos(1.5 * Math.PI * xn) ** 2;
    return 0.24 * Math.sqrt(Math.max(0, 1 - xn * xn)) * (0.65 + 0.35 * Math.sin(v * Math.PI * 0.8))
      - 0.032 * (leftSeam + rightSeam) * Math.min(1, v * 3)
      + 0.025 * gaussian((v - rim) / 0.065)
      + 0.003 * Math.sin(xn * 48 + seed) * Math.sin(v * Math.PI);
  }
  const r = Math.hypot(x, y);
  const a = Math.atan2(y, x);
  const folds = r * 24 + 2.2 * Math.sin(a * 6 + seed) + 0.8 * Math.sin(a * 11 - r * 7);
  return 0.20 * Math.sqrt(Math.max(0, 1 - r * r))
    + 0.040 * (0.5 + 0.5 * r) * Math.sin(folds)
    + 0.018 * r * Math.sin(a * 17 - r * 11 + seed)
    + 0.025 * gaussian((r - 0.83) / 0.13) * Math.max(0, Math.sin(folds + 1.1));
}

// Cache petal relief, normals, and crease occlusion once, not trigonometry per frame.
function buildPetalRelief(tulip, seed) {
  const surface = new Float32Array(RELIEF_SIZE * RELIEF_SIZE * RELIEF_STRIDE);
  const step = RELIEF_EXTENT * 2 / (RELIEF_SIZE - 1);
  for (let row = 0; row < RELIEF_SIZE; row++) {
    const y = row * step - RELIEF_EXTENT;
    for (let col = 0; col < RELIEF_SIZE; col++) {
      const x = col * step - RELIEF_EXTENT;
      const index = (row * RELIEF_SIZE + col) * RELIEF_STRIDE;
      let occlusion;
      if (tulip) {
        const v = (1 - y) / 2;
        const halfWidth = tulipWidth(v);
        const xn = x / Math.max(0.04, halfWidth);
        if (v < 0 || v > 1 || Math.abs(x) > halfWidth
          || v > 0.72 + 0.28 * Math.cos(1.5 * Math.PI * xn) ** 2) {
          surface[index + 3] = -1;
          continue;
        }
        occlusion = 0.17 * (gaussian((xn + 0.34) / 0.085)
          + gaussian((xn - 0.34) / 0.085)) * Math.min(1, v * 3)
          + 0.04 * (1 - v);
      } else {
        const r = Math.hypot(x, y);
        const a = Math.atan2(y, x);
        const edge = 0.88 + 0.09 * Math.sin(a * 9) + 0.055 * Math.sin(a * 17 + seed);
        if (r > edge) {
          surface[index + 3] = -1;
          continue;
        }
        const folds = r * 24 + 2.2 * Math.sin(a * 6 + seed) + 0.8 * Math.sin(a * 11 - r * 7);
        occlusion = 0.20 * Math.max(0, -Math.sin(folds)) ** 4 + 0.07 * r * r;
      }
      const height = petalHeight(x, y, tulip, seed);
      const nx = -(petalHeight(x + step, y, tulip, seed) - petalHeight(x - step, y, tulip, seed)) / (2 * step);
      const ny = -(petalHeight(x, y + step, tulip, seed) - petalHeight(x, y - step, tulip, seed))
        / (2 * step * (tulip ? 1.18 : 1));
      const inverseLength = 1 / Math.hypot(nx, ny, 1);
      surface[index] = nx * inverseLength;
      surface[index + 1] = ny * inverseLength;
      surface[index + 2] = inverseLength;
      surface[index + 3] = height;
      surface[index + 4] = occlusion;
    }
  }
  return surface;
}

function buildScene() {
  let seed = 21;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const points = [];
  const heads = [];
  const babies = [];
  const normal = (x, y, z) => {
    const length = Math.hypot(x, y, z) || 1;
    return [x / length, y / length, z / length];
  };
  function point(x, y, z, nx, ny, nz, material, tone = 0) {
    points.push(x, y, z, nx, ny, nz, material, tone);
  }

  // The reference's golden-angle dome gives a full, compact bouquet at every angle.
  const golden = Math.PI * (3 - Math.sqrt(5));
  const tulips = new Set([0, 3, 6, 8]);
  for (let i = 0; i < 10; i++) {
    const elevation = (88 - 60 * Math.sqrt(i / 9)) * Math.PI / 180;
    const azimuth = i * golden;
    const dx = Math.cos(elevation) * Math.cos(azimuth);
    const dy = Math.sin(elevation);
    const dz = Math.cos(elevation) * Math.sin(azimuth);
    const distance = 0.64 * (0.92 + random() * 0.13);
    const x = dx * distance;
    const y = 0.12 + dy * distance;
    const z = dz * distance;
    const isTulip = tulips.has(i);
    const flowerSeed = random() * TAU;
    heads.push({ x, y, z, tulip: isTulip, material: i % 3,
      radius: isTulip ? 0.175 : 0.155 + random() * 0.022,
      surface: buildPetalRelief(isTulip, flowerSeed) });
    for (let j = 0; j < 90; j++) {
      const t = j / 89;
      point(x * (1 - t), (y - 0.03) * (1 - t) - 0.12 * t, z * (1 - t),
        dx, 0, dz, 3, -0.10);
    }
  }

  // Broad, curled leaves around the neck, with a darker central rib.
  for (let i = 0; i < 8; i++) {
    const angle = (i + 0.4) / 8 * TAU;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const [dx, dy, dz] = normal(c, 0.15, s);
    const [nx, ny, nz] = normal(-c * 0.15, 1, -s * 0.15);
    for (let j = 0; j < 36; j++) {
      const t = j / 35;
      for (let k = -6; k <= 6; k++) {
        const across = k / 6;
        const width = 0.075 * Math.sin(Math.PI * t) * across;
        const curl = 0.025 * across * across;
        point(0.26 * c + dx * 0.30 * t - s * width + nx * curl,
          0.30 + dy * 0.30 * t - 0.10 * t * t + ny * curl,
          0.26 * s + dz * 0.30 * t + c * width + nz * curl,
          nx, ny, nz, 3, k === 0 ? -0.22 : 0.03);
      }
    }
  }

  // Dense folded wrapping, not the previous wireframe surface.
  const y0 = -0.20;
  const y1 = 0.30;
  const r0 = 0.06;
  const r1 = 0.36;
  const slope = (r1 - r0) / (y1 - y0);
  for (let i = 0; i < 64; i++) {
    const t = i / 63;
    const radius = r0 + (r1 - r0) * t;
    const count = Math.max(12, Math.floor(260 * radius));
    for (let j = 0; j < count; j++) {
      const angle = (j + random()) / count * TAU;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const y = y0 + (y1 - y0) * t + (t > 0.9 ? 0.03 * Math.sin(9 * angle) : 0);
      const [nx, ny, nz] = normal(c, -slope, s);
      point(radius * c, y, radius * s, nx, ny, nz, 4,
        0.26 * (Math.abs(Math.sin(5 * angle)) - 0.6));
    }
  }

  for (let i = 0; i < 7; i++) {
    const angle = i / 7 * TAU;
    for (let j = 0; j < 60; j++) {
      const t = j / 59;
      point(0.025 * Math.cos(angle) * (1 + 1.2 * t), -0.20 - 0.30 * t,
        0.025 * Math.sin(angle) * (1 + 1.2 * t), Math.cos(angle), 0, Math.sin(angle), 3, -0.08);
    }
  }

  const by = -0.12;
  const br = r0 + slope * (by - y0) + 0.01;
  for (let j = 0; j < 120; j++) {
    const angle = j / 120 * TAU;
    for (const offset of [-0.012, 0, 0.012]) {
      point(br * Math.cos(angle), by + offset, br * Math.sin(angle),
        Math.cos(angle), 0, Math.sin(angle), 5, 0.05);
    }
  }
  for (const side of [-1, 1]) {
    for (let j = 0; j < 90; j++) {
      const a = j / 90 * TAU;
      const x = side * (0.07 + 0.07 * Math.cos(a));
      const y = 0.04 * Math.sin(a) + 0.02 * (1 + Math.cos(a)) / 2;
      for (const fill of [1, 0.7, 0.85]) {
        point(x * fill, by + y * fill, br + 0.02, side * 0.3, 0.2, 0.93, 5, 0.12);
      }
    }
    for (let j = 0; j < 40; j++) {
      const t = j / 39;
      point(side * 0.06 * t, by - 0.15 * t, br + 0.025,
        side * 0.2, 0, 0.98, 5, -0.05 + 0.05 * Math.sin(t * 9));
    }
  }
  for (let i = 0; i < 65; i++) {
    const angle = random() * TAU;
    const elevation = 0.3 + random() * 1.1;
    const radius = 0.40 + random() * 0.18;
    babies.push({ x: radius * Math.cos(angle) * Math.cos(elevation),
      y: 0.12 + radius * Math.sin(elevation), z: radius * Math.sin(angle) * Math.cos(elevation),
      phase: random() * TAU });
  }
  return { points: new Float32Array(points), heads, babies };
}

export function createBouquet(canvas, { paused = false } = {}) {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('The bouquet requires a 2D canvas.');
  const { points, heads, babies } = buildScene();
  const palette = MATERIALS.flatMap(rgb => Array.from({ length: SHADES }, (_, i) => {
    const value = i / (SHADES - 1);
    const light = 0.20 + Math.pow(value, 0.65) * 0.80;
    const highlight = Math.max(0, (value - 0.85) / 0.15) * 0.30;
    const r = Math.round(rgb[0] * light * (1 - highlight) + 255 * highlight);
    const g = Math.round(rgb[1] * light * (1 - highlight) + 250 * highlight);
    const b = Math.round(rgb[2] * light * (1 - highlight) + 255 * highlight);
    return `rgb(${r},${g},${b})`;
  }));
  const surfaceGlyphs = Uint8Array.from(SURFACE_SHADE, glyph);
  const petalGlyphs = Uint8Array.from(PETAL_SHADE, glyph);
  let width = 0;
  let height = 0;
  let columns = 0;
  let rows = 0;
  let cellWidth = 0;
  let cellHeight = 0;
  let scaleX = 0;
  let scaleY = 0;
  let centerX = 0;
  let centerY = 0;
  let depths = new Float32Array(0);
  let characters = new Uint8Array(0);
  let colors = new Uint16Array(0);
  let angle = -0.15;
  let elapsed = 0;
  let lastTime = 0;
  let frame = 0;
  let isPaused = Boolean(paused);
  let destroyed = false;
  let pointer = null;
  let dragX = 0;
  let dragAngle = 0;
  // Reused projection values avoid a result array for every point in every frame.
  let px = 0;
  let py = 0;
  let pz = 0;
  let pf = 0;
  let ca = 1;
  let sa = 0;

  function project(x, y, z) {
    const xr = x * ca - z * sa;
    const zr = x * sa + z * ca;
    const yp = y - 0.20;
    const yt = yp * ct - zr * st;
    pz = yp * st + zr * ct;
    pf = CAM_DIST / (CAM_DIST - pz);
    px = centerX + xr * pf * scaleX;
    py = centerY - yt * pf * scaleY;
  }

  function plot(x, y, z, char, color) {
    const col = Math.floor(x);
    const row = Math.floor(y);
    if (row < 0 || row >= rows || col < 0 || col >= columns) return;
    const index = row * columns + col;
    if (z <= depths[index]) return;
    depths[index] = z;
    characters[index] = char;
    colors[index] = color;
  }

  function schedule() {
    if (!destroyed && !document.hidden && !frame) frame = requestAnimationFrame(draw);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fontSize = width < 600 || height < 500 ? 6 : 9;
    context.font = `500 ${fontSize}px "SFMono-Regular", Consolas, "Liberation Mono", monospace`;
    cellWidth = context.measureText('M').width;
    cellHeight = fontSize * 1.16;
    context.textBaseline = 'middle';
    context.textAlign = 'center';
    columns = Math.floor(width / cellWidth);
    rows = Math.floor(height / cellHeight);
    const scale = Math.max(1, Math.min((rows - 7) / 1.72, (columns - 6) * cellWidth / cellHeight / 1.85));
    scaleX = scale * cellHeight / cellWidth;
    scaleY = scale;
    centerX = columns / 2;
    centerY = rows / 2;
    depths = new Float32Array(columns * rows);
    characters = new Uint8Array(columns * rows);
    colors = new Uint16Array(columns * rows);
    schedule();
  }

  function draw(time) {
    frame = 0;
    if (destroyed || document.hidden || !width || !height) return;
    if (!isPaused && pointer === null && lastTime && time - lastTime < 1000 / FPS) {
      schedule();
      return;
    }
    if (!isPaused && pointer === null && lastTime) {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      angle += dt * SPIN_SPEED;
      elapsed += dt;
    }
    lastTime = time;
    ca = Math.cos(angle);
    sa = Math.sin(angle);
    depths.fill(-Infinity);
    characters.fill(0);

    for (let i = 0; i < points.length; i += 8) {
      project(points[i], points[i + 1], points[i + 2]);
      const nxr = points[i + 3] * ca - points[i + 5] * sa;
      const nzr = points[i + 3] * sa + points[i + 5] * ca;
      const nyt = points[i + 4] * ct - nzr * st;
      const nzt = points[i + 4] * st + nzr * ct;
      let dot = nxr * -0.45 + nyt * 0.60 + nzt * 0.66;
      if (points[i + 6] !== 4 && dot < 0) dot *= -0.55;
      const ambient = points[i + 6] === 4 ? 0.48 : 0.31;
      const b = clamp(ambient + (1 - ambient) * Math.max(0, dot) + points[i + 7], 0, 0.999);
      plot(px, py, pz, surfaceGlyphs[Math.floor(b * surfaceGlyphs.length)],
        points[i + 6] * SHADES + Math.floor(b * SHADES));
    }

    // Camera-facing head stamps are the reference's essential readability trick.
    // Their centers still move in true 3D, with perspective, lighting, and occlusion.
    for (const head of heads) {
      project(head.x, head.y, head.z);
      const fx = px;
      const fy = py;
      const z = pz;
      const rx = head.radius * pf * scaleX;
      const ry = head.radius * pf * scaleY * (head.tulip ? 1.18 : 1);
      const dim = -0.12 * (1 - clamp((z + 0.6) / 1.2, 0, 1));
      const rotation = head.tulip ? 0 : angle * 0.40;
      const cr = Math.cos(rotation);
      const sr = Math.sin(rotation);
      const textureScale = (RELIEF_SIZE - 1) / (RELIEF_EXTENT * 2);
      const surface = head.surface;
      for (let row = Math.floor(fy - ry * RELIEF_EXTENT) - 1; row <= Math.ceil(fy + ry * RELIEF_EXTENT); row++) {
        const dy = (row + 0.5 - fy) / ry;
        for (let col = Math.floor(fx - rx * RELIEF_EXTENT) - 1; col <= Math.ceil(fx + rx * RELIEF_EXTENT); col++) {
          const dx = (col + 0.5 - fx) / rx;
          const tx = Math.round((dx * cr - dy * sr + RELIEF_EXTENT) * textureScale);
          const ty = Math.round((dx * sr + dy * cr + RELIEF_EXTENT) * textureScale);
          if (tx < 0 || tx >= RELIEF_SIZE || ty < 0 || ty >= RELIEF_SIZE) continue;
          const index = (ty * RELIEF_SIZE + tx) * RELIEF_STRIDE;
          const height = surface[index + 3];
          if (height === -1) continue;
          const nx = surface[index] * cr + surface[index + 1] * sr;
          const ny = -surface[index] * sr + surface[index + 1] * cr;
          const nz = surface[index + 2];
          const diffuse = Math.max(0, nx * -0.45 + ny * -0.60 + nz * 0.66);
          const rim = Math.max(0, nx * 0.70 + ny * 0.15 + nz * 0.65);
          const highlight = Math.max(0, nx * -0.24 + ny * -0.32 + nz * 0.916);
          const occlusion = surface[index + 4];
          const b = clamp((0.18 + 0.72 * diffuse + 0.14 * rim ** 3) * (1 - occlusion)
            + 0.14 * highlight ** 18 + dim, 0, 0.999);
          plot(col, row, z + head.radius * (0.08 + height),
            petalGlyphs[Math.floor(b * petalGlyphs.length)],
            head.material * SHADES + Math.floor(b * SHADES));
        }
      }
    }

    for (const baby of babies) {
      project(baby.x, baby.y, baby.z);
      const bright = Math.sin(elapsed * 2 + baby.phase) > 0.6;
      plot(px, py, pz + 0.02, glyph(bright ? '*' : '.'), 6 * SHADES + (bright ? SHADES - 1 : 40));
    }

    context.fillStyle = '#000';
    context.fillRect(0, 0, width, height);
    let previousColor = -1;
    const offsetX = (width - columns * cellWidth) / 2;
    const offsetY = (height - rows * cellHeight) / 2;
    for (let row = 0, index = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++, index++) {
        if (!characters[index]) continue;
        const color = colors[index];
        if (color !== previousColor) {
          context.fillStyle = palette[color];
          previousColor = color;
        }
        context.fillText(GLYPHS[characters[index]], offsetX + (col + 0.5) * cellWidth,
          offsetY + (row + 0.5) * cellHeight);
      }
    }
    if (!isPaused && pointer === null) schedule();
  }

  function pointerDown(event) {
    if (pointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointer = event.pointerId;
    dragX = event.clientX;
    dragAngle = angle;
    canvas.setPointerCapture(pointer);
    lastTime = 0;
  }
  function pointerMove(event) {
    if (event.pointerId !== pointer) return;
    angle = dragAngle + (event.clientX - dragX) * 0.009;
    schedule();
  }
  function pointerUp(event) {
    if (event.pointerId !== pointer) return;
    const captured = pointer;
    pointer = null;
    if (canvas.hasPointerCapture(captured)) canvas.releasePointerCapture(captured);
    lastTime = 0;
    schedule();
  }
  function visibilityChange() {
    lastTime = 0;
    if (document.hidden) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    } else schedule();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  canvas.addEventListener('lostpointercapture', pointerUp);
  document.addEventListener('visibilitychange', visibilityChange);
  window.addEventListener('resize', resize);
  resize();

  return {
    setPaused(value) {
      if (destroyed) return;
      isPaused = Boolean(value);
      lastTime = 0;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      schedule();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibilityChange);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerUp);
      canvas.removeEventListener('lostpointercapture', pointerUp);
      if (pointer !== null && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    },
  };
}
