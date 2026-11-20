const TAU = Math.PI * 2;
const DEPTH = -50;

// Wide character-cell silhouettes keep two distinct lobes and a pointed base.
const HEART_MASKS = [
  [
    ' .+. .+. ',
    '+***+***+',
    '.*******.',
    ' .*****. ',
    '  .***.  ',
    '    +    ',
  ],
  [
    ' .++. .++. ',
    '+****+****+',
    '.*********.',
    ' .*******. ',
    '   .***.   ',
    '     +     ',
  ],
  [
    '  .++. .++.  ',
    ' +****+****+ ',
    '+***********+',
    '.***********.',
    '  .*******.  ',
    '    .***.    ',
    '      +      ',
  ],
];

// Horizontal anchors, initial journey phases, and pastel materials are deliberate:
// the first six also form the complete composition on a narrow screen.
const HEART_LAYOUT = [
  [0.08, 0.72, 0],
  [0.88, 0.18, 2],
  [0.23, 0.36, 1],
  [0.76, 0.62, 0],
  [0.06, 0.15, 2],
  [0.94, 0.86, 1],
  [0.40, 0.88, 0],
  [0.62, 0.43, 2],
  [0.31, 0.59, 1],
  [0.71, 0.11, 0],
];

const smoothstep = (value) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

export function createAmbience({ glyph, shades }) {
  const maxLevel = shades - 1;
  const dot = glyph('.');
  const plus = glyph('+');
  const asterisk = glyph('*');
  const masks = HEART_MASKS.map((lines) => {
    let count = 0;
    for (let row = 0; row < lines.length; row++) {
      for (let col = 0; col < lines[row].length; col++) {
        if (lines[row][col] !== ' ') count++;
      }
    }
    const cells = new Uint16Array(count * 3);
    const light = new Float32Array(count);
    let index = 0;
    for (let row = 0; row < lines.length; row++) {
      for (let col = 0; col < lines[row].length; col++) {
        const char = lines[row][col];
        if (char === ' ') continue;
        cells[index * 3] = col;
        cells[index * 3 + 1] = row;
        cells[index * 3 + 2] = glyph(char);
        light[index] = char === '.' ? 0.60 : char === '+' ? 0.88 : 1;
        index++;
      }
    }
    return { width: lines[0].length, height: lines.length, count, cells, light };
  });

  // Fixed-seed positions avoid both random frame-to-frame noise and a star grid.
  const stars = new Float64Array(42 * 6);
  let seed = 0x734a21;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let index = 0; index < 42; index++) {
    const offset = index * 6;
    stars[offset] = random();
    stars[offset + 1] = random();
    stars[offset + 2] = random() * TAU;
    stars[offset + 3] = 0.30 + random() * 0.32;
    stars[offset + 4] = index % 5 === 0 ? index % 3 : 6;
    stars[offset + 5] = index % 7 === 0 ? plus : index % 3 === 0 ? asterisk : dot;
  }

  function draw(time, columns, rows, plot) {
    // Leave the final three rows untouched for the dedication.
    if (columns < 5 || rows < 7) return;
    const starCount = Math.min(42, Math.max(12, Math.floor(columns * (rows - 3) / 210)));
    for (let index = 0; index < starCount; index++) {
      const offset = index * 6;
      const col = 2 + Math.floor(stars[offset] * (columns - 4));
      const row = 1 + Math.floor(stars[offset + 1] * (rows - 5));
      const wave = 0.5 + 0.5 * Math.sin(time * TAU * stars[offset + 3] + stars[offset + 2]);
      const brightness = 0.12 + 0.58 * wave * wave;
      const material = stars[offset + 4] * shades;
      const level = Math.max(1, Math.round(maxLevel * brightness));
      const char = wave > 0.80 ? asterisk : wave > 0.45 ? stars[offset + 5] : dot;
      plot(col, row, DEPTH, char, material + level);

      // Only a few glints grow tiny arms; their dimmer tips pulse continuously.
      if (index % 17 === 0 && columns >= 24 && rows >= 14) {
        const tipLevel = Math.max(1, Math.round(maxLevel * brightness * 0.52));
        plot(col - 1, row, DEPTH, dot, material + tipLevel);
        plot(col + 1, row, DEPTH, dot, material + tipLevel);
        plot(col, row - 1, DEPTH, dot, material + tipLevel);
        plot(col, row + 1, DEPTH, dot, material + tipLevel);
      }
    }

    const narrow = columns < 132;
    const heartCount = narrow || rows < 28 ? 6 : 10;
    for (let index = 0; index < heartCount; index++) {
      const layout = HEART_LAYOUT[index];
      const maskIndex = narrow ? (columns >= 42 ? index % 2 : 0) : index % masks.length;
      const mask = masks[maskIndex];
      const verticalTravel = rows - mask.height - 4;
      if (columns < mask.width + 4 || verticalTravel < 1) continue;

      const progress = (layout[1] + time * (0.025 + (index % 4) * 0.005)) % 1;
      // Fade the whole silhouette before its journey wraps; never crop at edges.
      const fade = smoothstep(progress / 0.12) * smoothstep((1 - progress) / 0.12);
      if (fade < 0.015) continue;
      const sway = Math.min(2.5, (columns - mask.width - 4) * 0.08);
      const horizontalTravel = columns - mask.width - 4 - sway * 2;
      const left = Math.round(2 + sway + layout[0] * horizontalTravel
        + Math.sin(time * (0.19 + index * 0.009) + index * 2.17) * sway);
      const top = 1 + Math.round((1 - progress) * verticalTravel);
      const breath = 0.91 + 0.09 * Math.sin(time * 0.37 + index * 1.31);
      const brightness = fade * breath * (0.46 + (index % 3) * 0.035);
      const material = layout[2] * shades;
      for (let cell = 0; cell < mask.count; cell++) {
        const offset = cell * 3;
        const level = Math.max(1, Math.round(maxLevel * brightness * mask.light[cell]));
        plot(left + mask.cells[offset], top + mask.cells[offset + 1], DEPTH,
          mask.cells[offset + 2], material + level);
      }
    }
  }

  return { draw };
}
