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
const BOOKS = ["#b5534a", "#4f6a96", "#c79a4a", "#3f7a5a", "#7a4a7a", "#c9b08a", "#2f4a6a"];

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

/** A chair: seat, back and legs. Its back is towards `back`, along v. */
function chair(u: number, v: number, back: number, color = SEAT): CellPart[] {
  return [
    part(u, v, 0.46, 0.44, 0.07, 0.44, color),
    part(u, v + back * 0.2, 0.74, 0.42, 0.5, 0.05, color),
    part(u - 0.17, v - 0.17, 0.22, 0.04, 0.44, 0.04, DARK),
    part(u + 0.17, v - 0.17, 0.22, 0.04, 0.44, 0.04, DARK),
    part(u - 0.17, v + 0.17, 0.22, 0.04, 0.44, 0.04, DARK),
    part(u + 0.17, v + 0.17, 0.22, 0.04, 0.44, 0.04, DARK),
  ];
}

/** A desk and its chair, facing the far wall, with what people leave on one. */
function desk(u: number, v: number): CellPart[] {
  return [
    part(u, v, 0.74, 1.3, 0.06, 0.7, WOOD, true),
    part(u - 0.42, v, 0.36, 0.4, 0.7, 0.6, DARK),
    part(u + 0.6, v, 0.36, 0.05, 0.7, 0.6, DARK),
    part(u, v + 0.05, 0.98, 0.5, 0.34, 0.04, SCREEN, false, true),
    part(u, v + 0.08, 0.86, 0.08, 0.1, 0.05, DARK),
    part(u, v - 0.14, 0.78, 0.46, 0.02, 0.16, "#3a3a48"),
    part(u + 0.46, v - 0.1, 0.79, 0.24, 0.03, 0.32, "#e9e4d4"),
    ...chair(u, v - 0.65, -1),
  ];
}

/** A long sofa along u, its back towards `back`, cushion by cushion. */
function sofa(u: number, v: number, length: number, back: number, color: string): CellPart[] {
  const parts = [
    part(u, v, 0.2, length, 0.3, 1, DARK, true),
    part(u, v + back * 0.4, 0.62, length, 0.72, 0.22, color),
    part(u - length / 2 + 0.14, v, 0.42, 0.28, 0.46, 1, color),
    part(u + length / 2 - 0.14, v, 0.42, 0.28, 0.46, 1, color),
  ];
  const cushions = Math.max(2, Math.round((length - 0.6) / 0.9));
  const width = (length - 0.6) / cushions;
  for (let index = 0; index < cushions; index += 1) {
    parts.push(part(u - (length - 0.6) / 2 + (index + 0.5) * width, v - back * 0.08, 0.44, width - 0.04, 0.16, 0.76, color));
  }
  return parts;
}

/** Books on a wall shelf that runs along u. */
function shelf(u: number, v: number, length: number, seed: number): CellPart[] {
  const parts: CellPart[] = [];
  for (const y of [1.3, 1.75, 2.2]) {
    parts.push(part(u, v, y, length, 0.05, 0.26, WOOD));
    let along = u - length / 2 + 0.06;
    let index = seed + y * 7;
    while (along < u + length / 2 - 0.1) {
      const wide = 0.05 + ((index * 13) % 5) * 0.012;
      const tall = 0.24 + ((index * 7) % 4) * 0.03;
      parts.push(part(along + wide / 2, v, y + 0.03 + tall / 2, wide, tall, 0.18, BOOKS[Math.floor(index * 3) % BOOKS.length]));
      along += wide + 0.012;
      index += 1;
    }
  }
  return parts;
}

