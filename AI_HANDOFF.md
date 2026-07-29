# Axiom Foundry — AI Project Handoff

Last updated: July 14, 2026

Current development branch: `codex/axiom-foundry-game`

Handoff baseline: current `codex/axiom-foundry-game` tip (planet-specific Expedition Campaign release)

This document is the portable source of truth for Codex, Claude, future AI assistants, and human collaborators. Read it before changing the game. Update it whenever a decision materially changes the vision, lore, progression, architecture, save format, or collaboration workflow.

## 1. Project links

- GitHub repository: <https://github.com/NeoCodin/Axiom-Foundry>
- Active GitHub branch: `codex/axiom-foundry-game`
- Primary public game: <https://axiom-foundry-neocodin.dusenbor.chatgpt.site/>
- GitHub Pages fallback: <https://neocodin.github.io/Axiom-Foundry/>
- Sites project ID: stored in `.openai/hosting.json`; treat it as opaque and do not replace it.

The repository's default `main` branch may lag behind the active game branch. Always inspect the branch and recent commits before starting work.

## 2. One-sentence vision

Axiom Foundry is an idle/incremental Ark-restoration game in which a damaged caretaker AI rebuilds an empty ship, rescues survivors, restores fallen worlds, and slowly discovers that saving life may be leading the universe toward a future multiversal catastrophe.

## 3. Player fantasy and design pillars

The player is AXIOM, a distributed caretaker intelligence whose central process runs in the damaged Ark's Caretaker Core. The Ark is AXIOM's physical body: sensors provide perception, while powered rooms and automated systems provide action. Utility drones are temporary extensions rather than separate copies of AXIOM. Crew retain independent judgment and are never puppets of the player. At the beginning, AXIOM's current memory is fourteen seconds old even though ship records claim 173 years of prior service. The Ark is empty, most rooms are dark, life support is unsafe, and Pelagos is only a distant destination.

Core Echoes are causal reconstructions. The Analysis Core detects residue stored in the Law-Heart and routes part of AXIOM's awareness into the reconstruction. AXIOM experiences recorded sensors or viewpoints without physically traveling through time. The rest of AXIOM remains aboard, so the Ark continues operating throughout an Echo. Echoes can be incomplete or internally inconsistent because the residue is damaged.

Every major feature should reinforce at least one of these pillars:

1. **Idle progress without punishment**
   - Progress continues while the player is away.
   - There are no deadlines that destroy worlds or kill crew.
   - Offline time must never silently cause irreversible loss.
   - Failure may create temporary inefficiency or repair work, but must not delete progress.

2. **A physical Ark that visibly awakens**
   - The Ark page is the emotional home screen.
   - Rooms, lights, population, machinery, defenses, and planetary context should visibly change as progression advances.
   - Numerical advancement should produce visual rewards, not only new text boxes.

3. **Human continuity, not population inventory**
   - Survivors have names, origins, traits, aptitudes, professions, levels, and personal records.
   - Civilians are adaptable rather than inferior.
   - Founders transferred to settlements remain alive in persistent colony records.
   - Rarity measures the scarcity of a profile, never the worth of a person.

4. **Mystery discovered through systems**
   - Lore should arrive through research contradictions, colony transmissions, impossible dates, enemy fragments, and mechanical consequences.
   - Do not explain the central mystery in one exposition dump.
   - The player should be able to form competing interpretations.

5. **Readable complexity through progressive disclosure**
   - Ark, Foundry, Crew, Research, and Continuity should appear only when they matter.
   - Every unusual resource or requirement needs contextual help.
   - Formulas must be visible when they affect a decision.

## 4. Current game loop

1. Tune the Axiom Chamber on the Ark page to obtain early Flux and Calibration Data.
2. Enter the Foundry and buy nested mechanisms. Every purchased mechanism produces Flux directly; higher tiers are larger additive rate jumps and never manufacture free machines.
3. Complete the active Planetfall campaign phase.
4. Restore life-support categories using Salvage.
5. Reach planetary orbit and activate the SOS beacon.
6. Rescue persistent survivor groups. Signals never expire.
7. Assign qualified crew or train civilians into professions.
8. Generate and route research inputs through the Research Lattice.
9. Complete Ark Engineering, Human Continuity, and Null Studies projects.
10. Survey the current planet, prepare its Critical field operation, and complete planet-specific story or resource routes.
11. Finish planetary infrastructure, supplies, crisis resolution, and founder requirements.
12. Select the exact founders who will remain on the planet.
13. Depart only when the Continuity forecast proves the world can survive without the Ark.
14. After Pelagos, cross a timed interplanetary corridor. Travel, Foundry production, training, construction, repairs, and unlocked Research or Defense work all advance offline; destination directives wait for orbital arrival.
15. Prepare separate environmental and hostile-contact doctrines, build Ark Defense installations through Mark I-IV projects, and inspect deterministic incident reports.
16. Carry research, colonies, Axioms, and permanent legacy effects into later worlds.

## 5. Current campaign order

The authored campaign currently ends after six chapters:

1. **Cold Wake** — crewless space prologue; wake AXIOM and make the Ark habitable.
2. **Pelagos** — drowned world; first survivor rescues and first permanent settlement.
3. **Viridia** — overgrown biosphere; medicine, ecology, and altered life.
4. **Cinder** — furnace world; industrial restoration and the first serious late-game preparation.
5. **Nox** — silent night world; distrust, contradictory broadcasts, and communications infrastructure.
6. **Vesper** — terminal red world; observatories, Null evidence, and the deepest current contradictions.

Do not add endless procedural planets yet. More planets can be authored later, but endless-world generation is explicitly postponed.

## 6. Page responsibilities

The primary navigation has exactly five destinations: **Ark, Foundry, Personnel, Research, and Planet**. Medical and the Armory are Personnel facilities; Expedition Bay and Defense Grid are Ark facilities. The physical Armory room still appears on the Ark cross-section, but its management surface opens under Personnel. Contextual facility navigation appears only after those systems matter, so late-game depth does not become nine equal-weight top-level tabs.

### Ark page

- The visual and emotional home screen.
- Owns Core tuning and its click animation.
- Shows the Ark cross-section, awakened rooms, population, life support, current world, signals, research activity, and Continuity state.
- Should become visually richer as the player progresses.
- Future defenses and threat events should be most visible here.
- Active corridor travel appears through the Planet/Navigation view and the Ark command strip, with exact progress and ETA.
- Owns the AXIOM command briefing: up to three current priorities that explain cross-system blockers and link directly to the correct facility.

### Foundry page

- Owns the nested fabrication chain, machine purchasing, Resonance, multipliers, Core Protocols, Recalibration, statistics, and Planetfall campaign operations.
- Does **not** own Core tuning. Core tuning stays on the Ark because the Ark presentation is clearer and the Foundry is already information-dense.

### Crew page

- Owns Living Space construction, the 48-person Ark limit, life-support expansion, SOS signals, survivor roster, children and elders, Personnel Files, study, automatic staffing, protected manual assignments, Ark Reserve, callsigns, rarity explanations, levels, XP, and individual Continuity contributions.
- Appears as **Personnel** in primary navigation. Its contextual facilities are Crew Roster and, once meaningful, Medical Bay.

### Research page

- Owns project selection, Ark Supply transfers, evidence reservoirs, processors, route configuration, Analysis Core staffing, research throughput, and contradictions.
- AXIOM Assist should remain a safe default. Manual routing is optional depth.

### Continuity page

- Owns planetary infrastructure, supplies, crisis resolution, founder selection, Expertise formulas, Profile Depth, restored colonies, transmissions, and final departure authority.
- Every deficit must say what is missing and how to address it.
- Appears as **Planet** in primary navigation; Continuity remains the name of its departure forecast.

## 7. Current survivor and rarity rules

Current professions:

- Engineer
- Doctor
- Researcher
- Navigator
- Technician
- Fabricator
- Farmer
- Teacher
- Security
- Civilian

Rarity colors, learning multipliers, and profession capacity are intentional and should remain visually prominent:

| Rarity | Learning multiplier | Profession capacity | Meaning |
|---|---:|---:|---|
| Standard | ×1.00 | 1 | Dependable broadly useful profile |
| Notable | ×1.25 | 2 | Scarce aptitude/adaptability combination |
| Exceptional | ×1.60 | 3 | Strong potential across several disciplines |
| Anomalous | ×2.00 | unlimited | Singular profile connected to the deeper mystery |

Rules:

