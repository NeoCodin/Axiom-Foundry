"use client";

import { type CSSProperties } from "react";
import { CIVILIAN_COLOR, CREW_ROLE_COLORS, PORTRAIT_SKINS } from "./crew-portrait";

/*
 * The Ark as a living pixel cutaway: one shared ship drawn on a 300x110 unit
 * grid (each unit a crisp block), with the real rooms, the real crew walking
 * their decks, and the Law-Heart beating in its chamber. Rooms are opened from
 * the tag pinned to them, so information lives on the ship instead of in panels.
 */

export type ArkCutawayRoomKind =
  | "fabrication"
  | "support"
  | "habitation"
  | "research"
  | "education"
  | "bridge";

export type ArkCutawayRoom = {
  key: string;
  kind: ArkCutawayRoomKind;
  label: string;
  sublabel: string;
  online: boolean;
  commissioning: boolean;
  interactive: boolean;
  ariaLabel: string;
  guideTarget?: string;
  mark: number;
  onActivate: () => void;
};

export type ArkCutawayCrew = { id: string; role: string; name: string };

export type ArkCutawayProps = {
  rooms: readonly ArkCutawayRoom[];
  crew: readonly ArkCutawayCrew[];
  heart: { name: string; core: string; surface: string; bright: string; limb: string; rateLabel: string };
  beatPeriodMs: number;
  beaconOnline: boolean;
  signal: { label: string; detail: string; onOpen?: () => void } | null;
  worldGlass: string;
  transit: boolean;
  driveEnergy: number;
  /** Art only: no tags, no clicks. Phones list the rooms beneath it. */
  compact?: boolean;
  /** Clicking a crew member on the ship opens Personnel. */
  onOpenCrew?: () => void;
};

type Px = readonly [x: number, y: number, w: number, h: number, fill: string, opacity?: number];
type Row = { x: number; y: number; w: number };

const VIEW_W = 300;
const VIEW_H = 110;
const HULL_TOP = 18;
const HULL_BOTTOM = 96;

const C = {
  outline: "#1b1726",
  hull: "#5d5468",
  hullLight: "#8f84a0",
  hullShade: "#3a3346",
  stripe: "#b5534a",
  wall: "#262236",
  wainscot: "#1e1b2d",
  floor: "#6e5d4c",
  light: "#ffd27a",
  glass: "#9fe3ff",
  metal: "#3b3548",
  metalLight: "#7c7290",
  nozzle: "#2a2535",
  tankGlass: "#9fe3c9",
  tankFluid: "#2f9e74",
  bunk: "#b5534a",
  wood: "#8a5a3a",
  board: "#1f3a2e",
  chalk: "#e8f0e0",
  screen: "#7fe3ff",
  screenInk: "#2a6f86",
  shuttle: "#c9c1d6",
  cable: "#4a4258",
  flame: "#ffb347",
  flameCore: "#fff1c2",
  bubble: "#c9fff0",
  legs: "#2b2433",
};

const SLOTS: Record<
  ArkCutawayRoomKind,
  { x: number; y: number; w: number; h: number; tag: "above" | "below"; align: "center" | "end" }
> = {
  fabrication: { x: 30, y: 26, w: 56, h: 28, tag: "above", align: "center" },
  support: { x: 30, y: 58, w: 56, h: 28, tag: "below", align: "center" },
  habitation: { x: 158, y: 26, w: 50, h: 28, tag: "above", align: "center" },
  education: { x: 158, y: 58, w: 50, h: 28, tag: "below", align: "center" },
  research: { x: 214, y: 26, w: 44, h: 28, tag: "above", align: "center" },
  bridge: { x: 262, y: 34, w: 20, h: 44, tag: "below", align: "end" },
};
const CHAMBER = { x: 92, y: 26, w: 60, h: 60 };
const HANGAR = { x: 214, y: 58, w: 44, h: 28 };
const HEART_X = 122;
const HEART_Y = 56;
const ANTENNA_X = 265;

