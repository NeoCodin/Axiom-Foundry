# Human Playtest Protocol

Automated simulation proves that Axiom Foundry is completable. It cannot prove
that the campaign is understandable, memorable, or satisfying. Use this short
protocol before changing late-game costs or adding another permanent system.

## Test route

Run a fresh save from Cold Wake through the first two completed Cinder
expeditions. Do not coach the player unless they are unable to proceed for ten
minutes. Ask them to think aloud.

Record these milestones using the in-game play-time statistic:

1. First Core tune
2. First machine purchase
3. Foundry discovery
4. First active research project
5. Pelagos orbit
6. First survivor signal and rescue
7. First completed training program
8. First Recalibration
9. First colony departure
10. First expedition
11. First forged armory item
12. First Defense Grid forecast

## What to observe

For every session, record:

- What the player believed their current goal was
- Whether the Ark command briefing matched that belief
- Every resource whose source they could not name
- Every time they opened three or more pages searching for one action
- Every facility that appeared before they understood why it mattered
- Every wait that felt anticipatory versus empty
- Which survivor they remembered without checking the roster
- Whether returning after a break made their next action obvious

## Success criteria

- The player can state one useful next action within 20 seconds of returning.
- No required resource remains unexplained after opening its contextual guide.
- Pelagos introduces no more than one unfamiliar permanent system at once.
- Cinder teaches Expeditions before Armory and Armory before the first storm.
- A blocked Continuity requirement can be traced to its remedy in one click
  from the Ark priority board.
- No wait longer than one play session lacks a visible intermediate goal.

## Balance rule

Do not rebalance from total completion time alone. First identify whether a
slow milestone is a meaningful anticipation period, a comprehension problem,
or an economy wall. Change costs only for the third case.

## Mechanical pacing audit — July 14, 2026

The Research v2 implementation includes an automated fresh-state audit from
Cold Wake through Cinder. It recursively follows every campaign research
prerequisite and currently verifies all of the following:

- The route contains nine required programs and remains inside the Recovery
  and Integration eras; Synthesis and Convergence do not gate the opening.
- No required opening program consumes expedition-only Recovered Schematics or
  recalibration-only Axiom Proofs.
- At conservative staffed-Core throughput, no active opening program contains
  more than 100 minutes of Core work. Evidence collection continues in
  parallel rather than extending that into a single opaque timer.
- The first Null Studies gate is obtainable from the Cold Wake cache plus
  Pelagos production in under eight hours at minimum intended staffing.
- A regression test enforces those ceilings whenever research costs or campaign
  requirements change.

This is a mechanical wall check, not a replacement for the think-aloud human
session above. The July 14 browser walkthrough was interrupted before it could
produce reliable comprehension notes; real idle waits also cannot be honestly
compressed into browser automation.