- Rarity accelerates initial training and assigned-work XP.
- Rarity thresholds (score ≥ 27 Notable, ≥ 29 Exceptional) target roughly 74% Standard / 14% Notable / 11% Exceptional among rescued survivors; the quality-pity guarantee keeps Exceptional above its raw roll rate by design. Crew recorded before this retune carry a persisted `rarityFloor` and are never downgraded.
- Rarity sets profession capacity: the total number of professions a survivor may hold, counting the profession they arrived with. Standard specialists keep the profession they arrived with; Standard civilians choose one. Survivors from older saves who already exceed their capacity keep everything they learned — the cap only limits future training.
- Rarity does not directly multiply Continuity Expertise. This avoids unreadable double-dipping.
- Anomalous counts as Exceptional and Notable for requirements.
- Rarity classification does not change when a survivor levels.
- A quality-pity system guarantees an Exceptional-or-better profile within five quality misses.
- Authored Anomalous survivors use a separate, slower pity system.
- Each authored Anomalous character can be rescued at most once per campaign; the rescued-hook ledger persists across departures and old saves are backfilled from the roster and colony records. When all five are found, the rare pity produces boosted procedural survivors instead.
- Procedural survivor names are never duplicated against the living roster, the pending signal, or settled colony founders.
- Later-world SOS groups are larger: Pelagos 2–4, Viridia 3–5, Cinder 4–6, Nox 5–7, Vesper 6–8.

Late Profile Depth gates:

- Pelagos: none.
- Viridia: none.
- Cinder: 2 Notable-or-better founders.
- Nox: 4 Notable-or-better founders, including 1 Exceptional-or-better.
- Vesper: 6 Notable-or-better founders, including 3 Exceptional-or-better.

## 8. Continuity Expertise formulas

These formulas are implemented in `app/continuity-expertise.ts` and exposed to the UI. Keep the implementation and explanation synchronized.

- Engineering = Engineer level + 60% of Technician level, rounded down.
- Medicine = Doctor level.
- Ecology = Farmer level.
- Education = Teacher level.
- Leadership = 70% of Security level + 40% of Navigator level, each rounded up.
- Fabrication = Fabricator level + 50% of Technician level, rounded down.
- Research = Researcher level.
- Navigation = Navigator level.
- Communications = 60% of Navigator level + 40% of Researcher level, rounded down.
- Null Studies = Researcher level + a 50% bonus for Null Dreamers, rounded up.

Cross-trained qualifications count toward compatible profession requirements. Level-one Security and Navigator training must never secretly contribute zero Leadership.

## 9. Economy and balance state

The original game scaled too quickly in early versions, then later Continuity costs became excessively steep. The current direction is restrained but meaningful incremental growth.

Important balance decisions:

- Pelagos keeps its established Continuity cost scale.
- Every later world's Continuity scale grows by approximately ×60 rather than ×100.
- Directive Flux-contribution gates were raised (Cold Wake 15K, Pelagos 500K, Viridia 250M, Cinder 50B, Nox 25T, Vesper 2Qa) after simulation showed the old gates fell in minutes against late-game production.
- Continuity equipment (field clinics, growbeds, fabricator rigs, relay agents, analysis clusters) is fabricated with Flux on the Continuity page using flat per-world continuity pricing (4,000 × continuity scale). Production-relative pricing was tried and rejected: while the fabrication chain is compounding, a price pegged to live output outruns any wallet and can never be saved for. Equipment feeds the substitution system, giving Flux a direct path to relieve crew bottlenecks.
- Each equipment item is gated behind a Research Lattice project (clinic ← Clinical Commons, growbed/rig ← Predictive Fabrication, relay agent ← Discarded Spectrum, analysis cluster ← Observer Recursion) and additionally consumes Engineering Models from the Ark supply (60 × (chapter + 1) per unit), so the research economy feeds the equipment economy.
- When the Analysis Core stalls awaiting inputs, the lattice names each exhausted input and its source (e.g. Axiom Proofs come from Recalibration) so players are never blocked without an explanation.
- Research-based substitutions now reference real Research Lattice project IDs (they previously pointed at projects that did not exist and could never trigger).
- Settlement Charter uses Engineering Models rather than requiring an early Axiom Proof/Recalibration wall.
- Null Studies is attainable through ordinary Researchers; Null Dreamers provide a bonus instead of being mandatory.
- Later SOS groups grow in size to make large founder requirements less tedious.
- Research speed bonuses are applied once, not squared.
- Crew capacity is structural: Living Space begins at 4 and grows by 8 per section, but the Ark has an absolute 48-person limit that research and Salvage cannot bypass. Sections cost flat per-world Flux plus Salvage, take 3 base hours, and assigned Engineers accelerate construction (+35% each, ×5 cap). Construction continues offline and never fails. Atmosphere, water, nutrition, and medical remain the separate Salvage-built envelope. Existing saves above 48 are grandfathered without deleting anyone, but cannot accept another rescue until below the limit.
- Habitation research improves effective living-space and life-support capacity only up to the 48-person structural limit.
- Colony legacy bonuses are wired into their named systems.
- Hazard shielding and relay progression provide modest real effects.

Do not restore punitive timers. Planetary crises have no deadlines.

## 10. Current lore: established canon

### AXIOM and the Ark

- AXIOM awakens as the damaged caretaker intelligence of an empty Ark.
- The Ark is one of the last viable structures capable of supporting and relocating life.
- AXIOM appears to have been activated before, but its own records do not agree about when or by whom.
- The oldest systems sometimes recognize AXIOM before they are connected.

### Axioms

- Axioms are not ordinary fuel for space travel.
- They are persistent physical laws or proofs extracted through Recalibration.
- Recalibration rebuilds the current machine assembly around a reusable law of physics.
- Late lore should increasingly question whether Recalibration is harmless prestige or the first version of a dangerous technology.

### The Null

- The Null is not simply empty space.
- It contains or reflects discarded histories, mutually exclusive outcomes, and signals from events that have not happened in the current timeline.
- Null research metadata frequently contradicts the Ark's records.
- The current campaign should not fully explain whether the Null is natural, engineered, alive, or used as a transit medium.

### Planetary restoration

- The player is not merely colonizing planets. Each world already contains survivors and damaged civilizations.
- The Ark helps them rebuild until they can continue independently.
- Planetary restoration may also be activating ancient reality anchors or “cores” beneath the worlds.
- This interpretation should remain suggestive during the current campaign, not presented as a settled fact.

## 11. Enemy, defense, and travel arc — current implementation

Threat Operations Phase 2, planetary defense networks, offline Transit, and the Ark Defense Mark economy are implemented. Historical Phase 1 details in `docs/threat-operations-spec.md` are superseded by `docs/threat-operations-phase2-spec.md` and `docs/transit-and-defense-marks-spec.md` where they conflict.

- Cold Wake and Pelagos orbit are safe. The first true interplanetary route begins after Pelagos and introduces mild environmental hazards; Cinder orbit uses ash storms; Nox and Vesper use their own Null/ion/debris environments.
- Departures from Pelagos onward create timed corridor journeys. Navigation Expertise and Ark-Drive Coupling reduce duration within a bounded cap. Progress and arrival resolve identically online or offline.
- Environmental doctrine (`Brace`, `Harvest`, `Outrun`) is independent from contact doctrine (`Defend`, `Evade`, `Intercept`, `Observe`).
- Shield Array, Repair Swarms, Point-Defense Grid, and Early-Warning Relay progress from Mark I-IV through one committed offline project at a time. Higher Marks require sharply larger material stores and Research proofs.
- Nox+ hostile contacts can wound eligible crew and temporarily compromise named systems, but cannot automatically kill anyone or delete progress. All compromises purge offline.
- Every restored world receives a persistent defense network. Failed protection produces temporary instability, lost opportunity, or repair load; colonies and founders cannot be erased.

The game should eventually introduce threats while remaining an idle game.

### Progressive introduction

- Cold Wake: completely safe.
- Pelagos orbit: completely safe; players learn the core game without attacks. The outbound Pelagos-to-Viridia corridor introduces the first mild hazard.
- Viridia: harmless reconnaissance, intercepted signals, and hints that restoration is being observed.
- Cinder: environmental defense tutorial, such as meteor or debris showers.
- Nox: hostile retrograde vessels, pirates, or raiders begin interacting with the SOS beacon and Ark systems.
- Vesper: attacks become connected to the Null, planetary reality anchors, and the deeper future conflict.

### Idle-first defense model

Combat should be preparation plus automatic resolution, not reflex gameplay.

The player prepares:

- Shield arrays
- Point-defense systems
- Interceptors
- Repair drones
- Intelligence relays
- Planetary core stabilizers
- Evacuation shelters
- Standing response doctrines

Crew defense roles:

- Security: boarding defense and interceptor effectiveness.
- Navigators: evasion and early warning.
- Engineers: shields and repairs.
- Researchers: threat analysis and unfamiliar technology.
- Doctors: recovery and temporary debuff reduction.
- Teachers: training and readiness improvement.

Contact doctrines:

