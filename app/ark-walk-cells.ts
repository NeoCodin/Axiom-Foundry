/*
 * The rooms along the Ark's corridors, the way a university building has them: lecture
 * theatres, seminar rooms, offices, wards, plant rooms. Each is laid out from what it is,
 * in metres along the corridor (u) and in from its door wall (v), so the same plan can
 * sit on either side. Pure plans; ark-walk-layout.ts places them and ark-walk.tsx draws them.
 */

export type CellTemplate =
  | "lecture" | "seminar" | "office" | "computer" | "lounge" | "washroom" | "laundry"
  | "gym" | "ward" | "store" | "plant" | "cleanroom";

export type CellPart = {
  u: number;
  v: number;
  /** Height of its middle above the floor. */
  y: number;
  w: number;
  h: number;
  d: number;
  color: string;
  /** The drone has to go round it. */
  block?: boolean;
  glow?: boolean;
};

const WOOD = "#7a5a3c";
const DARK = "#2e2c3a";
const STEEL = "#7c8294";
const PALE = "#c9cfdb";
const SEAT = "#4f5f86";
const SCREEN = "#bcd6ff";

const part = (u: number, v: number, y: number, w: number, h: number, d: number, color: string, block = false, glow = false): CellPart => ({ u, v, y, w, h, d, color, block, glow });
const screen = (u: number, v: number, y: number, w: number, h: number) => part(u, v, y, w, h, 0.06, SCREEN, false, true);

/** Skirting and a dado rail round the three walls away from the door. */
function trim(w: number, d: number): CellPart[] {
  return [0.12, 1.05].flatMap((y) => {
    const h = y < 1 ? 0.24 : 0.07;
    return [
      part(0.03, d / 2, y, 0.06, h, d, WOOD),
      part(w - 0.03, d / 2, y, 0.06, h, d, WOOD),
      part(w / 2, d - 0.03, y, w, h, 0.06, WOOD),
    ];
  });
}

/** A whiteboard on the wall to one side, with its frame and tray. */
function whiteboard(u: number, v: number, length: number): CellPart[] {
  const inward = u < 1 ? 1 : -1;
  return [
    part(u, v, 1.75, 0.05, 1.5, length + 0.14, STEEL),
    part(u + inward * 0.03, v, 1.75, 0.04, 1.36, length, "#eef1f6"),
    part(u + inward * 0.09, v, 1, 0.14, 0.05, length, STEEL),
  ];
}

/** A desk and its chair, facing the far wall. */
function desk(u: number, v: number): CellPart[] {
  return [
    part(u, v, 0.74, 1.3, 0.06, 0.7, WOOD, true),
    part(u, v, 0.36, 1.1, 0.7, 0.5, DARK),
    part(u, v + 0.05, 0.98, 0.5, 0.34, 0.04, SCREEN, false, true),
    part(u, v - 0.65, 0.45, 0.42, 0.06, 0.42, SEAT),
  ];
}

