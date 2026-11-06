export type ContactClassificationId =
  | "unknown-contacts"
  | "retrograde-vessels"
  | "causal-interdictors"
  | "the-returned";

export type CausalEvidenceSource =
  | "ark-defense"
  | "planetary-defense"
  | "research"
  | "expedition"
  | "colony";

export type CausalArchiveInput = {
  defenseFragmentIds: readonly string[];
  planetaryFragmentIds: readonly string[];
  completedResearchIds: readonly string[];
  completedExpeditionIds: readonly string[];
  completedWorldIds: readonly string[];
  firstContactResolved: boolean;
  hostileEventsResolved: number;
};

export type CausalEvidenceDefinition = {
  id: string;
  source: CausalEvidenceSource;
  sourceId: string;
  title: string;
  finding: string;
};

export type ContactClassificationDefinition = {
  id: ContactClassificationId;
  label: string;
  code: string;
  threshold: number;
  summary: string;
  operationalBenefit: string;
};

export type CausalArchiveView = {
  activeClassification: ContactClassificationDefinition;
  classifications: readonly (ContactClassificationDefinition & { unlocked: boolean })[];
  recoveredEvidence: readonly CausalEvidenceDefinition[];
  score: number;
  totalEvidence: number;
  nextClassification: ContactClassificationDefinition | null;
  evidenceToNext: number;
  readinessBonus: number;
  identificationBonus: number;
  forecastSeconds: number;
};

export const CONTACT_CLASSIFICATIONS: readonly ContactClassificationDefinition[] = [
  {
    id: "unknown-contacts",
    label: "Unknown Contacts",
    code: "UC-00",
    threshold: 0,
    summary: "Unidentified vessels violate local navigation, but their origin and objective remain unproven.",
    operationalBenefit: "No predictive benefit. Incident evidence is being preserved.",
  },
  {
    id: "retrograde-vessels",
    label: "Retrograde Vessels",
    code: "RV-01",
    threshold: 4,
    summary: "Contact effects repeatedly arrive before the events that caused them.",
    operationalBenefit: "+2 Ark readiness and +1 contact identification.",
  },
  {
    id: "causal-interdictors",
    label: "Causal Interdictors",
    code: "CI-02",
    threshold: 9,
    summary: "Their attacks select the futures restored worlds could create, while repeatedly excluding civilian life from direct fire.",
    operationalBenefit: "+4 Ark readiness, +2 identification, and 2 minutes of forecast analysis.",
  },
  {
    id: "the-returned",
    label: "The Returned",
    code: "TR-03",
    threshold: 15,
    summary: "Recovered language, biology, and authentication patterns are uncomfortably adjacent to the Ark's own descendants. This is a classification, not a conclusion.",
    operationalBenefit: "+6 Ark readiness, +3 identification, and 3 minutes of forecast analysis.",
  },
] as const;