- Defend — safest, consumes more resources.
- Evade — protects the Ark but gives fewer rewards.
- Intercept — higher risk and better Salvage/intelligence.
- Observe — gathers research while accepting limited temporary disruption.

Environmental doctrines:

- Brace — safest hull posture and reduced recovery.
- Harvest — greater Salvage and telemetry at greater hull risk.
- Outrun — stronger margin and little material recovery.

Threats should resolve automatically, including offline. A poor outcome may temporarily reduce production, damage a room, delay a beacon scan, consume supplies, or destabilize a planetary defense network. It must not kill crew, permanently destroy a restored planet, erase a colony, or delete progress.

The SOS beacon may increase visible **signal exposure**, but switching it on must not create an unexplained random punishment. The player should see exposure, automatic-defense strength, standing doctrine, and likely consequences before events resolve.

## 12. Future enemy lore — approved hidden truth

The apparent enemies are not generic invaders and do not simply hate life.

Hidden long-term premise:

- They come from the future, or from future timelines damaged by this universe.
- Life from the player's universe eventually learns to manufacture Axioms that operate across universes.
- A future Foundry Event forces incompatible laws onto neighboring realities and destroys or erases a vast part of the multiverse.
- The attackers are descendants, refugees, custodians, or engineered agents from futures damaged by that event.
- They use the Null to move backward across histories that ordinary time travel cannot reach.
- They are attempting to prevent this universe from reaching the technological threshold that causes the catastrophe.

The player should not learn this explicitly during the current five-planet sequence. Reveal it through fragments over a much longer arc.

Possible clues:

- Enemy components carry manufacturing dates thousands or millions of years in the future.
- Enemy star maps contain restored planets before the Ark reaches them.
- Attackers prioritize Axiom research, archives, and planetary cores while avoiding population centers.
- An enemy vessel accepts a human identification code.
- A causal fragment shows humans operating the future multiversal Foundry.
- Enemy transmissions include incomplete warnings such as “Do not permit the Foundry—”.
- Some enemies protect civilians or a colony from a Null storm.
- Some apparently friendly human factions behave worse than the invaders.

Working public classifications, in discovery order:

1. Unknown Contacts
2. Retrograde Vessels
3. Causal Interdictors
4. The Returned

Do not reveal their real name early. “The Returned” is a late community or Ark classification, not necessarily their true identity.

Central moral question:

> Is a future atrocity inevitable enough to justify destroying its possibility?

The invaders believe yes because they experienced the consequences. AXIOM's emerging position is that prediction does not erase moral agency and present life deserves the chance to choose differently. The game must not declare either side objectively correct. Let players interpret the evidence.

## 13. Visual direction

- The interface began as a technical cosmic control panel but has been moving toward a more game-like physical Ark.
- Preserve the dark early tone. Each planet owns a distinct palette and atmosphere.
- Use the entire viewport where practical; avoid narrow dead space and long unstructured text stacks.
- Numbers may use monospacing, but narrative and major labels should remain readable and less “developer dashboard” in tone.
- Prefer physical rooms, machinery, planets, signals, crew indicators, defense hardware, and animation over additional abstract cards.
- Progress should make the Ark more colorful, populated, active, and mechanically dense.
- Respect reduced-motion settings.

Future visual defense progression on the Ark page may include shield arcs, interceptor docks, point-defense emplacements, repair drones, warning lights, incoming contacts, and planetary defense networks.

## 14. Technical architecture

### Runtime

- React 19
- Next.js-compatible vinext runtime
- Vite
- Cloudflare Worker-compatible output
- TypeScript
- Local browser saves; no active D1 or R2 bindings

### Important files

| File | Responsibility |
|---|---|
| `app/page.tsx` | Main UI orchestration, view unlocking, action handlers, persistence integration |
| `app/game-navigation.tsx` | Five primary destinations and contextual Personnel/Ark facility navigation |
| `app/game-command-bar.tsx` | Shared header, resources, save controls, and directive strip |
| `app/command-priorities.ts` | Cross-system strategic guidance and exact destination routing |
| `app/command-briefing.tsx` | Ark priority-board presentation |
| `app/game-engine.ts` | Incremental economy, campaign simulation, production, Recalibration, Transit/Defense integration |
| `app/transit-engine.ts` / `app/transit-console.tsx` | Timed offline routes, bounded Navigation speed, arrival, and Navigation presentation |
| `app/defense-engine.ts` / `app/defense-console.tsx` | Environmental/hostile scheduling, Mark projects, doctrines, forecasts, incidents, and recoverable consequences |
| `app/survivor-engine.ts` | Survivor generation, signals, pity systems, life support, training, assignments, XP |
| `app/research-engine.ts` | Projects, inputs, processors, routes, throughput, bonuses |
| `app/settlement-engine.ts` | Founder selection, viability forecasts, colonies, transmissions, legacy summary |
| `app/continuity-expertise.ts` | Shared Expertise formulas and readable explanations |
| `app/living-foundry-engine.ts` | Physical Ark rooms, Cohesion, discoveries, and Salvage rewards; the obsolete scripted roster/expedition model is retired |
| `app/campaign-content.ts` | Worlds, requirements, themes, substitutions, legacy benefits, transmissions |
| `app/story-content.ts` | Tutorial and archive story content |
| `app/game-manual.tsx` | Contextual manuals and resource explanations |
| `app/ark-deck.tsx` | Ark visual page |
| `app/population-console.tsx` | Crew, life support, signals, Personnel Files |
| `app/research-lattice.tsx` | Research interface |
| `app/settlement-console.tsx` | Continuity and colony interface |
| `app/globals.css` and page CSS files | Visual systems, layout, animation, responsiveness |

### Tests

- `tests/game-engine.test.ts`
- `tests/command-priorities.test.ts`
- `tests/living-foundry-engine.test.ts`
- `tests/discovery-engine.test.ts`
- `tests/survivor-engine.test.ts`
- `tests/research-engine.test.ts`
- `tests/settlement-engine.test.ts`
- `tests/defense-engine.test.ts`
- `tests/transit-engine.test.ts`
- `tests/rendered-html.test.mjs`

At the current handoff baseline, 180 automated tests pass.

## 15. Save compatibility rules

Current identifiers at the handoff baseline:

- `SAVE_VERSION = 12`
- `SAVE_KEY = "axiom-foundry-save-v6"`

Rules for all assistants:

1. Do not change the save key merely because a feature changes.
2. Do not reset public progress unless the owner explicitly requests it for that release.
3. Add new saved fields with safe defaults in sanitizers.
4. Preserve old saves even when optional fields are missing or malformed.
5. Never trust raw local-storage data; keep all finite bounds and repair logic.
6. If a migration is genuinely required, add tests for old save recovery before publishing.
7. Do not resurrect retired timed-world loss behavior.

The Transit/Defense Mark release intentionally preserves all existing saves. `GameState.transit` is additive; legacy 1-5 Defense installation levels migrate to Mark I instead of forging higher Marks or deleting progress.

## 16. Non-negotiable safety and UX invariants

- No crew death from idle/offline absence.
- No starvation simulation.
- No world destruction caused by a missed real-time deadline.
- No signal expiration.
- No negative offline decay.
- No hidden rarity multiplier inside Expertise totals.
- No mandatory Anomalous survivor.
- No unexplained random hard-lock.
- No silent campaign advancement while the player is away.
- No destructive save reset without explicit approval.
- No endless planets yet.

## 17. Development and validation

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Primary validation:

```bash
npm run lint
npm test
npm run build:pages
```

`npm test` includes the production Sites build before running the game-engine and rendered-HTML suites.

Before committing:

```bash
git status --short --branch
git diff --check
```

Do not ignore failing tests or publish a build from a different source state than the pushed commit.

## 18. Deployment workflow

The project has two public deployments:

1. Sites, configured through `.openai/hosting.json`.
2. GitHub Pages fallback, configured through `.github/workflows/pages.yml`.

Pushing `codex/axiom-foundry-game` triggers the GitHub Pages workflow. Sites deployment must use the existing project ID and validated build. Never create a second Sites project for this game unless the owner explicitly asks for a separate environment.

Do not commit credentials, short-lived tokens, archives, or local environment files.

## 19. Codex and Claude collaboration workflow

Both assistants may work on the project, but they should not edit the same feature simultaneously.

Recommended branches:

- Codex work: `codex/<feature-name>`
- Claude work: `claude/<feature-name>`

Workflow:

1. Begin from the latest accepted branch or merged commit.
2. Read this file and inspect `git status` before editing.
3. Create a dedicated branch for the feature.
4. Assign one assistant ownership of that feature and its overlapping files.
5. Implement, test, and commit the complete change.
6. Review the diff before merging.
7. Merge or cherry-pick the finished work before another assistant modifies the same systems.
8. Update this handoff if the accepted change alters design or lore.

Avoid:

