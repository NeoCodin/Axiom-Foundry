# Axiom Foundry — AI Project Handoff

Last updated: July 12, 2026

Current development branch: `codex/axiom-foundry-game`

Handoff baseline commit: `6ddf4de` (`Deepen crew progression and late campaign`)

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

The player is AXIOM, the caretaker intelligence controlling a damaged interplanetary Ark. The player is not a conventional human captain. At the beginning, the Ark is empty, most rooms are dark, life support is unsafe, and Pelagos is only a distant destination.

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
2. Enter the Foundry and buy nested mechanisms. Higher tiers create the tier below them.
3. Complete the active Planetfall campaign phase.
4. Restore life-support categories using Salvage.
5. Reach planetary orbit and activate the SOS beacon.
6. Rescue persistent survivor groups. Signals never expire.
7. Assign qualified crew or train civilians into professions.
8. Generate and route research inputs through the Research Lattice.
9. Complete Ark Engineering, Human Continuity, and Null Studies projects.
10. Finish planetary infrastructure, supplies, crisis resolution, and founder requirements.
11. Select the exact founders who will remain on the planet.
12. Depart only when the Continuity forecast proves the world can survive without the Ark.
13. Carry research, colonies, Axioms, and permanent legacy effects into later worlds.

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

### Ark page

- The visual and emotional home screen.
- Owns Core tuning and its click animation.
- Shows the Ark cross-section, awakened rooms, population, life support, current world, signals, research activity, and Continuity state.
- Should become visually richer as the player progresses.
- Future defenses and threat events should be most visible here.

### Foundry page

- Owns the nested fabrication chain, machine purchasing, Resonance, multipliers, Core Protocols, Recalibration, statistics, and Planetfall campaign operations.
- Does **not** own Core tuning. Core tuning stays on the Ark because the Ark presentation is clearer and the Foundry is already information-dense.

### Crew page

- Owns Habitation Ring berth construction, life-support expansion, SOS signals, survivor roster, Personnel Files, training, assignments, callsigns, rarity explanations, levels, XP, and individual Continuity contributions.

### Research page

- Owns project selection, Ark Supply transfers, evidence reservoirs, processors, route configuration, Analysis Core staffing, research throughput, and contradictions.
- AXIOM Assist should remain a safe default. Manual routing is optional depth.

### Continuity page

- Owns planetary infrastructure, supplies, crisis resolution, founder selection, Expertise formulas, Profile Depth, restored colonies, transmissions, and final departure authority.
- Every deficit must say what is missing and how to address it.

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
- Crew capacity is structural: the Habitation Ring provides berths (4 base + 8 per section). Sections are purchased with Flux at flat per-world continuity pricing (600 × continuity scale × (1 + 0.08 per lifetime section)), take 3 base hours to build, and assigned Engineers accelerate construction (+35% each, ×5 cap). Construction continues offline and never fails. Habitation is no longer a life-support category; atmosphere, water, nutrition, and medical remain the Salvage-built envelope that sustains the people berths house. Old saves convert habitation capacity into completed sections and population is always grandfathered — nobody aboard ever loses a berth.
- Habitation research now increases effective berth and life-support capacity.
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

## 11. Enemy and defense arc — Phase 1 implemented, later phases approved direction

Phase 1 (Cinder environmental tier) is implemented per docs/threat-operations-spec.md: defense-engine.ts, a Defense tab unlocking at Cinder, ash storms every 4-8 hours with deterministic offline-identical resolution, four installations at flat continuity pricing, four standing doctrines (Observe yields Calibration Data and Null Traces), damage hard-capped at -25% production and 6h repairs. Simulated pacing is unchanged (12.88 bot-days). Nox vessels, beacon exposure, and planetary networks remain unbuilt.

The game should eventually introduce threats while remaining an idle game.

### Progressive introduction

- Cold Wake: completely safe.
- Pelagos: completely safe; players learn the core game without attacks.
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

Possible doctrines:

- Defend — safest, consumes more resources.
- Evade — protects the Ark but gives fewer rewards.
- Intercept — higher risk and better Salvage/intelligence.
- Observe — gathers research while accepting limited temporary disruption.

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
| `app/game-engine.ts` | Incremental economy, campaign simulation, production, Recalibration, system integration |
| `app/survivor-engine.ts` | Survivor generation, signals, pity systems, life support, training, assignments, XP |
| `app/research-engine.ts` | Projects, inputs, processors, routes, throughput, bonuses |
| `app/settlement-engine.ts` | Founder selection, viability forecasts, colonies, transmissions, legacy summary |
| `app/continuity-expertise.ts` | Shared Expertise formulas and readable explanations |
| `app/living-foundry-engine.ts` | Physical Ark rooms, legacy living systems, Cohesion, discoveries/rewards |
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
- `tests/living-foundry-engine.test.ts`
- `tests/discovery-engine.test.ts`
- `tests/survivor-engine.test.ts`
- `tests/research-engine.test.ts`
- `tests/settlement-engine.test.ts`
- `tests/rendered-html.test.mjs`

At the handoff baseline, 105 automated tests pass.

## 15. Save compatibility rules

Current identifiers at the handoff baseline:

- `SAVE_VERSION = 7`
- `SAVE_KEY = "axiom-foundry-save-v5"`

Rules for all assistants:

1. Do not change the save key merely because a feature changes.
2. Do not reset public progress unless the owner explicitly requests it for that release.
3. Add new saved fields with safe defaults in sanitizers.
4. Preserve old saves even when optional fields are missing or malformed.
5. Never trust raw local-storage data; keep all finite bounds and repair logic.
6. If a migration is genuinely required, add tests for old save recovery before publishing.
7. Do not resurrect retired timed-world loss behavior.

The latest crew/late-game release intentionally preserved all existing saves.

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

Recommended order, subject to owner approval:

1. Design the Threat Operations data model and standing doctrines without altering saves yet (owner has approved starting this: a Defense view/tab unlocking on Cinder arrival, with defense hardware and events visible on the Ark page).
2. Introduce Cinder environmental-defense events (ash/debris storms) as a safe tutorial.
3. Add Security/Navigator/Engineer defense assignments and automatic offline resolution.
4. Add Ark visual defense upgrades and readable exposure/readiness indicators.
5. Introduce Nox Retrograde Vessel encounters and Causal Fragments; the Observe doctrine should award Null Traces so threat study becomes the active source of the game's scarcest input.
6. Add persistent planetary defense networks around restored world cores.
7. Expand post-Vesper worlds only after the current campaign pacing is observed in real play.

Smaller queued items:

- The Living Foundry expedition/legacy-crew subsystem is fully dormant: `launchExpedition`/`claimExpedition` are never called from any UI, `foundry-deck.tsx` is not imported, and the nine named legacy crew are permanently locked (`unlocked: false` on every sync). Decide whether to resurrect it (expeditions awarding Null Traces would fit) or remove it. Until then, Archive cross-indexing awards Null Traces as the active source, and the Phase 2 Observe doctrine becomes the main one.
- The `null-expeditions` unlock from Discarded Spectrum remains a dead hook until that decision.

Completed from this list:

- Recalibration copy now states that unspent Flux is lost.
- Training-slot capacity is explained in the Crew UI and Field Manual, and a full slot roster disables the training dropdown with the reason instead of failing silently.
- Archive cross-index discoveries award Null Traces (15 + 10 × world index).

The next implementation should begin with a written mechanic specification and balance table. Do not jump directly into random combat events; the idle-resolution and failure-safety rules must be decided first.

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
