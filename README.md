# Axiom Foundry

Axiom Foundry is an idle ark-restoration game about rebuilding humanity without deciding what humanity is allowed to become.

AI assistants and collaborators should read [`AI_HANDOFF.md`](./AI_HANDOFF.md) before changing the game. It records the current vision, lore, balance decisions, save rules, roadmap, and Codex/Claude collaboration workflow.

You awaken as AXIOM, the damaged caretaker intelligence of an empty interplanetary Ark. Pelagos is ahead. The ship cannot yet support one person, most decks are dark, and the oldest system log welcomes you back.

## The game loop

1. Tune the Core and rebuild the nested Flux fabrication chain.
2. Restore stable atmosphere, water, nutrition, medical care, and habitation.
3. Reach a fallen planet and activate its SOS beacon.
4. Rescue persistent procedural survivor groups with names, histories, traits, aptitudes, and occasional mystery characters.
5. Let AXIOM staff adults into their strongest work, protect manual assignments, and study new professions while the game is open or closed.
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
- Five-destination navigation (Ark, Foundry, Personnel, Research, Planet), with the Armory and Medical Bay under Personnel and Ark operations revealed only when they matter
- An AXIOM command briefing that translates cross-system blockers into direct next actions without deadlines
- A contextual AXIOM Field Manual with unlocked-page guides, exact resource sources, and in-place question-mark help
- A clear division between the Ark home screen, which owns Core tuning, and the Foundry floor, which owns fabrication and Planetfall operations
- Zero-human Cold Wake opening and a one-time fresh save generation
- Deterministic survivor signals that never expire or fail
- Procedural names, backgrounds, traits, aptitudes, professional roles, and rare authored story hooks
- Stable profile-rarity colors across survivor signals, rosters, Ark previews, and founder selection
- Stable life-support capacity with no hunger, death, punishment timers, or negative offline decay
- A 48-person Ark limit, expandable living space, family groups, children, elders, Ark Reserve, automatic staffing, protected manual assignments, cross-training, callsigns, and offline XP
- A visual Research Lattice with safe auto-routing and an optional manual patch panel
- Six manufactured research inputs, six processors, crew/power limits, and three connected branches
- Research that unlocks habitation, training, medicine, fabrication, settlement planning, and the Null mystery
- A six-frame Personnel Armory with shared auto-equipment, offline Mark projects, researched specializations, scarce material costs, and permanent Axiom manufacturing laws
- Planet-specific Community Readiness, combined Expertise, infrastructure, supply, crisis, and research requirements
- Live crisis-resolution checklists generated from every world's Foundry stages, infrastructure, research, and Flux gates
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
