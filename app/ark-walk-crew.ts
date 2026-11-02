/*
 * Who does what aboard, for the drone view. Every crew member gets a place to be and
 * something to do there, from their job, their health, their training and their age:
 * engineers at the press and the racks, researchers at the screens, the wounded in the
 * sick bay with a doctor beside them, trainees at the Learning Deck desks while the
 * teacher walks the board, the off-duty eating together or talking in pairs, cooking
 * in the galley or asleep in their cabins, soldiers at the Armory's range and bench.
 * Pure planning; ark-walk.tsx animates it.
 */

import { CORE_HALF_Z, DOCK_WALL_Z, HALF_DEPTH, SIDE_ROOM_PLANS, towardWalls, type WalkRoomKind } from "./ark-walk-layout.ts";

export type WalkCrewMember = {
  id: string;
  name: string;
  role: string;
  /** In a training programme: they study on the Learning Deck. */
  training?: boolean;
  /** Wounded: they rest in the sick bay. */
  resting?: boolean;
  ageGroup?: string | null;
};

export type Activity =
  | "type" // working a console
  | "inspect" // walking a row of equipment, stopping to check it
  | "carry" // hauling crates from one place to another
  | "fix" // working on a machine with a tool
  | "tend" // reaching into the hydroponic shelves
  | "point" // pointing something out while talking
  | "talk" // in conversation
  | "teach" // walking the board, turning to point at it
  | "study" // seated at a desk, writing
  | "eat" // seated at the mess table
  | "sleep" // lying in a bunk
  | "patient" // lying in a sick-bay bed
  | "heal" // standing at a sick-bay bed
  | "pilot" // seated at the helm
  | "guard" // standing watch, or walking a beat
  | "lounge" // seated on a bench, chatting
  | "cook" // at the galley stoves
  | "aim" // on the Armory's firing range
  | "train"; // in a combat simulator pod, headset on

/** Activities done sitting or lying down. */
export const SEATED: ReadonlySet<Activity> = new Set(["study", "eat", "pilot", "lounge", "train"]);
export const LYING: ReadonlySet<Activity> = new Set(["sleep", "patient"]);

export type Spot = {
  activity: Activity;
  /** Where they are: x metres from the room's stern end, z across the ship. */
  at: { x: number; z: number };
  /** The far end of their beat, for jobs that move. */
  to?: { x: number; z: number };
  /** The direction they face while at it. */
  look: { x: number; z: number };
  /** Seat or bunk height above the deck. */
  y?: number;
  /** Only these jobs take this spot. */
  for?: readonly string[];
  /** The two spots of a conversation are filled together or not at all. */
  pair?: string;
  /** For the two-storey chamber: which deck the spot is on (0 upper, 1 lower). */
  deck?: number;
  /** In a room behind the hall (a cabin, the galley, the Armory): only used while it is open. */
  area?: string;
};

/** Where each profession works aboard; everyone else lives in Habitation. */
export const ROLE_ROOM: Record<string, WalkRoomKind> = {
  engineer: "fabrication",
  technician: "fabrication",
  fabricator: "fabrication",
  doctor: "support",
  farmer: "support",
  researcher: "research",
  teacher: "education",
  navigator: "bridge",
  security: "hangar",
  soldier: "hangar",
  // Civilians keep the common room: the lockers and the galley.
  civilian: "habitation",
};

const w = (z: number) => towardWalls(z);
const point = (x: number, z: number) => ({ x, z });
const ENGINEERS = ["engineer", "technician", "fabricator"];
const GALLERY_Z = -(CORE_HALF_Z + 1.4);
const SOLDIERS = ["security", "soldier"];
const sideRoom = (section: WalkRoomKind, id: string) => SIDE_ROOM_PLANS[section]!.find((plan) => plan.id === id)!;
const GALLEY = sideRoom("habitation", "galley");
const ARMORY = sideRoom("hangar", "armory");
const BRIEFING = sideRoom("hangar", "briefing");
const SIMULATOR = sideRoom("hangar", "simulator");
const STORES = sideRoom("fabrication", "stores");
const WORKSHOP = sideRoom("fabrication", "workshop");
const LAB = sideRoom("research", "lab");
const LIBRARY = sideRoom("education", "library");
const CLASSROOM = sideRoom("education", "classroom");
const FARM = sideRoom("support", "farm");
const INFIRMARY = sideRoom("support", "infirmary");
const RESEARCHERS = ["researcher"];
/** Two lists taken one from each in turn, the rest of the longer after. */
const interleave = <T,>(first: readonly T[], second: readonly T[]) =>
  Array.from({ length: Math.max(first.length, second.length) }, (_, index) => [first[index], second[index]]).flat().filter((item): item is T => item !== undefined);