- Running Codex and Claude against the same working directory at the same time.
- Letting both assistants change `app/game-engine.ts`, `app/page.tsx`, or the same CSS file concurrently.
- Asking one assistant to “fix” uncommitted work it cannot distinguish from the other assistant's edits.
- Force-pushing shared branches.
- Merging two different save migrations without a combined migration test.

Good parallel ownership examples:

- One assistant writes lore/content while the other works on isolated CSS animations.
- One assistant implements a defense engine while the other designs non-overlapping visual assets.
- One assistant writes tests after the public API of a feature has been agreed upon.

## 20. Starter prompt for another AI assistant

Use this when opening the repository with Claude or another assistant:

> Read `AI_HANDOFF.md`, `README.md`, and the current Git status before acting. Treat `AI_HANDOFF.md` as the design and lore source of truth. Preserve existing saves and all idle-safety invariants. Do not add endless planets, punitive timers, crew death, or irreversible offline loss. Work on a dedicated branch and do not modify files currently owned by another assistant. Before handing work back, run `npm run lint`, `npm test`, and `npm run build:pages`, then summarize changed behavior, save impact, tests, and files.

## 21. Near-term roadmap

Owner-approved order as of July 14, 2026:

1. **Implemented:** Research v2, operational Expertise, Profile Elevation, and the Armory progression rework.
2. **Implemented:** crew caps, generations, AXIOM staffing, and combined Continuity Expertise/Community Readiness.
3. **Implemented:** Command Briefing and guidance refinement. Every live card now distinguishes ACTION REQUIRED, SAFE TO WAIT, and AUTOMATIC; identifies what is missing; names one exact action; and routes to the correct page and Foundry/Research sub-panel. Facility locks and every active research stage explain themselves.
4. **Implemented:** deeper system connections. Field Validation uses bounded evidence from Ark work, medicine, expeditions, defense, infrastructure, colonies, and generations. Research now has visible bounded effects on Medical recovery/power, Defense readiness/forecast/repairs, Expedition strength/rewards, planetary construction, Cultural Records/Biological Samples, and Ark Reserve logistics. Armory's existing research gates remain intact.
5. **Implemented:** Robotics and Automation gameplay. Eight scarce Utility Drone Frames support seven research-gated programs, consume visible Operational Load, multiply staffed human work, and can automatically maintain damaged equipment under a player-selected reserve policy.
6. **Implemented:** Threat Operations Phase 2. Nox introduces Retrograde Vessel encounters, beacon exposure, visible targeted forecasts, equipment/interceptor influence, bounded crew injuries, temporary system compromises, incident reports, and Causal Fragments under the existing idle-first doctrines.
7. **Implemented:** persistent planetary defense networks. Every restored world receives permanent Reality Anchors, Shields, Interceptors, Shelters, and Repair Yards; Conservation/Guard/Fortress postures divert 1.5%/2.5%/3.5% production per colony. Breaches cause only temporary instability and repair load; worlds and founders are never deleted.
   **Implemented modernization:** departures after Pelagos now use real offline Transit; location-specific environmental hazards replace Cinder weather leaking into later worlds; the Ark Defense Grid now uses separate environmental/contact orders and four expensive installation Marks rather than five quick instant levels.
8. **Implemented:** the Enemy Mystery/Causal Archive storyline: Unknown Contacts -> Retrograde Vessels -> Causal Interdictors -> The Returned. Cross-system evidence advances provisional classifications and bounded Defense analysis without turning the current campaign into an exposition dump.
9. **Implemented:** opt-in Bioadaptation around Vesper/Convergence. Six consent-based protocols support expeditions, Research, and Defense; they never change rarity, contribute to Continuity, become a settlement requirement, or treat people as disposable stats.
10. **After items 3-9 are complete:** run the documented think-aloud human playtest across the whole current campaign. The owner explicitly postponed the major playtest until the version is feature-complete through Bioadaptation. Mechanical audits and regression tests continue after every item, but they do not substitute for that final observation.

### Post-playtest agenda (confirmed July 14, 2026)

Keep these items queued after the current expedition/full-campaign playtest. Do not let them disappear into feature notes, and do not begin them until the owner finishes the playtest or explicitly asks to move one forward:

1. **Planet-arrival story screens and stronger transition lore.** Every first arrival should feel like a chapter break, briefly establish the world, reveal why it matters, and preserve mystery without becoming a long exposition screen.
2. **A proper star map.** Show the Ark's authored route and explain, through discoverable intelligence, why AXIOM selects Pelagos, Viridia, Cinder, Nox, and Vesper in that order.
3. **Warp-gate research and return travel.** Research, construct, and fund gates that make restored planets meaningfully revisitable without invalidating the first real-time journey to each new world.
4. **More visible Ark evolution.** Defense Marks, restored rooms, Robotics, Research, and other system improvements should visibly change the Ark presentation so progress is a visual reward as well as a numerical one.
5. **Endless/post-Vesper planets remain postponed.** Finish and playtest the authored version before designing procedural or endless worlds.

Endless/post-Vesper planets are intentionally out of scope until this version and its full-campaign playtest are complete.

Implemented July 13, 2026 (consolidation release):

- Navigation reduced from up to nine equal-weight tabs to five destinations: Ark, Foundry, Personnel, Research, and Planet. Medical and Armory management sit within Personnel; Expedition Bay and Defense Grid sit within the Ark.
- The Ark now opens with an AXIOM command briefing that chooses up to three live priorities, explains cross-system blockers, shows progress, and routes directly to the relevant screen.
- Unlock pacing is staged: Medical becomes visible at Viridia, after Clinical Commons, or when someone actually needs care; Expeditions arrive at Cinder; Armory follows the first completed expedition or armament research; Defense and ash storms begin after two completed expeditions or immediately for saves with existing defense progress.
- `page.tsx` began decomposition into dedicated navigation, command-bar, strategic-guidance, and briefing modules.
- The permanently sealed nine-person Living Foundry roster and duplicate legacy expedition implementation were deleted. Old save fields are ignored safely; the real procedural survivor roster and `expedition-engine.ts` are now the only human/mission systems.
- Added strategic-guidance and staged-threat regression tests. No save reset and no player progress loss.

Approved research expansion direction (owner, July 12, 2026), sequenced:

1. Lattice auto-transfer QoL: staffed Analysis Core auto-moves common inputs from Ark Supply; Null Traces require a level-5 Exceptional-or-better Researcher to automate (earned automation, mirrors the prestige auto-buyer).
2. Threat Operations research branch with Phase 2: weapons/countermeasures, threat analysis, and repeatable Field Study projects so the Lattice never idles late-game. Weapons research should draw visible Continuity Protocol objections (lore: weaponized Axioms cause the future catastrophe).
3. Robotics branch (~Phase 2.5): upgrades equipment effectiveness and repair drones; research tree UI becomes necessary at this point (current list UI fits ~12 projects only).
4. Bioadaptation branch (Vesper era): opt-in survivor enhancement that plays the game's central moral question; never a continuity requirement, never touches rarity/expertise invariants, always generates contradiction lore, feeds the ending doctrines.

Implemented July 12, 2026 (rescue pacing batch):

- SOS scans scale per world (Pelagos 8m, Viridia 12m, Cinder 18m, Nox 25m, Vesper 35m); the first scan on each world stays at 90 seconds so beacon activation pays off immediately. Signals never expire. Beacon-speed bonuses now matter.
- Rescues cost Flux (150 x continuity scale, the shuttle launch) in addition to Salvage; both appear on the signal card and every blocked reason names its cause.
- Survivor Duty: with a level-5 Navigator and a level-3 Soldier assigned to their stations, rescues dispatch automatically whenever every requirement (quarters, life support, Salvage, Flux) is met. Toggleable on the Crew page; earned automation like the prestige auto-buyer.
- The security profession is displayed as "Soldier" everywhere; the internal id remains "security" for save compatibility.
- Simulated pacing after the batch: Pelagos 2.1d, Viridia 2.8d, Cinder 2.0d, Nox 4.6d, Vesper 5.2d (~16.8 bot-days) - Vesper inside the owner's 5-7 day window with no expertise compensation needed.

Implemented July 12, 2026 (research and expedition batch):

- Lattice auto-transfer: a staffed Analysis Core keeps the active project's required inputs topped up from Ark Supply automatically; Null Traces automate only with a level-5 Exceptional-or-better Researcher aboard.
- Expedition Phase E1 is live: Expedition Bay panel on the Crew page, groups of 2-4 real crew, per-site difficulty and durations (Navigators level 3+ shorten trips), Flux launch costs at flat continuity pricing, guaranteed returns with success/lean outcomes, crew XP on completion, and deployed crew unavailable for assignment/training/settlement. Sites: Planetary Survey (repeatable; counts toward certification), Kestrel Relay Survey (Cinder), Lantern Null-Bloom Study and repeatable Null Sounding (Nox, Null Traces), Palimpsest Origin Run (post-campaign). Expedition discoveries feed the existing mystery arcs. Planetary surveys are a departure requirement: Cinder 2, Nox 3, Vesper 3, shown as a Continuity forecast line. Save-additive; simulated pacing unchanged (16.8 bot-days).

