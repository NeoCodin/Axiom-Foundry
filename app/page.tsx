"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GENERATORS,
  LEGACY_UPGRADES,
  RECALIBRATION_THRESHOLD,
  RUN_UPGRADES,
  SAVE_KEY,
  buyLegacyUpgrade,
  buyRunUpgrade,
  buyTier,
  createInitialState,
  formatDuration,
  formatNumber,
  getLegacyUpgradeCost,
  getManualGain,
  getOfflineCapHours,
  getProductionSnapshot,
  getPurchaseQuantity,
  getRecalibrationGain,
  getRunUpgradeCost,
  getTierCost,
  isTierUnlocked,
  pulseCore,
  recalibrate,
  sanitizeGameState,
  setAutoEnabled,
  setAutoTier,
  setAutoUpgrades,
  setBuyMode,
  simulateGame,
  type GameState,
  type PurchaseMode,
} from "./game-engine";

type MobileTab = "core" | "machines" | "systems" | "recalibrate";

const purchaseModes: Array<{ value: PurchaseMode; label: string }> = [
  { value: "1", label: "×1" },
  { value: "10", label: "×10" },
  { value: "max", label: "MAX" },
];

function thresholdProgress(current: number, previous: number, next: number) {
  if (current >= next) return 1;
  const start = Math.log10(Math.max(1, previous) + 1);
  const end = Math.log10(next + 1);
  const position = Math.log10(Math.max(0, current) + 1);
  return Math.min(1, Math.max(0, (position - start) / (end - start)));
}

function getNextObjective(state: GameState) {
  const generatorUnlock = GENERATORS.find(
    (generator) => state.maxFlux < generator.unlockAt,
  );
  const upgradeReveal = RUN_UPGRADES.find(
    (upgrade) => state.maxFlux < upgrade.revealAt,
  );
  const candidates = [
    generatorUnlock
      ? {
          threshold: generatorUnlock.unlockAt,
          label: `Discover ${generatorUnlock.name}`,
        }
      : null,
    upgradeReveal
      ? {
          threshold: upgradeReveal.revealAt,
          label: `Decode ${upgradeReveal.name}`,
        }
      : null,
    state.runFlux < RECALIBRATION_THRESHOLD
      ? {
          threshold: RECALIBRATION_THRESHOLD,
          label: "Stabilize the first Recalibration",
        }
      : null,
  ]
    .filter((candidate): candidate is { threshold: number; label: string } =>
      Boolean(candidate),
    )
    .sort((left, right) => left.threshold - right.threshold);

  const next = candidates[0];
  if (!next) {
    return {
      label: "The Foundry is ready to Recalibrate",
      threshold: RECALIBRATION_THRESHOLD,
      progress: 1,
    };
  }

  const previousThreshold = [
    0,
    ...GENERATORS.map((generator) => generator.unlockAt),
    ...RUN_UPGRADES.map((upgrade) => upgrade.revealAt),
  ]
    .filter((threshold) => threshold <= state.maxFlux)
    .sort((left, right) => right - left)[0];

  return {
    ...next,
    progress: thresholdProgress(
      state.maxFlux,
      previousThreshold,
      next.threshold,
    ),
  };
}