/** A plant in a pot, leaves in layers. */
function potPlant(u: number, v: number): CellPart[] {
  return [
    part(u, v, 0.3, 0.46, 0.6, 0.46, "#a8603f", true),
    part(u, v, 0.61, 0.5, 0.05, 0.5, "#8a4c30"),
    part(u, v, 0.8, 0.08, 0.4, 0.08, "#4a3a2c"),
    part(u, v, 1.1, 0.9, 0.3, 0.9, "#3f8a4c"),
    part(u + 0.1, v - 0.08, 1.4, 0.66, 0.3, 0.66, "#58a95c"),
    part(u - 0.06, v + 0.06, 1.66, 0.36, 0.24, 0.36, "#2f6b3f"),
  ];
}

/** A rug with a border. */
function rug(u: number, v: number, w: number, d: number, field: string, edge: string): CellPart[] {
  return [
    part(u, v, 0.008, w, 0.016, d, edge),
    part(u, v, 0.012, w - 0.3, 0.018, d - 0.3, field),
    part(u, v, 0.016, w - 0.7, 0.018, d - 0.7, edge),
    part(u, v, 0.02, w - 0.86, 0.018, d - 0.86, field),
  ];
}

/** A rack of servers against a wall, with its lights. */
function serverRack(u: number, v: number): CellPart[] {
  const parts = [part(u, v, 1, 0.8, 2, 0.8, "#23222e", true)];
  for (let y = 0.3; y < 1.9; y += 0.22) {
    parts.push(part(u, v - 0.41, y, 0.68, 0.14, 0.02, "#3a3a4c"));
    parts.push(part(u - 0.26, v - 0.42, y, 0.04, 0.04, 0.02, y % 0.44 < 0.22 ? "#58ff8e" : "#ffb347", false, true));
  }
  return parts;
}

/** A filing cabinet, drawer by drawer. */
function filing(u: number, v: number): CellPart[] {
  const parts = [part(u, v, 0.65, 0.5, 1.3, 0.56, STEEL, true)];
  for (const y of [0.25, 0.65, 1.05]) {
    parts.push(part(u, v - 0.29, y, 0.42, 0.32, 0.02, "#6a7082"));
    parts.push(part(u, v - 0.3, y + 0.08, 0.14, 0.03, 0.03, "#d6a84d"));
  }
  return parts;
}

/** A tank with hoops, gauges and a lit sight glass, facing the door. */
function tank(u: number, v: number, tint: string): CellPart[] {
  const parts = [
    part(u, v, 0.1, 2.3, 0.2, 2.3, DARK),
    part(u, v, 1.75, 2.1, 3.1, 2.1, STEEL, true),
    part(u, v - 1.06, 1.75, 1.2, 1.3, 0.04, DARK),
    part(u, v - 1.08, 1.75, 1.04, 1.14, 0.05, tint, false, true),
    part(u, v - 1.09, 3, 0.5, 0.12, 0.06, "#ffcf6a", false, true),
    part(u + 0.8, v - 1.08, 2.8, 0.2, 0.2, 0.04, "#e9e4d4"),
    part(u - 0.8, v - 1.08, 2.8, 0.2, 0.2, 0.04, "#e9e4d4"),
    part(u, v, 3.4, 0.5, 0.2, 0.5, "#9b6a4a"),
    part(u, v, 3.72, 0.16, 0.44, 0.16, "#9b6a4a"),
  ];
  for (const y of [0.7, 1.5, 2.3, 3.1]) parts.push(part(u, v, y, 2.16, 0.1, 2.16, "#5a6072"));
  return parts;
}