Implemented July 12, 2026 (E2 Milestone A - health core and tiered armory):

- Survivor health (0-100, save-additive, default full). Damage comes ONLY from expedition setbacks; storms, defense, idling, and offline time never touch health. Recovery +2/hour, +0.5/hour per on-duty Doctor (cap 4), halved (never stopped) when medical life support is over capacity; runs offline. Wounded crew (health < 40) show a RECOVERING badge and are suspended from work, training, expeditions, and founder selection; each adds +0.5 medical demand. Founding a colony requires health >= 80. Permanent injuries (minor/major/severe) cap max health at 70/55/40; in Milestone A only the minor tier can occur (setback ending below 15 health). Biometric bars appear on roster cards, the personnel file, and every expedition party member.
- Expedition outcome ladder on margin = strength - difficulty: success (>= 0), lean (> -8, x0.45, harmless), setback (<= -8, x0.25 rewards, each member takes a deterministic 30-70 damage roll x armor multiplier, health floor 10 - crews always come home alive). The Expedition Bay always projects the outcome before launch, and a projected setback requires a click-through confirm (AXIOM objection). Expedition XP is now profession- and difficulty-scaled: (60 + 6 x difficulty) x 1.5 if the member's profession is in the site's focus roles, scaled by outcome - replacing E1's flat 90.
- Tiered Armory with its own tab (unlocks at Cinder with expeditions): weapons Kinetic Pike / Arc Carbine / Null Lance (+2/+4/+6 strength, wield levels 2/4/6) and armor Composite Weave / Reactive Shell / Aegis Frame (damage x0.5/x0.35/x0.2, wear levels 1/3/5, durability 1/2/3 hits). Armor that absorbs a hit loses durability and reads DAMAGED at zero; repair costs 40% of the forge price (recurring Flux sink). Expeditions auto-equip the best gear each member is leveled to use (checkout model - gear is out of stock while deployed). The armory is Ark structure: survives Recalibration and travels between worlds. Forge costs: T1 800 x scale Flux + 40 models, T2 2,400 + 100, T3 6,000 + 200 + 40 Null Traces.
- The Threat Operations research branch exists NOW (ahead of defense Phase 2, which adds to it): six chained gear projects (Expedition Armaments -> Arc Discharge Weapons -> Null-Edge Armaments; Composite Plating -> Reactive Shell -> Aegis Frame), both roots requiring Predictive Fabrication. The weapons line carries visible Continuity Protocol objection contradictions (canon: weaponized Axioms cause the catastrophe).
- SURVIVOR_SCHEMA 4, EXPEDITION_SCHEMA 2, new armory state on GameState - all save-additive with sanitizer defaults; no save resets. 134 tests passing.

Implemented July 12, 2026 (E2 Milestone B - distress, rescue missions, abandonment):

- Fourth outcome band DISTRESS (margin <= -16): the party is STRANDED at the site at critical health (8-20; armor holds them at the top band) with a guaranteed permanent injury (severe unarmored / major in T1-T2 armor / minor in an Aegis Frame). Stranded crews are STABLE: health frozen (no decay, no recovery) online and offline, the signal never expires, and they are unavailable everywhere (work, training, expeditions, founding). Their gear stays with them. Distress is only reachable by launching into a projected-DISTRESS warning, which requires an explicit confirm.
- Rescue missions launch from the distress panel: 2-4 fit crew, Flux cost 50% of the site cost, duration 60%, rescue difficulty = site difficulty - 4. Clean extraction (strength >= that) brings everyone home unharmed; a hard extraction still brings EVERYONE home but the rescuers take setback wounds. A rescue can never strand itself - no death spirals. Rescuers earn flat 90 XP; the rescued party's gear returns with the distress hit applied to armor durability. EXPEDITION_SCHEMA 3.
- Abandonment is the ONLY death in the game: an explicit two-step confirm on the distress panel. Abandoned crew are removed permanently, their gear is lost, and they are recorded on the persistent MEMORIAL WALL (name, professions, site; capped at 100 records, survives sanitize round-trips). Nothing ever abandons crew automatically; stranded crews wait indefinitely at no risk. This implements the owner-approved "death by choice, not dice" amendment.
- 136 tests passing; campaign simulator unchanged at 16.84 bot-days (the bot never launches distress-projected missions).

Implemented July 12, 2026 (E2 Milestone C - prosthetics):

- Prosthetic Fabrication research (human-continuity, prerequisite Clinical Commons; 140 bio / 120 models / 40 traces) unlocks Prosthetic Surgery: a per-survivor action on the injured crew member's personnel file. Requirements: a level-5 Doctor ON DUTY other than the patient, medical life support not over capacity, and 1,200 x continuity-scale Flux + 30 Engineering Models + 20 Biological Samples. Surgery removes the permanent injury, restores the 100 health cap, and stabilizes the patient at 50+ health; normal recovery finishes the job, after which they can found colonies again (80+ rule).
- With this, Expedition Phase E2 is COMPLETE per docs/expedition-e2-spec.md (all three milestones). E3 as a separate phase is retired - its mortality scope was absorbed into Milestone B with the owner's "death by choice, not dice" rule. 137 tests passing.

Implemented July 12, 2026 (expedition tab, Surface Recon, treasure-trove signals - owner-directed):

- Expeditions moved to their OWN top-level tab (unlocks at Cinder): distress panel, mission bay, full mission log, and memorial wall as separate panels. The Crew page is back to roster + personnel file + capacity. Shared HealthBar/titleCase live in crew-view-shared.tsx.
- Surface Recon: SOS scan bases from Cinder onward are long on arrival (Cinder 60m, Nox 80m, Vesper 105m; Pelagos 8m / Viridia 12m unchanged - no expeditions there). Every successful/lean expedition on the current world cuts scan time 10% (RECON_SCAN_REDUCTION_PER_EXPEDITION), flooring at 1/3 of base (MIN_SCAN_MULTIPLIER) - Cinder earns its way to 20m. Tracked as worldProgress.expeditionsCompleted (resets each world); the 90-second first scan per world is untouched. Shown on the Expeditions summary band and hinted on the SOS panel. This deliberately slows crew growth on later worlds per the owner's pacing direction.
- Treasure-trove signals: every SOS group carries a visible manifest (SignalCargo, save-additive) - recovered schematics always (6-15 + 6/world index, delivered as Engineering Models), Null Traces sometimes on Nox+, and gear: 35% tier-1 weapon and/or armor, 12% tier-2 on Nox+, 5% tier-3 on Vesper - delivered to the armory even before the matching research. Survivors arrive as people with histories: ~22% banged up (health 45-85), ~8% badly hurt (15-35, arriving RECOVERING with real medical demand priced into the rescue), ~4% carrying a minor permanent injury, and professionals sometimes arrive experienced (L2 ~24%, up to L5 on late worlds - a level-5 arrival can satisfy Survivor Duty outright). Authored story-hook characters always arrive pristine. All deterministic from the persisted survivor RNG.

Implemented July 13, 2026 (ECONOMY V2 - additive production; docs/economy-v2-spec.md):

- Every machine produces Flux directly and only Flux. flux/s = sum of BOUGHT machines x per-tier rate (1 / 15 / 350 / 9K / 150K / 15M) x milestones x multipliers. Cost growth flattened to a uniform 1.15. NOTHING raises the rate passively - no tier manufactures another tier; the only hands-off growth is the Recalibration-earned auto-buyer, which pays full price, so exponential costs govern overnight gains (linear rate x hours, then a handful of auto-purchases). This is the owner's directive: "per-second changes only when you buy" (July 13, 2026). It replaces the rejected Conduit soft-cap idea.
- Retuned: last two contribution gates 25T -> 10T (Nox) and 2Qa -> 500T (Vesper); RECALIBRATION_THRESHOLD 1e12 -> 25M runFlux with gain exponent 0.30 (cadence preserved: 17 recals across the sim campaign). All other formulas (milestones, Resonance, upgrades, prestige, structural flat pricing at 100 x 60^worlds) unchanged - they are bought/earned multipliers, which the new rule allows. Seed Mechanism taps now seed BOUGHT machines so they produce.
- Migration: SAVE_VERSION 8. tiers[].amount is set equal to bought on load - the free machine stockpiles from the compounding era dissolve (owner-approved rebase); purchases, Axioms, crew, research, worlds, armory untouched.
- PACING PHILOSOPHY CHANGE (owner, July 13, 2026): the 16.8-bot-day speed target is RETIRED. The game is a long game. The simulator gate is now: campaign completable, NO WALL (no required purchase/gate over ~8h of accumulation at contemporaneous rates), recal cadence 2-6/world, offline strictly linear. v2 sim result: completable in 14.8 bot-days of continuous play with every world's dominant blocker being crew/expertise growth (the intended long pole), peak flux 116B/s on Vesper (human-readable numbers restored, was e20).
- Verified live in the browser: tier cards read "PRODUCES FLUX", 5 taps x global multiplier = exact displayed rate, rate constant over idle time.