export default function Home() {
  const [game, setGame] = useState<GameState>(() => createInitialState(0));
  const [ready, setReady] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("core");
  const [announcement, setAnnouncement] = useState("");
  const [saveStatus, setSaveStatus] = useState("Local save pending");
  const [offlineNotice, setOfflineNotice] = useState<{
    seconds: number;
    gain: number;
  } | null>(null);
  const [pulseFeedback, setPulseFeedback] = useState<{
    id: number;
    value: string;
  } | null>(null);
  const [confirmPrestige, setConfirmPrestige] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const loadStarted = useRef(false);
  const gameRef = useRef(game);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    const now = Date.now();
    let next = createInitialState(now);

    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (raw) {
        const loaded = sanitizeGameState(JSON.parse(raw), now);
        const absence = Math.max(0, (now - loaded.lastSaved) / 1_000);
        const credited = Math.min(
          absence,
          getOfflineCapHours(loaded) * 3_600,
        );
        const before = loaded.flux;
        next = simulateGame(loaded, credited, 720);
        next.lastSaved = now;
        if (credited >= 2) {
          setOfflineNotice({ seconds: credited, gain: next.flux - before });
          setAnnouncement(
            `Welcome back. The Foundry produced ${formatNumber(next.flux - before)} Flux while you were away.`,
          );
        }
      }
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(next));
      setSaveStatus("Progress stored on this device");
    } catch {
      try {
        const damaged = window.localStorage.getItem(SAVE_KEY);
        if (damaged) {
          window.localStorage.setItem(`${SAVE_KEY}-recovery-${now}`, damaged);
        }
      } catch {
        // Storage can be unavailable in private or restricted browser modes.
      }
      next = createInitialState(now);
      setSaveStatus("Save storage is unavailable; this session still works");
    }

    gameRef.current = next;
    setGame(next);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    let previous = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(0, (now - previous) / 1_000);
      previous = now;
      setGame((current) =>
        simulateGame(
          current,
          elapsed,
          Math.min(720, Math.max(1, Math.ceil(elapsed * 4))),
        ),
      );
    }, 100);
    return () => window.clearInterval(timer);
  }, [ready]);

  const persistGame = useCallback((message = "Progress saved") => {
    try {
      const snapshot = { ...gameRef.current, lastSaved: Date.now() };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
      setSaveStatus(`${message} · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    } catch {
      setSaveStatus("Unable to save in this browser");
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setInterval(() => persistGame(), 5_000);
    const saveOnPageExit = () => persistGame();
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") persistGame();
    };
    const noticeNewerTab = (event: StorageEvent) => {
      if (event.key !== SAVE_KEY || !event.newValue) return;
      try {
        const incoming = sanitizeGameState(JSON.parse(event.newValue));
        if (incoming.lastSaved > gameRef.current.lastSaved + 2_000) {
          setSaveStatus("A newer save exists in another tab");
        }
      } catch {
        // Ignore malformed writes from another tab.
      }
    };

    window.addEventListener("pagehide", saveOnPageExit);
    document.addEventListener("visibilitychange", saveWhenHidden);
    window.addEventListener("storage", noticeNewerTab);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", saveOnPageExit);
      document.removeEventListener("visibilitychange", saveWhenHidden);
      window.removeEventListener("storage", noticeNewerTab);
    };
  }, [persistGame, ready]);

  const production = useMemo(() => getProductionSnapshot(game), [game]);
  const manualGain = useMemo(() => getManualGain(game), [game]);
  const recalibrationGain = useMemo(
    () => getRecalibrationGain(game),
    [game],
  );
  const objective = useMemo(() => getNextObjective(game), [game]);
  const firstLockedGenerator = GENERATORS.findIndex(
    (_, index) => !isTierUnlocked(game, index),
  );
  const visibleGeneratorCount =
    firstLockedGenerator === -1
      ? GENERATORS.length
      : Math.min(GENERATORS.length, firstLockedGenerator + 1);

  const handlePulse = () => {
    const gain = getManualGain(gameRef.current);
    setGame((current) => pulseCore(current));
    setPulseFeedback({ id: Date.now(), value: `+${formatNumber(gain)}` });
    window.setTimeout(() => setPulseFeedback(null), 650);
  };

  const handleBuyTier = (index: number) => {
    const quantity = getPurchaseQuantity(
      gameRef.current,
      index,
      gameRef.current.settings.buyMode,
    );
    if (quantity <= 0) return;
    setGame((current) =>
      buyTier(current, index, current.settings.buyMode),
    );
    setAnnouncement(`Built ${quantity} ${GENERATORS[index].name}${quantity === 1 ? "" : "s"}.`);
  };

  const handleRunUpgrade = (index: number) => {
    if (getRunUpgradeCost(gameRef.current, index) > gameRef.current.flux) {
      return;
    }
    setGame((current) => buyRunUpgrade(current, index));
    setAnnouncement(`${RUN_UPGRADES[index].name} advanced one level.`);
  };

  const handleLegacyUpgrade = (index: number) => {
    if (getLegacyUpgradeCost(gameRef.current, index) > gameRef.current.axioms) {
      return;
    }
    setGame((current) => buyLegacyUpgrade(current, index));
    setAnnouncement(`${LEGACY_UPGRADES[index].name} advanced one level.`);
  };

  const handleRecalibrate = () => {
    const current = gameRef.current;
    const gain = getRecalibrationGain(current);
    if (gain < 1) return;
    const next = recalibrate(current, Date.now());
    gameRef.current = next;
    setGame(next);
    setConfirmPrestige(false);
    setMobileTab("core");
    setAnnouncement(
      `Recalibration complete. Cycle ${next.cycle} begins with ${gain} new Axiom${gain === 1 ? "" : "s"}.`,
    );
    window.setTimeout(() => persistGame("Recalibration saved"), 0);
  };

  const handleHardReset = () => {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch {
      // The in-memory reset still works when storage is unavailable.
    }
    const next = createInitialState(Date.now());
    gameRef.current = next;
    setGame(next);
    setConfirmReset(false);
    setAnnouncement("The Foundry has been reset to Cycle 1.");
    setSaveStatus("Fresh local save started");
  };

  const updateMode = (mode: PurchaseMode) => {
    setGame((current) => setBuyMode(current, mode));
  };

  return (
    <main className="game-shell">
      <div className="ambient-grid" aria-hidden="true" />
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>

      <header className="command-bar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            ◇
          </span>
          <div>
            <p className="eyebrow">AXIOM FOUNDRY // CYCLE {String(game.cycle).padStart(2, "0")}</p>
            <h1>Build the machine that teaches the universe to multiply.</h1>
          </div>
        </div>

        <div className="resource-readout" title={`${game.flux.toExponential(6)} Flux`}>
          <span className="resource-label">Available Flux</span>
          <strong>{formatNumber(game.flux)}</strong>
          <span className="rate">+{formatNumber(production.fluxPerSecond)} / sec</span>
        </div>

        <div className="header-metrics">
          <div>
            <span>Axioms</span>
            <strong>{formatNumber(game.axioms)}</strong>
          </div>
          <div>
            <span>Resonance</span>
            <strong>×{formatNumber(production.resonance.multiplier)}</strong>
          </div>
        </div>

        <div className="header-actions">
          <span className="save-status">{ready ? saveStatus : "Restoring local cycle…"}</span>
          <button className="quiet-button" type="button" onClick={() => persistGame("Saved")}>Save now</button>
        </div>

        <div className="objective-strip">
          <div className="objective-copy">
            <span>{objective.label}</span>
            <span>{formatNumber(game.maxFlux)} / {formatNumber(objective.threshold)} discovered</span>
          </div>
          <div
            className="objective-track"
            role="progressbar"
            aria-label={objective.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(objective.progress * 100)}
          >
            <span style={{ width: `${objective.progress * 100}%` }} />
          </div>
        </div>
      </header>

      {offlineNotice && (
        <section className="offline-banner" aria-label="Offline production summary">
          <div>
            <span className="status-dot" aria-hidden="true" />
            <strong>The Foundry kept turning.</strong>
            <span>
              {formatDuration(offlineNotice.seconds)} credited · +{formatNumber(offlineNotice.gain)} Flux
            </span>
          </div>
          <button type="button" onClick={() => setOfflineNotice(null)} aria-label="Dismiss offline summary">Dismiss</button>
        </section>
      )}

      <div className="game-grid">
        <div className="left-column">
          <section className={`panel core-panel mobile-section ${mobileTab === "core" ? "is-mobile-active" : ""}`}>
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Instrument core</p>
                <h2>The Axiom Chamber</h2>
              </div>
              <span className="status-chip online">STABLE</span>
            </div>

            <div className="core-stage">
              <div className="core-orbit core-orbit-outer" aria-hidden="true">
                <span className="orbit-node node-one" />
                <span className="orbit-node node-two" />
              </div>
              <div className="core-orbit core-orbit-inner" aria-hidden="true" />
              <div className="core-center">
                <span>OUTPUT</span>
                <strong>×{formatNumber(production.globalMultiplier * production.resonance.multiplier)}</strong>
              </div>
              {pulseFeedback && (
                <span key={pulseFeedback.id} className="pulse-feedback" aria-hidden="true">
                  {pulseFeedback.value}
                </span>
              )}
            </div>

            <button className="tune-button" type="button" onClick={handlePulse} disabled={!ready}>
              <span>Tune the Core</span>
              <small>Force an alignment · +{formatNumber(manualGain)} Flux</small>
            </button>

            <div className="core-diagnostics">
              <div>
                <span>Machine multiplier</span>
                <strong>×{formatNumber(production.globalMultiplier)}</strong>
              </div>
              <div>
                <span>Balanced links</span>
                <strong>{production.resonance.levels}</strong>
              </div>
              <div>
                <span>Lifetime Axioms</span>
                <strong>{formatNumber(game.lifetimeAxioms)}</strong>
              </div>
            </div>
          </section>

          <section className={`panel recalibration-panel mobile-section ${mobileTab === "recalibrate" ? "is-mobile-active" : ""}`}>
            <div className="panel-heading">
              <div>
                <p className="section-kicker violet">Permanent layer</p>
                <h2>Recalibration</h2>
              </div>
              <span className="axiom-symbol" aria-hidden="true">A</span>
            </div>
            <p className="panel-copy">
              Collapse this assembly into a reusable law. Machines and run research reset; Axioms and Legacy upgrades remain.
            </p>
            <div className="prestige-preview">
              <span>Projected yield</span>
              <strong>{recalibrationGain} Axiom{recalibrationGain === 1 ? "" : "s"}</strong>
              <small>{formatNumber(game.runFlux)} / {formatNumber(RECALIBRATION_THRESHOLD)} run Flux</small>
            </div>
            {!confirmPrestige ? (
              <button
                className="prestige-button"
                type="button"
                disabled={recalibrationGain < 1}
                onClick={() => setConfirmPrestige(true)}
              >
                {recalibrationGain < 1 ? "Recalibration not yet stable" : "Prepare Recalibration"}
              </button>
            ) : (
              <div className="confirm-row" role="group" aria-label="Confirm Recalibration">
                <button className="prestige-button" type="button" onClick={handleRecalibrate}>Begin Cycle {game.cycle + 1}</button>
                <button className="quiet-button" type="button" onClick={() => setConfirmPrestige(false)}>Cancel</button>
              </div>
            )}
          </section>
        </div>

        <section className={`panel machine-panel mobile-section ${mobileTab === "machines" ? "is-mobile-active" : ""}`}>
          <div className="panel-heading machine-heading">
            <div>
              <p className="section-kicker">Nested mechanisms</p>
              <h2>Fabrication Chain</h2>
            </div>
            <div className="purchase-modes" role="group" aria-label="Purchase quantity">
              {purchaseModes.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  aria-pressed={game.settings.buyMode === mode.value}
                  className={game.settings.buyMode === mode.value ? "active" : ""}
                  onClick={() => updateMode(mode.value)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="machine-list">
            {GENERATORS.slice(0, visibleGeneratorCount).map((generator, index) => {
              const unlocked = isTierUnlocked(game, index);
              const tier = game.tiers[index];
              const quantity = getPurchaseQuantity(game, index, game.settings.buyMode);
              const displayQuantity = game.settings.buyMode === "max" ? Math.max(1, quantity) : game.settings.buyMode === "10" ? 10 : 1;
              const cost = getTierCost(game, index, displayQuantity);
              const milestoneProgress = tier.bought % 10;
              const resonanceLevel = index > 0 ? production.resonance.links[index - 1] : 0;

              if (!unlocked) {
                return (
                  <article className="machine-row locked" key={generator.name}>
                    <div className="locked-signal" aria-hidden="true">?</div>
                    <div>
                      <p className="machine-index">NEXT DISCOVERY</p>
                      <h3>Unresolved mechanism</h3>
                      <p>Reach {formatNumber(generator.unlockAt)} total Flux to stabilize this signal.</p>
                    </div>
                  </article>
                );
              }

              return (
                <div className="machine-block" key={generator.name}>
                  {index > 0 && (
                    <div className={`resonance-link ${resonanceLevel > 0 ? "active" : ""}`}>
                      <span aria-hidden="true" />
                      <p>Resonance link {resonanceLevel}/5 · balance both tiers in groups of 10</p>
                    </div>
                  )}
                  <article className="machine-row">
                    <div className="machine-id" aria-hidden="true">0{index + 1}</div>
                    <div className="machine-primary">
                      <div className="machine-title-line">
                        <div>
                          <p className="machine-index">TIER {index + 1} · PRODUCES {generator.produces.toUpperCase()}</p>
                          <h3>{generator.name}</h3>
                        </div>
                        <span className="owned-count" title={`${tier.amount.toExponential(6)} total`}>
                          {formatNumber(tier.amount)} <small>owned</small>
                        </span>
                      </div>
                      <p className="machine-description">{generator.description}</p>
                      <div className="machine-output">
                        <span>Output <strong>{formatNumber(production.tierOutputs[index])}/s</strong></span>
                        <span>Bought <strong>{formatNumber(tier.bought)}</strong></span>
                        <span>Milestone <strong>×{formatNumber(Math.pow(2, Math.floor(tier.bought / 10)))}</strong></span>
                      </div>
                      <div className="milestone-track" aria-label={`${milestoneProgress} of 10 purchases toward the next multiplier`}>
                        <span style={{ width: `${milestoneProgress * 10}%` }} />
                      </div>
                    </div>
                    <button
                      className="buy-button"
                      type="button"
                      disabled={quantity <= 0}
                      onClick={() => handleBuyTier(index)}
                      aria-label={`Buy ${game.settings.buyMode === "max" ? quantity : displayQuantity} ${generator.name} for ${formatNumber(cost)} Flux`}
                    >
                      <span>{game.settings.buyMode === "max" && quantity > 0 ? `Build ×${quantity}` : `Build ${game.settings.buyMode === "max" ? "Max" : `×${displayQuantity}`}`}</span>
                      <small>{quantity > 0 ? formatNumber(cost) : `Need ${formatNumber(cost)}`} Flux</small>
                    </button>
                  </article>
                </div>
              );
            })}
          </div>
        </section>

        <aside className={`systems-column mobile-section ${mobileTab === "systems" ? "is-mobile-active" : ""}`}>
          <section className="panel upgrades-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker brass">Current cycle</p>
                <h2>Run Research</h2>
              </div>
              <span className="count-label">{game.runUpgrades.reduce((sum, level) => sum + level, 0)} levels</span>
            </div>
            <div className="upgrade-list">
              {RUN_UPGRADES.map((upgrade, index) => {
                const level = game.runUpgrades[index];
                const maxed = level >= upgrade.maxLevel;
                const revealed = game.maxFlux >= upgrade.revealAt || index === RUN_UPGRADES.findIndex((item) => game.maxFlux < item.revealAt);
                if (!revealed) return null;
                if (game.maxFlux < upgrade.revealAt) {
                  return (
                    <article className="upgrade-card locked" key={upgrade.name}>
                      <div><span>Research signal</span><strong>Reach {formatNumber(upgrade.revealAt)} Flux</strong></div>
                    </article>
                  );
                }
                const cost = getRunUpgradeCost(game, index);
                return (
                  <article className={`upgrade-card ${maxed ? "installed" : ""}`} key={upgrade.name}>
                    <div className="upgrade-copy">
                      <span>LEVEL {level}/{upgrade.maxLevel}</span>
                      <strong>{upgrade.name}</strong>
                      <p>{upgrade.description}</p>
                    </div>
                    <button type="button" disabled={maxed || game.flux < cost} onClick={() => handleRunUpgrade(index)}>
                      {maxed ? "MAXED" : `${formatNumber(cost)} Flux`}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="panel automation-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Cycle control</p>
                <h2>Foreman</h2>
              </div>
              <span className={`status-chip ${game.settings.autoEnabled ? "online" : ""}`}>{game.settings.autoEnabled ? "ACTIVE" : "IDLE"}</span>
            </div>
            {game.lifetimeAxioms < 1 ? (
              <div className="locked-copy">
                <span className="lock-glyph" aria-hidden="true">◇</span>
                <p>Complete one Recalibration to unlock automatic machine purchasing.</p>
              </div>
            ) : (
              <>
                <label className="toggle-row">
                  <span><strong>Master Foreman</strong><small>Buys one affordable unit from each enabled tier every second.</small></span>
                  <input type="checkbox" checked={game.settings.autoEnabled} onChange={(event) => setGame((current) => setAutoEnabled(current, event.target.checked))} />
                </label>
                <div className="tier-toggles" aria-label="Automatic machine tiers">
                  {GENERATORS.map((generator, index) => (
                    <label key={generator.name}>
                      <input type="checkbox" checked={game.settings.autoTiers[index]} onChange={(event) => setGame((current) => setAutoTier(current, index, event.target.checked))} />
                      <span>T{index + 1}</span>
                    </label>
                  ))}
                </div>
                <label className={`toggle-row ${game.lifetimeAxioms < 3 ? "disabled" : ""}`}>
                  <span><strong>Research routing</strong><small>{game.lifetimeAxioms < 3 ? "Unlocks at 3 lifetime Axioms." : "Automatically buys affordable run research."}</small></span>
                  <input type="checkbox" disabled={game.lifetimeAxioms < 3} checked={game.settings.autoUpgrades} onChange={(event) => setGame((current) => setAutoUpgrades(current, event.target.checked))} />
                </label>
              </>
            )}
          </section>

          <section className="panel legacy-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker violet">Across all cycles</p>
                <h2>Legacy Matrix</h2>
              </div>
              <span className="count-label violet-text">{formatNumber(game.axioms)} A</span>
            </div>
            {game.lifetimeAxioms < 1 ? (
              <div className="locked-copy compact">
                <p>The matrix will resolve after your first Recalibration.</p>
              </div>
            ) : (
              <div className="legacy-list">
                {LEGACY_UPGRADES.map((upgrade, index) => {
                  const cost = getLegacyUpgradeCost(game, index);
                  return (
                    <article key={upgrade.name}>
                      <div><span>LEVEL {game.legacyUpgrades[index]}</span><strong>{upgrade.name}</strong><p>{upgrade.description}</p></div>
                      <button type="button" disabled={game.axioms < cost} onClick={() => handleLegacyUpgrade(index)}>{cost} A</button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <details className="panel statistics-panel">
            <summary>Foundry statistics</summary>
            <dl>
              <div><dt>This cycle</dt><dd>{formatDuration(game.runTime)}</dd></div>
              <div><dt>Total play</dt><dd>{formatDuration(game.playTime)}</dd></div>
              <div><dt>Run Flux</dt><dd>{formatNumber(game.runFlux)}</dd></div>
              <div><dt>All-time Flux</dt><dd>{formatNumber(game.allTimeFlux)}</dd></div>
              <div><dt>Core tunes</dt><dd>{formatNumber(game.manualPulses)}</dd></div>
              <div><dt>Offline cap</dt><dd>{getOfflineCapHours(game)} hours</dd></div>
            </dl>
            {!confirmReset ? (
              <button className="danger-link" type="button" onClick={() => setConfirmReset(true)}>Reset all local progress</button>
            ) : (
              <div className="reset-confirm">
                <p>This permanently erases the local Foundry save.</p>
                <button type="button" onClick={handleHardReset}>Erase progress</button>
                <button className="quiet-button" type="button" onClick={() => setConfirmReset(false)}>Cancel</button>
              </div>
            )}
          </details>
        </aside>
      </div>

      <nav className="mobile-nav" aria-label="Game sections">
        {([
          ["machines", "Machines"],
          ["core", "Core"],
          ["systems", "Systems"],
          ["recalibrate", "Recalibrate"],
        ] as Array<[MobileTab, string]>).map(([value, label]) => (
          <button key={value} type="button" className={mobileTab === value ? "active" : ""} aria-pressed={mobileTab === value} onClick={() => setMobileTab(value)}>
            <span aria-hidden="true">{value === "machines" ? "II" : value === "core" ? "◇" : value === "systems" ? "≡" : "A"}</span>
            {label}
            {value === "recalibrate" && recalibrationGain > 0 && <i aria-label="Recalibration available" />}
          </button>
        ))}
      </nav>
    </main>
  );
}
