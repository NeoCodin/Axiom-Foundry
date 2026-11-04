/*
 * The Arc Carbine: the one weapon the Ark builds, for its soldiers and for AXIOM's
 * own sim-body. It fires the Ark's power, not rounds. Each shot spends charge from
 * the cell seated in it; inside a Lawheart's reach (the simulator's dome, the
 * shuttle's field, a settlement's dome) the cell draws power and fills again on
 * its own. Outside, there is only the cell and the spares carried.
 *
 * Its kernel holds one firing law at a time, and the law decides what kind of
 * weapon it is: Conservation, nothing of the discharge lost, a steady automatic;
 * Containment, the discharge held to one line, a heavy exact bolt; Transit, the law
 * carried out in seven bolts at once, a close wide burst. Firing heats the coils,
 * and past their limit the carbine vents and will not fire until it has.
 *
 * Attachments change the rest: an optic for aiming down the sights, a barrel piece
 * for the sound and the spread, and the cell itself. Pure rules, shared by the
 * simulator's modes; their drawing code works out what each bolt hits.
 */

export type CarbineForm = "conservation" | "containment" | "transit";
export type CarbineOptic = "iron" | "reflex" | "scope";
export type CarbineBarrel = "bare" | "suppressor" | "focus";
export type CarbineCell = "standard" | "extended" | "heatsink";
export type CarbineLoadout = { form: CarbineForm; optic: CarbineOptic; barrel: CarbineBarrel; cell: CarbineCell };

export const DEFAULT_LOADOUT: CarbineLoadout = { form: "conservation", optic: "iron", barrel: "bare", cell: "standard" };

/** The firing laws: what each shot costs and heats, how fast it cycles, and what leaves the emitter. */
export const FORMS: Record<CarbineForm, {
  label: string;
  law: string;
  blurb: string;
  /** Charge per shot, out of a standard cell's hundred. */
  cost: number;
  heat: number;
  /** Seconds between shots. */
  interval: number;
  /** Damage per bolt, and bolts per shot. */
  damage: number;
  bolts: number;
  /** How far each bolt may stray, in radians, before stance and attachments. */
  spread: number;
}> = {
  conservation: { label: "Carbine", law: "Conservation", blurb: "None of the discharge is lost: steady automatic fire.", cost: 4, heat: 7, interval: 0.12, damage: 1, bolts: 1, spread: 0.006 },
  containment: { label: "Lance", law: "Containment", blurb: "The discharge cannot leave its line: one heavy, exact bolt.", cost: 18, heat: 32, interval: 0.8, damage: 5, bolts: 1, spread: 0 },
  transit: { label: "Scatter", law: "Transit", blurb: "The law rides out in seven bolts at once: a close, wide burst.", cost: 12, heat: 24, interval: 0.6, damage: 0.75, bolts: 7, spread: 0.08 },
};

/** How far each optic draws the view in when aiming down the sights. */
export const OPTICS: Record<CarbineOptic, { label: string; blurb: string; zoom: number }> = {
  iron: { label: "Iron sights", blurb: "Nothing in the way: a quick, wide aim.", zoom: 1.3 },
  reflex: { label: "Reflex sight", blurb: "A lit dot on clear glass: a little closer, as quick.", zoom: 1.7 },
  scope: { label: "Scope", blurb: "A magnified sight for distance. Narrow, and slow to bring round.", zoom: 3.4 },
};

/** What the barrel piece does to the sound of a shot, its spread and its bite. */
export const BARRELS: Record<CarbineBarrel, { label: string; blurb: string; noise: number; spread: number; damage: number }> = {
  bare: { label: "Bare emitter", blurb: "The discharge as it comes.", noise: 1, spread: 1, damage: 1 },
  suppressor: { label: "Suppressor", blurb: "Damps the crack of each shot: far fewer ears hear it, for a little less bite.", noise: 0.35, spread: 1, damage: 0.85 },
  focus: { label: "Focus coil", blurb: "Tightens the discharge to half its spread, and rings louder for it.", noise: 1.15, spread: 0.45, damage: 1 },
};

/** The cell: how much charge it holds, how much heat the coils take before venting, how fast they cool, and how long a swap takes. */
export const CELLS: Record<CarbineCell, { label: string; blurb: string; capacity: number; limit: number; cooling: number; swap: number }> = {
  standard: { label: "Standard cell", blurb: "The Ark's issue cell.", capacity: 100, limit: 100, cooling: 1, swap: 1.4 },
  extended: { label: "Extended cell", blurb: "Holds half as much again, and takes longer to change.", capacity: 150, limit: 100, cooling: 1, swap: 1.9 },
  heatsink: { label: "Heat sink", blurb: "An overheat suppressor: the coils run cooler and longer before they must vent. A smaller cell.", capacity: 90, limit: 150, cooling: 1.7, swap: 1.4 },
};

export const FORM_ORDER: readonly CarbineForm[] = ["conservation", "containment", "transit"];
export const OPTIC_ORDER: readonly CarbineOptic[] = ["iron", "reflex", "scope"];
export const BARREL_ORDER: readonly CarbineBarrel[] = ["bare", "suppressor", "focus"];
export const CELL_ORDER: readonly CarbineCell[] = ["standard", "extended", "heatsink"];

/** Heat shed a second once the trigger rests, and how soon after a shot it starts. */
export const COOL_RATE = 45;
export const COOL_DELAY = 0.2;
/** How long a vent takes, and how fast a cell fills inside a Lawheart's reach (charge a second). */
export const VENT_SECONDS = 1.8;
export const RECHARGE_RATE = 16;

