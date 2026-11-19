const TAU = Math.PI * 2;
const ELEVATION = 0.44;
const GLYPHS = ' .,:;~+*x%@(){}|/\\=-';
const MATERIALS = [
  [247, 184, 207], // rose pink
  [247, 229, 160], // butter yellow
  [173, 211, 239], // baby blue
  [113, 157, 122], // stems
  [151, 185, 141], // leaves
  [182, 172, 151], // folded paper
  [221, 160, 181], // ribbon
];

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function makeGeometry() {
  const positions = [];
  const normals = [];
  const materials = [];
  const characters = [];
  const p = [0, 0, 0];
  const du = [0, 0, 0];
  const dv = [0, 0, 0];
  const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];

  function frame(x, z) {
    const length = Math.hypot(x, 1, z);
    const ax = x / length;
    const ay = 1 / length;
    const az = z / length;
    const side = Math.hypot(ax, ay);
    const ux = ay / side;
    const uy = -ax / side;
    return [ux, uy, 0, ax, ay, az, uy * az, -ux * az, ux * ay - uy * ax];
  }

  // Sample real surfaces, retaining normals for lighting after rotation.
  function surface(fn, stepsU, stepsV, material, symbols, origin = [0, 0, 0], basis = identity) {
    for (let u = 0; u <= stepsU; u++) {
      for (let v = 0; v <= stepsV; v++) {
        const a = u / stepsU;
        const b = v / stepsV;
        fn(a, b, p);
        fn(a + 0.001, b, du);
        fn(a, b + 0.001, dv);
        const ux = du[0] - p[0];
        const uy = du[1] - p[1];
        const uz = du[2] - p[2];
        const vx = dv[0] - p[0];
        const vy = dv[1] - p[1];
        const vz = dv[2] - p[2];
        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;
        const length = Math.hypot(nx, ny, nz) || 1;
        nx /= length;
        ny /= length;
        nz /= length;
        positions.push(
          origin[0] + basis[0] * p[0] + basis[3] * p[1] + basis[6] * p[2],
          origin[1] + basis[1] * p[0] + basis[4] * p[1] + basis[7] * p[2],
          origin[2] + basis[2] * p[0] + basis[5] * p[1] + basis[8] * p[2],
        );
        normals.push(
          basis[0] * nx + basis[3] * ny + basis[6] * nz,
          basis[1] * nx + basis[4] * ny + basis[7] * nz,
          basis[2] * nx + basis[5] * ny + basis[8] * nz,
        );
        materials.push(material);
        // Fixed texture: the flowers do not sparkle or change glyphs each frame.
        const hash = (u * 17 + v * 31 + Math.floor(a * b * 97)) % symbols.length;
        characters.push(GLYPHS.indexOf(symbols[hash]));
      }
    }
  }

  function stem(origin, index) {
    const footX = Math.sin(index * 2.4) * 0.20;
    const footZ = Math.cos(index * 2.4) * 0.18;
    surface((t, s, out) => {
      const bend = Math.sin(t * Math.PI) * 0.14;
      const radius = 0.035;
      out[0] = footX * (1 - t) + origin[0] * t + bend + Math.cos(s * TAU) * radius;
      out[1] = -3.60 + (origin[1] + 3.60) * t;
      out[2] = footZ * (1 - t) + origin[2] * t + Math.sin(s * TAU) * radius;
    }, 80, 5, 3, '|/\\:');

    // Narrow, folded lance-shaped leaves grow out of the stems, not the heads.
    for (let leaf = 0; leaf < 2; leaf++) {
      const t = 0.37 + leaf * 0.19;
      const root = [footX * (1 - t) + origin[0] * t, -3.6 + (origin[1] + 3.6) * t,
        footZ * (1 - t) + origin[2] * t];
      const angle = index * 2.399 + leaf * 2.1;
      const reach = 1.05 + (index % 3) * 0.16;
      surface((u, v, out) => {
        const across = (v - 0.5) * 2;
        const width = Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.8) * 0.18;
        const outward = reach * u;
        out[0] = root[0] + Math.cos(angle) * outward - Math.sin(angle) * width * across;
        out[1] = root[1] + 1.18 * u - 0.34 * u * u + Math.abs(across) * width * 0.45;
        out[2] = root[2] + Math.sin(angle) * outward + Math.cos(angle) * width * across;
      }, 26, 6, 4, '/\\|+:');
    }
  }

  function tulip(origin, radius, material, index) {
    const basis = frame(origin[0] * 0.09, origin[2] * 0.08);
    stem([origin[0], origin[1] - 0.52, origin[2]], index);
    for (let layer = 0; layer < 2; layer++) {
      for (let petal = 0; petal < 3; petal++) {
        const angle = petal * TAU / 3 + layer * Math.PI / 3 + index * 0.53;
        surface((t, s, out) => {
          const across = (s - 0.5) * 2;
          const spread = 1.10 * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.43);
          const theta = angle + across * spread;
          const r = radius * (0.13 + 0.87 * Math.sin(t * Math.PI * 0.83)) * (layer ? 0.88 : 1);
          const ridge = 1 + 0.035 * Math.cos(across * Math.PI * 3) * Math.sin(t * Math.PI);
          out[0] = Math.cos(theta) * r * ridge;
          out[1] = -0.57 + t * radius * (layer ? 2.20 : 2.06)
            + 0.12 * (1 - across * across) * Math.pow(t, 5);
          out[2] = Math.sin(theta) * r * ridge;
        }, 25, 19, material, '()|/\\{}%', origin, basis);
      }
    }
  }

  function carnation(origin, radius, material, index) {
    const basis = frame(origin[0] * 0.11, origin[2] * 0.09);
    stem([origin[0], origin[1] - radius * 0.50, origin[2]], index);
    for (let ring = 0; ring < 7; ring++) {
      const f = ring / 6;
      const petals = 5 + ring * 2;
      for (let petal = 0; petal < petals; petal++) {
        const phase = petal * TAU / petals + ring * 1.91 + index;
        surface((t, s, out) => {
          const across = (s - 0.5) * 2;
          const theta = phase + across * Math.PI / petals * 1.12;
          const r = radius * (0.08 + f * 0.73 + t * (0.20 + f * 0.14));
          const frill = (Math.sin(across * 17 + phase * 3 + t * 9)
            + 0.45 * Math.sin(across * 33 - t * 13)) * 0.052 * t * t;
          out[0] = Math.cos(theta) * (r + frill * 0.45);
          out[1] = radius * (0.49 - f * 0.42 + 0.16 * Math.sin(t * Math.PI)
            - 0.32 * f * t * t + frill);
          out[2] = Math.sin(theta) * (r + frill * 0.45);
        }, 10, 11, material, '*+x%~{}', origin, basis);
      }
    }
    // Drooping outer ruffles give the rosette volume even from its back.
    for (let petal = 0; petal < 15; petal++) {
      const phase = petal * TAU / 15 + index;
      surface((t, s, out) => {
        const across = (s - 0.5) * 2;
        const theta = phase + across * 0.25;
        const r = radius * (0.89 - 0.48 * t + 0.12 * Math.sin(t * Math.PI));
        const frill = Math.sin(across * 19 + t * 10 + phase) * 0.045;
        out[0] = Math.cos(theta) * (r + frill);
        out[1] = radius * (-0.12 - t * 0.46 + frill);
        out[2] = Math.sin(theta) * (r + frill);
      }, 8, 10, material, '*+x~%', origin, basis);
    }
  }

  // An irregular, rounded arrangement: tall cups behind full, lower rosettes.
  tulip([-2.00, 2.65, -0.35], 0.64, 1, 0);
  tulip([0.00, 3.04, 0.42], 0.62, 2, 1);
  tulip([1.98, 2.65, -0.45], 0.66, 0, 2);
  tulip([1.23, 1.95, -1.70], 0.62, 1, 3);
  tulip([-1.15, 1.76, -1.80], 0.60, 2, 4);
  carnation([-1.54, 1.20, 1.10], 0.88, 0, 5);
  carnation([1.48, 1.10, 1.20], 0.87, 2, 6);
  carnation([-0.08, 0.56, 1.85], 0.79, 1, 7);
  carnation([0.34, 2.40, -0.82], 0.88, 0, 8);

  // Two open, softly folded paper sheets; the stems remain visible above them.
  for (let sheet = 0; sheet < 2; sheet++) {
    surface((t, s, out) => {
      const theta = s * Math.PI * 1.28 + sheet * Math.PI + 0.22;
      const radius = 0.30 + t * 1.11;
      const fold = 1 + 0.08 * Math.cos(theta * 6);
      out[0] = Math.cos(theta) * radius * fold;
      out[1] = -3.30 + t * 2.57 + Math.pow(t, 5) * (0.23 * Math.sin(theta * 3 + sheet));
      out[2] = Math.sin(theta) * radius * fold;
    }, 45, 64, 5, ':;/\\=');
  }

  // A narrow tie and two loops, modelled in space rather than drawn over it.
  surface((t, s, out) => {
    const theta = t * TAU;
    out[0] = Math.cos(theta) * 0.60;
    out[1] = -2.65 + (s - 0.5) * 0.19;
    out[2] = Math.sin(theta) * 0.60;
  }, 70, 4, 6, '=+');
  for (let side = -1; side <= 1; side += 2) {
    surface((t, s, out) => {
      const theta = t * TAU;
      out[0] = side * (0.12 + 0.43 * (1 - Math.cos(theta)));
      out[1] = -2.58 + Math.sin(theta) * 0.26 + (s - 0.5) * 0.10;
      out[2] = 0.65 + Math.sin(theta) * 0.12;
    }, 48, 3, 6, '~=+');
    surface((t, s, out) => {
      out[0] = side * (0.14 + t * 0.26) + (s - 0.5) * 0.12;
      out[1] = -2.63 - t * 0.66;
      out[2] = 0.66 + Math.sin(t * Math.PI) * 0.14;
    }, 20, 3, 6, '/\\=');
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    materials: new Uint8Array(materials),
    characters: new Uint8Array(characters),
  };
}