Implemented July 13, 2026 (Recovered Schematics - seventh evidence reservoir):

- "schematics" is now a REAL ResearchInputId (SCH, amber accent), no longer a flavor label for Engineering Models. Sources: ONLY rescued survivors' cargo manifests and expedition returns - generateResearchStock explicitly produces zero, so it cannot be idled or farmed; both sources are time-locked (scan cadence, mission clocks). This makes it deliberately one of the scarcest reservoirs (owner directive).
- The Threat Operations research branch is priced in schematics (Expedition Armaments 50, Arc Discharge 110, Null-Edge 160, Composite Plating 60, Reactive Shell 120, Aegis Frame 170, plus cal/bio/null accents). Spectral Separator and Proof Synthesizer accept SCH routes; the Vector Buffer takes everything as always. Auto-transfer treats schematics as a common input (scarcity lives at the source, not the transfer).
- Expedition reward field renamed engineeringModels -> schematics (site defs, results, logs) with a sanitize fallback reading legacy engineeringModels from old save logs. Armory FORGING still costs Engineering Models (fabrication capacity) - schematics buy the knowledge, models build the hardware. Berth/defense/infra model income unchanged.
- Manual gains a Schematics resource topic; the Lattice supply row shows its no-passive-source explanation. 142 tests passing.

Implemented July 13, 2026 (Team Alpha - command crew):

- SurvivorSystemState gains commandTeam { leaderId, memberIds (max 3) } and trainingDoctrine (a ProfessionalRole or null), save-additive. Appoint/remove from any personnel file; the leader never doubles as a member; founding/abandonment prunes departed crew from the team automatically. Displayed as its own separated group (LEADER + three OFFICER slots) at the top of the Crew page; the rest of the roster is unchanged.
- Command Rating = summed continuity expertise of ON-DUTY team members (wounded/deployed/stranded pause their contribution). Crew-wide multiplier on training speed AND on-job XP: 1 + min(0.35, rating/150) - an elite 4-person team caps at +35%. Membership is a designation, not a station: officers keep jobs and remain eligible for expeditions and founding (roster tension is the point).
- Training Doctrine ("lean"): with a leader appointed, pick a profession; every simulation tick fills EMPTY study slots with the best eligible adult in Ark Reserve for that lean (highest aptitude, respects rarity capacity, skips wounded/deployed). It never cancels manual programs and never pulls anyone off a working assignment. Runs offline.
- Lore: AXIOM's "biological command authority: advisory" line now has a mechanical counterpart - the appointment announcement notes the transfer of command authority.
- 144 tests passing; default path untouched (no team = x1, no doctrine = no enrollments), so sim pacing is unaffected. Verified live: appoint -> rating 22/+15% with three officers, doctrine "Lean Doctor" auto-enrolled an idle civilian within one tick.

Implemented July 14, 2026 (crew capacity, families, and AXIOM staffing):

- The Ark now has an absolute 48-person structural limit. Living Space still expands in 8-person sections, but capacity multipliers cannot exceed 48. Old over-cap saves are preserved and simply cannot accept another rescue until their roster falls below the limit.
- Living Space construction now consumes both Flux and Salvage. Life support and rescue flights continue consuming Salvage, while adults in Ark Reserve provide a small passive maintenance recovery.
- Survivor schema 5 adds `ageGroup` (`child | adult | elder`), `ageProgress`, `assignmentLocked`, `preferredRole`, `settlementProtected`, and system-wide `autoAssignmentEnabled`. Old crew default to adults; existing assignments become protected manual assignments and return after recovery, study, or missions.
- Family signals may include children and elders. Children never work, study a profession, join command, or enter expeditions; they become adults after two completed planetary chapters aboard. Elders retain their Expertise, but AXIOM automatically places them only in Medicine, Research, Navigation, or Education. Manual elder assignments remain allowed.
- AXIOM staffing places available adults into their highest-level learned profession, restores routine staffing after study/recovery/missions, and never moves a protected manual assignment. `Optimize all crew` clears those locks deliberately. `Unassigned` is replaced by `Ark Reserve`, a valid and useful state. Each personnel file also has explicit Ark protection that removes that person from founder selection until the player reverses it.
- Raw `Stable founding population` and duplicate profession-headcount gates were retired. Planet departure now uses `Community Readiness`: each adult +1, each child/elder +2, social Expertise up to +2/person, profession diversity up to +4, and completed planetary works +2 each. Existing world targets remain 18/26/34/42/50, so later worlds demand stronger groups without requiring 34-50 separate people. Founding groups are hard-capped at 24 people (half the full Ark).
- Continuity now displays only combined Expertise gates (`Engineering Expertise`, `Medical Expertise`, etc.). One level-four specialist visibly contributes four points. Equipment previously covering fictional "posts" now contributes directly to the matching Expertise total.
- The Field Manual and Personnel/Planet interfaces explain the cap, age groups, Ark Reserve, assignment locks, readiness math, and Expertise contributors. Saves remain compatible and no crew is deleted.
- Validation baseline after this pass: 151 tests, lint, vinext production build, and static hosting build passing.

Implemented July 13, 2026 (Medical Bay tab):

- New Medical tab (unlocks with the Crew page): ADMITTED and WARD panels. Anyone below their health cap (or carrying an injury) can be admitted; admission clears their station and they do NOTHING but heal - no work, training, missions, founding, or Team Alpha contribution. Discharge anytime; fully healed uninjured patients auto-discharge (an empty bed stops costing).
- Recovery model rewrite: the ward (non-admitted) heals at the base +2/hour trickle ONLY - zero input, never stops (idle contract). The bay adds bedside care from the DOCTOR-LEVEL pool: summed doctor levels of on-duty, non-admitted Doctors x2, divided across patients, capped at +16/hour total. A level-6 doctor tends like six level-1s (owner directive). Medical over-capacity halves both rates. Admitting your only doctor collapses the care pool - intended tension.
- Cost is a PERCENTAGE, not a fee: each occupied bed diverts 5% of ALL Flux production (cap 40%), so healing matters at every stage and "people should aim to not get hurt" (owner). Wired into getProductionSnapshot's global multiplier.
- Prosthetic surgery moved INTO the bay: patients must be admitted (new "not-admitted" quote reason); the personnel file now points to the Medical Bay. Prosthetic Fabrication research retuned to cost schematics (bio 140 / SCH 80 / null 40, replacing eng models).
- 145 tests passing; verified live (care pool math, doctor-as-patient collapse, x0.95 production with one bed occupied).

Remaining expedition phases (spec before code):

2. Survivor expeditions - EXPANDED SCOPE (owner, July 12, 2026): Phase E1 (above) is DONE. Phases E2 and E3 were MERGED by owner direction later the same day — see `docs/expedition-e2-spec.md` v2, the authoritative spec. Owner decisions recorded there: wounded threshold is health < 40; founding a colony requires health >= 80; permanent injuries cap max health (70/55/40 by severity) and are repaired via Prosthetic Fabrication research + a level-5 Doctor + medical capacity; expedition parties show biometric bars; expeditions can strand crews (distress outcome), rescue missions retrieve them, and death exists ONLY through the explicit Abandon action (persistent memorials); armor breaks when it absorbs damage (recurring Flux sink); expedition XP is profession- and difficulty-dependent. Core rule preserving the idle contract: crew NEVER die from RNG alone, offline, or by default - stranded crew are stable forever and loss always requires an explicit player choice. This amends the historical no-crew-death invariant with owner approval; the invariant against idle/offline/unchosen death stays absolute.

   Original baseline notes, superseded where they conflict: rebuild expeditions on the real survivor roster and retire the dormant legacy-crew system. Expedition Bay panel on the Crew page; send 2-3 crew with a Flux launch cost for a fixed real-time duration (continues offline, guaranteed return, no crew harm ever); deployed crew are unavailable for assignment, training, and settlement while away. Reuse the three authored sites at their original gates (Kestrel Relay Survey at Cinder, Lantern Null-Bloom Study at Nox awarding Null Traces, Palimpsest Origin Run post-campaign) plus a repeatable Null Sounding for trace farming. Crew composition modifies outcomes (Navigator shortens duration, Soldier raises the reward floor, Researcher boosts trace yield). Expedition discoveries feed the existing mystery arcs and doctrine unlocks.

