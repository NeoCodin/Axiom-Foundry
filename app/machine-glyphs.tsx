/*
 * Pixel glyphs for the Fabrication Chain's six machines, drawn on a 12x12
 * block grid. "#" is the tier colour, "+" the tier colour dimmed, "o" a lit
 * bone highlight. Colour comes from the row's --tier-accent via currentColor.
 */

const GLYPHS: readonly (readonly string[])[] = [
  // Vacuum Tap: a funnel drawing Flux out of nothing.
  [
    "............",
    ".##########.",
    "..#oo####+..",
    "...######...",
    "....####....",
    ".....##.....",
    ".....##.....",
    "....####....",
    "....#..#....",
    ".....++.....",
    "......+.....",
    ".....+......",
  ],
  // Phase Coil: a standing wave wound around a core.
  [
    "............",
    "....####....",
    "...#oo..#...",
    "....####....",
    "...#....#...",
    "....####....",
    "...#....#...",
    "....####....",
    "...#....#...",
    "....####....",
    ".....++.....",
    "....++++....",
  ],
  // Harmonic Loom: a frame, warp threads and the shuttle bar.
  [
    "............",
    ".##########.",
    ".#o+.+.+.+#.",
    ".#.+.+.+.+#.",
    ".####oo####.",
    ".#.+.+.+.+#.",
    ".#.+.+.+.+#.",
    ".#.+.+.+.+#.",
    ".##########.",
    ".#........#.",
    ".#........#.",
    "............",
  ],
  // Orbit Array: collectors circling a captured core.
  [
    "............",
    ".+...##...+.",
    "...#....#...",
    "..#..oo..#..",
    ".#..o##o..#.",
    ".#..o##o..#.",
    "..#..oo..#..",
    "...#....#...",
    ".+...##...+.",
    "............",
    "....####....",
    "...######...",
  ],
  // Constraint Engine: a bolted block with a piston at its heart.
  [
    "............",
    "..########..",
    "..#o....o#..",
    "..#.####.#..",
    "..#.#++#.#..",
    "..#.#++#.#..",
    "..#.####.#..",
    "..#o....o#..",
    "..########..",
    "....#..#....",
    "...######...",
    "............",
  ],
  // Horizon Forge: an anvil under a rising arc.
  [
    "............",
    "....####....",
    "..##....##..",
    ".#..+oo+..#.",
    ".#........#.",
    "############",
    ".##########.",
    "...######...",
    "....####....",
    "....#..#....",
    "...######...",
    "............",
  ],
];

type Run = { x: number; y: number; w: number; tone: string };

const RUNS: readonly (readonly Run[])[] = GLYPHS.map((rows) => {
  const runs: Run[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const tone = row[x];
      if (tone === ".") {
        x += 1;
        continue;
      }
      let end = x;
      while (end < row.length && row[end] === tone) end += 1;
      runs.push({ x, y, w: end - x, tone });
      x = end;
    }
  });
  return runs;
});

export function MachineGlyph({ tier }: { tier: number }) {
  const runs = RUNS[Math.max(0, Math.min(RUNS.length - 1, tier))];
  return (
    <svg className="machine-glyph" viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
      {runs.map((run, index) => (
        <rect
          key={index}
          x={run.x}
          y={run.y}
          width={run.w}
          height={1}
          fill={run.tone === "o" ? "#efe6d2" : "currentColor"}
          opacity={run.tone === "+" ? 0.55 : undefined}
        />
      ))}
    </svg>
  );
}
