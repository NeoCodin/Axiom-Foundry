# Axiom Foundry

Axiom Foundry is a cosmic incremental campaign about rebuilding a living, reality-forging ark across six endangered worlds. Higher-tier mechanisms manufacture the tiers beneath them, rescued specialists operate visible Foundry rooms, and balanced adjacent tiers generate Resonance without runaway recursive multipliers.

The Null Tide is erasing the laws of physics from inhabited space. The Foundry turns completed production cycles into portable Axioms—proven laws that keep ships, planets, time, and gravity consistent long enough for humanity to escape.

## How to play

1. Tune the Axiom Chamber to create your first Flux.
2. Complete Helion's three operations at your own pace; planetary progress saves automatically.
3. Build machines in groups of 25 for measured efficiency milestones.
4. Balance neighboring tiers in groups of 15 to strengthen Resonance.
5. Spend or directly contribute Flux to solve each planet's physics hazard.
6. Assign crew to Foundry rooms, upgrade the ark with Salvage, and give recruited specialists their own callsigns.
7. Launch reward-only expeditions that continue while the game is closed.
8. Travel from planet to planet, retaining Axioms, crew, rooms, relics, relays, and blueprints while rebuilding temporary machinery from a landing cache.
9. Reach 1 trillion run Flux and Recalibrate for permanent Axioms.
10. Recover contradictory records, decide what the Foundry truly is, and choose the doctrine carried beyond Vesper.

Progress saves automatically in browser storage. Returning players receive simulated offline production, initially capped at eight hours.

The Living Foundry release intentionally begins a fresh save generation so every player meets the new crew and discovers the rebuilt story from the beginning.

## Features

- Six-tier nested production chain
- Six-world, three-phase Planetfall campaign designed for hours of progression
- Planet-specific color themes, hazards, relics, and mechanical consequences
- Visual Foundry theater that grows with purchased machinery
- Interactive cross-section ark with rooms, assignments, upgrades, and visible crew
- Named specialists with editable callsigns, homeworld histories, XP, and capped bonuses
- Reward-only Null Tide expeditions with guaranteed Salvage and discoveries
- Positive-only crew Cohesion with no hunger, decay, death, or missed timers
- Buy one, buy ten, and buy-max controls
- Per-tier milestones and adjacent-tier Resonance
- Repeatable run upgrades
- Prestige progression through Recalibration and Axioms
- Permanent Legacy upgrades
- Machine and research automation
- Versioned local saves and offline progress
- First-run guided orientation and replayable field manual
- Six untimed planetary rescue directives designed for active or idle play
- Progressive mystery archive with crew dialogue, conflicting records, and doctrine endings
- Responsive desktop and mobile interfaces
- Reduced-motion and keyboard-accessible controls

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validate

```bash
npm test
```

The test suite verifies the deployment build, server-rendered game surface, economy invariants, crew and room state, expedition rewards, multiplier placement, planet gates, save behavior, Planetfall transitions, Recalibration behavior, and a deterministic multi-hour campaign pacing guard.

## Technology

- React 19
- Next.js-compatible vinext runtime
- Vite
- Cloudflare Worker-compatible deployment output