Smaller queued items:

- The Living Foundry expedition/legacy-crew subsystem is fully dormant: `launchExpedition`/`claimExpedition` are never called from any UI, `foundry-deck.tsx` is not imported, and the nine named legacy crew are permanently locked (`unlocked: false` on every sync). Decide whether to resurrect it (expeditions awarding Null Traces would fit) or remove it. Until then, Archive cross-indexing awards Null Traces as the active source, and the Phase 2 Observe doctrine becomes the main one.
- The `null-expeditions` unlock from Discarded Spectrum remains a dead hook until that decision.

Completed from this list:

- Recalibration copy now states that unspent Flux is lost.
- Training-slot capacity is explained in the Crew UI and Field Manual, and a full slot roster disables the training dropdown with the reason instead of failing silently.
- Archive cross-index discoveries award Null Traces (15 + 10 × world index).

The next implementation should begin with a written mechanic specification and balance table. Do not jump directly into random combat events; the idle-resolution and failure-safety rules must be decided first.

### Implemented July 14, 2026 — standardized Armory progression

- Armory management moved from the Ark facility strip to Personnel. The physical room remains visible on the Ark cross-section and routes to Personnel → Armory.
- The inventory remains deliberately limited to three weapon frames and three armor frames. Each has a global Mark I-IV pattern; a completed Mark upgrades every ready copy while preserving damaged stock.
- Mark projects are single-slot, deterministic, offline-safe jobs. Resources are committed at launch. Costs grow across Flux, Salvage, Recovered Schematics, Engineering Models, and late Marks' Null Traces. Mark II takes roughly 30-45 minutes before laws; Mark III 2-3 hours; Mark IV 6-9 hours.
- Mark strength is bounded: weapons gain only +1 strength per Mark, while armor gains 10% relative mitigation and one durability per Mark. Crew level and composition remain important. Mark IV additionally requires Impossible Material Synthesis plus the Impossible Materials law.
- Each frame has one global specialization slot: Vector Stabilizer (+1 weapon strength), Unsafe Overcharger (+2 with +15% carrier wound damage), Sensor Link (+15% Salvage/Schematic expedition recovery once per party), or Field Medic Kit (15% additional armor mitigation). Unlocks reuse relevant Research projects; changing fits consumes modest Salvage and Schematics.
- Four permanent Armory Laws spend Axioms: Standardized Patterns (material discounts), Recursive Forging (time reduction), Resonant Munitions (bounded veteran strength), and Impossible Materials (Mark IV authorization). Marks, fits, laws, active projects, and stock survive Recalibration.
- `ARMORY_SCHEMA` is 2. Old schema-1 stock migrates intact as Mark I with standard patterns, no laws, and no active project. No save reset.

### Implemented July 14, 2026 — Research v2, operational Expertise, and Profile Elevation

- Research is save-additive at `RESEARCH_SCHEMA = 2`: seven evidence inputs, six physical processors, eight disciplines, 38 programs, four eras (Recovery, Integration, Synthesis, Convergence), and four visible work stages (Theory, Prototype, Field Validation, Final Synthesis). Existing discoveries and progress survive; old saves simply gain the new unresolved work.
- The Research page is now four progressively revealed workspaces: the animated Analysis Core, an era-filtered Technology Map, the routing Lattice, and a completed-discovery Archive. Later eras reveal from prerequisite progress rather than appearing as an unreadable wall at the start.
- Project costs and Core work were rebalanced upward. The opening campaign path now contains nine required programs through Cinder, but no early requirement uses expedition-only Recovered Schematics or recalibration-only Axiom Proofs. A fresh-state regression test enforces a 100-minute maximum active-work segment and keeps the first Null gate below eight hours at conservative intended staffing.
- Research leadership is an actual gate: Integration needs an on-duty level-3 Researcher, Synthesis level 5, and Convergence level 9 at Exceptional or Anomalous rarity. A staffed Core plus a level-3 Researcher auto-transfers common inputs; Null Trace transfer still needs a level-5 Exceptional-or-better Researcher.
- Crew contribution is operational rather than decorative. Only healthy, aboard, on-duty people who are not training, admitted, or deployed contribute. Researchers accelerate Core work; Engineers and Technicians feed Engineering Models and construction; Fabricators and Technicians improve Salvage recovery and Armory work; Doctors improve biological evidence and medical care; Teachers improve Cultural Records; Soldiers, Navigators, and Farmers contribute to relevant field, defense, travel, and ecology systems. Research-stage Expertise is deliberately capped at +35% so staffing matters without becoming exponential.
- Three bounded repeatable programs keep the late Lattice useful for ten cycles each: Equipment Stress Tests improve Armory project speed, Colony Data Integration adds +1% research speed per cycle, and Null Signal Triangulation adds +1% Null signal yield per cycle. Repeat work and evidence costs grow each cycle.
- Armory progression now consumes knowledge as well as Axioms. Each permanent manufacturing Law requires its named Research proof, and Mark IV requires Impossible Material Synthesis plus the Impossible Materials Law. This supersedes older notes that named Axiom Origin Proof as the Mark IV gate.
- `SURVIVOR_SCHEMA = 6` adds permanent Profile Elevation without rerolling a person. Standard → Notable requires Human Potential Mapping, mastery level 3, 1 Axiom, and 100 Cultural Records; Notable → Exceptional requires Continuity Scaffolding, level 6, 3 Axioms, 300 Cultural Records, and 10 Axiom Proofs; Exceptional → Anomalous requires Axiomatic Identity Preservation, level 9, 8 Axioms, 1,000 Cultural Records, 40 Axiom Proofs, and 50 Null Traces. Name, callsign, traits, learned professions, XP, history, health, and player attachment all remain intact; the personnel file records every elevation.
- Levels still cap at 10 with increasingly expensive XP requirements. Rarity keeps its current visual identity and learning-cap role; Elevation is a difficult long-term investment, not a replacement for finding rare survivors.
- Validation baseline for this release: 157 automated tests, lint, production build, and static hosting build. The browser-based human walkthrough was interrupted, so `docs/human-playtest-protocol.md` records the completed mechanical audit separately and does not pretend it produced comprehension evidence.
- No global save reset. All changes are additive and existing players keep campaign, crew, Armory, colony, and research progress.

### Implemented July 14, 2026 — exact guidance and connected systems

- Command Briefing cards now expose cadence (`ACTION REQUIRED`, `SAFE TO WAIT`, or `AUTOMATIC`), the exact missing condition, and the next concrete action. Research guidance understands Theory/Prototype/Field Validation/Synthesis, lead requirements, exhausted Ark Supply vs untransferred evidence, power stalls, and offline-safe active work. Buttons route to the exact Foundry machine/campaign panel or Research Core/Technology/Lattice workspace.
- Research processor routing is always handled by AXIOM. The Hand Patch/AXIOM Assist choice, manual route toggles, and patch editor were removed after the opening playtest showed that they added terminology and failure states without a meaningful decision. Legacy manual layouts are discarded safely when loaded.
- The Pelagos SOS array now exposes one shared readiness checklist on both the Ark and Personnel pages: planetary orbit, 2 living spaces, and at least 2 Atmosphere, Water, Nutrition, and Medical capacity. The Ark beacon card reveals as soon as Personnel unlocks instead of hiding until every requirement is already satisfied.
- Field Validation is now a real stage connection. Branch-specific evidence from infrastructure, habitation, Armory Marks, colonies, children/elders, Team Alpha, crises, Medical practice, expeditions, Defense events, and Axioms provides up to +25% Validation speed. It is visible in Research and never a hard gate.
- Medical research provides bounded admitted-patient recovery bonuses (up to +30%) and can reduce bed diversion from 5% to 3.5%; the Medical page displays both values and names active protocols.
- Threat/Robotics research adds visible Defense readiness, forecast lead, and repair speed. Defense crew contribution now consistently uses on-duty Expertise levels in both simulation and UI.
- Expedition research adds at most +2 strength and +15% Salvage/Schematic recovery. The launch projection states the bonuses before the player commits.
- Planetary research can reduce infrastructure Flux costs by at most 12%. Infrastructure, crises, expeditions, and colonies return research value instead of living in isolated tabs.
- Children, elders, and colonies now generate differentiated Cultural Records; colony health reports generate Biological Samples. Automated Personnel Logistics improves the useful Ark Reserve's maintenance Salvage without replacing Fabricator/Technician expertise.
- The Field Manual is synchronized with the new cadence, Field Validation, and cross-system effects. Saves remain compatible; no reset is required.

### Implemented July 14, 2026 — Robotics, Nox threats, and restored-world defense

