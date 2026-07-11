export const TOUR_STEPS = [
  {
    target: "welcome",
    eyebrow: "Foreman orientation // 01",
    title: "Welcome to the last Foundry",
    body: "The universe is not dying. It is forgetting how to exist. The Null Tide is stripping gravity, light, and time from one system after another. This starship-sized factory is the last machine that can forge stable physical laws and carry them between worlds.",
    note: "You are its new Foreman. Build the chain. Prove the laws. Reach each planet before its final signal goes dark.",
  },
  {
    target: "flux",
    eyebrow: "Core systems // 02",
    title: "Wake the Core and make Flux",
    body: "Flux is unrealized possibility drawn from the edge of broken space. Tune the Core to gather it, then spend Flux on machines and research. Your first goal is 10 Flux for a Vacuum Tap.",
    note: "Flux is temporary energy. What you eventually prove with it can become permanent.",
  },
  {
    target: "fabrication",
    eyebrow: "Fabrication // 03",
    title: "Teach the machine to multiply",
    body: "Vacuum Taps produce Flux automatically. Every higher machine manufactures the tier beneath it, and every ten purchased machines doubles that tier's output.",
    note: "Keep neighboring tiers balanced in groups of ten. Their agreement creates Resonance, multiplying the entire Foundry.",
  },
  {
    target: "research",
    eyebrow: "Cycle research // 04",
    title: "Shape the current attempt",
    body: "Run Research spends Flux on powerful upgrades for this cycle. These discoveries disappear during Recalibration, so use them to push toward the next breakthrough.",
    note: "The Foreman automation system arrives after your first Axiom.",
  },
  {
    target: "missions",
    eyebrow: "Sixfold evacuation // 05",
    title: "Worlds are waiting",
    body: "Each Planetary Directive is a distress signal with an active-play deadline. Complete its goal to deliver an anchor or evacuation route before local physics collapses.",
    note: "If time expires, that planet is recorded as lost—but your Foundry progress is never erased. Quest clocks pause while the game is closed.",
  },
  {
    target: "recalibration",
    eyebrow: "Portable laws // 06",
    title: "Turn one cycle into an Axiom",
    body: "At 10 billion run Flux, Recalibrate. Your temporary machines and Run Research collapse, but the pattern they proved condenses into a permanent Axiom.",
    note: "An Axiom is a portable law of physics. It keeps mass, time, and spacecraft consistent inside the Null Tide. Select Begin rescues when you are ready—the first planetary clock starts then.",
  },
] as const;

export const LORE_ENTRIES = [
  {
    title: "The universe forgot",
    tag: "The Null Tide",
    paragraphs: [
      "The first collapse was mistaken for an equipment failure. On Lyrix, shadows appeared before the objects that cast them. Hours later, gravity released the oceans and the planet came apart without an explosion.",
      "The phenomenon spreads along no natural path. Scientists named it the Null Tide because it leaves no radiation, wreckage, or reliable history—only regions where the universe no longer agrees on what is true.",
    ],
  },
  {
    title: "Foundry at the edge",
    tag: "Your vessel",
    paragraphs: [
      "The Concordance built the Axiom Foundry around the lens of a collapsed star. It is factory, observatory, and ark: a machine able to discover physical laws, prove them through repetition, and carry those proofs into unstable space.",
      "Every fabrication cycle expands the pocket of reality the Foundry can protect. If it grows powerful enough, it may carry the surviving fleets beyond the Tide itself.",
    ],
  },
  {
    title: "Flux: the energy of almost",
    tag: "Primary resource",
    paragraphs: [
      "At the boundary of the Null Tide, countless possible outcomes fail to become real. Their discarded energy gathers as Flux.",
      "The Core aligns those possibilities into a current the Foundry can use. Flux is powerful but temporary; left unshaped, it dissolves back into uncertainty.",
    ],
  },
  {
    title: "Axioms: laws we can carry",
    tag: "Permanent resource",
    paragraphs: [
      "An ordinary axiom is a statement accepted as fundamentally true. The Foundry creates physical ones: laws tested by billions of repeated operations until local space cannot contradict them.",
      "An Axiom kernel lets a vessel carry certainty with it—mass attracts mass, cause comes before effect, and a hull remains one hull. Axioms are not fuel for space travel. They are what make space travel possible after the universe begins to break.",
    ],
  },
  {
    title: "The Resonant Chain",
    tag: "Why balance matters",
    paragraphs: [
      "One machine repeating an operation makes a claim. A synchronized chain repeating it at every scale makes a proof.",
      "When neighboring fabrication tiers reach harmony, their patterns reinforce one another. The crew calls this Resonance. The universe calls it evidence.",
    ],
  },
  {
    title: "Why we Recalibrate",
    tag: "Prestige protocol",
    paragraphs: [
      "No temporary configuration can become a permanent law. To complete a proof, the Foundry deliberately collapses its active machinery and compares everything the cycle produced.",
      "The machines are lost, but their shared pattern condenses into an Axiom. Recalibration is not starting over. It is turning one universe's worth of work into something the next universe cannot take away.",
    ],
  },
  {
    title: "The Planetary Ledger",
    tag: "The stakes",
    paragraphs: [
      "Every beacon on the Directive board belongs to a living world. Its timer measures how long local physics is expected to hold. Complete the directive and the Foundry can send an anchor, open an evacuation corridor, or restore the planet's failing laws.",
      "Miss the deadline and the world is lost. The name remains in the Ledger. The purpose of the Foundry is not to save everything—it is to make every cycle strong enough to save more than the last.",
    ],
  },
] as const;