const HULL: readonly Px[] = [
  [22, 18, 252, 78, C.outline], [274, 24, 6, 66, C.outline], [280, 30, 5, 54, C.outline], [285, 38, 4, 38, C.outline], [289, 46, 2, 22, C.outline],
  [12, 28, 10, 20, C.metal], [12, 64, 10, 20, C.metal], [8, 31, 4, 14, C.nozzle], [8, 67, 4, 14, C.nozzle],
  [24, 20, 248, 74, C.hull], [274, 26, 4, 62, C.hull], [278, 32, 5, 50, C.hull], [283, 40, 4, 34, C.hull], [287, 48, 1, 18, C.hull],
  [24, 20, 248, 1, C.hullLight], [274, 26, 4, 1, C.hullLight], [278, 32, 5, 1, C.hullLight], [283, 40, 4, 1, C.hullLight],
  [24, 93, 248, 1, C.hullShade], [24, 89, 248, 1, C.stripe],
  [40, 22, 2, 2, C.glass], [52, 22, 2, 2, C.glass], [64, 22, 2, 2, C.glass], [76, 22, 2, 2, C.glass],
  [168, 22, 2, 2, C.glass], [180, 22, 2, 2, C.glass], [192, 22, 2, 2, C.glass],
  [222, 22, 2, 2, C.glass], [234, 22, 2, 2, C.glass], [246, 22, 2, 2, C.glass],
  [264, 8, 2, 10, C.hullLight], [258, 6, 14, 2, C.hullLight], [260, 4, 10, 2, C.hullLight],
];

const PROPS: Record<ArkCutawayRoomKind | "chamber" | "hangar", readonly Px[]> = {
  fabrication: [
    [36, 34, 12, 18, C.metal], [37, 35, 10, 2, C.metalLight], [38, 40, 8, 1, C.light],
    [50, 48, 34, 3, C.metal], [50, 48, 34, 1, C.metalLight],
  ],
  support: [
    [35, 61, 12, 2, C.metal], [51, 61, 12, 2, C.metal], [67, 61, 12, 2, C.metal],
    [36, 63, 10, 21, C.tankGlass, 0.35], [52, 63, 10, 21, C.tankGlass, 0.35], [68, 63, 10, 21, C.tankGlass, 0.35],
    [37, 68, 8, 15, C.tankFluid], [53, 66, 8, 17, C.tankFluid], [69, 70, 8, 13, C.tankFluid],
    [41, 59, 1, 2, C.cable], [57, 59, 1, 2, C.cable], [73, 59, 1, 2, C.cable],
  ],
  chamber: [
    [96, 30, 1, 52, C.cable], [147, 30, 1, 52, C.cable],
    [106, 36, 3, 46, C.metal], [135, 36, 3, 46, C.metal], [106, 36, 3, 1, C.metalLight], [135, 36, 3, 1, C.metalLight],
    [109, 56, 6, 1, C.cable], [129, 56, 6, 1, C.cable], [112, 80, 20, 4, C.metalLight],
  ],
  habitation: [
    [161, 31, 2, 21, C.metal], [163, 36, 16, 3, C.bunk], [163, 46, 16, 3, C.bunk],
    [163, 35, 3, 1, C.hullLight], [163, 45, 3, 1, C.hullLight],
    [186, 46, 14, 2, C.wood], [187, 48, 1, 4, C.wood], [198, 48, 1, 4, C.wood], [192, 28, 2, 2, C.light],
  ],
  education: [
    [161, 61, 24, 1, C.wood], [162, 62, 22, 11, C.board], [161, 73, 24, 1, C.wood],
    [165, 65, 8, 1, C.chalk], [165, 68, 12, 1, C.chalk], [176, 65, 5, 1, C.chalk],
    [188, 78, 7, 2, C.wood], [198, 78, 7, 2, C.wood],
    [189, 80, 1, 4, C.wood], [194, 80, 1, 4, C.wood], [199, 80, 1, 4, C.wood], [204, 80, 1, 4, C.wood],
  ],
  research: [[219, 44, 36, 4, C.metal], [219, 44, 36, 1, C.metalLight], [223, 48, 2, 4, C.metal], [249, 48, 2, 4, C.metal]],
  hangar: [
    [220, 72, 26, 8, C.shuttle], [226, 68, 14, 4, C.shuttle], [240, 70, 5, 3, C.glass],
    [218, 70, 4, 2, C.metal], [218, 80, 4, 2, C.metal], [222, 79, 22, 1, C.hullShade],
  ],
  bridge: [[281, 42, 3, 28, C.glass], [265, 64, 2, 8, C.metal], [265, 70, 6, 2, C.metal], [272, 62, 7, 3, C.metalLight]],
};

