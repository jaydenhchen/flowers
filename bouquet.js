/*
 * Adapted from bouquet3d.py by Alish Sharma (MIT License).
 * https://github.com/alishsharma17/Ascii-Flower-Bouquet-
 * Copyright (c) 2026 Alish Sharma. See LICENSE.
 * Browser port, pastel palette, and carnation heads customized for Samantha.
 */
import { buildFlowerMesh } from './flowers.js';
import { createAmbience } from './ambience.js';

const TAU = Math.PI * 2;
const TILT = 0.30;
const CAM_DIST = 4;
const SPIN_SPEED = 0.6;
const FPS = 24;
const MESSAGE = 'I love you Samantha!';
const FONT = '"SFMono-Regular", Consolas, "Liberation Mono", monospace';
const GLYPHS = ' .,:;-=+*#%@';
const SURFACE_SHADE = '.,:;-=+*#%@';
const PETAL_SHADE = '+*#%@';
const SHADES = 64;
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
    const x = i === 0 ? -0.20 : dx * distance;
    const y = 0.12 + dy * distance;
    const z = i === 0 ? 0.14 : dz * distance;
    const isTulip = tulips.has(i);
    const flowerSeed = random() * TAU;
    const radius = isTulip ? 0.175 : 0.155 + random() * 0.022;
    const [ax, ay, az] = normal(x, y + 0.12, z);
    const attachment = radius * (isTulip ? 1.18 : 0.55);
    const baseX = x - ax * attachment;
    const baseY = y - ay * attachment;
    const baseZ = z - az * attachment;
    heads.push({ x, y, z, baseX, baseY, baseZ, tulip: isTulip, material: i % 3,
      radius, seed: flowerSeed });
    const [ux, uy, uz] = normal(ay, -ax, 0);
    const vx = ay * uz - az * uy;
    const vy = az * ux - ax * uz;
    const vz = ax * uy - ay * ux;
    // Every flower has a continuous tube ending at its actual three-dimensional base.
    for (let j = 0; j < 100; j++) {
      const t = j / 99;
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * TAU;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const nx = ux * c + vx * s;
        const ny = uy * c + vy * s;
        const nz = uz * c + vz * s;
        point(baseX * t + nx * 0.006, -0.12 + (baseY + 0.12) * t + ny * 0.006,
          baseZ * t + nz * 0.006, nx, ny, nz, 3, -0.04);
      }
    }
    if (isTulip) {
      // Small sepals bridge the pedicel and the lower petal rim.
      for (let sepal = 0; sepal < 4; sepal++) {
        const a = sepal / 4 * TAU;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const nx = ux * c + vx * s;
        const ny = uy * c + vy * s;
        const nz = uz * c + vz * s;
        for (let j = 0; j < 14; j++) {
          const t = j / 13;
          const spread = 0.024 * Math.sin(Math.PI * t);
          for (let k = -1; k <= 1; k++) {
            const across = k * 0.005 * Math.sin(Math.PI * t);
            point(baseX + ax * t * 0.06 + nx * spread + (vx * c - ux * s) * across,
              baseY + ay * t * 0.06 + ny * spread + (vy * c - uy * s) * across,
              baseZ + az * t * 0.06 + nz * spread + (vz * c - uz * s) * across,
              nx, ny, nz, 3, 0.05);
          }
        }
      }
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
  const { positions: flowerPositions, normals: flowerNormals, tones: flowerTones,
    materials: flowerMaterials, indices: flowerIndices } = buildFlowerMesh(heads);
  const transformedFlowers = new Float32Array(flowerMaterials.length * 4);
  const ambience = createAmbience({ glyph, shades: SHADES });
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
  let sceneFont = '';
  let messageFont = '';
  let messageSize = 0;
  let messageWidth = 0;
  let messageY = 0;
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
    sceneFont = `500 ${fontSize}px ${FONT}`;
    context.font = sceneFont;
    cellWidth = context.measureText('M').width;
    cellHeight = fontSize * 1.16;
    context.textBaseline = 'middle';
    context.textAlign = 'center';
    columns = Math.floor(width / cellWidth);
    rows = Math.floor(height / cellHeight);
    const scale = Math.max(1, Math.min((rows - 9) / 1.85, (columns - 8) * cellWidth / cellHeight / 2.0));
    scaleX = scale * cellHeight / cellWidth;
    scaleY = scale;
    centerX = columns / 2;
    centerY = (rows - 4) / 2;
    messageSize = width < 600 || height < 500 ? 12 : 15;
    messageFont = `500 ${messageSize}px ${FONT}`;
    context.font = messageFont;
    messageWidth = context.measureText(MESSAGE).width;
    messageY = Math.min(height - messageSize * 1.5, (centerY + scaleY * 0.82 + 2) * cellHeight);
    context.font = sceneFont;
    depths = new Float32Array(columns * rows);
    characters = new Uint8Array(columns * rows);
    colors = new Uint16Array(columns * rows);
    schedule();
  }

  // Rasterize actual world-space petal triangles into the same terminal depth buffer.
  function drawFlowers() {
    for (let vertex = 0, i = 0, out = 0; vertex < flowerMaterials.length; vertex++, i += 3, out += 4) {
      project(flowerPositions[i], flowerPositions[i + 1], flowerPositions[i + 2]);
      let nx = flowerNormals[i] * ca - flowerNormals[i + 2] * sa;
      const nzr = flowerNormals[i] * sa + flowerNormals[i + 2] * ca;
      let ny = flowerNormals[i + 1] * ct - nzr * st;
      let nz = flowerNormals[i + 1] * st + nzr * ct;
      const inside = nz < 0;
      if (inside) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      const diffuse = Math.max(0, nx * -0.45 + ny * 0.60 + nz * 0.66);
      const rim = Math.max(0, nx * 0.70 + ny * -0.15 + nz * 0.65);
      const highlight = Math.max(0, nx * -0.24 + ny * 0.32 + nz * 0.916);
      const brightness = clamp((0.28 + 0.64 * diffuse + 0.12 * rim ** 3 + flowerTones[vertex])
        * (inside ? 0.82 : 1) + 0.12 * highlight ** 18, 0.04, 0.999);
      const inverseW = pf / CAM_DIST;
      transformedFlowers[out] = px;
      transformedFlowers[out + 1] = py;
      transformedFlowers[out + 2] = inverseW;
      transformedFlowers[out + 3] = brightness * inverseW;
    }
    for (let triangle = 0; triangle < flowerIndices.length; triangle += 3) {
      const v0 = flowerIndices[triangle] * 4;
      const v1 = flowerIndices[triangle + 1] * 4;
      const v2 = flowerIndices[triangle + 2] * 4;
      const x0 = transformedFlowers[v0], y0 = transformedFlowers[v0 + 1];
      const x1 = transformedFlowers[v1], y1 = transformedFlowers[v1 + 1];
      const x2 = transformedFlowers[v2], y2 = transformedFlowers[v2 + 1];
      const area = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
      if (Math.abs(area) < 0.000001) continue;
      const minX = Math.max(0, Math.ceil(Math.min(x0, x1, x2) - 0.5));
      const maxX = Math.min(columns - 1, Math.floor(Math.max(x0, x1, x2) - 0.5));
      const minY = Math.max(0, Math.ceil(Math.min(y0, y1, y2) - 0.5));
      const maxY = Math.min(rows - 1, Math.floor(Math.max(y0, y1, y2) - 0.5));
      if (minX > maxX || minY > maxY) continue;
      const inverseArea = 1 / area;
      const a0 = (y1 - y2) * inverseArea;
      const b0 = (x2 - x1) * inverseArea;
      const c0 = (x1 * y2 - x2 * y1) * inverseArea;
      const a1 = (y2 - y0) * inverseArea;
      const b1 = (x0 - x2) * inverseArea;
      const c1 = (x2 * y0 - x0 * y2) * inverseArea;
      const material = flowerMaterials[flowerIndices[triangle]];
      for (let row = minY; row <= maxY; row++) {
        for (let col = minX; col <= maxX; col++) {
          const w0 = a0 * (col + 0.5) + b0 * (row + 0.5) + c0;
          const w1 = a1 * (col + 0.5) + b1 * (row + 0.5) + c1;
          const w2 = 1 - w0 - w1;
          if (w0 < -0.000001 || w1 < -0.000001 || w2 < -0.000001) continue;
          const inverseDepth = w0 * transformedFlowers[v0 + 2] + w1 * transformedFlowers[v1 + 2]
            + w2 * transformedFlowers[v2 + 2];
          const w = 1 / inverseDepth;
          const depth = CAM_DIST - w;
          const cell = row * columns + col;
          if (depth <= depths[cell]) continue;
          const brightness = clamp((w0 * transformedFlowers[v0 + 3] + w1 * transformedFlowers[v1 + 3]
            + w2 * transformedFlowers[v2 + 3]) * w, 0, 0.999);
          depths[cell] = depth;
          characters[cell] = petalGlyphs[Math.floor(brightness * petalGlyphs.length)];
          colors[cell] = material * SHADES + Math.floor(brightness * SHADES);
        }
      }
    }
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
    ambience.draw(elapsed, columns, rows, plot);

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

    drawFlowers();

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
    context.font = messageFont;
    context.fillStyle = '#000';
    context.fillRect(width / 2 - messageWidth / 2 - 10, messageY - messageSize, messageWidth + 20, messageSize * 2);
    context.fillStyle = '#f6c1d6';
    context.fillText(MESSAGE, width / 2, messageY);
    context.font = sceneFont;
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
