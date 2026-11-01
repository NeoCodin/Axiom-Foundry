/*
 * Deterministic pixel portraits for every person aboard. A survivor's id
 * seeds skin, hair, hairstyle and small accessories; their job colours the
 * uniform; age changes proportions and hair. No art files, no randomness at
 * render time: the same person always has the same face.
 *
 * The portrait is a 12x15 bust drawn inside a 14x17 cut-plate frame (the
 * game's hull-plate shape), so a token is 28x34 px at 2 px per block.
 */

export const PORTRAIT_WIDTH = 14;
export const PORTRAIT_HEIGHT = 17;

export type PortraitRun = { x: number; y: number; w: number; fill: string };

export type PortraitStatus = "ready" | "wounded" | "training" | "deployed" | "protected";

/** Uniform colour by profession; shared with the Ark cutaway's crew sprites. */
export const CREW_ROLE_COLORS: Record<string, string> = {
  engineer: "#ff9f43",
  technician: "#ffd27a",
  fabricator: "#e8a35c",
  doctor: "#e9e4da",
  farmer: "#5fd39a",
  researcher: "#7fb7ff",
  teacher: "#f28ab2",
  navigator: "#b18cff",
  security: "#d9654f",
  soldier: "#d9654f",
};
export const CIVILIAN_COLOR = "#8f8aa3";

export const PORTRAIT_SKINS = ["#f3cfae", "#e2b48c", "#c68e64", "#9c6644", "#73492f", "#4f3121"];
const HAIRS = ["#231a17", "#3b2618", "#5c3a22", "#8a4f27", "#c9934d", "#7c2f2a", "#1c1c2b"];
const ELDER_HAIRS = ["#d9d4cc", "#b7b0a6", "#eeeae3", "#8f8a84"];

const RARITY_EDGE: Record<string, string> = {
  standard: "#4b4566",
  notable: "#4e91e8",
  exceptional: "#af6eea",
  anomalous: "#f1bd62",
};
const STATUS_MARK: Partial<Record<PortraitStatus, string>> = {
  training: "#bd8df1",
  deployed: "#62a7ff",
  protected: "#72e6a5",
};