export const CAUSAL_EVIDENCE_DEFINITIONS: readonly CausalEvidenceDefinition[] = [
  { id: "def-contact-before-cause", source: "ark-defense", sourceId: "contact-before-cause", title: "Challenge inversion", finding: "A valid reply preceded AXIOM's challenge." },
  { id: "def-protected-lifeboat", source: "ark-defense", sourceId: "protected-lifeboat", title: "Civilian exclusion", finding: "A firing solution was broken to protect an unarmed lifeboat." },
  { id: "def-returned-navigation", source: "ark-defense", sourceId: "returned-navigation", title: "Origin charts", finding: "Their charts label restored worlds as the source of a future event." },
  { id: "def-ark-casualty-index", source: "ark-defense", sourceId: "ark-casualty-index", title: "Ark casualty index", finding: "The enemy carries casualty projections for Ark histories that never occurred." },
  { id: "def-chronology-wound", source: "ark-defense", sourceId: "chronology-wound", title: "Chronology wound", finding: "Hull damage briefly existed before the weapon discharged." },
  { id: "def-preserved-archive", source: "ark-defense", sourceId: "preserved-archive", title: "Preserved archive", finding: "A boarding probe erased targeting data but copied civilian testimony intact." },
  { id: "def-unfired-salvo", source: "ark-defense", sourceId: "unfired-salvo", title: "Unfired salvo", finding: "A weapon aborted after predicting casualties AXIOM had not yet rescued." },
  { id: "def-voiceprint-descendant", source: "ark-defense", sourceId: "voiceprint-descendant", title: "Inherited voiceprint", finding: "A command voice shares impossible familial markers with the Ark roster." },
  { id: "planet-vector-without-origin", source: "planetary-defense", sourceId: "vector-without-origin", title: "Vector without origin", finding: "A vessel's route begins after its arrival and ends at a world-core anchor." },
  { id: "planet-civilian-exclusion", source: "planetary-defense", sourceId: "civilian-exclusion", title: "Refugee corridor", finding: "A planetary strike aborts when a refugee shuttle crosses its path." },
  { id: "planet-future-authentication", source: "planetary-defense", sourceId: "future-authentication", title: "Future authentication", finding: "The contact answers an Ark cipher dated three centuries ahead." },
  { id: "planet-foundry-reference", source: "planetary-defense", sourceId: "foundry-event-reference", title: "Foundry Event reference", finding: "A damaged packet names an event but omits who caused it and what it destroyed." },
  { id: "planet-anchor-priority", source: "planetary-defense", sourceId: "anchor-priority", title: "Anchor priority", finding: "Every viable colony is ignored until its reality anchor comes online." },
  { id: "planet-evacuation-window", source: "planetary-defense", sourceId: "evacuation-window", title: "Evacuation window", finding: "The enemy opens a safe corridor immediately before attacking infrastructure." },
  { id: "planet-colony-memory", source: "planetary-defense", sourceId: "colony-memory", title: "Colony memory", finding: "A vessel broadcasts the colony's future anthem before its first verse is written." },
  { id: "planet-multiverse-scar", source: "planetary-defense", sourceId: "multiverse-scar", title: "Adjacent absence", finding: "Sensors record a region where neighboring histories appear to have been removed." },
  { id: "research-temporal", source: "research", sourceId: "temporal-signal-analysis", title: "Temporal signature", finding: "Null transmissions can be separated from corrections arriving before their cause." },
  { id: "research-threat", source: "research", sourceId: "causal-threat-projection", title: "Interdiction model", finding: "Attack frequency follows a world's future potential. Its present military value has little effect." },
  { id: "research-material", source: "research", sourceId: "retrograde-material-analysis", title: "Retrograde material", finding: "Recovered matter has a valid composition and no local manufacturing history." },
  { id: "research-cartography", source: "research", sourceId: "causal-cartography", title: "Causal cartography", finding: "Enemy routes connect possible futures. Physical distance barely affects them." },
  { id: "research-returned", source: "research", sourceId: "returned-origin-hypothesis", title: "Returned hypothesis", finding: "The strongest model places the contacts in a future created by restored life. The evidence remains incomplete." },
  { id: "expedition-kestrel", source: "expedition", sourceId: "kestrel-relay", title: "Kestrel reply", finding: "A dead transmitter answers before it is powered." },
  { id: "expedition-palimpsest", source: "expedition", sourceId: "palimpsest-origin", title: "Palimpsest coordinate", finding: "The oldest Foundry coordinate points to a place whose history was overwritten." },
  { id: "expedition-wreckage", source: "expedition", sourceId: "causal-wreckage", title: "Causal wreckage", finding: "A wreck recognizes Ark crew as ancestors while refusing every contemporary date." },
  { id: "colony-pelagos", source: "colony", sourceId: "pelagos", title: "Pelagos continuity", finding: "Restored civilian life produces the first measurable shift in hostile attention." },
  { id: "colony-viridia", source: "colony", sourceId: "viridia", title: "Viridia divergence", finding: "A living biosphere creates futures the Null model cannot collapse into one answer." },
  { id: "colony-cinder", source: "colony", sourceId: "cinder", title: "Cinder escalation", finding: "Industrial recovery is followed by deliberate surveillance of planetary anchors." },
  { id: "colony-nox", source: "colony", sourceId: "nox", title: "Nox recognition", finding: "The contacts respond to a restored world's signal as though recognizing a historical mistake." },
  { id: "colony-vesper", source: "colony", sourceId: "vesper", title: "Vesper contradiction", finding: "The Null Tide recedes from living settlements while its custodians move closer." },
] as const;

const hasEvidence = (definition: CausalEvidenceDefinition, input: CausalArchiveInput) => {
  if (definition.source === "ark-defense") return input.defenseFragmentIds.includes(definition.sourceId);
  if (definition.source === "planetary-defense") return input.planetaryFragmentIds.includes(definition.sourceId);
  if (definition.source === "research") return input.completedResearchIds.includes(definition.sourceId);
  if (definition.source === "expedition") return input.completedExpeditionIds.includes(definition.sourceId);
  return input.completedWorldIds.includes(definition.sourceId);
};

export function getCausalArchive(input: CausalArchiveInput): CausalArchiveView {
  const recoveredEvidence = CAUSAL_EVIDENCE_DEFINITIONS.filter((entry) => hasEvidence(entry, input));
  const contactObserved = input.firstContactResolved || input.hostileEventsResolved > 0;
  const score = recoveredEvidence.length + (contactObserved ? 1 : 0);
  const temporalAnalysis = input.completedResearchIds.includes("temporal-signal-analysis");
  const threatProjection = input.completedResearchIds.includes("causal-threat-projection");
  const returnedHypothesis = input.completedResearchIds.includes("returned-origin-hypothesis");
  const causalWreckage = input.completedExpeditionIds.includes("causal-wreckage");
  const unlocked = CONTACT_CLASSIFICATIONS.map((classification) => {
    if (classification.id === "unknown-contacts") return contactObserved || score > 0;
    if (classification.id === "retrograde-vessels") return contactObserved && score >= classification.threshold;
    if (classification.id === "causal-interdictors") return temporalAnalysis && threatProjection && score >= classification.threshold;
    return returnedHypothesis && causalWreckage && score >= classification.threshold;
  });
  let activeIndex = 0;
  for (let index = 0; index < unlocked.length; index += 1) if (unlocked[index]) activeIndex = index;
  const activeClassification = CONTACT_CLASSIFICATIONS[activeIndex];
  const nextClassification = CONTACT_CLASSIFICATIONS[activeIndex + 1] ?? null;
  return {
    activeClassification,
    classifications: CONTACT_CLASSIFICATIONS.map((classification, index) => ({ ...classification, unlocked: unlocked[index] })),
    recoveredEvidence,
    score,
    totalEvidence: CAUSAL_EVIDENCE_DEFINITIONS.length,
    nextClassification,
    evidenceToNext: nextClassification ? Math.max(0, nextClassification.threshold - score) : 0,
    readinessBonus: [0, 2, 4, 6][activeIndex],
    identificationBonus: [0, 1, 2, 3][activeIndex],
    forecastSeconds: [0, 60, 120, 180][activeIndex],
  };
}