const SCREENS: readonly Px[] = [
  [218, 30, 11, 7, C.screen], [231, 30, 11, 7, C.screen], [244, 30, 11, 7, C.screen],
  [220, 32, 6, 1, C.screenInk], [220, 34, 4, 1, C.screenInk], [233, 32, 7, 1, C.screenInk], [233, 35, 5, 1, C.screenInk], [246, 33, 6, 1, C.screenInk],
];
const PISTON: readonly Px[] = [[41, 27, 2, 6, C.cable], [39, 33, 6, 3, C.metalLight]];
const CRATES: readonly Px[] = [[52, 44, 4, 4, C.wood], [66, 44, 4, 4, C.wood]];
const BUBBLES = [[40, 80, 0], [56, 78, -0.8], [72, 81, -1.6], [44, 76, -1.2], [60, 74, -0.4], [74, 77, -2]] as const;

/** Where each profession works aboard, and how many fit on a deck. */
const ROLE_ROOM: Record<string, ArkCutawayRoomKind> = {
  engineer: "fabrication",
  technician: "fabrication",
  fabricator: "fabrication",
  doctor: "support",
  farmer: "support",
  researcher: "research",
  teacher: "education",
  navigator: "bridge",
};
const ROOM_SPOTS: Record<ArkCutawayRoomKind, readonly number[]> = {
  fabrication: [52, 64, 76],
  support: [47, 63, 80],
  habitation: [181, 202, 168, 194],
  research: [215, 255],
  education: [186, 191, 200],
  bridge: [268],
};
const WALK_RANGE: Partial<Record<ArkCutawayRoomKind, number>> = { fabrication: 22, habitation: 18, education: 12 };
const HAIRS = ["#231a17", "#4b3020", "#8a4f27", "#cf9a52", "#d9d4cc", "#7c2f2a"];

function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function disc(cx: number, cy: number, r: number): Row[] {
  const rows: Row[] = [];
  for (let y = Math.floor(cy - r); y < Math.ceil(cy + r); y += 1) {
    const dy = y + 0.5 - cy;
    if (Math.abs(dy) >= r) continue;
    const half = Math.sqrt(r * r - dy * dy);
    const x0 = Math.round(cx - half);
    const x1 = Math.round(cx + half);
    if (x1 > x0) rows.push({ x: x0, y, w: x1 - x0 });
  }
  return rows;
}

function ring(cx: number, cy: number, outer: number, inner: number): Row[] {
  const rows: Row[] = [];
  for (let y = Math.floor(cy - outer); y < Math.ceil(cy + outer); y += 1) {
    const dy = y + 0.5 - cy;
    if (Math.abs(dy) >= outer) continue;
    const ho = Math.sqrt(outer * outer - dy * dy);
    const a0 = Math.round(cx - ho);
    const b1 = Math.round(cx + ho);
    if (Math.abs(dy) < inner) {
      const hi = Math.sqrt(inner * inner - dy * dy);
      const a1 = Math.round(cx - hi);
      const b0 = Math.round(cx + hi);
      if (a1 > a0) rows.push({ x: a0, y, w: a1 - a0 });
      if (b1 > b0) rows.push({ x: b0, y, w: b1 - b0 });
    } else if (b1 > a0) {
      rows.push({ x: a0, y, w: b1 - a0 });
    }
  }
  return rows;
}