const FARMERS = ["farmer"];
const CABINS = SIDE_ROOM_PLANS.habitation!.filter((plan) => plan.kind === "cabin");

/** Every room's places, best first. Furniture is drawn against 7 m walls and pushed out (w). */
export const ROOM_SPOTS: Record<WalkRoomKind, readonly Spot[]> = {
  fabrication: [
    { activity: "type", at: point(3.5, w(-2.9)), look: point(0, -1), for: ENGINEERS },
    { activity: "fix", at: point(WORKSHOP.from + 5.6, WORKSHOP.z0 + 5.7), look: point(0, -1), for: ENGINEERS, area: "workshop" },
    { activity: "carry", at: point(15.4, w(3.7)), to: point(3.2, w(3.9)), look: point(-1, 0) },
    { activity: "carry", at: point(STORES.from + 1.9, STORES.z1 - 1.6), to: point(STORES.from + 1.9, STORES.z0 + 1), look: point(0, -1), for: ENGINEERS, area: "stores" },
    { activity: "inspect", at: point(7, w(-4.8)), to: point(12.2, w(-4.8)), look: point(0, -1) },
    { activity: "fix", at: point(12.4, w(1.9)), look: point(1, 1.1) },
    { activity: "type", at: point(WORKSHOP.from + 8.6, WORKSHOP.z0 + 3), look: point(1, 0), for: ENGINEERS, area: "workshop" },
    { activity: "talk", at: point(5.6, 2.4), look: point(1, 0), pair: "fabrication" },
    { activity: "talk", at: point(6.5, 2.4), look: point(-1, 0), pair: "fabrication" },
  ],
  research: [
    { activity: "type", at: point(3.5, w(-4.8)), look: point(0, -1) },
    { activity: "type", at: point(LAB.from + 3.75, LAB.z0 + 4.6), look: point(0, -1), for: RESEARCHERS, area: "lab" },
    { activity: "type", at: point(6, w(-4.8)), look: point(0, -1) },
    { activity: "inspect", at: point(LAB.from + 10.2, LAB.z0 + 1.6), to: point(LAB.from + 14, LAB.z0 + 1.6), look: point(0, -1), for: RESEARCHERS, area: "lab" },
    { activity: "point", at: point(5.7, w(3.4)), look: point(1, 0), pair: "holo-table" },
    { activity: "talk", at: point(9.3, w(3.4)), look: point(-1, 0), pair: "holo-table" },
    { activity: "type", at: point(10, w(-4.8)), look: point(0, -1) },
    { activity: "type", at: point(2.8, w(5.1)), look: point(0, 1) },
    { activity: "type", at: point(LAB.from + 11.25, LAB.z0 + 4.6), look: point(0, -1), for: RESEARCHERS, area: "lab" },
  ],
  bridge: [
    { activity: "pilot", at: point(10.3, 0), look: point(1, 0), y: 0.66, for: ["navigator"] },
    { activity: "type", at: point(4, w(-4.9)), look: point(0, -1) },
    { activity: "guard", at: point(5.5, 2.6), look: point(1, 0) },
    { activity: "type", at: point(4, w(4.9)), look: point(0, 1) },
  ],
  support: [
    // The wounded are nursed in the infirmary, two beds at its far wall and two by its door.
    { activity: "heal", at: point(INFIRMARY.from + 2.1, INFIRMARY.z0 + 1.3), look: point(-1, 0), for: ["doctor"], area: "infirmary" },
    { activity: "tend", at: point(9.9, w(5.6)), to: point(11.1, w(5.6)), look: point(0, 1), for: ["farmer"] },
    { activity: "tend", at: point(FARM.from + 2, FARM.z0 + 2.1), to: point(FARM.from + 11, FARM.z0 + 2.1), look: point(0, -1), for: FARMERS, area: "farm" },
    { activity: "type", at: point(6.7, w(4.4)), look: point(0, 1) },
    { activity: "tend", at: point(11.7, w(5.6)), to: point(12.9, w(5.6)), look: point(0, 1), for: ["farmer"] },
    { activity: "tend", at: point(FARM.from + 2, FARM.z0 + 3.9), to: point(FARM.from + 11, FARM.z0 + 3.9), look: point(0, 1), for: FARMERS, area: "farm" },
    { activity: "inspect", at: point(2.6, w(-3.6)), to: point(11.4, w(-3.6)), look: point(0, -1) },
    // Lying figures are centred on their bed, head towards the look direction.
    ...[[0.65, 1.25], [INFIRMARY.to - INFIRMARY.from - 0.65, 1.25], [0.65, 4.45], [INFIRMARY.to - INFIRMARY.from - 0.65, 4.45]].map(([x, z]): Spot => ({
      activity: "patient", at: point(INFIRMARY.from + x, INFIRMARY.z0 + z), look: point(0, -1), y: 0.72, area: "infirmary",
    })),
  ],
  education: [
    { activity: "teach", at: point(4.5, w(-4.2)), to: point(9.5, w(-4.2)), look: point(0, 1), for: ["teacher"] },
    // Desks in the hall and in the classroom behind it fill in turn; then the library's reading table.
    ...interleave(
      [2, 3.6, 5.2].flatMap((row) => [3, 5.67, 8.33, 11].map((deskX): Spot => ({ activity: "study", at: point(deskX, w(row + 0.55)), look: point(0, -1), y: 0.45 }))),
      [2.4, 4].flatMap((row) => [1.5, 3.3, 5.1].map((deskX): Spot => ({
        activity: "study", at: point(CLASSROOM.from + deskX, CLASSROOM.z0 + row + 0.55), look: point(0, -1), y: 0.45, area: "classroom",
      }))),
    ),
    { activity: "study", at: point(LIBRARY.from + 3.1, LIBRARY.z0 + 4.15), look: point(0, -1), y: 0.45, area: "library" },
    { activity: "study", at: point(LIBRARY.from + 3.1, LIBRARY.z0 + 1.85), look: point(0, 1), y: 0.45, area: "library" },
  ],
  habitation: [
    { activity: "eat", at: point(12.6, w(2.25)), look: point(0, 1), y: 0.55 },
    { activity: "eat", at: point(14.2, w(4.55)), look: point(0, -1), y: 0.55 },
    { activity: "eat", at: point(14.2, w(2.25)), look: point(0, 1), y: 0.55 },
    { activity: "eat", at: point(12.6, w(4.55)), look: point(0, -1), y: 0.55 },
    { activity: "talk", at: point(5, -3), look: point(0, 1), pair: "habitation-a" },
    { activity: "talk", at: point(5, -2.1), look: point(0, -1), pair: "habitation-a" },
    { activity: "talk", at: point(7, 3.2), look: point(1, 0), pair: "habitation-b" },
    { activity: "talk", at: point(7.9, 3.2), look: point(-1, 0), pair: "habitation-b" },
    { activity: "type", at: point(3, w(5.6)), look: point(0, 1) },
    { activity: "cook", at: point(GALLEY.from + 1.5, GALLEY.z0 + 1.5), look: point(0, -1), area: "galley" },
    { activity: "cook", at: point(GALLEY.to - 1.5, GALLEY.z0 + 1.5), look: point(0, -1), area: "galley" },
    // Two to a cabin, in its bunk, head to the far wall.
    ...CABINS.flatMap((cabin) => [0.74, 1.94].map((y): Spot => ({
      activity: "sleep", at: point(cabin.from + 0.6, cabin.z0 + 1.6), look: point(0, -1), y, area: cabin.id,
    }))),
  ],
  // The dock is laid out at full width already.
  hangar: [
    { activity: "guard", at: point(9.3, DOCK_WALL_Z - 0.7), look: point(0, -1) },
    { activity: "aim", at: point(ARMORY.from + 3.6, ARMORY.z0 + 0.9), look: point(1, 0), for: SOLDIERS, area: "armory" },
    { activity: "fix", at: point(ARMORY.from + 1.6, ARMORY.z0 + 4.7), look: point(-1, 0), for: SOLDIERS, area: "armory" },
    { activity: "type", at: point(6, DOCK_WALL_Z - 2.1), look: point(0, 1) },
    // Soldiers drill in the combat simulator, seated in its pods.
    ...[[0.65, 1.6, 1], [SIMULATOR.to - SIMULATOR.from - 0.65, 4.2, -1]].map(([x, z, facing]): Spot => ({
      activity: "train", at: point(SIMULATOR.from + x, SIMULATOR.z0 + z), look: point(facing, 0), y: 0.5, for: SOLDIERS, area: "simulator",
    })),
    { activity: "guard", at: point(3, -2.4), to: point(24, -2.4), look: point(0, 1) },
    { activity: "aim", at: point(ARMORY.from + 3.6, ARMORY.z0 + 1.9), look: point(1, 0), for: SOLDIERS, area: "armory" },
    { activity: "type", at: point(ARMORY.from + 7.3, ARMORY.z0 + 6.9), look: point(0, -1), for: SOLDIERS, area: "armory" },
    { activity: "inspect", at: point(ARMORY.from + 3.4, ARMORY.z1 - 1.4), to: point(ARMORY.from + 12, ARMORY.z1 - 1.4), look: point(0, 1), for: SOLDIERS, area: "armory" },
    { activity: "point", at: point(BRIEFING.from + 1, BRIEFING.z0 + 4.8), look: point(1, 0), pair: "briefing", area: "briefing" },
    { activity: "talk", at: point(BRIEFING.from + 4.6, BRIEFING.z0 + 4.8), look: point(-1, 0), pair: "briefing", area: "briefing" },
    { activity: "lounge", at: point(2.5, -(HALF_DEPTH - 0.7)), look: point(0, 1), y: 0.45, pair: "lounge" },
    { activity: "lounge", at: point(4.5, -(HALF_DEPTH - 0.7)), look: point(0, 1), y: 0.45, pair: "lounge" },
  ],
  // Watching the Law-Heart through the core windows from the lower gallery.
  chamber: [
    { activity: "inspect", at: point(4, GALLERY_Z), to: point(12, GALLERY_Z), look: point(0, 1), deck: 1, for: ENGINEERS },
  ],
};

