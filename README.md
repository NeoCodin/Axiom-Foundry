# Axiom Foundry

Axiom Foundry is a cosmic incremental game about building a machine that teaches the universe to multiply. Higher-tier mechanisms manufacture the tiers beneath them, groups of ten create production milestones, and balanced adjacent tiers generate a global Resonance multiplier.

## How to play

1. Tune the Axiom Chamber to create your first Flux.
2. Spend Flux on Vacuum Taps and progressively unlock five higher machine tiers.
3. Buy machines in groups of ten to double their individual output.
4. Balance neighboring tiers in groups of ten to strengthen Resonance.
5. Buy Run Research upgrades to accelerate the current cycle.
6. Reach 10 billion run Flux and Recalibrate for permanent Axioms.
7. Spend Axioms on Legacy upgrades and unlock the Foreman automation system.

Progress saves automatically in browser storage. Returning players receive simulated offline production, initially capped at eight hours.

## Features

- Six-tier nested production chain
- Buy one, buy ten, and buy-max controls
- Per-tier milestones and adjacent-tier Resonance
- Repeatable run upgrades
- Prestige progression through Recalibration and Axioms
- Permanent Legacy upgrades
- Machine and research automation
- Versioned local saves and offline progress
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

The test suite verifies the deployment build, server-rendered game surface, core economy invariants, bulk-purchase equivalence, production consistency, save recovery, and Recalibration behavior.

## Technology

- React 19
- Next.js-compatible vinext runtime
- Vite
- Cloudflare Worker-compatible deployment output