export type Carbine = {
  loadout: CarbineLoadout;
  /** Charge left in the seated cell. */
  charge: number;
  /** Spare cells carried; Infinity never runs out. */
  spare: number;
  heat: number;
  /** When a vent finishes, or null. */
  ventUntil: number | null;
  /** When a cell swap finishes, or null. */
  swapUntil: number | null;
  lastShot: number;
};

export const capacity = (gun: Carbine) => CELLS[gun.loadout.cell].capacity;
export const heatLimit = (gun: Carbine) => CELLS[gun.loadout.cell].limit;

export function createCarbine(loadout: CarbineLoadout = DEFAULT_LOADOUT, spare = 2): Carbine {
  return { loadout, charge: CELLS[loadout.cell].capacity, spare, heat: 0, ventUntil: null, swapUntil: null, lastShot: -Infinity };
}

/** A loadout read back from storage, with anything unknown set to the issue part. */
export function sanitizeLoadout(value: unknown): CarbineLoadout {
  const raw = (value && typeof value === "object" ? value : {}) as Partial<Record<keyof CarbineLoadout, string>>;
  const pick = <T extends string>(options: readonly T[], chosen: string | undefined, fallback: T) => (options as readonly string[]).includes(chosen ?? "") ? chosen as T : fallback;
  return {
    form: pick(FORM_ORDER, raw.form, DEFAULT_LOADOUT.form),
    optic: pick(OPTIC_ORDER, raw.optic, DEFAULT_LOADOUT.optic),
    barrel: pick(BARREL_ORDER, raw.barrel, DEFAULT_LOADOUT.barrel),
    cell: pick(CELL_ORDER, raw.cell, DEFAULT_LOADOUT.cell),
  };
}

export type CarbineEvent = "swapped" | "vented" | "charged";

/**
 * Advance the carbine: a swap finishes, the coils cool or vent, and inside a
 * Lawheart's reach the seated cell fills (at rate a second; a power pack on
 * AXIOM's back feeds it faster).
 */
export function stepCarbine(gun: Carbine, time: number, dt: number, powered: boolean, rate = RECHARGE_RATE): CarbineEvent[] {
  const events: CarbineEvent[] = [];
  const cell = CELLS[gun.loadout.cell];
  if (gun.swapUntil !== null && time >= gun.swapUntil) {
    gun.swapUntil = null;
    if (Number.isFinite(gun.spare)) gun.spare = Math.max(0, gun.spare - 1);
    gun.charge = cell.capacity;
    events.push("swapped");
  }
  if (gun.ventUntil !== null) {
    gun.heat = Math.max(0, gun.heat - (cell.limit / VENT_SECONDS) * dt);
    if (time >= gun.ventUntil) {
      gun.ventUntil = null;
      gun.heat = 0;
      events.push("vented");
    }
  } else if (time - gun.lastShot > COOL_DELAY) {
    gun.heat = Math.max(0, gun.heat - COOL_RATE * cell.cooling * dt);
  }
  if (powered && gun.swapUntil === null && gun.charge < cell.capacity) {
    gun.charge = Math.min(cell.capacity, gun.charge + rate * dt);
    if (gun.charge >= cell.capacity) events.push("charged");
  }
  return events;
}

/** Write a different firing law into the kernel: from its next cycle the carbine is that weapon. */
export function switchLaw(gun: Carbine, form: CarbineForm, time: number) {
  if (gun.loadout.form === form) return false;
  gun.loadout = { ...gun.loadout, form };
  gun.lastShot = time;
  return true;
}

/** Change the cell, if there is a spare and the seated one is not already full. */
export function swapCell(gun: Carbine, time: number) {
  if (gun.swapUntil !== null || gun.spare <= 0 || gun.charge >= capacity(gun)) return false;
  gun.swapUntil = time + CELLS[gun.loadout.cell].swap;
  return true;
}

/** What leaves the emitter when the carbine fires. */
export type Discharge = {
  bolts: number;
  damage: number;
  spread: number;
  /** How far the shot carries, against the bare emitter's. */
  noise: number;
  /** This shot took the coils past their limit. */
  vent: boolean;
};

/**
 * Pull the trigger. It fires if it is not mid-swap or venting, has cycled, and has
 * the charge; an empty cell clicks and starts a swap.
 */
export function pullTrigger(gun: Carbine, time: number): Discharge | "busy" | "hot" | "dry" {
  const form = FORMS[gun.loadout.form];
  const barrel = BARRELS[gun.loadout.barrel];
  if (gun.swapUntil !== null) return "busy";
  if (gun.ventUntil !== null) return "hot";
  if (time - gun.lastShot < form.interval) return "busy";
  if (gun.charge < form.cost) {
    gun.lastShot = time;
    swapCell(gun, time);
    return "dry";
  }
  gun.charge -= form.cost;
  gun.heat += form.heat;
  gun.lastShot = time;
  const vent = gun.heat >= heatLimit(gun);
  if (vent) {
    gun.heat = heatLimit(gun);
    gun.ventUntil = time + VENT_SECONDS;
  }
  return { bolts: form.bolts, damage: form.damage * barrel.damage, spread: form.spread * barrel.spread, noise: barrel.noise, vent };
}

/** The carbine as the heads-up display shows it. */
export function carbineReadout(gun: Carbine, time: number) {
  const cell = CELLS[gun.loadout.cell];
  return {
    form: FORMS[gun.loadout.form].label,
    optic: gun.loadout.optic,
    charge: gun.charge / cell.capacity,
    shots: Math.floor(gun.charge / FORMS[gun.loadout.form].cost),
    spare: gun.spare,
    heat: Math.min(1, gun.heat / cell.limit),
    venting: gun.ventUntil !== null,
    swapping: gun.swapUntil !== null ? Math.min(1, 1 - (gun.swapUntil - time) / cell.swap) : null,
  };
}