/** A full ship's company for the QA sandbox: every job, the wounded, trainees and children. */
export function demoCrew(): WalkCrewMember[] {
  const roles = [
    "engineer", "engineer", "technician", "fabricator", "engineer", "researcher", "researcher", "researcher", "researcher",
    "doctor", "farmer", "farmer", "teacher", "navigator", "navigator", "security", "soldier", "soldier",
    "civilian", "civilian", "civilian", "civilian", "civilian", "civilian", "civilian", "civilian",
  ];
  const crew: WalkCrewMember[] = roles.map((role, index) => ({ id: `demo-${index}`, name: `Crew ${index + 1}`, role }));
  crew[3].resting = true;
  crew[19].resting = true;
  crew[1].training = true;
  crew[20].training = true;
  crew[21].ageGroup = "child";
  crew[22].ageGroup = "child";
  crew[23].ageGroup = "elder";
  return crew;
}

export type Placement = { member: WalkCrewMember; room: WalkRoomKind; spot: Spot; index: number };
export type CrewPlan = { placed: Placement[]; roaming: WalkCrewMember[] };

const REST: ReadonlySet<Activity> = new Set(["study", "eat", "sleep", "patient", "lounge"]);
const MAX_ROAMING = 6;

/**
 * Give everyone aboard a place: the wounded to bed, trainees and children to the desks,
 * the rest to their job's room, and anyone left over into a conversation, the mess,
 * a bunk, or walking the decks.
 */