export function portraitSeed(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Darkens (amount < 0) or lightens (amount > 0) a #rrggbb colour. */
function shade(hex: string, amount: number) {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const base = (value >> shift) & 255;
    const next = amount < 0 ? base * (1 + amount) : base + (255 - base) * amount;
    return Math.max(0, Math.min(255, Math.round(next)));
  };
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, "0")).join("")}`;
}

function pick<T>(random: () => number, values: readonly T[]) {
  return values[Math.floor(random() * values.length) % values.length];
}

/** A person's skin and hair, as their portrait draws them; for figures that must match it. */
export function getCrewLook({ id, ageGroup = "adult" }: { id: string; ageGroup?: string | null }) {
  // Same seed and draw order as getCrewPortrait, so the two always agree.
  const random = seededRandom(portraitSeed(id));
  const skin = pick(random, PORTRAIT_SKINS);
  const hair = ageGroup === "elder" ? pick(random, ELDER_HAIRS) : pick(random, HAIRS);
  const style = Math.floor(random() * 6);
  // Style 2 is the close crop, drawn a shade lighter; style 1 is long hair.
  return { skin, hair: style === 2 ? shade(hair, 0.12) : hair, longHair: style === 1 };
}

export function getCrewPortrait({
  id,
  role,
  ageGroup = "adult",
  rarity = "standard",
  status = "ready",
}: {
  id: string;
  role?: string | null;
  ageGroup?: string | null;
  rarity?: string | null;
  status?: PortraitStatus;
}): PortraitRun[] {
  const random = seededRandom(portraitSeed(id));
  const child = ageGroup === "child";
  const elder = ageGroup === "elder";
  const skin = pick(random, PORTRAIT_SKINS);
  const hair = elder ? pick(random, ELDER_HAIRS) : pick(random, HAIRS);
  const style = Math.floor(random() * 6);
  const accessoryRoll = random();
  const uniform = CREW_ROLE_COLORS[role ?? ""] ?? CIVILIAN_COLOR;
  const skinShade = shade(skin, -0.22);
  const eye = "#1a1420";
  const lips = shade(skin, -0.38);

  const grid: (string | null)[][] = Array.from({ length: PORTRAIT_HEIGHT }, () =>
    Array<string | null>(PORTRAIT_WIDTH).fill(null),
  );
  // Portrait coordinates are 0..11 x 0..14, placed at (1, 1) inside the frame.
  const set = (x: number, y: number, color: string | null) => {
    if (x < 0 || x > 11 || y < 0 || y > 14) return;
    grid[y + 1][x + 1] = color;
  };
  const fill = (x0: number, x1: number, y: number, color: string | null) => {
    for (let x = x0; x <= x1; x += 1) set(x, y, color);
  };

  const drop = child ? 1 : 0;
  const top = 4 + drop;
  const bottom = 9 + drop;

  // Uniform and shoulders.
  if (child) {
    fill(3, 8, 12, uniform);
    fill(2, 9, 13, uniform);
    fill(2, 9, 14, shade(uniform, -0.25));
  } else {
    fill(2, 9, 12, uniform);
    fill(1, 10, 13, uniform);
    fill(1, 10, 14, shade(uniform, -0.25));
    fill(5, 6, 11, skinShade);
    set(4, 12, shade(uniform, 0.35));
    set(7, 12, shade(uniform, 0.35));
  }

  // Face with the light from the left, matching the Ark and the planet.
  for (let y = top; y <= bottom; y += 1) {
    fill(3, 8, y, skin);
    set(8, y, skinShade);
  }
  fill(4, 7, bottom + 1, skin);
  set(7, bottom + 1, skinShade);
  set(2, top + 2, skinShade);
  set(9, top + 2, skinShade);

  set(4, top + 2, eye);
  set(7, top + 2, eye);
  set(6, top + 3, skinShade);
  fill(5, 6, top + 4, lips);
  if (elder) {
    set(3, top + 3, skinShade);
    set(5, top + 1, skinShade);
  }

  // Hair.
  const crown = top - 2;
  switch (style) {
    case 0: // short with a side part
      fill(3, 8, crown, hair);
      fill(3, 8, crown + 1, hair);
      set(5, crown + 1, skin);
      set(3, top, hair);
      set(8, top, hair);
      break;
    case 1: // long, framing the face
      fill(3, 8, crown, hair);
      fill(2, 9, crown + 1, hair);
      for (let y = top; y <= bottom + 1; y += 1) {
        set(2, y, hair);
        set(9, y, hair);
      }
      set(3, top, hair);
      set(8, top, hair);
      break;
    case 2: // close crop
      fill(3, 8, crown + 1, shade(hair, 0.12));
      break;
    case 3: // tied up
      fill(5, 6, crown - 1, hair);
      fill(3, 8, crown, hair);
      fill(3, 8, crown + 1, hair);
      break;
    case 4: // full and round
      fill(4, 7, crown - 1, hair);
      fill(3, 8, crown, hair);
      fill(2, 9, crown + 1, hair);
      set(2, top, hair);
      set(9, top, hair);
      set(2, top + 1, hair);
      set(9, top + 1, hair);
      break;
    default: // swept fringe
      fill(3, 8, crown, hair);
      fill(3, 8, crown + 1, hair);
      fill(3, 5, top, hair);
      break;
  }

  // One small, profession-flavoured detail for some people.
  if (!child && accessoryRoll < 0.22 && (role === "researcher" || role === "doctor" || role === "teacher")) {
    fill(3, 5, top + 2, "#2b2433");
    fill(6, 8, top + 2, "#2b2433");
    set(4, top + 2, "#9fe3ff");
    set(7, top + 2, "#9fe3ff");
  } else if (!child && accessoryRoll < 0.4 && (role === "engineer" || role === "technician" || role === "fabricator")) {
    fill(3, 8, top, "#5a5068");
    set(4, top, "#9fe3ff");
    set(7, top, "#9fe3ff");
  } else if (!child && (role === "security" || role === "soldier")) {
    set(1, 12, shade(uniform, 0.4));
    set(10, 12, shade(uniform, 0.4));
  } else if (!child && role === "navigator") {
    set(8, 13, "#ffd27a");
  }

  // The frame: the same cut as the hull plates, in the rarity colour. A cell
  // is frame edge when it is inside the plate but touches the outside.
  const edge = RARITY_EDGE[rarity ?? "standard"] ?? RARITY_EDGE.standard;
  const frameRows = PORTRAIT_HEIGHT;
  const insideFrame = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= PORTRAIT_WIDTH || y >= frameRows) return false;
    const fromBottom = frameRows - 1 - y;
    const left = y === 0 ? 2 : y === 1 ? 1 : fromBottom === 0 ? 1 : 0;
    const right = y === 0 ? 1 : fromBottom === 0 ? 2 : fromBottom === 1 ? 1 : 0;
    return x >= left && x < PORTRAIT_WIDTH - right;
  };
  for (let y = 0; y < frameRows; y += 1) {
    for (let x = 0; x < PORTRAIT_WIDTH; x += 1) {
      if (!insideFrame(x, y)) {
        grid[y][x] = null;
      } else if (
        !insideFrame(x - 1, y) || !insideFrame(x + 1, y) ||
        !insideFrame(x, y - 1) || !insideFrame(x, y + 1)
      ) {
        grid[y][x] = edge;
      } else if (grid[y][x] === null) {
        grid[y][x] = "#15131f";
      }
    }
  }

  // Status marks sit on the frame where the eye finds them.
  if (status === "wounded") {
    grid[13][11] = "#ff707b";
    grid[14][10] = "#ff707b";
    grid[14][11] = "#ff707b";
    grid[14][12] = "#ff707b";
    grid[15][11] = "#ff707b";
  } else if (STATUS_MARK[status]) {
    for (let x = 3; x <= 10; x += 1) grid[frameRows - 1][x] = STATUS_MARK[status]!;
  }

  const runs: PortraitRun[] = [];
  for (let y = 0; y < frameRows; y += 1) {
    let x = 0;
    while (x < PORTRAIT_WIDTH) {
      const color = grid[y][x];
      if (!color) {
        x += 1;
        continue;
      }
      let end = x;
      while (end < PORTRAIT_WIDTH && grid[y][end] === color) end += 1;
      runs.push({ x, y, w: end - x, fill: color });
      x = end;
    }
  }
  return runs;
}
