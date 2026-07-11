# Axiom Foundry

Axiom Foundry is an idle ark-restoration game about rebuilding humanity without deciding what humanity is allowed to become.

You awaken as AXIOM, the damaged caretaker intelligence of an empty interplanetary Ark. Pelagos is ahead. The ship cannot yet support one person, most decks are dark, and the oldest system log welcomes you back.

## The game loop

1. Tune the Core and rebuild the nested Flux fabrication chain.
2. Restore stable atmosphere, water, nutrition, medical care, and habitation.
3. Reach a fallen planet and activate its SOS beacon.
4. Rescue persistent procedural survivor groups with names, histories, traits, aptitudes, and occasional mystery characters.
5. Assign specialists or train adaptable civilians while the game is open or closed.
6. Manufacture science inputs and route them through the configurable Research Lattice.
7. Complete Ark Engineering, Human Continuity, and Null Studies projects.
8. Restore planetary infrastructure, resolve its crisis, and stock an independent settlement.
9. Explicitly choose the trained founders who will remain on the planet.
10. Depart only when the continuity forecast proves the world can survive without the Ark.

The campaign moves through Cold Wake, Pelagos, Viridia, Cinder, Nox, and Vesper. Every restored colony remains in the record, transmits back to the Ark, and provides a modest permanent legacy benefit.

## Major systems

- Six-tier nested incremental production with buy-one, buy-ten, and buy-max controls
- Manual Core tuning that evolves from emergency power into optional anomaly probing
- A physical Ark cross-section that lights and fills as systems and people come online
- Full-width cinematic presentation with a pulsing Axiom Chamber, animated planetary theater, and physical research machinery
- Progressive navigation that reveals Foundry, Research, Life Support, Crew, and Continuity only when each system matters
- A clear division between the Ark home screen, which owns Core tuning, and the Foundry floor, which owns fabrication and Planetfall operations
- Zero-human Cold Wake opening and a one-time fresh save generation
- Deterministic survivor signals that never expire or fail
- Procedural names, backgrounds, traits, aptitudes, professional roles, and rare authored story hooks
- Stable life-support capacity with no hunger, death, punishment timers, or negative offline decay
- Civilian education, specialist cross-training, callsigns, work assignments, and offline XP
- A visual Research Lattice with safe auto-routing and an optional manual patch panel
- Six manufactured research inputs, six processors, crew/power limits, and three connected branches
- Research that unlocks habitation, training, medicine, fabrication, settlement planning, and the Null mystery
- Planet-specific population, expertise, infrastructure, supply, crisis, and research requirements
- Explicit founder selection and detailed viability forecasts with fair research/equipment substitutions
- Persistent colonies, transmissions, legacy bonuses, and contradictory Continuity Protocol records
- Recalibration and permanent Axioms beneath the larger Ark campaign
- Versioned local saves, offline progress, responsive layouts, and reduced-motion support

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validate

```bash
npm run lint
npm test
```

The automated suite covers the deployment build, deterministic survivor generation, life-support safety, offline training, Research Lattice routing, multiplier caps, planetary viability forecasts, founder persistence, save repair, the incremental economy, and server-rendered game surfaces.

## Technology

- React 19
- Next.js-compatible vinext runtime
- Vite
- Cloudflare Worker-compatible deployment output