const TEMPLATES: Record<CellTemplate, (w: number, d: number) => CellPart[]> = {
  // Rows stepping down from the door to a screen on the far wall, with an aisle up the middle.
  lecture: (w, d) => {
    const parts: CellPart[] = [
      part(w / 2, d - 0.16, 2.4, w - 3.6, 2.3, 0.04, DARK),
      screen(w / 2, d - 0.2, 2.4, w - 4, 2),
      part(w / 2, d - 2, 0.55, 1, 1.1, 0.7, WOOD, true),
      part(w / 2, d - 2, 1.12, 1.1, 0.06, 0.8, DARK),
      part(w / 2, d - 2.1, 1.2, 0.34, 0.1, 0.24, SCREEN, false, true),
      ...whiteboard(0.08, d - 2.6, 3),
    ];
    for (let row = 0; row < 4; row += 1) {
      const v = 2.6 + row * 1.7;
      const rise = (3 - row) * 0.2;
      for (const side of [-1, 1]) {
        const u = w / 2 + side * (w / 4 + 0.35);
        const bank = w / 2 - 2;
        parts.push(part(u, v, rise / 2 + 0.05, bank, rise + 0.1, 1.5, DARK, true));
        parts.push(part(u, v + 0.45, rise + 0.75, bank, 0.05, 0.4, WOOD));
        parts.push(part(u, v + 0.42, rise + 0.42, bank, 0.6, 0.05, WOOD));
        const seats = Math.floor(bank / 0.62);
        for (let seat = 0; seat < seats; seat += 1) {
          const x = u - bank / 2 + (seat + 0.5) * (bank / seats);
          parts.push(part(x, v - 0.2, rise + 0.45, 0.5, 0.08, 0.45, SEAT));
          parts.push(part(x, v - 0.42, rise + 0.72, 0.5, 0.5, 0.06, SEAT));
        }
      }
    }
    return parts;
  },
  seminar: (w, d) => {
    const top = d / 2 + 0.6;
    const parts: CellPart[] = [
      part(w / 2, top, 0.75, w - 3, 0.08, 2.6, "#4a3526", true),
      part(w / 2, top, 0.8, w - 3.2, 0.02, 2.4, "#5c4330"),
      part(w / 2, top, 0.37, w - 4, 0.7, 0.9, DARK),
      screen(w / 2, d - 0.2, 2.2, Math.min(4, w - 2), 1.5),
      ...whiteboard(0.08, d / 2, 4),
      ...whiteboard(w - 0.08, d / 2, 4),
    ];
    for (let u = 2; u < w - 1.6; u += 1.3) {
      parts.push(...chair(u, d / 2 - 1.1, -1), ...chair(u, d / 2 + 2.3, 1));
      parts.push(part(u, top - 0.9, 0.8, 0.22, 0.015, 0.3, "#e9e4d4"), part(u, top + 0.9, 0.8, 0.22, 0.015, 0.3, "#e9e4d4"));
    }
    return parts;
  },
  office: (w, d) => {
    const parts: CellPart[] = [
      part(w / 2, d - 0.3, 1.2, w - 0.6, 2.4, 0.4, WOOD, true),
      ...shelf(w / 2, d - 0.56, w - 1.2, 3),
      ...filing(0.42, 2.2),
    ];
    for (let row = 0; row * 3 + 3.5 < d - 1; row += 1) {
      parts.push(...desk(1.4, 3.5 + row * 3));
      if (w > 4.6) parts.push(...desk(w - 1.4, 3.5 + row * 3));
    }
    return parts;
  },
  computer: (w, d) => {
    const parts: CellPart[] = [];
    for (let v = 3; v < d - 1.4; v += 2.2) for (let u = 1.2; u < w - 0.8; u += 1.7) parts.push(...desk(u, v));
    for (let u = 0.9; u < w - 0.6; u += 1.1) parts.push(...serverRack(u, d - 0.5));
    return parts;
  },
  lounge: (w, d) => {
    const sofaLength = Math.min(5, w - 2);
    const parts: CellPart[] = [
      ...rug(w / 2, d / 2, Math.max(3, w - 3), d - 4.5, "#6b4a5e", "#c79a4a"),
      ...sofa(w / 2, d - 2.2, sofaLength, 1, "#4f5f86"),
      part(1.2, d / 2, 0.2, 1, 0.3, 3.4, DARK, true),
      part(0.8, d / 2, 0.62, 0.22, 0.72, 3.4, "#4f5f86"),
      part(1.28, d / 2 - 0.9, 0.44, 0.76, 0.16, 1.5, "#5a6c98"),
      part(1.28, d / 2 + 0.9, 0.44, 0.76, 0.16, 1.5, "#5a6c98"),
      part(w / 2, d / 2, 0.42, 1.8, 0.08, 1, WOOD, true),
      part(w / 2 - 0.8, d / 2 - 0.4, 0.2, 0.08, 0.4, 0.08, DARK),
      part(w / 2 + 0.8, d / 2 - 0.4, 0.2, 0.08, 0.4, 0.08, DARK),
      part(w / 2 - 0.8, d / 2 + 0.4, 0.2, 0.08, 0.4, 0.08, DARK),
      part(w / 2 + 0.8, d / 2 + 0.4, 0.2, 0.08, 0.4, 0.08, DARK),
      part(w / 2 - 0.3, d / 2, 0.48, 0.34, 0.05, 0.24, "#b5534a"),
      part(w / 2 + 0.4, d / 2 + 0.2, 0.5, 0.1, 0.1, 0.1, "#e9e4d4"),
      ...potPlant(w - 1, d - 1),
      part(1, d - 1, 0.04, 0.3, 0.06, 0.3, DARK),
      part(1, d - 1, 0.8, 0.04, 1.5, 0.04, DARK),
      part(1, d - 1, 1.62, 0.4, 0.3, 0.4, "#ffd89a", false, true),
      part(w / 2, d - 0.1, 2.2, Math.min(3, w - 2), 1.3, 0.04, DARK),
      screen(w / 2, d - 0.14, 2.2, Math.min(2.8, w - 2.2), 1.14),
    ];
    if (w > 6) parts.push(...shelf(w - 0.2 - 1.1, 0.2 + 0.1, 2.2, 5));
    return parts;
  },
  washroom: (w, d) => {
    const parts: CellPart[] = [];
    for (let u = 0.9; u < w - 0.5; u += 1.5) {
      parts.push(part(u - 0.72, d - 1.1, 1.1, 0.06, 2.2, 2, PALE, true));
      parts.push(part(u, d - 0.4, 0.42, 0.5, 0.84, 0.6, "#e9edf4", true));
      parts.push(part(u, d - 0.14, 0.95, 0.46, 0.5, 0.14, "#dfe5ee"));
      parts.push(part(u, d - 0.52, 0.88, 0.44, 0.06, 0.5, "#c8d0dc"));
      parts.push(part(u, d - 2.1, 1.1, Math.min(1.3, (w - u) * 2), 2, 0.05, "#7f93ad"));
      parts.push(part(u + 0.42, d - 2.14, 1.1, 0.06, 0.2, 0.06, "#d6a84d"));
    }
    parts.push(part(0.4, d / 2 - 2, 0.85, 0.5, 0.18, 4, "#e9edf4", true));
    parts.push(part(0.06, d / 2 - 2, 1.75, 0.04, 1.2, 3.8, "#a8c4dc"));
    parts.push(part(0.08, d / 2 - 2, 2.4, 0.06, 0.08, 3.9, STEEL));
    for (const offset of [-1.4, 0, 1.4]) {
      parts.push(part(0.4, d / 2 - 2 + offset, 0.95, 0.34, 0.03, 0.46, "#c8d0dc"));
      parts.push(part(0.14, d / 2 - 2 + offset, 1.08, 0.1, 0.2, 0.05, STEEL));
    }
    return parts;
  },
  laundry: (w, d) => {
    const parts: CellPart[] = [
      part(w / 2, d / 2, 0.85, 3, 0.08, 1.2, PALE, true),
      part(w / 2 - 1.3, d / 2, 0.42, 0.1, 0.84, 1, DARK),
      part(w / 2 + 1.3, d / 2, 0.42, 0.1, 0.84, 1, DARK),
      part(w / 2 - 0.7, d / 2, 0.93, 0.7, 0.08, 0.5, "#efe6d2"),
      part(w / 2 - 0.7, d / 2, 1, 0.66, 0.07, 0.46, "#a6c6ee"),
      part(w / 2 + 0.5, d / 2 + 0.1, 0.93, 0.7, 0.1, 0.5, "#e9b0a8"),
      part(0.5, 2.6, 0.3, 0.6, 0.6, 0.6, "#8a7a5c"),
      part(0.5, 2.6, 0.62, 0.64, 0.06, 0.64, "#a8966e"),
    ];
    for (let u = 0.8; u + 0.48 <= w; u += 1.1) {
      parts.push(part(u, d - 0.5, 0.6, 0.95, 1.2, 0.8, PALE, true));
      parts.push(part(u, d - 0.92, 0.65, 0.56, 0.56, 0.03, "#3a3f50"));
      parts.push(part(u, d - 0.94, 0.65, 0.42, 0.42, 0.04, "#6f8fb8", false, true));
      parts.push(part(u - 0.28, d - 0.92, 1.08, 0.2, 0.1, 0.03, "#2b2433"));
      parts.push(part(u + 0.3, d - 0.92, 1.08, 0.06, 0.06, 0.03, "#58ff8e", false, true));
    }
    parts.push(part(w / 2, d - 2.2, 2.6, w - 1.6, 0.04, 0.04, STEEL));
    ["#e9b0a8", "#a6c6ee", "#efe6d2", "#b6d8a8", "#efe6d2", "#d8c0e8"].forEach((color, index) => {
      if (0.9 + index * 0.8 < w - 0.6) parts.push(part(0.9 + index * 0.8, d - 2.2, 2.24, 0.56, 0.7, 0.03, color));
    });
    return parts;
  },
  gym: (w, d) => {
    const parts: CellPart[] = [
      part(w / 2, d / 2 - 0.5, 0.03, w - 3, 0.05, 4, "#3f4f5c"),
      part(w / 2, d / 2 - 0.5, 0.058, w - 3.3, 0.01, 3.7, "#46586a"),
      part(w / 2, d / 2 - 0.5, 0.062, 0.05, 0.01, 3.7, "#c9cfdb"),
      // Weights on a rack along the wall.
      part(1, d - 1.6, 0.06, 0.8, 0.12, 2.4, DARK, true),
      part(1, d - 1.6, 0.5, 0.06, 0.9, 2.4, STEEL),
      part(1, d - 1.6, 0.95, 0.7, 0.05, 2.4, STEEL),
      part(1, d - 1.6, 0.5, 0.7, 0.05, 2.4, STEEL),
      part(0.68, d - 0.5, 1.1, 0.06, 2.2, 0.06, STEEL),
      // A bench with a bar over it.
      part(w - 1.4, d - 1.2, 0.46, 2, 0.1, 0.5, "#b5534a", true),
      part(w - 1.4, d - 1.2, 0.22, 1.6, 0.42, 0.14, DARK),
      part(w - 2.2, d - 1.2, 0.98, 0.06, 0.08, 1.6, STEEL),
      part(w - 2.2, d - 1.2 - 0.74, 0.98, 0.14, 0.5, 0.06, DARK),
      part(w - 2.2, d - 1.2 + 0.74, 0.98, 0.14, 0.5, 0.06, DARK),
      part(w - 2.2, d - 1.2 - 0.6, 0.5, 0.06, 1, 0.06, STEEL),
      part(w - 2.2, d - 1.2 + 0.6, 0.5, 0.06, 1, 0.06, STEEL),
      // Mirrors down the far wall.
      part(w / 2, d - 0.1, 1.2, w - 3.6, 2, 0.04, DARK),
      part(w / 2, d - 0.14, 1.2, w - 3.7, 1.9, 0.04, "#9bb0c9"),
      // A running machine by the side wall, and a bag hung from the ceiling.
      part(w - 1, 3.4, 0.14, 0.7, 0.2, 1.8, DARK, true),
      part(w - 1, 3.4, 0.25, 0.54, 0.03, 1.6, "#3a3a48"),
      part(w - 1, 2.56, 0.8, 0.66, 0.08, 0.08, STEEL),
      part(w - 1.3, 2.6, 0.55, 0.05, 0.9, 0.05, STEEL),
      part(w - 0.7, 2.6, 0.55, 0.05, 0.9, 0.05, STEEL),
      part(w - 1, 2.56, 1.02, 0.5, 0.3, 0.06, SCREEN, false, true),
      part(1.2, 3.4, 1.3, 0.44, 1, 0.44, "#5a2a26", true),
      part(1.2, 3.4, 2.6, 0.04, 1.6, 0.04, DARK),
      part(1.2, 3.4, 1.84, 0.54, 0.08, 0.54, DARK),
    ];
    for (let v = d - 2.6; v < d - 0.6; v += 0.5) {
      for (const y of [0.56, 1.01]) {
        parts.push(part(1, v, y, 0.5, 0.06, 0.06, STEEL));
        for (const end of [-0.24, 0.24]) parts.push(part(1 + end, v, y + 0.02, 0.1, 0.16, 0.16, "#1f1f28"));
      }
    }
    return parts;
  },
  ward: (w, d) => {
    const parts: CellPart[] = [part(w / 2, d - 0.08, 2.2, 0.5, 0.5, 0.04, "#efe6d2"), part(w / 2, d - 0.1, 2.2, 0.32, 0.1, 0.04, "#3fbf6f"), part(w / 2, d - 0.1, 2.2, 0.1, 0.32, 0.04, "#3fbf6f")];
    for (let v = 3; v < d - 1; v += 3) {
      for (const u of [1.1, w - 1.1]) {
        const out = u < w / 2 ? -1 : 1;
        parts.push(part(u, v, 0.3, 1.1, 0.2, 2.1, STEEL, true));
        parts.push(part(u, v, 0.45, 1.04, 0.14, 2, "#dfe7ee"));
        parts.push(part(u, v + 0.3, 0.54, 1.08, 0.1, 1.3, "#7f9fc0"));
        parts.push(part(u, v - 0.8, 0.58, 0.9, 0.12, 0.4, "#ffffff"));
        parts.push(part(u, v - 1.05, 0.65, 1.1, 0.8, 0.05, STEEL));
        parts.push(part(u, v + 1.05, 0.5, 1.1, 0.5, 0.05, STEEL));
        parts.push(part(u, v + 1.3, 1, 1.5, 2, 0.05, "#8fb6a8"));
        parts.push(part(u, v + 1.3, 2.05, 1.6, 0.04, 0.08, STEEL));
        parts.push(part(u + out * 0.1, v - 1.1, 1.5, 0.5, 0.36, 0.04, "#23222e"));
        parts.push(part(u + out * 0.1, v - 1.12, 1.5, 0.42, 0.28, 0.04, "#14281c"));
        parts.push(part(u + out * 0.1, v - 1.13, 1.5, 0.36, 0.03, 0.04, "#58ff8e", false, true));
      }
    }
    return parts;
  },
  store: (w, d) => {
    const parts: CellPart[] = [];
    const crates = ["#a98f63", "#8a7a5c", "#6a7a8a", "#a8603f", "#7a8a5c"];
    for (let v = 3; v < d - 0.6; v += 2.8) {
      parts.push(part(w / 2 - 0.6, v, 1.5, w - 3, 3, 0.7, "#2e2c3a", true));
      for (const y of [0.1, 1.05, 2]) parts.push(part(w / 2 - 0.6, v, y, w - 2.9, 0.06, 0.76, STEEL));
      let index = 0;
      for (let u = 1.2; u < w - 2; u += 0.9) {
        for (const [row, y] of [[0, 0.5], [1, 1.42], [2, 2.36]] as const) {
          index += 1;
          if ((index * 7) % 4 === 0) continue;
          const tall = 0.5 + ((index * 3) % 3) * 0.12;
          parts.push(part(u, v - 0.42, y - 0.26 + tall / 2 + row * 0.03, 0.7, tall, 0.14, crates[index % crates.length]));
          parts.push(part(u, v - 0.5, y - 0.1, 0.24, 0.1, 0.02, "#efe6d2"));
        }
      }
    }
    return parts;
  },
  plant: (w, d) => {
    const parts: CellPart[] = [
      part(w / 2, 2.4, 3.9, w - 1.4, 0.3, 0.3, STEEL),
      part(w / 2, 2.9, 3.6, w - 1.4, 0.2, 0.2, "#9b6a4a"),
      part(w / 2, 2.4, 3.9, w - 1.3, 0.34, 0.1, "#5a6072"),
    ];
    for (let u = 1.9; u < w - 1.4; u += 2.7) {
      parts.push(...tank(u, d - 3, "#7fd0ff"));
      // Pipework from the tank to the header, with a red valve wheel.
      parts.push(part(u, (d - 3 + 2.9) / 2, 3.6, 0.2, 0.2, Math.max(0.2, d - 5.9), "#9b6a4a"));
      parts.push(part(u + 0.5, d - 4.3, 1.1, 0.12, 2.2, 0.12, "#9b6a4a"));
      parts.push(part(u + 0.5, d - 4.42, 1.3, 0.4, 0.4, 0.05, "#b5302a"));
      parts.push(part(u + 0.5, d - 4.46, 1.3, 0.14, 0.14, 0.05, "#2e2c3a"));
    }
    return parts;
  },
  cleanroom: (w, d) => {
    const parts: CellPart[] = [part(w / 2, d - 0.5, 1.5, w - 1.6, 3, 0.8, PALE, true)];
    for (let u = 1.2; u < w - 1; u += 0.9) {
      for (const y of [0.7, 1.5, 2.3]) parts.push(part(u, d - 0.92, y, 0.74, 0.5, 0.04, "#a8b2c2"));
      parts.push(part(u, d - 0.94, 2.72, 0.2, 0.06, 0.03, "#58ff8e", false, true));
    }
    for (let v = 3.2; v < d - 2; v += 3) {
      parts.push(part(w / 2, v, 0.8, w - 3, 0.1, 1.1, PALE, true));
      parts.push(part(1.8, v, 0.4, 0.1, 0.72, 0.9, STEEL));
      parts.push(part(w - 1.8, v, 0.4, 0.1, 0.72, 0.9, STEEL));
      // A glass hood over the bench, with its racks and samples inside.
      parts.push(part(w / 2, v, 1.42, w - 3.1, 0.04, 1.14, STEEL));
      parts.push(part(w / 2, v - 0.56, 1.14, w - 3.1, 0.56, 0.02, "#a9dcd8"));
      parts.push(part(w / 2, v + 0.56, 1.14, w - 3.1, 0.56, 0.02, "#a9dcd8"));
      parts.push(part(w / 2, v, 1.4, w - 3.3, 0.03, 0.9, "#eef4ff", false, true));
      for (let u = 2.2; u < w - 2; u += 0.5) {
        parts.push(part(u, v, 0.92, 0.28, 0.14, 0.28, "#d8dee8"));
        parts.push(part(u, v, 1.04, 0.1, 0.12, 0.1, u % 1 < 0.5 ? "#7fd0ff" : "#58d89a", false, true));
      }
    }
    return parts;
  },
};

/** What is in a room of this kind and size. */
export const cellParts = (template: CellTemplate, width: number, depth: number) => [...trim(width, depth), ...TEMPLATES[template](width, depth)];