const TEMPLATES: Record<CellTemplate, (w: number, d: number) => CellPart[]> = {
  // Rows stepping down from the door to a screen on the far wall, with an aisle up the middle.
  lecture: (w, d) => {
    const parts: CellPart[] = [screen(w / 2, d - 0.2, 2.4, w - 4, 2), part(w / 2, d - 2, 0.55, 1, 1.1, 0.7, WOOD, true), ...whiteboard(0.08, d - 2.6, 3)];
    for (let row = 0; row < 4; row += 1) {
      const v = 2.6 + row * 1.7;
      const rise = (3 - row) * 0.2;
      for (const side of [-1, 1]) {
        const u = w / 2 + side * (w / 4 + 0.35);
        const bank = w / 2 - 2;
        parts.push(part(u, v, rise / 2 + 0.05, bank, rise + 0.1, 1.5, DARK, true));
        parts.push(part(u, v + 0.45, rise + 0.75, bank, 0.05, 0.4, WOOD));
        parts.push(part(u, v - 0.2, rise + 0.45, bank, 0.06, 0.45, SEAT));
      }
    }
    return parts;
  },
  seminar: (w, d) => {
    const top = d / 2 + 0.6;
    const parts: CellPart[] = [
      part(w / 2, top, 0.75, w - 3, 0.08, 2.6, "#4a3526", true),
      part(w / 2, top, 0.37, w - 4, 0.7, 0.9, DARK),
      screen(w / 2, d - 0.2, 2.2, Math.min(4, w - 2), 1.5),
      ...whiteboard(0.08, d / 2, 4),
      ...whiteboard(w - 0.08, d / 2, 4),
    ];
    for (let u = 2; u < w - 1.6; u += 1.3) {
      for (const v of [d / 2 - 1.1, d / 2 + 2.3]) parts.push(part(u, v, 0.45, 0.44, 0.06, 0.44, SEAT));
    }
    return parts;
  },
  office: (w, d) => {
    const parts: CellPart[] = [part(w / 2, d - 0.3, 1.2, w - 0.6, 2.4, 0.4, WOOD, true)];
    for (let row = 0; row * 3 + 3.5 < d - 1; row += 1) {
      parts.push(...desk(1.4, 3.5 + row * 3));
      if (w > 4.6) parts.push(...desk(w - 1.4, 3.5 + row * 3));
    }
    return parts;
  },
  computer: (w, d) => {
    const parts: CellPart[] = [];
    for (let v = 3; v < d - 1; v += 2.2) for (let u = 1.2; u < w - 0.8; u += 1.7) parts.push(...desk(u, v));
    return parts;
  },
  lounge: (w, d) => [
    part(w / 2, d / 2, 0.01, Math.max(3, w - 3), 0.02, d - 4.5, "#6b4a5e"),
    part(w / 2, d - 2.2, 0.4, Math.min(5, w - 2), 0.8, 1, SEAT, true),
    part(1.2, d / 2, 0.4, 1, 0.8, 3.4, SEAT, true),
    part(w / 2, d / 2, 0.3, 1.8, 0.6, 1, WOOD, true),
    part(w - 1, d - 1, 0.5, 0.6, 1, 0.6, WOOD, true),
    part(w - 1, d - 1, 1.5, 0.9, 1.2, 0.9, "#4f8a56"),
  ],
  washroom: (w, d) => {
    const parts: CellPart[] = [];
    for (let u = 0.9; u < w - 0.5; u += 1.5) {
      parts.push(part(u - 0.72, d - 1.1, 1.1, 0.06, 2.2, 2, PALE, true));
      parts.push(part(u, d - 0.4, 0.42, 0.5, 0.84, 0.6, "#e9edf4", true));
    }
    parts.push(part(0.4, d / 2 - 2, 0.85, 0.5, 0.18, 4, "#e9edf4", true));
    return parts;
  },
  laundry: (w, d) => {
    const parts: CellPart[] = [part(w / 2, d / 2, 0.85, 3, 0.08, 1.2, PALE, true)];
    for (let u = 0.8; u + 0.48 <= w; u += 1.1) {
      parts.push(part(u, d - 0.5, 0.6, 0.95, 1.2, 0.8, PALE, true));
      parts.push(part(u, d - 0.92, 0.65, 0.5, 0.5, 0.04, "#6f8fb8", false, true));
    }
    return parts;
  },
  gym: (w, d) => [
    part(w / 2, d / 2 - 0.5, 0.03, w - 3, 0.05, 4, "#3f4f5c"),
    part(1, d - 1.6, 0.7, 0.8, 1.4, 2.4, STEEL, true),
    part(w - 1.4, d - 1.2, 0.45, 2, 0.9, 0.7, DARK, true),
    part(w / 2, d - 0.4, 1, w - 3.6, 2, 0.1, "#9bb0c9"),
    part(w - 1, 3.4, 0.5, 0.7, 1, 1.8, STEEL, true),
  ],
  ward: (w, d) => {
    const parts: CellPart[] = [];
    for (let v = 3; v < d - 1; v += 3) {
      for (const u of [1.1, w - 1.1]) {
        parts.push(part(u, v, 0.45, 1.1, 0.5, 2.1, "#dfe7ee", true));
        parts.push(part(u, v - 0.8, 0.75, 0.9, 0.14, 0.4, "#ffffff"));
        parts.push(part(u, v + 1.3, 1, 1.5, 2, 0.05, "#8fb6a8"));
      }
    }
    return parts;
  },
  store: (w, d) => {
    const parts: CellPart[] = [];
    for (let v = 3; v < d - 0.6; v += 2.8) {
      parts.push(part(w / 2 - 0.6, v, 1.5, w - 3, 3, 0.7, STEEL, true));
      for (let u = 1.2; u < w - 2; u += 0.9) parts.push(part(u, v - 0.42, 0.5 + (u % 3 > 1.5 ? 1 : 0), 0.7, 0.7, 0.14, "#a98f63"));
    }
    return parts;
  },
  plant: (w, d) => {
    const parts: CellPart[] = [part(w / 2, 2.4, 3.9, w - 1.4, 0.3, 0.3, STEEL), part(w / 2, 2.9, 3.6, w - 1.4, 0.2, 0.2, "#9b6a4a")];
    for (let u = 1.9; u < w - 1.4; u += 2.7) {
      parts.push(part(u, d - 3, 1.7, 2.1, 3.4, 2.1, STEEL, true));
      parts.push(part(u, d - 4.08, 1.7, 1.2, 0.9, 0.05, "#7fd0ff", false, true));
      parts.push(part(u, d - 4.1, 2.6, 0.5, 0.12, 0.06, "#ffcf6a", false, true));
    }
    return parts;
  },
  cleanroom: (w, d) => {
    const parts: CellPart[] = [part(w / 2, d - 0.5, 1.5, w - 1.6, 3, 0.8, PALE, true)];
    for (let v = 3.2; v < d - 2; v += 3) {
      parts.push(part(w / 2, v, 0.8, w - 3, 0.1, 1.1, PALE, true));
      parts.push(part(w / 2, v, 1.1, w - 3.4, 0.5, 0.5, "#a9dcd8"));
    }
    return parts;
  },
};

/** What is in a room of this kind and size. */
export const cellParts = (template: CellTemplate, width: number, depth: number) => [...trim(width, depth), ...TEMPLATES[template](width, depth)];
