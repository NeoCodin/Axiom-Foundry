/*
 * The crew's art for the drone view, painted pixel by pixel onto small canvases:
 * landscapes, photo boards of real crew faces, posters, children's crayon
 * drawings, star charts, banners, rugs and the murals painted across whole
 * bulkheads. Every piece is drawn from a seed, so the same ship always shows the
 * same pictures. ark-walk.tsx hangs them.
 */

type Paint = CanvasRenderingContext2D;

export type CrewFace = { pixels: readonly { x: number; y: number; color: string }[] };

function hash(value: number) {
  const x = Math.sin(value * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Mix two colours in sRGB. */
export function mix(from: string, to: string, amount: number) {
  const read = (hex: string) => {
    const value = Number.parseInt(hex.replace("#", "").slice(0, 6), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  };
  const a = read(from);
  const b = read(to);
  return `#${a.map((channel, index) => Math.round(channel * (1 - amount) + b[index] * amount).toString(16).padStart(2, "0")).join("")}`;
}

function dot(context: Paint, x: number, y: number, color: string, w = 1, h = 1) {
  context.fillStyle = color;
  context.fillRect(Math.round(x), Math.round(y), w, h);
}

function disc(context: Paint, cx: number, cy: number, radius: number, color: string) {
  for (let y = Math.floor(cy - radius); y <= cy + radius; y += 1) {
    for (let x = Math.floor(cx - radius); x <= cx + radius; x += 1) {
      if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= radius) dot(context, x, y, color);
    }
  }
}

function line(context: Paint, x0: number, y0: number, x1: number, y1: number, color: string) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let step = 0; step <= steps; step += 1) dot(context, x0 + ((x1 - x0) * step) / steps, y0 + ((y1 - y0) * step) / steps, color);
}

/** Text drawn through a stencil, so it lands as whole pixels rather than smoothed. */
function stencilText(context: Paint, text: string, cx: number, y: number, size: number, color: string, maxWidth: number) {
  const scratch = document.createElement("canvas");
  scratch.width = context.canvas.width;
  scratch.height = context.canvas.height;
  const pen = scratch.getContext("2d")!;
  let fontSize = size;
  do {
    pen.font = `bold ${fontSize}px monospace`;
    fontSize -= 1;
  } while (pen.measureText(text).width > maxWidth && fontSize > 4);
  pen.textAlign = "center";
  pen.textBaseline = "top";
  pen.fillStyle = "#ffffff";
  pen.fillText(text, cx, y);
  const { data } = pen.getImageData(0, 0, scratch.width, scratch.height);
  context.fillStyle = color;
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] > 120) context.fillRect(((index - 3) / 4) % scratch.width, Math.floor((index - 3) / 4 / scratch.width), 1, 1);
  }
}

