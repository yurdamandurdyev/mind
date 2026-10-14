// Lateral brain silhouette, including the cerebellum and the descending stem.
// Fibers, clipping and category hit areas use the same coordinate system.
export const BRAIN_VIEWBOX = { width: 760, height: 600 };
export const BRAIN_OUTLINE = `M 80,290
 C 55,260 57,220 78,180 C 105,112 178,70 259,51
 C 351,24 451,39 520,76 C 593,109 643,164 662,227
 C 688,262 690,307 675,344 C 695,375 672,425 635,445
 C 606,469 562,472 527,453 C 506,463 500,489 515,526
 L 539,582 C 515,576 496,551 481,524 L 446,469
 C 421,444 399,428 364,425 C 326,444 284,437 256,413
 C 208,424 164,406 146,378 C 108,367 87,333 80,290 Z`;
const HULL = [
  [80, 290],
  [63, 240],
  [78, 180],
  [120, 120],
  [185, 80],
  [259, 51],
  [350, 36],
  [440, 44],
  [520, 76],
  [590, 121],
  [638, 177],
  [662, 227],
  [680, 280],
  [675, 344],
  [679, 384],
  [635, 445],
  [580, 465],
  [527, 453],
  [505, 479],
  [515, 526],
  [539, 582],
  [510, 563],
  [481, 524],
  [446, 469],
  [407, 437],
  [364, 425],
  [310, 436],
  [256, 413],
  [205, 412],
  [166, 397],
  [146, 378],
  [105, 350],
];
function inside(x, y) {
  let contained = false;
  for (let i = 0, j = HULL.length - 1; i < HULL.length; j = i++) {
    const [xi, yi] = HULL[i],
      [xj, yj] = HULL[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      contained = !contained;
  }
  return contained;
}
function createFibers() {
  let seed = 113;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const points = [];
  while (points.length < 220) {
    const x = 60 + random() * 630,
      y = 35 + random() * 550;
    if (inside(x, y)) points.push([x, y]);
  }
  const bundles = Array.from({ length: 12 }, () => []);
  const edges = new Set();
  points.forEach(([x, y], i) => {
    const neighbors = points
      .map(([nx, ny], j) => ({ j, d: Math.hypot(nx - x, ny - y) }))
      .filter((p) => p.j !== i)
      .sort((a, b) => a.d - b.d);
    const connected = [...neighbors.slice(0, 5), neighbors[12], neighbors[25]];
    for (const { j } of connected) {
      const key = [Math.min(i, j), Math.max(i, j)].join("-");
      if (edges.has(key)) continue;
      edges.add(key);
      const [nx, ny] = points[j],
        bend = (random() - 0.5) * 28;
      const cx = (x + nx) / 2 + bend,
        cy = (y + ny) / 2 - bend;
      bundles[(i + j) % bundles.length].push(
        `M${x.toFixed(1)},${y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${nx.toFixed(1)},${ny.toFixed(1)}`,
      );
    }
  });
  return {
    bundles: bundles.map((paths) => paths.join(" ")),
    points: points.filter((_, i) => i % 3 === 0),
  };
}
// Generated once. No geometry calculations or React updates on animation frames.
export const FIBERS = createFibers();
export const NODES_PER_PAGE = 12;
export const NODE_POSITIONS = [
  [210, 145],
  [350, 115],
  [500, 155],
  [175, 245],
  [335, 225],
  [560, 245],
  [235, 325],
  [405, 305],
  [555, 345],
  [320, 385],
  [460, 395],
  [600, 305],
];
export function nodePosition(index) {
  return NODE_POSITIONS[index % NODES_PER_PAGE];
}