const HEART_HALO = disc(HEART_X, HEART_Y, 10);
const HEART_BODY = disc(HEART_X, HEART_Y, 7);
const HEART_INNER = disc(HEART_X, HEART_Y, 4.5);
const HEART_CORE = disc(HEART_X, HEART_Y, 2);
const HEART_RING = ring(HEART_X, HEART_Y, 13, 12);
const PING_RING = ring(ANTENNA_X, 3, 3, 2);

function Blocks({ blocks }: { blocks: readonly Px[] }) {
  return blocks.map(([x, y, w, h, fill, opacity], index) => (
    <rect key={index} x={x} y={y} width={w} height={h} fill={fill} opacity={opacity} />
  ));
}

function Rows({ rows, fill, opacity }: { rows: readonly Row[]; fill: string; opacity?: number }) {
  return rows.map((row, index) => (
    <rect key={index} x={row.x} y={row.y} width={row.w} height={1} fill={fill} opacity={opacity} />
  ));
}

function roomShell(x: number, y: number, w: number, h: number, lit: boolean): Px[] {
  return [
    [x, y, w, h, C.wall],
    [x, y + h - 8, w, 6, C.wainscot],
    [x, y + h - 2, w, 2, C.floor],
    ...(lit ? ([[x + 3, y, w - 6, 1, C.light], [x, y + 1, w, 10, C.light, 0.1]] as Px[]) : []),
  ];
}

function Person({ x, top, id, role }: { x: number; top: number; id: string; role: string }) {
  const seed = hash(id);
  const hair = HAIRS[seed % HAIRS.length];
  const skin = PORTRAIT_SKINS[(seed >>> 4) % PORTRAIT_SKINS.length];
  const shirt = CREW_ROLE_COLORS[role] ?? CIVILIAN_COLOR;
  return (
    <>
      <rect x={x} y={top} width={3} height={1} fill={hair} />
      <rect x={x} y={top + 1} width={3} height={2} fill={skin} />
      <rect x={x} y={top + 3} width={3} height={3} fill={shirt} />
      <rect x={x} y={top + 6} width={1} height={2} fill={C.legs} />
      <rect x={x + 2} y={top + 6} width={1} height={2} fill={C.legs} />
    </>
  );
}

function titleCase(role: string) {
  const display = role === "security" ? "soldier" : role;
  return display.charAt(0).toUpperCase() + display.slice(1);
}

function placeCrew(crew: readonly ArkCutawayCrew[], online: ReadonlySet<ArkCutawayRoomKind>) {
  const placed: { id: string; role: string; name: string; kind: ArkCutawayRoomKind; spot: number }[] = [];
  const used: Partial<Record<ArkCutawayRoomKind, number>> = {};
  const claim = (member: ArkCutawayCrew, kind: ArkCutawayRoomKind) => {
    const taken = used[kind] ?? 0;
    if (!online.has(kind) || taken >= ROOM_SPOTS[kind].length) return false;
    used[kind] = taken + 1;
    placed.push({ id: member.id, role: member.role, name: member.name, kind, spot: taken });
    return true;
  };
  for (const member of crew) {
    const home = ROLE_ROOM[member.role] ?? "habitation";
    if (claim(member, home)) continue;
    if (claim(member, "habitation")) continue;
    claim(member, "education");
  }
  return placed;
}

