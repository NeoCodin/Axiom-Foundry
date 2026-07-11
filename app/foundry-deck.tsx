"use client";

import {
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

import {
  WORLD_IDS,
  type ExpeditionId,
  type RoomId,
  type WorldId,
} from "./discovery-content";
import {
  EXPEDITION_DEFINITIONS,
  ROOM_DEFINITIONS,
  getAvailableExpeditions,
  getCrewDefinition,
  getExpeditionDefinition,
  getRoomDefinition,
  getRoomSlotCapacity,
  getRoomUpgradeCost,
  type LivingFoundryState,
} from "./living-foundry-engine";

export type FoundryDeckProps = {
  state: LivingFoundryState;
  worldsSaved: number;
  currentWorld: WorldId | number | null;
  now: number;
  onRenameFoundry: (name: string) => void;
  onAssignCrew: (crewId: string, roomId: RoomId | null) => void;
  onRenameCallsign: (crewId: string, callsign: string) => void;
  onUpgradeRoom: (roomId: RoomId) => void;
  onLaunchExpedition: (
    expeditionId: ExpeditionId,
    crewIds: readonly string[],
  ) => void;
  onClaimExpedition: () => void;
  investigationLabel?: string | null;
  investigableRoomIds?: readonly RoomId[];
  onInvestigateRoom: (roomId: RoomId) => void;
  transmission?: { speaker: string; text: string } | null;
  onOpenEngineeringConsole: () => void;
  onOpenArchive: () => void;
};

type RoomPresentation = {
  code: string;
  deck: string;
  description: string;
  baseEffect: string;
};

const ROOM_PRESENTATION: Record<RoomId, RoomPresentation> = {
  "axiom-chamber": {
    code: "HEART",
    deck: "Midship",
    description: "The ark's law-heart keeps every occupied room physically possible.",
    baseEffect: "Stabilizes Cohesion and every active room.",
  },
  "fabrication-floor": {
    code: "ASSEMBLY",
    deck: "Works",
    description: "Crew shape machine nests from salvage and remembered geometry.",
    baseEffect: "Improves machine support and salvage handling.",
  },
  "resonance-gallery": {
    code: "CONCORD",
    deck: "Habitat",
    description: "A tuned commons where conflicting histories learn to agree.",
    baseEffect: "Raises crew Cohesion when staffed.",
  },
  "research-observatory": {
    code: "LENS",
    deck: "Crown",
    description: "An impossible window maps places the Null Tide has already erased.",
    baseEffect: "Improves expeditions and reveals distant signals.",
  },
  "memory-archive": {
    code: "MNEMOSYNE",
    deck: "Crown",
    description: "Lyra's sealed records outnumber the memories the crew admit having.",
    baseEffect: "Restores fragments and crew conversations.",
  },
  "planetfall-bridge": {
    code: "HELM",
    deck: "Crown",
    description: "The bridge points the living ark toward the next endangered world.",
    baseEffect: "Coordinates planetary arrival and evacuation.",
  },
  "recalibration-vault": {
    code: "SEED",
    deck: "Keel",
    description: "A silent vault preserves laws that must survive the next remaking.",
    baseEffect: "Strengthens permanent systems across landings.",
  },
  "expedition-bay": {
    code: "HANGAR",
    deck: "Keel",
    description: "Small craft leave through the ark's oldest and most scarred doors.",
    baseEffect: "Launches salvage and discovery expeditions.",
  },
};

const WORLD_PRESENTATION: Record<
  WorldId,
  {
    name: string;
    accent: string;
    rgb: string;
    secondary: string;
    sky: string;
    ground: string;
  }
> = {
  helion: {
    name: "Helion Reach",
    accent: "#55d6e8",
    rgb: "85 214 232",
    secondary: "#8fa8bd",
    sky: "#03070d",
    ground: "#101a26",
  },
  pelagos: {
    name: "Pelagos",
    accent: "#35c6d8",
    rgb: "53 198 216",
    secondary: "#597ce8",
    sky: "#020a17",
    ground: "#08253a",
  },
  cinderwake: {
    name: "Cinderwake",
    accent: "#ff8a3d",
    rgb: "255 138 61",
    secondary: "#e44536",
    sky: "#100605",
    ground: "#30130c",
  },
  ilyra: {
    name: "Ilyra",
    accent: "#c697ff",
    rgb: "198 151 255",
    secondary: "#ef60d6",
    sky: "#0b0615",
    ground: "#28123a",
  },
  orison: {
    name: "Orison Prime",
    accent: "#84e0a0",
    rgb: "132 224 160",
    secondary: "#e6c45a",
    sky: "#06110c",
    ground: "#173622",
  },
  vesper: {
    name: "Vesper Ark",
    accent: "#ff5e6d",
    rgb: "255 94 109",
    secondary: "#d4e3ff",
    sky: "#08060c",
    ground: "#2a0d17",
  },
};

const EXPEDITION_FLAVOR: Record<
  ExpeditionId,
  {
    risk: string;
  }
> = {
  kestrel: {
    risk: "Low signal risk",
  },
  lantern: {
    risk: "Unstable physics",
  },
  palimpsest: {
    risk: "Identity hazard",
  },
};

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function resolveWorldId(currentWorld: FoundryDeckProps["currentWorld"]): WorldId {
  if (typeof currentWorld === "string" && WORLD_IDS.includes(currentWorld)) {
    return currentWorld;
  }
  if (typeof currentWorld === "number" && Number.isFinite(currentWorld)) {
    const index = clamp(Math.trunc(currentWorld), 0, WORLD_IDS.length - 1);
    return WORLD_IDS[index];
  }
  return WORLD_IDS[0];
}

function formatRemaining(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const rest = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function formatRouteDuration(seconds: number) {
  if (seconds >= 3_600) {
    const hours = seconds / 3_600;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hr`;
  }
  return `${Math.ceil(seconds / 60)} min`;
}

function FoundryDeck({
  state,
  worldsSaved,
  currentWorld,
  now,
  onRenameFoundry,
  onAssignCrew,
  onRenameCallsign,
  onUpgradeRoom,
  onLaunchExpedition,
  onClaimExpedition,
  investigationLabel = null,
  investigableRoomIds = [],
  onInvestigateRoom,
  transmission = null,
  onOpenEngineeringConsole,
  onOpenArchive,
}: FoundryDeckProps) {
  const firstUnlockedRoom =
    state.rooms.find((room) => room.unlocked)?.id ?? ROOM_DEFINITIONS[0].id;
  const [selectedRoomId, setSelectedRoomId] =
    useState<RoomId>(firstUnlockedRoom);
  const [renamingFoundry, setRenamingFoundry] = useState(false);
  const [foundryDraft, setFoundryDraft] = useState(state.foundryName);
  const [selectedExpeditionId, setSelectedExpeditionId] =
    useState<ExpeditionId>(EXPEDITION_DEFINITIONS[0].id);
  const [selectedExpeditionCrew, setSelectedExpeditionCrew] = useState<
    string[]
  >([]);

  const roomById = useMemo(
    () =>
      new Map(
        state.rooms.map((room) => [room.id, room]),
      ),
    [state.rooms],
  );
  const worldId = resolveWorldId(currentWorld);
  const world = WORLD_PRESENTATION[worldId];
  const selectedRoom = roomById.get(selectedRoomId);
  const selectedRoomDefinition = getRoomDefinition(selectedRoomId);
  const selectedUpgradeCost = getRoomUpgradeCost(state, selectedRoomId);
  const selectedPresentation = ROOM_PRESENTATION[selectedRoomId];
  const unlockedCrew = state.crew.filter((member) => member.unlocked);
  const selectedCrew = unlockedCrew.filter(
    (member) => member.assignedRoomId === selectedRoomId,
  );
  const cohesion = clamp(
    Number.isFinite(state.cohesion) ? state.cohesion : 0,
    0,
    100,
  );
  const activeExpedition = state.activeExpedition;
  const activeExpeditionDefinition = activeExpedition
    ? getExpeditionDefinition(activeExpedition.id)
    : null;
  const expeditionReady = Boolean(
    activeExpedition && now >= activeExpedition.endsAt,
  );
  const hangarUnlocked = roomById.get("expedition-bay")?.unlocked ?? false;
  const availableExpeditions = getAvailableExpeditions(worldsSaved);
  const selectedExpeditionDefinition = getExpeditionDefinition(
    selectedExpeditionId,
  );
  const selectedExpeditionAvailable = availableExpeditions.some(
    (expedition) => expedition.id === selectedExpeditionId,
  );
  const expeditionCrewIds = new Set(activeExpedition?.crewIds ?? []);
  const availableCrew = unlockedCrew.filter(
    (member) => !expeditionCrewIds.has(member.id),
  );
  const validSelectedCrew = selectedExpeditionCrew.filter((crewId) =>
    availableCrew.some((member) => member.id === crewId),
  );
  const canLaunch =
    hangarUnlocked &&
    !activeExpedition &&
    selectedExpeditionAvailable &&
    validSelectedCrew.length >= 1 &&
    validSelectedCrew.length <= 3;
  const activeExpeditionCrew = activeExpedition?.crewIds
    ? unlockedCrew.filter((member) =>
        activeExpedition.crewIds.includes(member.id),
      )
    : [];
  const shellStyle = {
    "--living-accent": world.accent,
    "--living-accent-rgb": world.rgb,
    "--living-secondary": world.secondary,
    "--living-sky": world.sky,
    "--living-ground": world.ground,
  } as CSSProperties;

  const submitFoundryName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = foundryDraft.trim();
    if (!nextName) return;
    onRenameFoundry(nextName);
    setRenamingFoundry(false);
  };

  const submitCallsign = (
    event: FormEvent<HTMLFormElement>,
    crewId: string,
  ) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextCallsign = String(form.get("callsign") ?? "").trim();
    if (nextCallsign) onRenameCallsign(crewId, nextCallsign);
  };

  const toggleExpeditionCrew = (crewId: string) => {
    setSelectedExpeditionCrew((current) => {
      if (current.includes(crewId)) {
        return current.filter((selectedId) => selectedId !== crewId);
      }
      if (current.length >= 3) return current;
      return [...current, crewId];
    });
  };

  return (
    <section
      className="living-foundry-shell"
      aria-labelledby="living-foundry-title"
      data-world={worldId}
      style={shellStyle}
    >
      <header className="living-foundry-header">
        <div className="living-foundry-identity">
          <span className="living-foundry-sigil" aria-hidden="true">
            LF
          </span>
          <div className="living-foundry-title">
            <span>Living Foundry // {world.name}</span>
            {renamingFoundry ? (
              <form
                className="living-foundry-name-form"
                onSubmit={submitFoundryName}
              >
                <label className="sr-only" htmlFor="living-foundry-name">
                  Foundry name
                </label>
                <input
                  id="living-foundry-name"
                  maxLength={32}
                  onChange={(event) => setFoundryDraft(event.target.value)}
                  value={foundryDraft}
                />
                <button type="submit">Save</button>
                <button type="button" onClick={() => setRenamingFoundry(false)}>
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <h2 id="living-foundry-title">{state.foundryName}</h2>
                <button
                  type="button"
                  onClick={() => {
                    setFoundryDraft(state.foundryName);
                    setRenamingFoundry(true);
                  }}
                >
                  Rename foundry
                </button>
              </>
            )}
          </div>
        </div>

        <div className="living-foundry-metrics" aria-label="Foundry resources">
          <div className="living-foundry-metric">
            <span>Cohesion</span>
            <strong>{Math.round(cohesion)}%</strong>
            <div
              className="living-cohesion-track"
              role="progressbar"
              aria-label="Crew Cohesion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(cohesion)}
            >
              <span style={{ width: `${cohesion}%` }} />
            </div>
          </div>
          <div className="living-foundry-metric">
            <span>Salvage</span>
            <strong>{compactNumber.format(Math.max(0, state.salvage))}</strong>
          </div>
        </div>

        <div className="living-foundry-actions">
          <button type="button" onClick={onOpenEngineeringConsole}>
            Engineering Console
          </button>
          <button type="button" onClick={onOpenArchive}>
            Archive
          </button>
        </div>
        {transmission && (
          <blockquote className="living-foundry-transmission">
            <span>{`${transmission.speaker} // crew intercept`}</span>
            <p>{transmission.text}</p>
          </blockquote>
        )}
      </header>

      <div className="living-foundry-layout">
        <div className="living-ark-column">
          <section className="living-ark-frame" aria-labelledby="ark-cutaway-title">
            <header>
              <div>
                <p className="living-foundry-kicker">Ark systems cutaway</p>
                <h3 id="ark-cutaway-title">The inhabited machine</h3>
              </div>
              <span>{worldsSaved} worlds carried</span>
            </header>

            <div className="ark-cutaway">
              <span className="ark-spine" aria-hidden="true" />
              <div className="ark-room-grid">
                {ROOM_DEFINITIONS.map((definition) => {
                  const roomId = definition.id;
                  const room = roomById.get(roomId);
                  const presentation = ROOM_PRESENTATION[roomId];
                  const unlocked = room?.unlocked ?? false;
                  const level = Math.max(0, room?.level ?? 0);
                  const assignedCrew = unlockedCrew.filter(
                    (member) => member.assignedRoomId === roomId,
                  );
                  const active = unlocked && assignedCrew.length > 0;
                  const capacity = room ? getRoomSlotCapacity(room) : 0;

                  return (
                    <button
                      className={`ark-room ark-room--${roomId} ${unlocked ? "is-unlocked" : "is-locked"} ${active ? "is-active" : ""}`}
                      type="button"
                      aria-pressed={selectedRoomId === roomId}
                      data-room={roomId}
                      key={roomId}
                      onClick={() => setSelectedRoomId(roomId)}
                    >
                      <span className="ark-room-activity" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                      <span className="ark-room-topline">
                        <span>{presentation.code}</span>
                        {unlocked ? (
                          <span className="ark-room-level">L{level}</span>
                        ) : (
                          <span className="ark-room-lock" aria-hidden="true">
                            {definition.unlockWorlds}
                          </span>
                        )}
                      </span>
                      <div className="ark-room-copy">
                        <h4>{definition.name}</h4>
                        <p>
                          {unlocked
                            ? presentation.description
                            : `Dark until ${definition.unlockWorlds} worlds are secured.`}
                        </p>
                      </div>
                      <span className="ark-room-footer">
                        <span className="ark-room-crew" aria-hidden="true">
                          {assignedCrew.slice(0, 5).map((member) => (
                            <i className="ark-crew-mini" key={member.id} />
                          ))}
                        </span>
                        <span>
                          {unlocked
                            ? `${assignedCrew.length}/${capacity} crew`
                            : "Offline"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="ark-room-drawer" aria-labelledby="room-drawer-title">
            <header>
              <div>
                <p className="living-foundry-kicker">
                  {`${selectedPresentation.deck} // ${selectedPresentation.code}`}
                </p>
                <h3 id="room-drawer-title">
                  {selectedRoomDefinition?.name ?? "Unknown room"}
                </h3>
              </div>
              <span className="ark-room-level">
                {selectedRoom?.unlocked
                  ? `Level ${selectedRoom.level}`
                  : "Room dark"}
              </span>
            </header>
            <div className="ark-room-drawer-copy">
              <p>{selectedPresentation.description}</p>
              <dl className="ark-room-effects">
                <div>
                  <dt>Current function</dt>
                  <dd>
                    {selectedPresentation.baseEffect}
                  </dd>
                </div>
                <div>
                  <dt>Assigned crew</dt>
                  <dd>
                    {selectedCrew.length > 0
                      ? selectedCrew.map((member) => member.callsign).join(", ")
                      : "No crew assigned"}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="ark-room-drawer-actions">
              {investigationLabel &&
                selectedRoom?.unlocked &&
                investigableRoomIds.includes(selectedRoomId) && (
                <button
                  className="ark-room-investigate"
                  type="button"
                  onClick={() => onInvestigateRoom(selectedRoomId)}
                >
                  <span>Investigate room</span>
                  <small>{investigationLabel}</small>
                </button>
              )}
              <button
                className="ark-room-upgrade"
                type="button"
                disabled={
                  !selectedRoom?.unlocked ||
                  !selectedRoomDefinition ||
                  selectedRoom.level >= selectedRoomDefinition.maxLevel ||
                  state.salvage < selectedUpgradeCost
                }
                onClick={() => onUpgradeRoom(selectedRoomId)}
              >
                <span>
                  {selectedRoom &&
                  selectedRoomDefinition &&
                  selectedRoom.level >= selectedRoomDefinition.maxLevel
                    ? "Room fully awakened"
                    : `Upgrade ${selectedRoomDefinition?.name ?? "room"}`}
                </span>
                {selectedRoom && selectedRoomDefinition &&
                  selectedRoom.level < selectedRoomDefinition.maxLevel && (
                    <small>
                      {compactNumber.format(selectedUpgradeCost)} Salvage
                    </small>
                  )}
              </button>
            </div>
          </section>
        </div>

        <aside className="living-foundry-operations" aria-label="Foundry operations">
          <section className="living-operation-card living-crew-operation" aria-labelledby="crew-roster-title">
            <header>
              <div>
                <p className="living-foundry-kicker">People, not multipliers</p>
                <h3 id="crew-roster-title">Crew roster</h3>
              </div>
              <span>{unlockedCrew.length} awake</span>
            </header>
            {unlockedCrew.length > 0 ? (
              <div className="living-crew-list">
                {unlockedCrew.map((member) => {
                  const definition = getCrewDefinition(member.id);
                  if (!definition) return null;
                  const away = expeditionCrewIds.has(member.id);
                  return (
                  <article
                    className={`living-crew-card ${away ? "is-away" : ""}`}
                    key={member.id}
                  >
                    <span className="living-crew-portrait" aria-hidden="true" />
                    <div className="living-crew-body">
                      <div className="living-crew-heading">
                        <strong>{definition.canonicalName}</strong>
                        <span>
                          {away
                            ? "On expedition"
                            : `${definition.specialty} · L${member.level}`}
                        </span>
                      </div>
                      <form
                        className="living-callsign-form"
                        key={`${member.id}:${member.callsign}`}
                        onSubmit={(event) => submitCallsign(event, member.id)}
                      >
                        <label className="sr-only" htmlFor={`callsign-${member.id}`}>
                          Callsign for {definition.canonicalName}
                        </label>
                        <input
                          id={`callsign-${member.id}`}
                          name="callsign"
                          defaultValue={member.callsign}
                          maxLength={18}
                        />
                        <button type="submit">Set</button>
                      </form>
                      <label className="sr-only" htmlFor={`assignment-${member.id}`}>
                        Assign {member.callsign} to a room
                      </label>
                      <select
                        className="living-crew-assignment"
                        id={`assignment-${member.id}`}
                        disabled={away}
                        value={member.assignedRoomId ?? ""}
                        onChange={(event) =>
                          onAssignCrew(
                            member.id,
                            event.target.value
                              ? (event.target.value as RoomId)
                              : null,
                          )
                        }
                      >
                        <option value="">Unassigned</option>
                        {ROOM_DEFINITIONS.map((roomDefinition) => {
                          const roomId = roomDefinition.id;
                          const room = roomById.get(roomId);
                          const unlocked = room?.unlocked ?? false;
                          const occupants = unlockedCrew.filter(
                            (crew) => crew.assignedRoomId === roomId,
                          ).length;
                          const full = Boolean(
                            room &&
                              occupants >= getRoomSlotCapacity(room) &&
                              member.assignedRoomId !== roomId,
                          );
                          return (
                            <option
                              disabled={!unlocked || full}
                              value={roomId}
                              key={roomId}
                            >
                              {roomDefinition.name}
                              {!unlocked ? " (dark)" : full ? " (full)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </article>
                  );
                })}
              </div>
            ) : (
              <p className="living-foundry-empty">
                The ark is awake, but no one has answered its corridors yet.
              </p>
            )}
          </section>

          <section className="living-operation-card" aria-labelledby="expedition-title">
            <header>
              <div>
                <p className="living-foundry-kicker">Expedition hangar</p>
                <h3 id="expedition-title">Beyond the hull</h3>
              </div>
              <span>{hangarUnlocked ? "Bay responsive" : "Bay dark"}</span>
            </header>
            <div className="living-expedition-body">
              <div
                className={`living-expedition-visual ${activeExpedition && !expeditionReady ? "is-away" : ""}`}
                aria-hidden="true"
              />
              {!activeExpedition && (
                <>
                  <fieldset
                    className="living-expedition-routes"
                    disabled={!hangarUnlocked}
                  >
                    <legend>Choose a route</legend>
                    <div>
                      {EXPEDITION_DEFINITIONS.map((route) => {
                        const expeditionId = route.id;
                        const unlocked = worldsSaved >= route.unlockWorlds;
                        return (
                          <label
                            className={`${selectedExpeditionId === expeditionId ? "is-selected" : ""} ${unlocked ? "" : "is-locked"}`}
                            key={expeditionId}
                          >
                            <input
                              type="radio"
                              name="expedition-route"
                              value={expeditionId}
                              checked={selectedExpeditionId === expeditionId}
                              disabled={!unlocked}
                              onChange={() =>
                                setSelectedExpeditionId(expeditionId)
                              }
                            />
                            <span>
                              <strong>{route.title}</strong>
                              <small>{route.destination}</small>
                              <i>
                                {unlocked
                                  ? `${formatRouteDuration(route.durationSeconds)} · ${route.rewardSalvage} Salvage · ${EXPEDITION_FLAVOR[expeditionId].risk}`
                                  : `Secure ${route.unlockWorlds} worlds to decode`}
                              </i>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <fieldset
                    className="living-expedition-manifest"
                    disabled={!hangarUnlocked}
                  >
                    <legend>Assign 1–3 available crew</legend>
                    {availableCrew.length > 0 ? (
                      <div>
                        {availableCrew.map((member) => {
                          const definition = getCrewDefinition(member.id);
                          const selected = validSelectedCrew.includes(member.id);
                          const selectionFull =
                            !selected && validSelectedCrew.length >= 3;
                          return (
                            <label
                              className={selected ? "is-selected" : ""}
                              key={member.id}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                disabled={selectionFull}
                                onChange={() => toggleExpeditionCrew(member.id)}
                              />
                              <span>
                                <strong>{member.callsign}</strong>
                                <small>
                                  {definition?.specialty ?? "crew"} · L{member.level}
                                </small>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p>No crew are currently available for departure.</p>
                    )}
                    <small>{validSelectedCrew.length} / 3 assigned</small>
                  </fieldset>
                </>
              )}
              <div className="living-expedition-copy">
                {activeExpedition ? (
                  <>
                    <strong>
                      {activeExpeditionDefinition?.title ?? "Salvage expedition"}
                    </strong>
                    <span>
                      {activeExpeditionDefinition?.destination ?? "Unknown route"}
                    </span>
                    <span className="living-expedition-clock">
                      {expeditionReady
                        ? "CRAFT RETURNED"
                        : formatRemaining(activeExpedition.endsAt - now)}
                    </span>
                    <small>
                      Recovery manifest: {compactNumber.format(activeExpedition.rewardSalvage)} Salvage
                    </small>
                    <small>
                      Crew: {activeExpeditionCrew.length > 0
                        ? activeExpeditionCrew
                            .map((member) => member.callsign)
                            .join(", ")
                        : "Manifest sealed"}
                    </small>
                  </>
                ) : (
                  <>
                    <strong>No craft beyond the hull</strong>
                    <span>
                      Choose a route and entrust up to three available crew with its recovery.
                    </span>
                    <small>
                      {selectedExpeditionDefinition
                        ? `${formatRouteDuration(selectedExpeditionDefinition.durationSeconds)} route · base recovery ${selectedExpeditionDefinition.rewardSalvage} Salvage`
                        : "Select an available route."}
                    </small>
                  </>
                )}
              </div>
              <button
                className="living-expedition-action"
                type="button"
                disabled={activeExpedition ? !expeditionReady : !canLaunch}
                onClick={() => {
                  if (expeditionReady) onClaimExpedition();
                  else if (!activeExpedition && canLaunch) {
                    onLaunchExpedition(selectedExpeditionId, validSelectedCrew);
                  }
                }}
              >
                {expeditionReady
                  ? "Claim expedition manifest"
                    : activeExpedition
                      ? "Expedition underway"
                      : !hangarUnlocked
                        ? "Secure more worlds to wake the bay"
                        : !selectedExpeditionAvailable
                          ? "Secure more worlds to unlock this route"
                          : validSelectedCrew.length < 1
                            ? "Assign at least one crew member"
                            : "Launch selected expedition"}
              </button>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

export default FoundryDeck;