/** Little pictures, seven pixels across, for posters and banners. */
const ICONS = {
  heart: [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."],
  star: ["...X...", "...X...", "XXXXXXX", ".XXXXX.", "..XXX..", ".XX.XX.", "X.....X"],
  drop: ["...X...", "..XXX..", ".XXXXX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX.."],
  gear: [".X.X.X.", "XXXXXXX", ".XX.XX.", "XX...XX", ".XX.XX.", "XXXXXXX", ".X.X.X."],
  sprout: ["XX...XX", "XXX.XXX", ".XXXXX.", "...X...", "...X...", "..XXX..", ".XXXXX."],
  ship: ["...X...", "..XXX..", "..XXX..", ".XXXXX.", "XXXXXXX", "X.XXX.X", "..X.X.."],
} as const;
export type IconName = keyof typeof ICONS;

function icon(context: Paint, name: IconName, x: number, y: number, scale: number, color: string) {
  ICONS[name].forEach((row, rowIndex) => {
    for (let column = 0; column < row.length; column += 1) {
      if (row[column] === "X") dot(context, x + column * scale, y + rowIndex * scale, color, scale, scale);
    }
  });
}

/** A ridge line across the canvas: a random walk from a seed. */
function ridge(width: number, base: number, rough: number, seed: number) {
  const heights: number[] = [];
  let y = base;
  for (let x = 0; x < width; x += 1) {
    if (x % 2 === 0) y += Math.round((hash(seed + x * 0.37) - 0.5) * rough * 2);
    y = Math.max(base - rough * 2, Math.min(base + rough * 2, y));
    heights.push(y);
  }
  return heights;
}

const SCENES = [
  { sky: ["#f8d08a", "#f29a64", "#c8607a"], sun: "#fff3c8", far: "#8a5a82", near: "#5a3c64", ground: "#3e2c4c", water: null },
  { sky: ["#cfeaff", "#a2d0f4", "#7eb4e6"], sun: "#fffbe0", far: "#9aaad0", near: "#6c9a54", ground: "#88b85a", water: null },
  { sky: ["#232a5c", "#34367a", "#5a4890"], sun: "#eeeaff", far: "#4c4282", near: "#2e2858", ground: "#3a3066", water: "#4a5aa0" },
  { sky: ["#ffeab4", "#f8cc72", "#eca452"], sun: "#fff7dc", far: "#c87e48", near: "#a2603a", ground: "#d8a05c", water: null },
  { sky: ["#ffd8ea", "#f4b0cc", "#cc92dc"], sun: "#ffffff", far: "#a072b8", near: "#7a5498", ground: "#5e4a86", water: "#e6a6cc" },
  { sky: ["#dff0ff", "#b4d8f4", "#8cbce8"], sun: "#ffffff", far: "#8a96b8", near: "#567a48", ground: "#4a6c3c", water: "#5c84d0" },
] as const;
const FRAMES = [["#3a2616", "#c9a050"], ["#5a3a24", "#8a5a36"], ["#22202a", "#d8d2c4"], ["#7a4a2a", "#e0b070"]] as const;

/** A framed landscape: somewhere someone remembers, or hopes for. One in six is the world below. */
export function paintPainting(context: Paint, width: number, height: number, seed: number, world: string) {
  const pick = Math.floor(hash(seed) * (SCENES.length + 1));
  const scene = pick < SCENES.length
    ? SCENES[pick]
    : { sky: ["#1e2050", "#2c2c66", "#433a80"], sun: "#ffe9b0", far: mix(world, "#2c2c66", 0.4), near: mix(world, "#1e2050", 0.25), ground: mix(world, "#ffffff", 0.15), water: null };
  const [outer, inner] = FRAMES[Math.floor(hash(seed * 1.7) * FRAMES.length)];
  const ix = 2;
  const iy = 2;
  const iw = width - 4;
  const ih = height - 4;
  // Sky in three bands, dithered where they meet.
  for (let y = 0; y < ih; y += 1) {
    const band = Math.min(2, Math.floor((y / (ih * 0.62)) * 3));
    for (let x = 0; x < iw; x += 1) {
      const edge = (y / (ih * 0.62)) * 3 - band;
      const next = band < 2 && edge > 0.75 && (x + y) % 2 === 0 ? band + 1 : band;
      dot(context, ix + x, iy + y, scene.sky[next]);
    }
  }
  if (pick === 2) {
    for (let star = 0; star < 9; star += 1) dot(context, ix + hash(seed + star) * iw, iy + hash(seed * 3 + star) * ih * 0.45, "#e8e4ff");
  }
  disc(context, ix + iw * (0.55 + hash(seed * 2.3) * 0.25), iy + ih * 0.28, Math.max(1.5, ih * 0.13), scene.sun);
  const far = ridge(iw, Math.round(ih * 0.55), 2, seed * 5.1);
  const near = ridge(iw, Math.round(ih * 0.72), 1, seed * 7.3);
  for (let x = 0; x < iw; x += 1) {
    for (let y = far[x]; y < ih; y += 1) dot(context, ix + x, iy + y, scene.far);
    for (let y = near[x]; y < ih; y += 1) dot(context, ix + x, iy + y, scene.near);
  }
  const groundTop = Math.round(ih * 0.86);
  for (let x = 0; x < iw; x += 1) {
    for (let y = groundTop; y < ih; y += 1) {
      const glint = scene.water && (x * 7 + y * 3) % 11 === 0;
      dot(context, ix + x, iy + y, scene.water ? (glint ? mix(scene.water, "#ffffff", 0.5) : scene.water) : scene.ground);
    }
  }
  // A few trees on the near hills, some of the time.
  if (hash(seed * 4.4) > 0.4) {
    for (let tree = 0; tree < 3; tree += 1) {
      const tx = Math.floor(hash(seed + tree * 9.1) * (iw - 2)) + 1;
      const ty = near[tx];
      dot(context, ix + tx, iy + ty - 3, mix(scene.near, "#000000", 0.35), 1, 3);
      dot(context, ix + tx - 1, iy + ty - 2, mix(scene.near, "#000000", 0.35), 3, 1);
    }
  }
  context.fillStyle = outer;
  context.fillRect(0, 0, width, 1);
  context.fillRect(0, height - 1, width, 1);
  context.fillRect(0, 0, 1, height);
  context.fillRect(width - 1, 0, 1, height);
  context.fillStyle = inner;
  context.fillRect(1, 1, width - 2, 1);
  context.fillRect(1, height - 2, width - 2, 1);
  context.fillRect(1, 1, 1, height - 2);
  context.fillRect(width - 2, 1, 1, height - 2);
}

const PASTELS = ["#f4c8c0", "#c8d4f4", "#d8f0c4", "#f4e4b0", "#e4ccf0", "#f8d8b8"];

/** A cork board of photos: real faces from the crew, pinned up by the people who love them. */
export function paintPortraits(context: Paint, width: number, height: number, seed: number, faces: readonly CrewFace[]) {
  dot(context, 0, 0, "#b88a56", width, height);
  for (let speck = 0; speck < (width * height) / 9; speck += 1) {
    dot(context, hash(seed + speck * 1.3) * width, hash(seed * 2 + speck * 0.7) * height, hash(speck) > 0.5 ? "#a47848" : "#c99c66");
  }
  const slots = [[2, 1], [16, 2], [30, 1], [3, 15], [17, 16], [31, 15]];
  slots.forEach(([sx, sy], index) => {
    const face = index < faces.length ? faces[index] : null;
    if (!face) {
      // An empty spot gets a note instead.
      dot(context, sx + 2, sy + 2, PASTELS[(index + 2) % PASTELS.length], 8, 8);
      for (let row = 0; row < 3; row += 1) dot(context, sx + 3, sy + 4 + row * 2, "#7a6a5a", 6, 1);
      dot(context, sx + 6, sy + 1, "#d8443a");
      return;
    }
    dot(context, sx, sy, "#f4f1e8", 12, 14);
    dot(context, sx + 1, sy + 1, PASTELS[Math.floor(hash(seed + index * 3.7) * PASTELS.length)], 10, 10);
    for (const pixel of face.pixels) {
      const px = pixel.x - 2;
      const py = pixel.y - 2;
      if (px >= 0 && px < 10 && py >= 0 && py < 10) dot(context, sx + 1 + px, sy + 1 + py, pixel.color);
    }
    dot(context, sx + 3, sy + 12, "#9a8e80", 6, 1);
    dot(context, sx + 5, sy, hash(seed + index) > 0.5 ? "#d8443a" : "#3a6ae8", 2, 1);
  });
}

type PosterDesign = { lines: readonly [string, string]; icon: IconName; paper: string; ink: string };
const POSTERS: Record<string, readonly PosterDesign[]> = {
  habitation: [
    { lines: ["ONE SHIP", "ONE PEOPLE"], icon: "heart", paper: "#e2786a", ink: "#fff4e0" },
    { lines: ["THE SHIP", "NEVER LANDS"], icon: "ship", paper: "#3e4a8a", ink: "#ffd27a" },
    { lines: ["WE KEEP", "THE LIGHT"], icon: "star", paper: "#f2c744", ink: "#3a2a1a" },
  ],
  education: [
    { lines: ["ASK", "WHY"], icon: "star", paper: "#7d8cf0", ink: "#ffffff" },
    { lines: ["A B C", "1 2 3"], icon: "sprout", paper: "#f4efe2", ink: "#c8503a" },
  ],
  support: [
    { lines: ["WATER", "IS LIFE"], icon: "drop", paper: "#4f7ad8", ink: "#ffffff" },
    { lines: ["GROW", "TOGETHER"], icon: "sprout", paper: "#7cc35a", ink: "#20381a" },
    { lines: ["WASH", "YOUR HANDS"], icon: "drop", paper: "#f4efe2", ink: "#3a6a2a" },
  ],
  research: [
    { lines: ["KNOW THE", "STARS"], icon: "star", paper: "#2a2f66", ink: "#c9d0ff" },
    { lines: ["ASK", "WHY"], icon: "star", paper: "#7d8cf0", ink: "#ffffff" },
  ],
  fabrication: [
    { lines: ["SAFETY", "FIRST"], icon: "gear", paper: "#f2c744", ink: "#2a2218" },
    { lines: ["EVERY BOLT", "COUNTS"], icon: "gear", paper: "#e8963a", ink: "#2a1a10" },
    { lines: ["MIND", "THE PRESS"], icon: "gear", paper: "#d85a4a", ink: "#fff2e0" },
  ],
  hangar: [
    { lines: ["COME HOME", "SAFE"], icon: "ship", paper: "#ee7a3c", ink: "#2a1a10" },
    { lines: ["SEALS", "CHECKED?"], icon: "gear", paper: "#f2c744", ink: "#2a2218" },
  ],
  bridge: [{ lines: ["HOLD", "STEADY"], icon: "star", paper: "#a27ef0", ink: "#ffffff" }],
};

/** A printed poster: a picture and two lines, in the room's own spirit. */
export function paintPoster(context: Paint, width: number, height: number, seed: number, room: string) {
  const designs = POSTERS[room] ?? POSTERS.habitation;
  const design = designs[Math.floor(hash(seed) * designs.length)];
  dot(context, 0, 0, design.paper, width, height);
  const rim = mix(design.paper, design.ink, 0.35);
  dot(context, 2, 2, rim, width - 4, 1);
  dot(context, 2, height - 3, rim, width - 4, 1);
  dot(context, 2, 2, rim, 1, height - 4);
  dot(context, width - 3, 2, rim, 1, height - 4);
  const scale = Math.max(1, Math.floor(width / 13));
  icon(context, design.icon, Math.round(width / 2 - 3.5 * scale), Math.round(height * 0.12), scale, design.ink);
  stencilText(context, design.lines[0], width / 2, Math.round(height * 0.6), 8, design.ink, width - 6);
  stencilText(context, design.lines[1], width / 2, Math.round(height * 0.6) + 10, 8, design.ink, width - 6);
  for (const [x, y] of [[1, 1], [width - 2, 1]]) dot(context, x, y, "#d8d2c4");
}

const CRAYONS = ["#e8443a", "#3a6ae8", "#f2c02a", "#3aa040", "#9a4ad8", "#f08a2a", "#5a3a2a"];

/** A child's crayon drawing on a sheet of paper. */
export function paintDrawing(context: Paint, width: number, height: number, seed: number) {
  const papers = ["#f6f1e4", "#fde6ef", "#e6f0ff", "#fff6c8"];
  dot(context, 0, 0, papers[Math.floor(hash(seed * 1.9) * papers.length)], width, height);
  const crayon = (index: number) => CRAYONS[(index + Math.floor(hash(seed) * 7)) % CRAYONS.length];
  const variant = Math.floor(hash(seed * 2.7) * 5);
  if (variant === 0) {
    disc(context, 3, 3, 2, "#f2c02a");
    for (const [x, y] of [[6, 1], [6, 4], [1, 6], [4, 6]]) dot(context, x, y, "#f2c02a");
    dot(context, 8, 6, "#8a5a3a", 5, 4);
    line(context, 7, 6, 10, 3, "#e8443a");
    line(context, 10, 3, 13, 6, "#e8443a");
    dot(context, 10, 8, "#3a6ae8", 1, 2);
    dot(context, 0, height - 2, "#3aa040", width, 1);
  } else if (variant === 1) {
    for (let figure = 0; figure < 3; figure += 1) {
      const fx = 3 + figure * 5;
      const color = crayon(figure);
      dot(context, fx, 4, color, 2, 2);
      dot(context, fx, 6, color, 2, 3);
      line(context, fx - 1, 7, fx + 2, 7, color);
      dot(context, fx, 9, color, 1, 2);
      dot(context, fx + 1, 9, color, 1, 2);
    }
    for (const [x, y] of [[7, 0], [9, 0], [6, 1], [10, 1], [7, 2], [9, 2], [8, 3], [8, 1], [7, 1], [9, 1], [8, 2]]) dot(context, x, y, "#e8443a");
  } else if (variant === 2) {
    for (let star = 0; star < 6; star += 1) dot(context, hash(seed + star) * width, hash(seed * 4 + star) * 4, "#f2c02a");
    dot(context, 2, 6, "#8a86a8", width - 4, 3);
    dot(context, 1, 7, "#8a86a8", 1, 1);
    for (let window = 3; window < width - 3; window += 2) dot(context, window, 7, "#f2c02a");
    disc(context, width / 2, 7.5, 1.5, "#f08a2a");
  } else if (variant === 3) {
    disc(context, 5, 8, 3.5, "#3aa040");
    dot(context, 3, 7, "#3a6ae8", 2, 2);
    dot(context, 6, 9, "#3a6ae8", 2, 1);
    dot(context, 11, 2, "#e8443a", 2, 5);
    dot(context, 11, 1, "#ffffff", 2, 1);
    dot(context, 11, 7, "#f08a2a", 2, 2);
  } else {
    ["#e8443a", "#f08a2a", "#f2c02a", "#3aa040", "#3a6ae8"].forEach((color, ring) => {
      for (let x = ring; x < width - ring; x += 1) {
        const rise = Math.sqrt(Math.max(0, 1 - ((x - width / 2) / (width / 2 - ring)) ** 2));
        dot(context, x, height - 3 - Math.round(rise * (height - 5 - ring)) + ring, color);
      }
    });
  }
  dot(context, 0, 0, "#efe4a0", 2, 1);
  dot(context, width - 2, 0, "#efe4a0", 2, 1);
}

/** A star chart: the stars near the Ark, a constellation or two, and the course to the world below. */
export function paintChart(context: Paint, width: number, height: number, seed: number, world: string) {
  dot(context, 0, 0, "#232a62", width, height);
  for (let x = 4; x < width; x += 5) dot(context, x, 0, "#2f3778", 1, height);
  for (let y = 4; y < height; y += 5) dot(context, 0, y, "#2f3778", width, 1);
  const stars = Array.from({ length: 14 }, (_, star) => ({ x: 1 + Math.floor(hash(seed + star * 1.31) * (width - 2)), y: 1 + Math.floor(hash(seed * 2.1 + star * 0.77) * (height - 2)) }));
  for (let link = 0; link < 4; link += 1) line(context, stars[link].x, stars[link].y, stars[link + 1].x, stars[link + 1].y, "#6f7cd0");
  for (let link = 6; link < 8; link += 1) line(context, stars[link].x, stars[link].y, stars[link + 1].x, stars[link + 1].y, "#6f7cd0");
  stars.forEach((star, index) => {
    dot(context, star.x, star.y, index % 4 === 0 ? "#fff2c0" : "#ffffff");
    if (index % 5 === 0) {
      dot(context, star.x - 1, star.y, "#9aa6f0");
      dot(context, star.x + 1, star.y, "#9aa6f0");
    }
  });
  const px = width - 6;
  const py = height - 6;
  disc(context, px, py, 3, mix(world, "#ffffff", 0.1));
  line(context, px - 4, py + 1, px + 4, py - 1, "#d8d2ff");
  for (let step = 0; step < 10; step += 1) if (step % 2 === 0) dot(context, 2 + step * ((px - 6) / 10), 2 + step * ((py - 5) / 10), "#ffb347");
  dot(context, 0, 0, "#9aa0c0", width, 1);
  dot(context, 0, height - 1, "#9aa0c0", width, 1);
  dot(context, 0, 0, "#9aa0c0", 1, height);
  dot(context, width - 1, 0, "#9aa0c0", 1, height);
}

/** A hanging banner, swallow-tailed, with a sign sewn on. Transparent where the tail is cut. */
export function paintBanner(context: Paint, width: number, height: number, seed: number, color: string) {
  context.clearRect(0, 0, width, height);
  const cloth = color;
  const trim = mix(color, "#ffffff", 0.45);
  dot(context, 0, 0, cloth, width, height);
  dot(context, 1, 0, trim, 1, height);
  dot(context, width - 2, 0, trim, 1, height);
  const notch = Math.floor(width / 2);
  for (let row = 0; row < notch; row += 1) {
    const y = height - notch + row;
    context.clearRect(notch - row - 1, y, (row + 1) * 2, 1);
  }
  const names: IconName[] = ["star", "heart", "sprout", "ship"];
  icon(context, names[Math.floor(hash(seed) * names.length)], Math.floor(width / 2) - 3, 5, 1, trim);
  dot(context, 2, 14, trim, width - 4, 1);
}

const RUGS = [
  ["#b8504a", "#5a2a2a", "#f2c744", "#f4e0c0"],
  ["#4a4a9a", "#24244a", "#e2786a", "#e0d8ff"],
  ["#5a8a4a", "#2a3a22", "#f2c744", "#e8f0c8"],
  ["#d8a03a", "#6a4818", "#b8504a", "#fff0c8"],
  ["#8a4a8a", "#3a1a3a", "#7cc35a", "#f0d8f0"],
] as const;

/** A woven rug: a border, a medallion, fringes at the ends. */
export function paintRug(context: Paint, width: number, height: number, seed: number) {
  const [field, border, motif, light] = RUGS[Math.floor(hash(seed) * RUGS.length)];
  dot(context, 0, 0, field, width, height);
  for (let x = 0; x < width; x += 1) {
    dot(context, x, 0, x % 2 === 0 ? light : border);
    dot(context, x, height - 1, x % 2 === 0 ? light : border);
  }
  dot(context, 1, 1, border, width - 2, 2);
  dot(context, 1, height - 3, border, width - 2, 2);
  dot(context, 1, 1, border, 2, height - 2);
  dot(context, width - 3, 1, border, 2, height - 2);
  dot(context, 3, 3, light, width - 6, 1);
  dot(context, 3, height - 4, light, width - 6, 1);
  dot(context, 3, 3, light, 1, height - 6);
  dot(context, width - 4, 3, light, 1, height - 6);
  const cx = width / 2;
  const cy = height / 2;
  const size = Math.min(width, height) * 0.3;
  for (let y = 4; y < height - 4; y += 1) {
    for (let x = 4; x < width - 4; x += 1) {
      const d = Math.abs(x + 0.5 - cx) / size + Math.abs(y + 0.5 - cy) / size;
      if (d < 1 && d > 0.6) dot(context, x, y, motif);
      else if (d <= 0.3) dot(context, x, y, light);
    }
  }
  for (const [x, y] of [[5, 5], [width - 7, 5], [5, height - 7], [width - 7, height - 7]]) dot(context, x, y, motif, 2, 2);
}

/** The welcome mat at the dock's door, in the dock's colours. */
export function paintMat(context: Paint, width: number, height: number) {
  dot(context, 0, 0, "#6a3a24", width, height);
  for (let y = 2; y < height - 2; y += 3) dot(context, 2, y, "#ee7a3c", width - 4, 1);
  icon(context, "ship", Math.floor(width / 2) - 3, Math.floor(height / 2) - 3, 1, "#ffd27a");
}

/** A mural across a whole bulkhead, painted by many hands. */
export function paintMural(context: Paint, width: number, height: number, seed: number, world: string, scene: "world" | "meadow" | "hands") {
  if (scene === "world") {
    // The world below, the Ark over it, a recon ship going down.
    for (let y = 0; y < height; y += 1) dot(context, 0, y, mix("#1c1a48", mix(world, "#2a2060", 0.5), y / height), width, 1);
    for (let star = 0; star < 40; star += 1) dot(context, hash(seed + star) * width, hash(seed * 3 + star) * height * 0.7, star % 5 === 0 ? "#fff2c0" : "#d8d8ff");
    const radius = width * 0.75;
    const cx = width * 0.5;
    const cy = height + radius - height * 0.32;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const d = Math.hypot(x - cx, y - cy);
        if (d < radius) {
          const shade = (x / width) * 0.6 + ((y - (cy - radius)) / height) * 0.2;
          dot(context, x, y, d > radius - 1.5 ? mix(world, "#ffffff", 0.55) : mix(world, "#1c1a48", Math.min(0.6, Math.floor(shade * 4) / 6)));
        }
      }
    }
    dot(context, width * 0.22, height * 0.22, "#a49bba", width * 0.42, 4);
    dot(context, width * 0.2, height * 0.22 + 1, "#a49bba", 3, 2);
    for (let window = 0; window < 12; window += 1) dot(context, width * 0.25 + window * 3, height * 0.22 + 1, "#ffd27a");
    disc(context, width * 0.43, height * 0.22 + 2, 2.2, "#ffb347");
    dot(context, width * 0.7, height * 0.42, "#e0dce8", 3, 2);
    dot(context, width * 0.7 + 1, height * 0.42 + 2, "#ee7a3c", 1, 2);
  } else if (scene === "meadow") {
    // A meadow at sunrise and everyone in it, hand in hand.
    const bands = ["#f8c0d0", "#f8d4a0", "#fbe8b0"];
    for (let y = 0; y < height * 0.6; y += 1) dot(context, 0, y, bands[Math.min(2, Math.floor((y / (height * 0.6)) * 3))], width, 1);
    disc(context, width * 0.5, height * 0.6, height * 0.28, "#fff2c0");
    const hills = ridge(width, Math.round(height * 0.6), 2, seed * 3.3);
    for (let x = 0; x < width; x += 1) for (let y = hills[x]; y < height; y += 1) dot(context, x, y, y > height * 0.8 ? "#5a9a46" : "#7cc35a");
    for (let flower = 0; flower < 30; flower += 1) dot(context, hash(seed + flower * 2.2) * width, height * 0.78 + hash(seed * 5 + flower) * height * 0.2, CRAYONS[flower % 5]);
    for (let person = 0; person < 12; person += 1) {
      const px = width * 0.1 + person * (width * 0.8 / 11);
      const py = hills[Math.floor(px)] - 6;
      dot(context, px, py, ["#e8b48a", "#c48a5a", "#8a5a3a", "#f0c8a0"][person % 4], 2, 2);
      dot(context, px, py + 2, CRAYONS[person % CRAYONS.length], 2, 3);
      dot(context, px - 1, py + 3, CRAYONS[person % CRAYONS.length], 4, 1);
      dot(context, px, py + 5, "#3a2a2a", 1, 2);
      dot(context, px + 1, py + 5, "#3a2a2a", 1, 2);
    }
  } else {
    // The Law-Heart in the middle and the crew's handprints all round it.
    dot(context, 0, 0, "#f4ecd8", width, height);
    const cx = width / 2;
    const cy = height / 2;
    for (let ray = 0; ray < 16; ray += 1) {
      const angle = (ray / 16) * Math.PI * 2;
      line(context, cx, cy, cx + Math.cos(angle) * height * 0.48, cy + Math.sin(angle) * height * 0.48, ray % 2 === 0 ? "#ffb347" : "#f2c744");
    }
    disc(context, cx, cy, height * 0.18, "#ffd27a");
    disc(context, cx, cy, height * 0.1, "#fff6dc");
    const palm = [".X.X.X.", ".X.X.X.", "XXXXXXX", "XXXXXX.", ".XXXXX.", "..XXX.."];
    for (let hand = 0; hand < 26; hand += 1) {
      const hx = hash(seed + hand * 1.7) * (width - 8);
      const hy = hash(seed * 2.3 + hand * 0.9) * (height - 7);
      if (Math.hypot(hx + 3 - cx, hy + 3 - cy) < height * 0.42) continue;
      const color = CRAYONS[hand % CRAYONS.length];
      palm.forEach((row, rowIndex) => {
        for (let column = 0; column < row.length; column += 1) if (row[column] === "X") dot(context, hx + column, hy + rowIndex, color);
      });
    }
    for (let x = 0; x < width; x += 1) {
      dot(context, x, 0, CRAYONS[Math.floor(x / 4) % 5]);
      dot(context, x, height - 1, CRAYONS[Math.floor(x / 4) % 5]);
    }
  }
}