export function ArkCutaway({
  rooms,
  crew,
  heart,
  beatPeriodMs,
  beaconOnline,
  signal,
  worldGlass,
  transit,
  driveEnergy,
  compact = false,
  onOpenCrew,
}: ArkCutawayProps) {
  const onlineKinds = new Set(rooms.filter((room) => room.online).map((room) => room.kind));
  const roomLabels = new Map(rooms.map((room) => [room.kind, room.label] as const));
  const placed = placeCrew(crew, onlineKinds);
  const style = {
    "--cutaway-beat": `${Math.max(600, beatPeriodMs)}ms`,
    "--cutaway-drive": String(0.35 + Math.min(1, Math.max(0, driveEnergy)) * 0.65),
  } as CSSProperties;

  return (
    <div className={`ark-cutaway-scene ${transit ? "is-in-transit" : ""} ${compact ? "is-compact" : ""}`} style={style}>
      <div className="ark-cutaway-frame">
        <svg
          className="ark-cutaway-art"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          shapeRendering="crispEdges"
          role="img"
          aria-label={`Cutaway of the Ark: ${rooms.filter((room) => room.online).length} of ${rooms.length} decks lit, ${crew.length} people aboard, the Law-Heart beating in its chamber`}
        >
          <g className="ark-cutaway-drive">
            <rect x={4} y={31} width={4} height={14} fill={C.flame} />
            <rect x={4} y={67} width={4} height={14} fill={C.flame} />
            <rect x={6} y={34} width={2} height={8} fill={C.flameCore} />
            <rect x={6} y={70} width={2} height={8} fill={C.flameCore} />
          </g>
          <Blocks blocks={HULL} />
          <rect
            className={beaconOnline ? `ark-cutaway-beacon ${signal ? "has-signal" : ""}` : undefined}
            x={264}
            y={2}
            width={2}
            height={2}
            fill={beaconOnline ? C.light : C.hullShade}
          />

          <Blocks blocks={roomShell(CHAMBER.x, CHAMBER.y, CHAMBER.w, CHAMBER.h, true)} />
          <rect x={CHAMBER.x} y={CHAMBER.y + 1} width={CHAMBER.w} height={CHAMBER.h - 2} fill={heart.surface} opacity={0.07} />
          <Blocks blocks={PROPS.chamber} />
          <Blocks blocks={roomShell(HANGAR.x, HANGAR.y, HANGAR.w, HANGAR.h, true)} />
          <Blocks blocks={PROPS.hangar} />

          {rooms.map((room) => {
            const slot = SLOTS[room.kind];
            return (
              <g
                key={room.key}
                className={`ark-cutaway-room ${room.online ? "is-online" : "is-dormant"} ${!compact && room.interactive ? "is-interactive" : ""}`}
                onClick={!compact && room.interactive ? room.onActivate : undefined}
              >
                <Blocks blocks={roomShell(slot.x, slot.y, slot.w, slot.h, room.online)} />
                <Blocks blocks={PROPS[room.kind]} />
                {room.kind === "bridge" && <rect x={281} y={58} width={3} height={12} style={{ fill: worldGlass }} />}
                {room.online && room.kind === "research" && (
                  <g className="ark-cutaway-screens"><Blocks blocks={SCREENS} /></g>
                )}
                {room.online && room.kind === "fabrication" && (
                  <>
                    <g className="ark-cutaway-piston"><Blocks blocks={PISTON} /></g>
                    <g className="ark-cutaway-crates"><Blocks blocks={CRATES} /></g>
                  </>
                )}
                {room.online && room.kind === "support" && BUBBLES.map(([x, y, delay]) => (
                  <rect
                    key={`${x}-${y}`}
                    className="ark-cutaway-bubble"
                    x={x}
                    y={y}
                    width={1}
                    height={1}
                    fill={C.bubble}
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
              </g>
            );
          })}

          <g className="ark-cutaway-heart-ring"><Rows rows={HEART_RING} fill={heart.bright} /></g>
          <g className="ark-cutaway-heart">
            <Rows rows={HEART_HALO} fill={heart.limb} opacity={0.3} />
            <Rows rows={HEART_BODY} fill={heart.surface} />
            <Rows rows={HEART_INNER} fill={heart.bright} />
            <Rows rows={HEART_CORE} fill={heart.core} />
          </g>

          {placed.map((person, index) => {
            const slot = SLOTS[person.kind];
            const x = ROOM_SPOTS[person.kind][person.spot];
            const top = slot.y + slot.h - 10;
            const range = person.spot === 0 ? WALK_RANGE[person.kind] : undefined;
            return (
              <g
                key={person.id}
                className={`ark-cutaway-person ${range ? "ark-cutaway-walker" : ""} ${!compact && onOpenCrew ? "is-interactive" : ""}`}
                data-pixel-tooltip={compact ? undefined : `${person.name} · ${titleCase(person.role)} · ${roomLabels.get(person.kind) ?? ""}`}
                onClick={!compact ? onOpenCrew : undefined}
                style={range ? ({
                  "--walk": `${range}px`,
                  animationDuration: `${8 + (index % 4) * 1.5}s`,
                  animationDelay: `${-(index * 1.7) % 9}s`,
                } as CSSProperties) : undefined}
              >
                <Person x={x} top={top} id={person.id} role={person.role} />
              </g>
            );
          })}

          {beaconOnline && [0, 1].map((index) => (
            <g key={index} className="ark-cutaway-ping" style={{ animationDelay: `${index * -1.2}s` }}>
              <Rows rows={PING_RING} fill={signal ? heart.bright : C.light} />
            </g>
          ))}
        </svg>

        {!compact && (
          <>
            {rooms.map((room) => {
              const slot = SLOTS[room.kind];
              const centre = ((slot.x + slot.w / 2) / VIEW_W) * 100;
              const tagStyle = slot.tag === "above"
                ? ({ "--tag-x": `${centre}%`, bottom: `calc(${100 - (HULL_TOP / VIEW_H) * 100}% + 26px)` } as CSSProperties)
                : ({ "--tag-x": `${centre}%`, top: `calc(${(HULL_BOTTOM / VIEW_H) * 100}% + 26px)` } as CSSProperties);
              return (
                <div key={room.key} className="ark-cutaway-slot">
                  <button
                    type="button"
                    className={`ark-cutaway-tag is-${slot.tag} align-${slot.align} ${room.online ? "is-online" : "is-dormant"} ${room.commissioning ? "is-commissioning" : ""}`}
                    style={tagStyle}
                    data-room={room.kind}
                    data-guide-target={room.guideTarget}
                    disabled={!room.interactive}
                    aria-label={room.ariaLabel}
                    onClick={room.onActivate}
                  >
                    <strong>{room.label}</strong>
                    <small>{room.sublabel}</small>
                    {room.commissioning && <em className="is-commission">Commission</em>}
                    {!room.commissioning && room.mark > 0 && <em>Mark {room.mark}</em>}
                  </button>
                </div>
              );
            })}

            <div
              className="ark-cutaway-heart-tag"
              style={{ "--tag-x": `${(HEART_X / VIEW_W) * 100}%`, bottom: `calc(${100 - (HULL_TOP / VIEW_H) * 100}% + 26px)` } as CSSProperties}
              tabIndex={0}
              aria-label={`Law-Heart: ${heart.name}, ${heart.rateLabel} routed through the Ark`}
            >
              <strong>{heart.name}</strong>
              <small>{heart.rateLabel} routed</small>
            </div>

            {signal && (
              <button
                type="button"
                className="ark-cutaway-signal"
                style={{ "--tag-x": `${(ANTENNA_X / VIEW_W) * 100}%` } as CSSProperties}
                onClick={signal.onOpen}
                disabled={!signal.onOpen}
                aria-label={`${signal.label}: ${signal.detail}. Open rescue operations`}
              >
                <strong>{signal.label}</strong>
                <small>{signal.detail}</small>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
