export const TOUR_STEPS = [
  {
    target: "welcome",
    eyebrow: "Foreman orientation // 01",
    title: "Welcome to the last Foundry",
    body: "The universe is not dying. It is forgetting how to exist. The Null Tide is stripping gravity, light, and time from one system after another. This starship-sized factory is the last machine that can forge stable physical laws and carry them between worlds.",
    note: "You are its new Foreman. The route now runs world by world: rebuild, repair three phases, carry the proof onward.",
  },
  {
    target: "flux",
    eyebrow: "Core systems // 02",
    title: "Wake the Core and make Flux",
    body: "Flux is unrealized possibility drawn from the edge of broken space. Tune the Core to gather it, then decide whether to spend it on machinery, research, or the current planet's repair operation.",
    note: "Flux and physical machines are local to a planet. Axioms, recovered relics, relays, and blueprints survive every jump.",
  },
  {
    target: "fabrication",
    eyebrow: "Fabrication // 03",
    title: "Watch the Foundry take shape",
    body: "Vacuum Taps produce Flux automatically, and each higher machine manufactures the tier beneath it. The planetary theater grows new towers, arrays, and orbital structures as you build.",
    note: "Every 25 purchases adds a measured efficiency step. Balance neighboring tiers in groups of 15 to create Resonance without runaway compounding.",
  },
  {
    target: "research",
    eyebrow: "Cycle research // 04",
    title: "Shape the current attempt",
    body: "Run Research spends Flux on focused upgrades for the current assembly. It helps solve a planet's physics hazard, but its temporary models are packed away during Planetfall or Recalibration.",
    note: "Permanent relics can change research prices and machine behavior. The Foreman automation system arrives after your first Axiom.",
  },
  {
    target: "missions",
    eyebrow: "Sixfold evacuation // 05",
    title: "Every world is a chapter",
    body: "Each planet has three operations. Construction, sustained Resonance, research, and direct Flux contributions repair visible parts of that world's failing physics.",
    note: "Planetary Directives have no deadline. Progress saves automatically, so you can leave the Foundry idle and return whenever you are ready.",
  },
  {
    target: "recalibration",
    eyebrow: "Portable laws // 06",
    title: "Turn one cycle into an Axiom",
    body: "At 1 trillion run Flux, Recalibrate. Your temporary machines and Run Research collapse, but the pattern they proved condenses into a permanent Axiom. Vesper requires that proof and seals a second copy as its rescue grant.",
    note: "An Axiom is a portable law of physics. It keeps mass, time, and spacecraft consistent inside the Null Tide. Begin at Helion when you are ready; the route will wait for you.",
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
    tag: "The route",
    paragraphs: [
      "Every beacon on the Directive board belongs to a living world. Three repair phases change both the planet and the hazard currently weakening your Foundry.",
      "The Foundry no longer treats rescue as a race. Each operation waits for your return, and every completed world leaves a working relic, a new blueprint, and a relay that shields the route ahead.",
    ],
  },
  {
    title: "Why the Foundry rebuilds",
    tag: "Planetfall protocol",
    paragraphs: [
      "The Foundry cannot carry a planet-sized physical assembly through an unstable jump. At Planetfall, temporary machines and Run Research are translated into a compact landing cache while blueprints, Axioms, relays, and recovered relics remain aboard.",
      "This is not forgotten progress. Each world unlocks a deeper fabrication tier, each rescue weakens future hazards, and each Axiom makes the next reconstruction more capable. The repeated rebuild is how one proven chain becomes portable.",
    ],
  },
  {
    title: "The route remembers",
    tag: "Consequences",
    paragraphs: [
      "Helion's lens strengthens manual alignment. Pelagos improves the Phase Coil. Cinderwake sharpens Resonance. Ilyra reduces research loss. Orison seeds every future assembly. These are not trophies; they alter the machine that reaches Vesper.",
      "Every finished chapter brings another world into the final route. When Vesper's corridor opens, the Concordance can cross together with a complete record of how each rescue changed the Foundry.",
    ],
  },
] as const;