/** A self-contained, orthographically projected 3D ASCII bouquet. */
export function createBouquet(canvas, { paused = false } = {}) {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('A 2D canvas is required to render the bouquet.');

  const geometry = makeGeometry();
  const { positions, normals, materials, characters } = geometry;
  const count = materials.length;
  const cosElevation = Math.cos(ELEVATION);
  const sinElevation = Math.sin(ELEVATION);
  const palette = MATERIALS.map((rgb) => Array.from({ length: 12 }, (_, shade) => {
    const light = 0.72 + shade * 0.026;
    return `rgb(${Math.round(rgb[0] * light)},${Math.round(rgb[1] * light)},${Math.round(rgb[2] * light)})`;
  }));

  // Fit a complete revolution, not merely the opening view.
  let radius = 0;
  let low = Infinity;
  let high = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    const radial = Math.hypot(positions[i], positions[i + 2]);
    radius = Math.max(radius, radial);
    low = Math.min(low, positions[i + 1] * cosElevation - radial * sinElevation);
    high = Math.max(high, positions[i + 1] * cosElevation + radial * sinElevation);
  }
  const middle = (low + high) * 0.5;

  let width = 0;
  let height = 0;
  let columns = 0;
  let rows = 0;
  let cellWidth = 0;
  let cellHeight = 0;
  let scale = 0;
  let depth = new Float32Array(0);
  let cells = new Int32Array(0);
  let shades = new Uint8Array(0);
  let angle = -0.24;
  let frame = 0;
  let lastTime = 0;
  let destroyed = false;
  let isPaused = Boolean(paused);
  let pointer = null;
  let previousX = 0;
  let dragStartX = 0;
  let dragStartAngle = 0;

  function requestDraw() {
    if (!destroyed && !document.hidden && !frame) frame = requestAnimationFrame(draw);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    if (width <= 0 || height <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fontSize = clamp(width / 64, 9, 13);
    cellWidth = fontSize * 0.61;
    cellHeight = fontSize * 0.94;
    columns = Math.ceil(width / cellWidth);
    rows = Math.ceil(height / cellHeight);
    depth = new Float32Array(columns * rows);
    cells = new Int32Array(columns * rows);
    shades = new Uint8Array(columns * rows);
    scale = Math.min((width - cellWidth * 5) / (radius * 2), (height - cellHeight * 5) / (high - low));
    context.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    requestDraw();
  }

  function draw(time) {
    frame = 0;
    if (destroyed || document.hidden || !width || !height) return;
    // Cap glyph rasterization at 30fps while keeping rotation time-based.
    if (!isPaused && pointer === null && lastTime && time - lastTime < 30) {
      requestDraw();
      return;
    }
    if (!isPaused && pointer === null && lastTime) {
      angle += Math.min((time - lastTime) / 1000, 0.10) * 0.23;
    }
    lastTime = time;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    depth.fill(-Infinity);
    cells.fill(-1);

    for (let point = 0, i = 0; point < count; point++, i += 3) {
      const x = positions[i] * cosine + positions[i + 2] * sine;
      const z = -positions[i] * sine + positions[i + 2] * cosine;
      const y = positions[i + 1] * cosElevation - z * sinElevation;
      const distance = positions[i + 1] * sinElevation + z * cosElevation;
      const column = Math.floor((width * 0.5 + x * scale) / cellWidth);
      const row = Math.floor((height * 0.5 - (y - middle) * scale) / cellHeight);
      if (column < 0 || column >= columns || row < 0 || row >= rows) continue;
      const cell = row * columns + column;
      if (distance <= depth[cell]) continue;
      depth[cell] = distance;
      cells[cell] = point;
      const nx = normals[i] * cosine + normals[i + 2] * sine;
      const nz = -normals[i] * sine + normals[i + 2] * cosine;
      // Petals and paper are two-sided. A soft key light retains pastel color.
      const light = Math.abs(nx * -0.35 + normals[i + 1] * 0.78 + nz * 0.52);
      shades[cell] = clamp(Math.round(3 + light * 7 + distance * 0.20), 0, 11);
    }

    context.clearRect(0, 0, width, height);
    let previousColor = '';
    for (let row = 0, cell = 0; row < rows; row++) {
      const y = (row + 0.5) * cellHeight;
      for (let column = 0; column < columns; column++, cell++) {
        const point = cells[cell];
        if (point < 0) continue;
        const color = palette[materials[point]][shades[cell]];
        if (color !== previousColor) {
          context.fillStyle = color;
          previousColor = color;
        }
        context.fillText(GLYPHS[characters[point]], (column + 0.5) * cellWidth, y);
      }
    }
    if (!isPaused && pointer === null) requestDraw();
  }

  function pointerDown(event) {
    if (pointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointer = event.pointerId;
    previousX = event.clientX;
    dragStartX = event.clientX;
    dragStartAngle = angle;
    canvas.setPointerCapture(pointer);
    canvas.style.cursor = 'grabbing';
    lastTime = 0;
  }

  function pointerMove(event) {
    if (event.pointerId !== pointer) return;
    previousX = event.clientX;
    angle = dragStartAngle + (previousX - dragStartX) * 0.009;
    requestDraw();
  }

  function pointerUp(event) {
    if (event.pointerId !== pointer) return;
    const captured = pointer;
    pointer = null;
    if (canvas.hasPointerCapture(captured)) canvas.releasePointerCapture(captured);
    canvas.style.cursor = originalCursor;
    lastTime = 0;
    requestDraw();
  }

  function visibilityChange() {
    lastTime = 0;
    if (document.hidden) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    } else {
      requestDraw();
    }
  }

  const originalCursor = canvas.style.cursor;
  const originalTouchAction = canvas.style.touchAction;
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  canvas.addEventListener('lostpointercapture', pointerUp);
  document.addEventListener('visibilitychange', visibilityChange);
  window.addEventListener('resize', resize);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  return {
    setPaused(value) {
      if (destroyed) return;
      isPaused = Boolean(value);
      lastTime = 0;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      requestDraw();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibilityChange);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerUp);
      canvas.removeEventListener('lostpointercapture', pointerUp);
      if (pointer !== null && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
      canvas.style.cursor = originalCursor;
      canvas.style.touchAction = originalTouchAction;
    },
  };
}