export function planCrew(
  crew: readonly WalkCrewMember[],
  online: (room: WalkRoomKind) => boolean,
  away: ReadonlySet<string> = new Set(),
  areaOpen: (area: string) => boolean = () => true,
): CrewPlan {
  const taken = new Set<string>();
  const placed: Placement[] = [];
  const free = (room: WalkRoomKind, accept: (spot: Spot) => boolean) =>
    online(room)
      ? ROOM_SPOTS[room]
        .map((spot, index) => ({ spot, index }))
        .filter(({ spot, index }) => !taken.has(`${room}:${index}`) && (!spot.area || areaOpen(spot.area)) && accept(spot))
      : [];
  const take = (member: WalkCrewMember, room: WalkRoomKind, slot: { spot: Spot; index: number }) => {
    taken.add(`${room}:${slot.index}`);
    placed.push({ member, room, spot: slot.spot, index: slot.index });
  };
  const fits = (member: WalkCrewMember, spot: Spot) => !spot.for || spot.for.includes(member.role);

  const aboard = crew.filter((member) => !away.has(member.id));
  const waiting: WalkCrewMember[] = [];
  // The wounded first: they lie down whatever their job, in the sick bay if there is room.
  for (const member of aboard) {
    if (!member.resting) continue;
    const bed = free("support", (spot) => spot.activity === "patient")[0] ?? free("habitation", (spot) => spot.activity === "sleep")[0];
    if (bed) take(member, bed.spot.activity === "patient" ? "support" : "habitation", bed);
  }
  const patients = placed.some((placement) => placement.spot.activity === "patient");
  for (const member of aboard) {
    if (member.resting) continue;
    // Trainees and children are in class.
    if (member.training || member.ageGroup === "child") {
      const desk = free("education", (spot) => spot.activity === "study")[0];
      if (desk) {
        take(member, "education", desk);
        continue;
      }
    }
    const home = ROLE_ROOM[member.role];
    const job = home
      ? free(home, (spot) => !spot.pair && !REST.has(spot.activity) && fits(member, spot) && (spot.activity !== "heal" || patients))[0]
      : undefined;
    const lookout = home && ["engineer", "technician", "fabricator"].includes(member.role) && !job ? free("chamber", (spot) => fits(member, spot))[0] : undefined;
    if (home && job) take(member, home, job);
    else if (lookout) take(member, "chamber", lookout);
    else waiting.push(member);
  }

  // Whoever is left talks in pairs in their own room, then in Habitation, then eats, sleeps or walks.
  const pairUp = (room: WalkRoomKind, people: WalkCrewMember[]) => {
    const pairs = new Map<string, { spot: Spot; index: number }[]>();
    for (const slot of free(room, (spot) => Boolean(spot.pair))) {
      pairs.set(slot.spot.pair!, [...(pairs.get(slot.spot.pair!) ?? []), slot]);
    }
    for (const slots of pairs.values()) {
      if (slots.length < 2 || people.length < 2) continue;
      take(people.shift()!, room, slots[0]);
      take(people.shift()!, room, slots[1]);
    }
  };
  const byHome = new Map<WalkRoomKind, WalkCrewMember[]>();
  const homeless: WalkCrewMember[] = [];
  for (const member of waiting) {
    const home = ROLE_ROOM[member.role];
    if (home && online(home)) byHome.set(home, [...(byHome.get(home) ?? []), member]);
    else homeless.push(member);
  }
  for (const [room, people] of byHome) {
    pairUp(room, people);
    homeless.push(...people);
  }
  pairUp("habitation", homeless);
  const roaming: WalkCrewMember[] = [];
  for (const member of homeless) {
    const seat = free("habitation", (spot) => spot.activity === "eat")[0]
      ?? (roaming.length >= MAX_ROAMING ? free("habitation", (spot) => spot.activity === "sleep")[0] : undefined);
    if (seat) take(member, "habitation", seat);
    else if (roaming.length < MAX_ROAMING) roaming.push(member);
  }
  return { placed, roaming };
}
