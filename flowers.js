const TAU = Math.PI * 2;

// Each row shares its vertices with the next. Only the attachment pole is
// collapsed; the remaining triangles describe continuous, two-sided petals.
const TULIP_ROWS = 24;
const TULIP_COLUMNS = 14;
const CARNATION_ROWS = 8;
const CARNATION_COLUMNS = 10;
const CARNATION_LAYERS = [
  { count: 10, radius: 1.04, root: -0.55, rim: -0.23, arch: 0.49 },
  { count: 9, radius: 0.93, root: -0.40, rim: 0.13, arch: 0.43 },
  { count: 8, radius: 0.76, root: -0.23, rim: 0.43, arch: 0.35 },
  { count: 6, radius: 0.55, root: -0.08, rim: 0.65, arch: 0.27 },
  { count: 4, radius: 0.33, root: 0.18, rim: 0.79, arch: 0.19 },
];

function randomFromSeed(seed) {
  let state = (Math.floor(seed * 1048576) ^ 0x9e3779b9) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * Construct stem-aligned petal surfaces in world coordinates, once per bouquet.
 * Local +Y points from the stem base toward the flower center. Petal normals
 * face out of the cup / above the ruffles; the renderer can shade their backs.
 */
export function buildFlowerMesh(heads) {
  let vertexCount = 0;
  let triangleCount = 0;
  for (const head of heads) {
    if (head.tulip) {
      vertexCount += 6 * (1 + TULIP_ROWS * (TULIP_COLUMNS + 1));
      triangleCount += 6 * TULIP_COLUMNS * (2 * TULIP_ROWS - 1);
    } else {
      for (const layer of CARNATION_LAYERS) {
        vertexCount += layer.count * (1 + CARNATION_ROWS * (CARNATION_COLUMNS + 1));
        triangleCount += layer.count * CARNATION_COLUMNS * (2 * CARNATION_ROWS - 1);
      }
    }
  }

  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const tones = new Float32Array(vertexCount);
  const materials = new Uint8Array(vertexCount);
  const indices = new Uint32Array(triangleCount * 3);
  let vertex = 0;
  let index = 0;

  // Reused finite-difference samples: no temporary vector per grid vertex.
  const point = new Float64Array(3);
  const left = new Float64Array(3);
  const right = new Float64Array(3);
  const lower = new Float64Array(3);
  const upper = new Float64Array(3);
  const epsilon = 0.0001;

  for (let headIndex = 0; headIndex < heads.length; headIndex++) {
    const head = heads[headIndex];
    let ax = head.x - head.baseX;
    let ay = head.y - head.baseY;
    let az = head.z - head.baseZ;
    const axisLength = Math.hypot(ax, ay, az);
    if (axisLength > 0) {
      ax /= axisLength;
      ay /= axisLength;
      az /= axisLength;
    } else {
      ax = 0;
      ay = 1;
      az = 0;
    }

    // Pick the least parallel reference, avoiding a near-zero cross product.
    let ux;
    let uy;
    let uz;
    if (Math.abs(ay) < 0.9) {
      ux = az;
      uy = 0;
      uz = -ax;
    } else {
      ux = 0;
      uy = -az;
      uz = ay;
    }
    const uLength = Math.hypot(ux, uy, uz);
    ux /= uLength;
    uy /= uLength;
    uz /= uLength;
    // U cross axis = V, so (U, axis, V) is right handed.
    const vx = uy * az - uz * ay;
    const vy = uz * ax - ux * az;
    const vz = ux * ay - uy * ax;
    const radius = head.radius;
    const material = head.material ?? headIndex % 3;
    const seed = head.seed ?? headIndex + 1;
    const random = randomFromSeed(seed);
    const rotation = random() * TAU;

    function emitVertex(surface, u, v, bias, pole = false) {
      surface(u, v, point);
      const u0 = Math.max(-1, u - epsilon);
      const u1 = Math.min(1, u + epsilon);
      const v0 = Math.max(0, v - epsilon);
      const v1 = Math.min(1, v + epsilon);
      // The pole has no angular derivative. Sample immediately above it to
      // retain the limiting normal of the tapered surface.
      const normalV = pole ? 0.0005 : v;
      surface(u0, normalV, left);
      surface(u1, normalV, right);
      surface(u, v0, lower);
      surface(u, v1, upper);
      const dux = right[0] - left[0];
      const duy = right[1] - left[1];
      const duz = right[2] - left[2];
      const dvx = upper[0] - lower[0];
      const dvy = upper[1] - lower[1];
      const dvz = upper[2] - lower[2];
      // dV cross dU faces outward for an upward-growing cup, and upward
      // for an outward-growing carnation petal.
      let nx = dvy * duz - dvz * duy;
      let ny = dvz * dux - dvx * duz;
      let nz = dvx * duy - dvy * dux;
      const length = Math.hypot(nx, ny, nz);
      if (length > 0) {
        nx /= length;
        ny /= length;
        nz /= length;
      } else {
        nx = 0;
        ny = 1;
        nz = 0;
      }
      const offset = vertex * 3;
      positions[offset] = head.x + radius * (ux * point[0] + ax * point[1] + vx * point[2]);
      positions[offset + 1] = head.y + radius * (uy * point[0] + ay * point[1] + vy * point[2]);
      positions[offset + 2] = head.z + radius * (uz * point[0] + az * point[1] + vz * point[2]);
      normals[offset] = ux * nx + ax * ny + vx * nz;
      normals[offset + 1] = uy * nx + ay * ny + vy * nz;
      normals[offset + 2] = uz * nx + az * ny + vz * nz;
      tones[vertex] = bias;
      materials[vertex] = material;
      vertex++;
    }

    function emitGrid(surface, rows, columns, tone) {
      const start = vertex;
      emitVertex(surface, 0, 0, tone(0, 0), true);
      for (let row = 1; row <= rows; row++) {
        const v = row / rows;
        for (let column = 0; column <= columns; column++) {
          const u = 2 * column / columns - 1;
          emitVertex(surface, u, v, tone(u, v));
        }
      }
      const stride = columns + 1;
      const gridStart = start + 1;
      for (let column = 0; column < columns; column++) {
        indices[index++] = start;
        indices[index++] = gridStart + column;
        indices[index++] = gridStart + column + 1;
      }
      for (let row = 0; row < rows - 1; row++) {
        for (let column = 0; column < columns; column++) {
          const a = gridStart + row * stride + column;
          const b = a + 1;
          const c = a + stride;
          const d = c + 1;
          indices[index++] = a;
          indices[index++] = c;
          indices[index++] = b;
          indices[index++] = b;
          indices[index++] = c;
          indices[index++] = d;
        }
      }
    }

    if (head.tulip) {
      // Six long oval petals overlap in staggered whorls around a narrow foot.
      // The lower-middle belly closes gently toward a small, scalloped mouth.
      // In local radius units: Y is [-1.18, 1.015], radial reach < 0.798.
      // Splitting V at 0.2 and 0.8 bounds distance from center below 1.28:
      // the broad belly never coincides with either extreme of the height.
      for (let layer = 0; layer < 2; layer++) {
        for (let petal = 0; petal < 3; petal++) {
          const angle = rotation + petal * TAU / 3 + layer * Math.PI / 3;
          const tip = 0.96 + layer * 0.035 + (random() - 0.5) * 0.04;
          const phase = random() * TAU;
          const width = 1.13 + (random() - 0.5) * 0.02;
          const surface = (u, v, out) => {
            const arch = Math.cos(u * Math.PI * 0.5);
            const rim = tip - 0.24 * (1 - arch * arch);
            const y = -1.18 + (rim + 1.18) * v;
            // Broad oval shoulders overlap; rounded tips draw inward, not out
            // into a bucket rim. Even at the foot each whorl covers the axis.
            const spread = width * (0.94 + 0.1 * Math.sin(Math.PI * v) - 0.15 * v ** 4);
            const theta = angle + u * spread;
            const belly = v * (2.4 - 2 * v + 0.14 * v * v);
            // Smooth longitudinal relief adds veins without carnation ruffles.
            const relief = Math.sin(Math.PI * v) * (
              0.019 * (1 - u * u)
              + 0.004 * Math.cos(u * Math.PI * 3 + 0.15 * Math.sin(v * Math.PI + phase))
            );
            const r = belly * (1 - layer * 0.055) + relief;
            out[0] = Math.cos(theta) * r;
            out[1] = y;
            out[2] = Math.sin(theta) * r;
          };
          const tone = (u, v) => 0.08 + 0.055 * v
            - 0.025 * Math.abs(u) ** 4 - 0.015 * (1 - v) ** 2;
          emitGrid(surface, TULIP_ROWS, TULIP_COLUMNS, tone);
        }
      }
    } else {
      // Successively smaller overlapping whorls hide the center. The outer
      // whorl rolls downward around the back instead of ending in a flat disc.
      for (let layerIndex = 0; layerIndex < CARNATION_LAYERS.length; layerIndex++) {
        const layer = CARNATION_LAYERS[layerIndex];
        const stagger = layerIndex * 0.67;
        for (let petal = 0; petal < layer.count; petal++) {
          const angle = rotation + petal * TAU / layer.count + stagger;
          const phase = random() * TAU;
          const reach = layer.radius * (0.965 + 0.07 * random());
          const rise = (random() - 0.5) * 0.055;
          const bias = (random() - 0.5) * 0.025;
          const halfWidth = Math.PI / layer.count * 1.39;
          const surface = (u, v, out) => {
            const fan = 0.78 + 0.22 * Math.sin(v * Math.PI * 0.5);
            // Reverse the angular sweep so the ruffles' front normals face up.
            const theta = angle - u * halfWidth * fan;
            const fold = Math.cos(u * Math.PI * 2.5 + phase + v * 1.8);
            const frill = Math.sin(u * Math.PI * 4 + phase + v * 2.4);
            const edge = v ** 4;
            // Broad folds remain legible at character-cell resolution; the
            // smaller rim scallops soften the silhouette without wire detail.
            const r = reach * v + edge * (0.026 * fold + 0.024 * frill);
            const y = layer.root + (layer.rim + rise - layer.root) * v
              + layer.arch * Math.sin(Math.PI * v)
              + 0.075 * u * u * Math.sin(Math.PI * v)
              + (0.012 * v + 0.047 * edge) * fold
              + 0.026 * edge * frill;
            out[0] = Math.cos(theta) * r;
            out[1] = y;
            out[2] = Math.sin(theta) * r;
          };
          const tone = (u, v) => bias - 0.12 * (1 - v) ** 2
            - 0.018 * (0.5 + 0.5 * Math.cos(u * Math.PI * 2.5 + phase + v * 1.8));
          emitGrid(surface, CARNATION_ROWS, CARNATION_COLUMNS, tone);
        }
      }
    }
  }

  return { positions, normals, tones, materials, indices };
}
