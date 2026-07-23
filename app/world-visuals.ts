export type WorldVisual = {
  slug: string;
  accent: string;
  accentRgb: string;
  accentSoft: string;
  secondary: string;
  sky: string;
  ground: string;
  planet: string;
};

export const WORLD_VISUALS: readonly WorldVisual[] = [
  {
    slug: "cold-wake",
    accent: "#55d6e8",
    accentRgb: "85 214 232",
    accentSoft: "rgb(85 214 232 / 0.13)",
    secondary: "#8aa0b5",
    sky: "#04070b",
    ground: "#0b1118",
    planet: "#182735",
  },
  {
    slug: "pelagos",
    accent: "#35c6d8",
    accentRgb: "53 198 216",
    accentSoft: "rgb(53 198 216 / 0.13)",
    secondary: "#4169e1",
    sky: "#020b18",
    ground: "#061525",
    planet: "#0a4160",
  },
  {
    slug: "viridia",
    accent: "#7ee7a8",
    accentRgb: "126 231 168",
    accentSoft: "rgb(126 231 168 / 0.13)",
    secondary: "#43bfb0",
    sky: "#03100b",
    ground: "#0a2518",
    planet: "#1f6947",
  },
  {
    slug: "cinder",
    accent: "#ff8a3d",
    accentRgb: "255 138 61",
    accentSoft: "rgb(255 138 61 / 0.13)",
    secondary: "#e44536",
    sky: "#120807",
    ground: "#24100b",
    planet: "#6c281b",
  },
  {
    slug: "nox",
    accent: "#c697ff",
    accentRgb: "198 151 255",
    accentSoft: "rgb(198 151 255 / 0.13)",
    secondary: "#f05ad9",
    sky: "#0d0718",
    ground: "#1b0d2b",
    planet: "#45206e",
  },
  {
    slug: "vesper",
    accent: "#ff5e6d",
    accentRgb: "255 94 109",
    accentSoft: "rgb(255 94 109 / 0.13)",
    secondary: "#d4e3ff",
    sky: "#09070d",
    ground: "#1d0b13",
    planet: "#4b1526",
  },
] as const;