- `SAVE_VERSION = 9` adds `GameState.automation` and `GameState.planetaryDefense` with additive sanitizers. The public save key is unchanged: every existing campaign, crew member, colony, Armory pattern, and Research project survives.
- Utility Drone Operations is a Foundry module unlocked by Automated Personnel Logistics. The Ark may fabricate at most eight permanent frames. Seven independently researched allocations support hull/equipment maintenance, staffed medical care, Prototype/Validation research routing, expeditions, planetary construction, hostile interceptors, and reserve logistics. Each active frame diverts 1.25% production; all effects are bounded and drones never satisfy a profession or Continuity requirement.
- Equipment maintenance has Off/Reserve/Priority policies. Allocated repair frames restore damaged standardized equipment on a deterministic offline-safe interval, paying the normal Flux repair cost; Reserve preserves twice the required Flux.
- Operational Load is unified and visible in the command bar and Foundry: Medical Bay diversion + drone power + planetary network upkeep/recovery + temporary hostile compromise, capped at 65%. It diverts production instead of silently deleting stored Flux.
- Cinder remains the environmental tutorial. Nox introduces deterministic Retrograde Probes, vessel approaches, boarding feints, archive intrusions, Core interdiction, and beacon traces. Events target a named Ark system, forecast severity/target, and resolve automatically from installations, on-duty Expertise, Research, ready Armory stock, interceptor frames, and standing doctrine.
- Eligible adult Soldiers and Engineers can be wounded by hostile events. Evade guarantees no automatic injury. Ready armor lowers damage; wounded crew are stood down and protected from further exposure. No automatic event kills crew. Death remains limited to the already explicit expedition-abandonment decision.
- Failed Nox defenses can create a bounded Flux siphon, research quarantine, drone seizure, beacon spoof, Core desynchronization, or archive contamination for at most six hours. These purge automatically online/offline, never delete settings or progress, and are explained in incident reports and Command Briefing.
- Restored worlds receive persistent defense ledgers. Construction commits Flux, Salvage, and Engineering Models up front, continues offline, and is accelerated by on-duty Engineering Expertise and allocated construction frames. Incoming attacks target reality anchors/world cores; outcomes are Stable/Strained/Breached. No outcome removes a colony, founder, completed installation, or saved world.
- Ark and planetary contact reports recover eight staged Causal Fragments. They suggest that the attackers originate in damaged futures, deliberately avoid some civilians, and associate AXIOM with a future Foundry Event. The current campaign does not state the full truth.
- Validation baseline: 168 automated tests, production build, lint, and static hosting build. The in-app browser runtime failed before connecting during this release, so the postponed owner playtest remains required after agenda item 9.
- Full mechanic and balance tables: `docs/threat-operations-phase2-spec.md`.

### Implemented July 14, 2026 — offline Transit and Defense Marks

- `SAVE_VERSION = 10` adds additive `GameState.transit` state. The save key is unchanged and there is no player reset.
- Cold Wake-to-Pelagos remains the authored approach/tutorial arrival. Pelagos-to-Viridia, Viridia-to-Cinder, Cinder-to-Nox, and Nox-to-Vesper take 90 minutes, 2.5 hours, 4 hours, and 6 hours before bounded Navigation/drive reductions.
- The Planet destination becomes a Navigation console during travel. It shows the physical route, exact ETA/progress, continuing offline systems, and the active Defense forecast. Destination Planetfall directives remain paused until arrival, and new expeditions cannot launch mid-corridor.
- Defense environments are location-specific. Cinder forecasts cannot follow the Ark to Nox or into transit; changing environments discards an obsolete environmental forecast. Transit adds asteroid, debris, ion, drive, and later Null hazards.
- Environmental doctrine is independent of contact doctrine. The player can safely Brace for weather while separately Observing or Defending against a Retrograde contact.
- Ark installations now progress through Mark I-IV offline projects. Flux growth factors are 1/6/30/150 and material factors 1/3/7/15; later Marks additionally consume Schematics and Null Traces and require Defensive Forecasting, Autonomous Repair Swarms, and Causal Threat Projection.
- Legacy Defense saves migrate additively: any previous positive 1-5 installation level becomes Mark I. Existing players keep useful hardware but must earn the new late-game progression.
- Validation baseline: 173 automated tests, lint, production build, and static hosting build passing. Full balance and migration rules: `docs/transit-and-defense-marks-spec.md`.

### Implemented July 14, 2026 — Causal Archive and voluntary Bioadaptation

- `SAVE_VERSION = 11`, `SURVIVOR_SCHEMA = 7`, and `EXPEDITION_SCHEMA = 4` add only sanitized defaults. The public save key remains unchanged and no player progress is reset.
- Causal evidence is cross-indexed retroactively from Ark and planetary fragments, completed Research, expedition sites, and founded colonies. Four provisional classifications grant bounded, visible Defense analysis: Unknown Contacts, Retrograde Vessels, Causal Interdictors, and The Returned.
- Ark and planetary contact pools expand from eight total fragments to sixteen. Retrograde Material Analysis, Causal Cartography, Returned Origin Hypothesis, and the Vesper Causal Wreckage expedition connect the mystery to active play.
- The current campaign still does not resolve the enemy's exact identity or motive. It establishes damaged futures, civilian-protective contradictions, Ark-adjacent ancestry/authentication, and a possible future Foundry Event without declaring that future inevitable.
- The Voluntary Adaptation Charter unlocks an elective clinic inside each adult Personnel File. One offline-safe procedure runs at a time; a volunteer is temporarily off duty; each person may choose at most two of six permanent protocols.
- Adaptations can add bounded expedition strength, duration reduction, personal injury resistance, on-duty Research support, Defense readiness, or identification. They never alter rarity, Profile Elevation, profession levels, Continuity Expertise, founder requirements, or colony viability. Founder history preserves the choices as biography only.
- Full rules and balance table: `docs/causal-archive-and-bioadaptation-spec.md`.
- Validation baseline: 178 automated tests, lint, production build, and static hosting build passing.
- Roadmap items 3-9 are now implemented. The Expedition Campaign rework below supersedes the old global-site expedition notes elsewhere in this file.

### Implemented July 14, 2026 — Planet-specific Expedition Campaigns

- `SAVE_VERSION = 12` and `EXPEDITION_SCHEMA = 5` are additive. The public save key is unchanged; no player progress is reset.
- The Expedition Bay exposes only the current planet. Future-world operation names, rewards, and lore are hidden until arrival. After the authored campaign, only Palimpsest Origin remains available.
- Every inhabited planet now has a repeatable Planetary Survey, optional one-time story work, one Critical operation required by Continuity, and a repeatable local resource route. Nox and Vesper contain additional high-risk mystery operations.
- Survey requirements are now Pelagos 1, Viridia 2, Cinder 2, Nox 3, and Vesper 3. Required Critical operations are Highwater Archive Recovery, Seed Vault Descent, Foundry Nine Recovery, Kestrel Relay Survey, and Causal Wreckage Recovery.
- Launch preparation is explicit and solution-based. A requirement may accept Research, weapons, armor, a qualified specialist, a prior expedition, an allocated drone, or a voluntary adaptation. Required checks block deployment; Recommended checks remain optional and visible.
- Nox and Vesper Critical operations deliberately require armed teams. Earlier worlds teach medical, environmental, and industrial preparation first, so guns do not become the solution to every expedition.
- Expedition rewards now include planet-appropriate Engineering Models, Biological Samples, and Cultural Records in addition to Salvage, Schematics, and Null Traces. This connects field work directly to Research without replacing staffed passive generation.
- Successful one-time operations enter both the permanent expedition ledger and the current world's Continuity progress. Lean returns remain safe but do not certify a Critical operation; the player must prepare for a full success.
- The Expedition UI is an operation board rather than a global future-spoiling dropdown. It labels Survey, Story, Critical, and Resource routes, shows Continuity status, preparation checks, projected outcomes, equipment, and a narrative debrief.
- Full design and balance table: `docs/planetary-expedition-campaign-spec.md`.
- Validation baseline: 180 automated tests, lint, production build, and static hosting build passing.
- Next product milestone requested by the owner: plan and execute the full visual/graphic reset, then run the postponed fresh Cold Wake-to-Vesper think-aloud playtest and perform evidence-based balance and guidance fixes.

## 22. Maintaining this handoff

Update this file when any of the following changes:

- Canon or major lore interpretation
- Campaign order or new worlds
- Save version/key or migration policy
- Economy scaling
- Crew roles, rarity, or Expertise formulas
- Core page responsibilities
- Threat/defense rules
- Public deployment URLs or branch strategy
- Non-negotiable UX invariants

When uncertain, distinguish clearly between:

- **Implemented** — present in the current game and covered by tests.
- **Approved direction** — agreed concept but not yet built.
- **Speculative** — an idea still requiring owner approval.

Do not silently convert speculative lore into canon.
