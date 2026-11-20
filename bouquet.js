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
const CAMERA_TARGET_Y = 0.20;
const SPIN_SPEED = 0.6;
const FPS = 24;
const MESSAGE = 'I love you Samantha!';
const FONT = '"SFMono-Regular", Consolas, "Liberation Mono", monospace';
const GLYPHS = ' .,:;-=+*#%@';
const SURFACE_SHADE = '.,:;-=+*#%@';
const PETAL_SHADE = '+*#%@';
const SHADES = 64;
const FLOWER_BOUND = 1.3;
const FLOWER_GAP = 0.012;
const FLOWER_COUNT = 14;
const FLOWER_DROP = 0.08;
const STEM_BASE_Y = -0.30;
const MATERIALS = [
  [255, 188, 215], // pastel pink
  [255, 236, 164], // butter yellow
  [174, 218, 255], // baby blue
  [115, 190, 110], // foliage
  [211, 176, 126], // kraft paper
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

  // Golden-angle candidates are spread just enough to separate all petal volumes.
  const golden = Math.PI * (3 - Math.sqrt(5));
  const tulips = new Set([0, 3, 6, 8, 11, 13]);
  for (let i = 0; i < FLOWER_COUNT; i++) {
    const elevation = (88 - 60 * Math.sqrt(i / (FLOWER_COUNT - 1))) * Math.PI / 180;
    const azimuth = i * golden;
    const dx = Math.cos(elevation) * Math.cos(azimuth);
    const dy = Math.sin(elevation);
    const dz = Math.cos(elevation) * Math.sin(azimuth);
    const distance = 0.64 * (0.92 + random() * 0.13);
    const x = i === 0 ? 0.14 : dx * distance;
    const y = 0.12 + dy * distance + (i === 0 ? 0.02 : 0);
    const z = i === 0 ? 0.10 : dz * distance;
    const isTulip = tulips.has(i);
    const flowerSeed = random() * TAU;
    const radius = isTulip ? 0.14 : 0.155 + random() * 0.022;
    heads.push({ x, y, z, tulip: isTulip, material: i % 3, radius, seed: flowerSeed });
  }

  // Resolve crowded pairs locally instead of spreading the entire bouquet
  // around its single closest pair. All petals fit inside 1.3-radius spheres.
  for (let pass = 0; pass < 32; pass++) {
    let moved = false;
    for (let i = 0; i < heads.length; i++) {
      for (let j = i + 1; j < heads.length; j++) {
        const a = heads[i];
        const b = heads[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const distance = Math.hypot(dx, dy, dz);
        const required = FLOWER_BOUND * (a.radius + b.radius) + FLOWER_GAP;
        if (distance >= required) continue;
        const correction = (required - distance) * 0.5 / distance;
        a.x -= dx * correction;
        a.y -= dy * correction;
        a.z -= dz * correction;
        b.x += dx * correction;
        b.y += dy * correction;
        b.z += dz * correction;
        moved = true;
      }
    }
    // Keep the lower envelope level before seating the blooms in the sleeve.
    for (const head of heads) {
      const minimumY = 0.34 + FLOWER_BOUND * head.radius;
      if (head.y >= minimumY) continue;
      head.y = minimumY;
      moved = true;
    }
    if (!moved) break;
  }
  // A final uniform correction guarantees the gap, including rounding residue.
  let spread = 1;
  for (let i = 0; i < heads.length; i++) {
    for (let j = i + 1; j < heads.length; j++) {
      const a = heads[i];
      const b = heads[j];
      const distance = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      spread = Math.max(spread, (FLOWER_BOUND * (a.radius + b.radius) + FLOWER_GAP) / distance);
    }
  }
  for (const head of heads) {
    head.x *= spread;
    head.y = 0.12 + (head.y - 0.12) * spread - FLOWER_DROP;
    head.z *= spread;
    const { x, y, z, radius, tulip: isTulip } = head;
    const [ax, ay, az] = normal(x, y - STEM_BASE_Y, z);
    const attachment = radius * (isTulip ? 1.18 : 0.55);
    const baseX = x - ax * attachment;
    const baseY = y - ay * attachment;
    const baseZ = z - az * attachment;
    head.baseX = baseX;
    head.baseY = baseY;
    head.baseZ = baseZ;
    const [ux, uy, uz] = normal(ay, -ax, 0);
    const vx = ay * uz - az * uy;
    const vy = az * ux - ax * uz;
    const vz = ax * uy - ay * ux;
    // Cubic stalks rise from the bundle, bow gently, and meet each bloom along
    // its own axis. The last control point keeps the petal/calyx joint smooth.
    const length = Math.hypot(baseX, baseY - STEM_BASE_Y, baseZ);
    const radial = Math.hypot(x, z);
    const bend = 0.065 * Math.sin(head.seed * 1.7);
    const controlX = baseX * 0.10 - z / radial * bend;
    const controlY = STEM_BASE_Y + (baseY - STEM_BASE_Y) * 0.45;
    const controlZ = baseZ * 0.10 + x / radial * bend;
    const approachX = baseX - ax * length * 0.30;
    const approachY = baseY - ay * length * 0.30;
    const approachZ = baseZ - az * length * 0.30;
    for (let j = 0; j < 100; j++) {
      const t = j / 99;
      const u = 1 - t;
      const cx = 3 * u * u * t * controlX + 3 * u * t * t * approachX + t * t * t * baseX;
      const cy = STEM_BASE_Y * u * u * u + 3 * u * u * t * controlY
        + 3 * u * t * t * approachY + t * t * t * baseY;
      const cz = 3 * u * u * t * controlZ + 3 * u * t * t * approachZ + t * t * t * baseZ;
      let tx = u * u * controlX + 2 * u * t * (approachX - controlX) + t * t * (baseX - approachX);
      let ty = u * u * (controlY - STEM_BASE_Y) + 2 * u * t * (approachY - controlY)
        + t * t * (baseY - approachY);
      let tz = u * u * controlZ + 2 * u * t * (approachZ - controlZ) + t * t * (baseZ - approachZ);
      const inverseLength = 1 / Math.hypot(tx, ty, tz);
      tx *= inverseLength;
      ty *= inverseLength;
      tz *= inverseLength;
      const crossLength = Math.hypot(tx, ty);
      const localUX = ty / crossLength;
      const localUY = -tx / crossLength;
      const localVX = -tz * localUY;
      const localVY = tz * localUX;
      const localVZ = tx * localUY - ty * localUX;
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * TAU;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const nx = localUX * c + localVX * s;
        const ny = localUY * c + localVY * s;
        const nz = localVZ * s;
        point(cx + nx * 0.006, cy + ny * 0.006, cz + nz * 0.006, nx, ny, nz, 3, -0.04);
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

  const flowers = buildFlowerMesh(heads);

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
  const y0 = -0.45;
  const y1 = 0.30;
  const r0 = 0.06;
  let r1 = r0;
  function encloseInPaper(x, y, z) {
    const radius = Math.hypot(x, z);
    // All blooms fit within the mouth's outline. Below its folded edge, leave
    // clearance from the actual cone wall, including the highest paper fold.
    r1 = Math.max(r1, radius + 0.04);
    if (y > y1 + 0.03) return;
    const t = (y - y0 - 0.03) / (y1 - y0);
    r1 = Math.max(r1, r0 + (radius + 0.02 - r0) / t);
  }
  for (let i = 0; i < flowers.positions.length; i += 3) {
    encloseInPaper(flowers.positions[i], flowers.positions[i + 1], flowers.positions[i + 2]);
  }
  for (let i = 0; i < points.length; i += 8) encloseInPaper(points[i], points[i + 1], points[i + 2]);
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
      const bend = 0.012 * Math.sin(Math.PI * t) * Math.sin(angle * 1.7);
      point((0.025 * (1 + 1.2 * t) + bend) * Math.cos(angle), y0 - 0.30 * t,
        (0.025 * (1 + 1.2 * t) - bend) * Math.sin(angle), Math.cos(angle), 0, Math.sin(angle), 3, -0.08);
    }
  }

  const by = STEM_BASE_Y;
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
  return { points: new Float32Array(points), heads, babies, flowers };
}

export function createBouquet(canvas, { paused = false } = {}) {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('The bouquet requires a 2D canvas.');
  const { points, babies, flowers } = buildScene();
  const { positions: flowerPositions, normals: flowerNormals, tones: flowerTones,
    materials: flowerMaterials, indices: flowerIndices } = flowers;
  const transformedFlowers = new Float32Array(flowerMaterials.length * 4);
  let frameHalfWidth = 0;
  let frameTop = -Infinity;
  let frameBottom = Infinity;
  function includeInFrame(x, y, z) {
    const radius = Math.hypot(x, z);
    const yp = y - CAMERA_TARGET_Y;
    const denominator = CAM_DIST - yp * st;
    const depthRange = radius * ct;
    // Exact full-turn extrema: vertical projection is monotone in rotated Z;
    // horizontal projection peaks at sin(angle) = depthRange / denominator.
    frameHalfWidth = Math.max(frameHalfWidth,
      CAM_DIST * radius / Math.sqrt(denominator * denominator - depthRange * depthRange));
    const near = CAM_DIST * (yp * ct - radius * st) / (denominator - depthRange);
    const far = CAM_DIST * (yp * ct + radius * st) / (denominator + depthRange);
    frameTop = Math.max(frameTop, near, far);
    frameBottom = Math.min(frameBottom, near, far);
  }
  for (let i = 0; i < points.length; i += 8) includeInFrame(points[i], points[i + 1], points[i + 2]);
  for (let i = 0; i < flowerPositions.length; i += 3) {
    includeInFrame(flowerPositions[i], flowerPositions[i + 1], flowerPositions[i + 2]);
  }
  for (const baby of babies) includeInFrame(baby.x, baby.y, baby.z);
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
    const yp = y - CAMERA_TARGET_Y;
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
    messageSize = width < 600 || height < 500 ? 12 : 15;
    messageFont = `500 ${messageSize}px ${FONT}`;
    context.font = messageFont;
    messageWidth = context.measureText(MESSAGE).width;
    const messageRows = messageSize * 2.8 / cellHeight;
    const scale = Math.max(1, Math.min((rows - 8 - messageRows) / (frameTop - frameBottom),
      (columns - 8) * cellWidth / cellHeight / (frameHalfWidth * 2)));
    scaleX = scale * cellHeight / cellWidth;
    scaleY = scale;
    centerX = columns / 2;
    const contentTop = (rows - ((frameTop - frameBottom) * scale + messageRows)) / 2;
    centerY = contentTop + frameTop * scale;
    messageY = (contentTop + (frameTop - frameBottom) * scale + messageRows * 0.6) * cellHeight;
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
