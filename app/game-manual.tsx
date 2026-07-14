"use client";

import { SURVIVOR_RARITY_DEFINITIONS } from "./survivor-engine";
import { CONTINUITY_EXPERTISE_PRESENTATION } from "./continuity-expertise";
import type { ResearchInputId } from "./research-engine";

export type ManualPageId =
  | "deck"
  | "engineering"
  | "research"
  | "population"
  | "medical"
  | "expeditions"
  | "defense"
  | "armory"
  | "settlement";

export type ManualTopicId = ManualPageId | "salvage" | ResearchInputId;

type ManualStep = {
  title: string;
  detail: string;
};

type ManualSource = {
  label: string;
  detail: string;
};

export type ManualTopic = {
  id: ManualTopicId;
  label: string;
  category: string;
  title: string;
  summary: string;
  steps: readonly ManualStep[];
  sources?: readonly ManualSource[];
  tip?: string;
};

export const MANUAL_PAGE_LABELS: Record<ManualPageId, string> = {
  deck: "Ark",
  engineering: "Foundry",
  research: "Research",
  population: "Personnel",
  medical: "Medical",
  expeditions: "Expeditions",
  defense: "Defense",
  armory: "Armory",
  settlement: "Planet",
};

export const MANUAL_TOPICS: Record<ManualTopicId, ManualTopic> = {
  deck: {
    id: "deck",
    label: "Ark",
    category: "Page guide // command deck",
    title: "Wake the Ark one system at a time",
    summary:
      "The Ark is your visual command deck. Tune its Core, watch the ship awaken, and enter each room only after the current directive brings it online.",
    steps: [
      { title: "Tune the Core", detail: "Click the Axiom Chamber to gain Flux and one Calibration Data per tune." },
      { title: "Follow the active directive", detail: "The strip above the Ark always names the next useful action and shows its progress." },
      { title: "Enter awakened destinations", detail: "The five destinations are Ark, Foundry, Personnel, Research, and Planet. Medical and Armory management belong to Personnel; Expeditions and Defense remain Ark operations." },
      { title: "Read AXIOM's priorities", detail: "The command briefing names up to three useful actions, shows exactly what is missing, names the one action to take, and opens the correct page and sub-panel." },
      { title: "Travel without babysitting", detail: "After Pelagos, departure begins a real corridor journey instead of instantly changing worlds. Open Planet to see route progress and ETA; production, research, training, construction, repair, and Defense all continue online or offline." },
    ],
    sources: [
      { label: "Flux", detail: "Core tunes and Foundry machines create the energy used by almost every early action." },
      { label: "Salvage", detail: "Slowly recovered by the Ark, improved by crew assignments, and awarded by planetary work." },
      { label: "Axioms", detail: "Permanent laws earned by Recalibration. They survive the cycle reset." },
    ],
    tip: "ACTION REQUIRED means make a choice; SAFE TO WAIT means offline progress is enough; AUTOMATIC means the Ark will resolve it under the displayed standing doctrine.",
  },
  engineering: {
    id: "engineering",
    label: "Foundry",
    category: "Page guide // fabrication floor",
    title: "Build the machine that builds the next machine",
    summary:
      "The Foundry owns fabrication, Planetfall directives, Core Protocols, automation, Recalibration, and statistics. Core tuning stays on the Ark.",
    steps: [
      { title: "Buy the first mechanism", detail: "Every machine produces Flux directly - each tier simply produces far more per unit. Your Flux/sec only changes when you buy something; nothing grows on its own." },
      { title: "Keep adjacent tiers balanced", detail: "Groups of 15 across neighboring tiers create Resonance and improve the whole chain." },
      { title: "Complete Planetfall phases", detail: "Directives award Salvage and crew experience while progressively revealing the Foundry's deeper systems." },
      { title: "Allocate utility drones", detail: "After Automated Personnel Logistics, fabricate up to eight permanent support frames. Assign them to researched programs; each active frame diverts 1.25% production and multiplies people instead of replacing them." },
      { title: "Recalibrate when worthwhile", detail: "Recalibration resets the current assembly but awards permanent Axioms and preserves people, research, and restored worlds." },
    ],
    sources: [
      { label: "Machine multiplier", detail: "Comes from purchases, milestones, Resonance, research, world effects, and permanent upgrades." },
      { label: "Balanced links", detail: "Created when neighboring tiers hold enough matched groups of 15." },
      { label: "Lifetime Axioms", detail: "Your permanent total across every Recalibration cycle." },
      { label: "Operational Load", detail: "The unified share of output diverted to Medical care, utility drones, restored-world defense networks, and temporary hostile compromises." },
    ],
    tip: "You do not need to buy everything immediately. The active directive is the safest guide to the next efficient target.",
  },
  research: {
    id: "research",
    label: "Research",
    category: "Page guide // analysis core",
    title: "Move evidence from the Ark into a working route",
    summary:
      "Research is a four-era technology program: Recovery, Integration, Synthesis, then Convergence. Evidence first collects in Ark Supply, and each project passes through Theory, Prototype, Field Validation, and Final Synthesis.",
    steps: [
      { title: "Open the Technology Map", detail: "Choose an available program from the current era. Later eras reveal only when completed prerequisites create a real path to them." },
      { title: "Transfer Ark Supply", detail: "Press +25 beside each required resource to move it into Lattice inventory." },
      { title: "Route the evidence", detail: "Leave AXIOM Assist enabled at first; it connects compatible sources and processors automatically." },
      { title: "Staff Analysis stations", detail: "Researchers and Technicians provide stations. An on-duty level-3 Researcher automates common transfer; an Exceptional level-5 Researcher can safely automate Null Traces." },
      { title: "Match the active stage", detail: "Researchers drive Theory and Synthesis. Prototypes and validation use the branch's relevant on-duty Engineers, Fabricators, Doctors, Teachers, Ecologists, Navigators, or Soldiers." },
      { title: "Validate against the real Ark", detail: "Field Validation gains up to +25% speed from branch-specific evidence such as expeditions, clinical work, defense events, infrastructure, children and elders, and independent colonies. This is a bonus, never a gate." },
      { title: "Build the Robotics branch", detail: "Integration unlocks logistics and medical support. Synthesis adds research routing, expedition support, repair swarms, and planetary construction. Convergence adds interceptor control." },
      { title: "Authorize Bioadaptation carefully", detail: "The Synthesis-era Voluntary Adaptation Charter opens an elective clinic in each adult's Personnel File. Six protocols branch through Medicine, Continuity, planetary work, and Null studies; each protocol has its own research program before anyone may volunteer." },
      { title: "Cross-index the contacts", detail: "Retrograde Material Analysis, Temporal Signal Analysis, Causal Cartography, Causal Threat Projection, and the Returned Origin Hypothesis turn Defense, expedition, and colony evidence into provisional classifications rather than a premature answer." },
      { title: "Develop a research lead", detail: "Integration requires an on-duty level-3 Researcher, Synthesis level 5, and Convergence a level-9 Exceptional Researcher. Levels cap at 10 and demand progressively more XP." },
    ],
    sources: [
      { label: "Ark Supply", detail: "The reserve generated by Core work, machines, survivors, worlds, crises, and Recalibrations." },
      { label: "Lattice", detail: "The smaller inventory already transferred into the Analysis Core and available to active projects." },
      { label: "Throughput", detail: "Limited by routes, power, Analysis stations, stage-specific on-duty expertise, and evidence. Expertise is noticeable but bounded at +35%." },
      { label: "System rewards", detail: "Completed programs unlock Armory frames and laws, improve Medical recovery and power use, strengthen forecasts and repairs, support expeditions, and reduce selected planetary construction costs." },
      { label: "Repeatables", detail: "Later eras add capped field-study cycles for Armory project speed, research speed, and Null evidence yield." },
    ],
    tip: "If Ark Supply is above zero but Lattice reads zero, press the +25 transfer button. That is the most common stalled-research cause.",
  },
  population: {
    id: "population",
    label: "Crew",
    category: "Page guide // human continuity",
    title: "Make the Ark safe, answer signals, then shape the crew",
    summary:
      "Rescue groups never expire. The Ark holds at most 48 people; expand living space and life support, then let AXIOM handle routine staffing while you protect the assignments that matter.",
    steps: [
      { title: "Expand living systems", detail: "Living-space sections cost Flux and Salvage, and assigned Engineers speed construction. Atmosphere, water, nutrition, and medical capacity also expand with Salvage. The Ark's absolute limit is 48 people." },
      { title: "Activate the SOS beacon", detail: "Once the Ark reaches a planetary orbit, the beacon finds a persistent group after 90 seconds." },
      { title: "Dispatch the rescue shuttle", detail: "Spend the listed Salvage to bring the entire group aboard. Each person also brings Biological Samples and Cultural Records." },
      { title: "Let AXIOM staff the Ark", detail: "Adults default to their strongest learned profession. Manual assignments stay locked; Ark Reserve covers absences and performs light maintenance. Optimize All Crew performs a complete reshuffle." },
      { title: "Study a profession", detail: "Adults with an open profession slot can study new work. Standard profiles learn at ×1.00, Notable ×1.25, Exceptional ×1.60, and Anomalous ×2.00." },
    ],
    sources: [
      { label: "Profile rarity", detail: "Colors describe how scarce a recruit's aptitude, adaptability, trait, and archive combination is—not their human worth. Rarity accelerates training and job XP and sets profession capacity (Standard 1, Notable 2, Exceptional 3, Anomalous unlimited)." },
      { label: "Profession levels", detail: "Levels come from XP and create Continuity expertise. Rarity never multiplies that expertise directly." },
      { label: "Operational expertise", detail: "Levels also affect work a healthy, assigned specialist is doing now: research stages, engineering construction, salvage recovery, medicine, defense, and Armory development. A Team Alpha lean trains future specialists; only on-duty expertise produces the craft bonus." },
      { label: "Profile elevation", detail: "Research can permanently recognize a mastered favorite: Standard to Notable requires level 3, Notable to Exceptional level 6, and Exceptional to Anomalous level 9. Axioms and research evidence pay for it; identity and XP are preserved." },
      { label: "Voluntary Bioadaptation", detail: "After the Voluntary Adaptation Charter, an adult may freely choose up to two permanent protocols in their Personnel File. The clinic commits Flux, Axioms, and research evidence, runs offline, and temporarily takes the volunteer off duty. Adaptations support expeditions, research, or defense but never change rarity, count toward Continuity, become a settlement requirement, or make refusal a penalty." },
      { label: "Training slots", detail: "One program can run per slot. Slots grow with population (+1 per 20 people) and the Adaptive Instruction and Clinical Commons research projects, up to 12." },
      { label: "Civilians", detail: "Highly adaptable recruits who can be trained around the exact needs of a future settlement." },
      { label: "Specialists", detail: "Arrive ready for a profession and improve through assigned work. Notable-or-better specialists can cross-train additional professions." },
      { label: "Children and elders", detail: "Rescued family groups may include children and elders. Children attend school, never work or enter missions, and grow into adults after two planetary chapters. Elders may work, but AXIOM automatically places them only in medicine, research, navigation, or education." },
      { label: "Ark protection", detail: "Use Protect for the Ark on a personnel file to keep a favorite or essential specialist off every planetary selection list until you remove the protection." },
      { label: "Expeditions & health", detail: "The Expedition Bay always projects the outcome before launch. Setbacks send crew home wounded (below 40 health = RECOVERING); a projected DISTRESS would strand them at the site. Stranded crews are stable forever - send a rescue party (it can never strand itself) or, only by explicit choice, abandon them to the memorial wall. Nothing in the game kills crew automatically." },
      { label: "Team Alpha", detail: "Appoint a crew leader plus up to three adult officers. Their combined Continuity Expertise becomes a Command Rating that boosts crew-wide study and job XP. A Training Doctrine fills empty study slots from Ark Reserve without pulling anyone off a station." },
    ],
    tip: "Roster order stays chronological. Color and visible labels identify rare profiles without hiding anyone or changing rescue priority.",
  },
  defense: {
    id: "defense",
    label: "Defense",
    category: "Page guide // threat operations",
    title: "Prepare the Ark, then let it defend itself",
    summary:
      "Travel hazards begin on the first interplanetary corridor, Cinder orbit teaches ash defense, and Nox reveals retrograde contacts. Installations, crew, equipment, research, drones, and two independent standing doctrines resolve every incident automatically online or offline.",
    steps: [
      { title: "Build installation Marks", detail: "Shield Arrays carry readiness and reduce injuries; Repair Swarms speed recovery; the Early-Warning Relay extends forecasts; Point-Defense contests debris and hostile craft. Each installation advances from Mark I to IV through one offline project at a time." },
      { title: "Assign defenders", detail: "On-duty Soldier levels raise readiness and interception, Engineer levels add readiness and repair speed, and Navigator levels extend forecast lead time. Experience matters more than headcount." },
      { title: "Develop threat support", detail: "Defensive Forecasting and Causal Threat Projection add visible readiness; Temporal Signal Analysis extends warning; Autonomous Repair Swarms multiply repair speed." },
      { title: "Choose an environmental doctrine", detail: "Brace is safest. Harvest opens collection vanes for better Salvage and telemetry at greater hull risk. Outrun improves the projected margin but recovers little." },
      { title: "Choose a contact doctrine", detail: "Defend is the safe default. Evade guarantees no automatic crew injury for little reward. Intercept exposes defenders for extra recovery. Observe gathers Calibration Data, Null Traces, and Causal Fragments." },
      { title: "Prepare actual people", detail: "Nox contacts may injure eligible on-duty adult defenders. Ready armor reduces wound damage. Wounded crew are removed from duty and protected from further exposure; automatic events never kill them." },
      { title: "Purge targeted compromises", detail: "A failed defense can temporarily siphon Flux, quarantine research, seize one drone program, spoof the beacon, desynchronize the Core, or contaminate the Archive. Purges complete automatically offline and never delete state." },
      { title: "Read the incident report", detail: "Every resolution records its target, margin, injuries, compromise, rewards, and recovery time, so offline results remain explainable." },
      { title: "Build the Causal Archive", detail: "Identified Ark contacts, attacks on restored worlds, Research, expeditions, and colony history are indexed together. The classifications advance from Unknown Contacts to Retrograde Vessels, Causal Interdictors, and provisionally The Returned; each stage grants a small visible readiness, identification, or forecast benefit." },
    ],
    sources: [
      { label: "Location-specific hazards", detail: "Transit produces asteroid, debris, ion, drive, and later Null hazards. Cinder produces ash storms; Nox produces Null shear and ion storms; Vesper produces Null shear and debris fronts. An old forecast is discarded when the Ark changes environment." },
      { label: "Mark economy", detail: "Higher Marks cost sharply more Flux, Salvage, Engineering Models, Schematics, and eventually Null Traces. Mark II-IV also require Defensive Forecasting, Autonomous Repair Swarms, and Causal Threat Projection respectively." },
      { label: "Worst case", detail: "A battered outcome temporarily reduces production by at most 25% while repairs run (six hours maximum, faster with drones and engineers). Damage never stacks deeper." },
      { label: "Null Traces", detail: "The Observe doctrine is the active way to gather Null Traces from Cinder onward." },
      { label: "Causal Fragments", detail: "Identified contacts reveal evidence that they originate from damaged futures and may be trying to prevent something the Ark eventually causes. Some contacts protect civilians or preserve testimony. The Causal Archive calls its final current category The Returned, but the current campaign never proves who they are, whether their future is inevitable, or whether the Ark is the enemy." },
    ],
    tip: "The first corridor hazard waits 45 minutes. A fresh Defense ledger's first orbital hazard waits two hours; later environmental gaps are four to eight hours. First contact waits 90 minutes after hostile operations become possible.",
  },
  medical: {
    id: "medical",
    label: "Medical",
    category: "Page guide // medical bay",
    title: "Admit the hurt, staff the doctors, pay the power",
    summary:
      "Everyone heals slowly on their own — that never stops and costs nothing. The Medical Bay is the fast lane: admitted patients do nothing but heal at a rate driven by Doctor levels. Research can improve recovery and lower the power diverted by each occupied bed.",
    steps: [
      { title: "Admit from the ward", detail: "Anyone below their health cap can be admitted. Admission clears their station: no work, no training, no missions, no founding, no Team Alpha contribution — just healing. Discharge anytime." },
      { title: "Staff the bay with levels", detail: "The care pool is the summed doctor level of on-duty Doctors — one level-6 doctor tends like six level-1s. Care divides across patients, so a crowded bay heals each patient slower." },
      { title: "Mind the diversion", detail: "Each occupied bed diverts 5% of ALL Flux production (capped at 40%). Healing is never about affording a fee — it is about how much of the ship you are willing to power down. People should aim to not get hurt." },
      { title: "Apply medical research", detail: "Clinical Commons, Planetary Epidemiology, and Synthetic Ecosystem Design each improve admitted recovery. The later two also lower the per-patient Flux diversion; the live summary always shows the exact rate." },
      { title: "Perform prosthetic surgery here", detail: "Permanent injuries are repaired only on ADMITTED patients: Prosthetic Fabrication research, a level-5 Doctor on duty, spare medical capacity, and Flux + Models + Bio Samples." },
    ],
    tip: "An overloaded medical life-support envelope halves every healing rate — expand medical capacity before a big expedition push.",
  },
  expeditions: {
    id: "expeditions",
    label: "Expeditions",
    category: "Page guide // expedition command",
    title: "Read the projection, pick the crew, launch",
    summary:
      "Every inhabited world has its own operation board. Crews of 2-4 run surveys, one-time story operations, difficult Continuity work, and repeatable resource routes. Future-world operations stay hidden, and every launch projects its result first.",
    steps: [
      { title: "Read the current-world board", detail: "The Bay shows only the planet currently below the Ark. Survey routes certify terrain; story operations reveal local history; resource routes can be repeated; orange Critical operations are required for Continuity." },
      { title: "Prepare before selecting strength", detail: "Required checks are hard deployment conditions: research, weapons, armor, a qualified specialist, a prior operation, automation, or a voluntary adaptation. Checks with several options accept any listed solution. Recommended checks improve safety but never block launch." },
      { title: "Build the crew", detail: "Each member adds their best profession level. Security specialists level 3+ add +2 strength, Researchers +1, Navigators 3+ shorten the trip. Gear from the Armory auto-equips." },
      { title: "Use research support", detail: "Surface Reconnaissance improves recovered resources. Defensive Forecasting and Specialized Field Loadouts add bounded strength, while the loadout program also improves returns. The projection shows both bonuses before launch." },
      { title: "Respect the projection", detail: "SUCCESS and LEAN are safe. SETBACK sends everyone home wounded. DISTRESS strands the party at the site - launching into either warning takes an extra confirm." },
      { title: "Handle distress calmly", detail: "Stranded crews are stable forever and the signal never expires. Send a rescue party (strength of difficulty-4 extracts cleanly; weaker parties take wounds but still bring everyone home), or - only by explicit choice - abandon them to the memorial wall." },
    ],
    sources: [
      { label: "Outcome bands", detail: "Success at strength >= difficulty; lean within 8 below; setback within 16; distress beyond that. Weapons add strength, armor absorbs wound damage." },
      { label: "XP", detail: "Members earn (60 + 6 x difficulty) XP to their profession, x1.5 when it matches the site's focus, scaled by outcome." },
    ],
    tip: "Missions resolve fully offline. Later planets ask for more kinds of preparation, not merely larger numbers.",
  },
  armory: {
    id: "armory",
    label: "Armory",
    category: "Personnel guide // equipment development",
    title: "Improve six trusted frames instead of collecting clutter",
    summary:
      "The Armory belongs to Personnel because equipment exists to support people. The Ark maintains three weapon frames and three armor frames; Research unlocks them, the forge stocks them, and long-running Mark projects improve every copy of a frame at once.",
    steps: [
      { title: "Unlock the frame", detail: "Threat Operations research unlocks each weapon and armor pattern. Schematics provide knowledge; Engineering Models and Flux manufacture it." },
      { title: "Run Mark projects", detail: "Mark II-IV projects commit Flux, Salvage, Schematics, Models, and eventually Null Traces. Only one runs at once, it continues offline, and completion improves every stocked copy." },
      { title: "Fit one specialization", detail: "Each frame accepts one researched modification. Stabilizers add reliability, Overchargers add power and risk, Sensor Links improve recovery, and Field Medic Kits improve protection." },
      { title: "Check wield levels", detail: "A survivor's best professional level decides what they can carry: Pike 2 / Carbine 4 / Lance 6, Weave 1 / Shell 3 / Frame 5." },
      { title: "Repair after setbacks", detail: "Armor that absorbs a hit loses durability and eventually reads DAMAGED. Repairs cost 40% of the forge price." },
      { title: "Prove and rewrite Armory laws", detail: "Research first proves Pattern Architecture, Recursive Manufacturing, Resonant Weapon Dynamics, and Impossible Material Synthesis. Axioms then make each law permanent." },
    ],
    sources: [
      { label: "Weapons", detail: "Marks add bounded strength rather than exponential damage. A qualified crew and good team composition remain essential." },
      { label: "Armor", detail: "Marks improve mitigation and durability, but cannot remove expedition risk or replace medical preparation." },
      { label: "Health", detail: "Wounded crew (below 40 health) recover at +2/hour, faster with assigned Doctors. Expedition setbacks and Nox-class defense incidents can deal visible, bounded damage." },
    ],
    tip: "Marks, fitted specializations, stocked gear, active projects, and Armory Laws all survive Recalibration and travel between worlds.",
  },
  settlement: {
    id: "settlement",
    label: "Continuity",
    category: "Page guide // planetary continuity",
    title: "Leave only when a world can continue without the Ark",
    summary:
      "Continuity combines Community Readiness, Expertise, infrastructure, supplies, research, surveys, a critical planet-specific field operation, crisis response, and your chosen founders into one departure forecast.",
    steps: [
      { title: "Read the explicit deficits", detail: "Every unmet requirement names the direct fix and any research or equipment substitute." },
      { title: "Complete permanent world work", detail: "Infrastructure, stored supplies, and required research remain completed. Every crisis card lists its Foundry, infrastructure, research, and Flux prerequisites live." },
      { title: "Prove the plan in the field", detail: "Every inhabited planet requires local surveys and one Critical expedition. Open its dossier in the Expedition Bay to see the exact preparation, crew, equipment, and research needed." },
      { title: "Connect world and laboratory", detail: "Completed infrastructure provides Engineering Models and Field Validation evidence. Planetary research can reduce selected construction costs, and independent colonies continue returning Cultural Records and biological reports." },
      { title: "Choose a founding community", detail: "Community Readiness replaces a raw population quota. Every person contributes; children, elders, social Expertise, profession diversity, and completed planetary works increase readiness." },
      { title: "Meet combined Expertise", detail: "Engineering, Medical, Ecology, and other requirements count combined levels, not numbers of job titles. One experienced specialist can contribute several points." },
      { title: "Name and establish the settlement", detail: "Departure becomes available only when every requirement is met. There is no deadline." },
      { title: "Cross the corridor", detail: "Pelagos and later departures begin timed offline travel. Planetfall directives do not advance until orbital arrival, expedition launches pause during the crossing, and the Navigation screen shows the exact ETA and current hazard forecast." },
      { title: "Protect restored worlds", detail: "After Nox contact, every colony gains a persistent defense network. Choose Conservation, Guard, or Fortress upkeep and build Reality Anchors, Shields, Interceptors, Shelters, and Repair Yards. Construction and attacks continue offline." },
    ],
    sources: [
      { label: "Viability", detail: "A readable summary of how close the current world is to independent survival." },
      { label: "Expertise", detail: "Combined profession levels from selected founders. Open any requirement's ‘How this is counted’ row to see its formula and contributors." },
      { label: "Community Readiness", detail: "Each adult contributes 1; each child or elder contributes 2. Medicine, Ecology, Education, and Leadership can add up to 2 more per person. Profession diversity adds up to 4, and completed planetary works add 2 each." },
      { label: "Founding-group limit", detail: "A departure can take at most 24 people, half the Ark's full capacity. Protected personnel are never selectable." },
      { label: "Leadership", detail: "70% of Security level plus 40% of Navigator level, each rounded up. Even a level-one qualification contributes." },
      { label: "Profile Depth", detail: "Cinder requires 2 Notable-or-better founders; Nox requires 4 including 1 Exceptional; Vesper requires 6 including 3 Exceptional. Anomalous counts as Exceptional." },
      { label: "Substitutions", detail: "Research and fabricated equipment prevent unlucky recruitment from hard-locking a world." },
      { label: "Planetary failure", detail: "A breached network creates temporary instability, lost opportunity, and repair load. A restored world, its founders, and completed installations are never deleted." },
    ],
    tip: "Founders remain alive in the colony record after departure. The SOS array guarantees an Exceptional-or-better profile within five quality misses, so Profile Depth can never become a permanent luck wall.",
  },
  salvage: {
    id: "salvage",
    label: "Salvage",
    category: "Resource guide // recovery stores",
    title: "Salvage is the bridge between an empty Ark and its first crew",
    summary:
      "Salvage pays for living-space construction, life-support capacity, rescue shuttles, and later repairs and upgrades. It recovers automatically and never requires a timer challenge.",
    steps: [
      { title: "Wait for base recovery", detail: "The Ark begins with 35 Salvage and automatically recovers 43.2 per hour, including offline time." },
      { title: "Assign recovery expertise", detail: "Fabricator levels and supporting Technician levels raise Salvage recovery. One veteran contributes more than several beginners, within a hard cap." },
      { title: "Keep an Ark Reserve", detail: "Available adults without a station perform light maintenance and recover a smaller amount of Salvage automatically. Automated Personnel Logistics later improves that support without replacing staffed specialists." },
      { title: "Complete planetary work", detail: "Planetfall phase completions and stabilized worlds award extra Salvage caches." },
      { title: "Launch expeditions later", detail: "After enough worlds are secured, Expedition Bay routes return larger Salvage manifests." },
    ],
    sources: [
      { label: "Passive recovery", detail: "Always active, even with no crew aboard." },
      { label: "Crew recovery", detail: "Added by working assignments, not merely by owning a specialist." },
      { label: "Campaign caches", detail: "Awarded when Planetfall work advances and when a world is secured." },
    ],
    tip: "Early on, save enough Salvage to expand every life-support category and still pay the rescue signal's shuttle cost.",
  },
  "calibration-data": {
    id: "calibration-data",
    label: "Calibration Data",
    category: "Research input // CAL",
    title: "Record how the damaged Core responds",
    summary: "Calibration Data comes from operating and observing the Axiom Chamber.",
    steps: [
      { title: "Tune the Core", detail: "Every manual Core tune immediately adds 1 Calibration Data to Ark Supply." },
      { title: "Let instruments observe", detail: "The Ark also records 90 Calibration Data per hour passively." },
      { title: "Transfer it", detail: "Open Evidence Reservoirs and press +25 before a project can consume it." },
    ],
  },
  "engineering-models": {
    id: "engineering-models",
    label: "Engineering Models",
    category: "Research input // ENG",
    title: "Turn fabrication into repeatable system models",
    summary: "Engineering Models are created by building mechanisms and proving infrastructure designs.",
    steps: [
      { title: "Buy Foundry machines", detail: "Every machine purchase adds a small batch, with higher tiers producing slightly more." },
      { title: "Increase Flux production", detail: "Model generation rises passively with the strength of the active fabrication chain." },
      { title: "Complete infrastructure", detail: "Planetary infrastructure projects award larger model batches." },
    ],
  },
  "biological-samples": {
    id: "biological-samples",
    label: "Biological Samples",
    category: "Research input // BIO",
    title: "Biological evidence begins with rescued life",
    summary: "Biological Samples begin with rescued life, then grow through clinical and ecological work rather than raw headcount.",
    steps: [
      { title: "Rescue survivors", detail: "Each rescued person immediately adds 18 Biological Samples to Ark Supply." },
      { title: "Staff living sciences", detail: "On-duty Doctor and Farmer levels generate the strongest passive flow. A small baseline continues offline even when stations change." },
      { title: "Transfer it", detail: "Press +25 in Evidence Reservoirs to move Ark Supply into the Lattice." },
    ],
    tip: "No survivor is harmed or consumed. Samples represent non-destructive clinical and planetary observations.",
  },
  "cultural-records": {
    id: "cultural-records",
    label: "Cultural Records",
    category: "Research input // CUL",
    title: "Every rescued person brings memory the Ark did not possess",
    summary: "Cultural Records come from testimony, teaching material, and recovered civic knowledge.",
    steps: [
      { title: "Rescue survivors", detail: "Each rescued person immediately adds 22 Cultural Records to Ark Supply." },
      { title: "Staff education and analysis", detail: "On-duty Teacher and Researcher levels grow the archive. Children contribute learning records, elders contribute preserved testimony, and Adaptive Instruction increases the educational return." },
      { title: "Hear from restored worlds", detail: "Every independent colony adds a continuing Cultural Records stream. Colony Data Integration strengthens that exchange and makes settlement history part of active research." },
      { title: "Transfer it", detail: "Press +25 in Evidence Reservoirs to move Ark Supply into the Lattice." },
    ],
  },
  schematics: {
    id: "schematics",
    label: "Schematics",
    category: "Research input // SCH",
    title: "Designs the Ark cannot invent — only recover",
    summary:
      "Recovered Schematics fuel the Threat Operations research branch (weapons and armor tiers). Nothing aboard generates them: they arrive only with people and expeditions, which makes them one of the scarcest reservoirs in the game.",
    steps: [
      { title: "Answer SOS signals", detail: "Every rescued group carries schematics in its cargo manifest — richer on later worlds." },
      { title: "Fly expeditions", detail: "Every site pays schematics on return, scaled by the outcome. Surveys are the steady repeatable source." },
      { title: "Spend them on Threat Operations", detail: "Weapon and armor research tiers are priced mostly in schematics. Transfer them into the Lattice like any evidence reservoir." },
    ],
    tip: "Both sources are time-locked — scan cadence and mission clocks — so schematics can't be farmed by idling. Plan the branch around your rescue and expedition rhythm.",
  },
  "null-traces": {
    id: "null-traces",
    label: "Null Traces",
    category: "Research input // NUL",
    title: "Measure absences that should not leave evidence",
    summary: "Null Traces begin accumulating after Cold Wake as the Ark enters later worlds.",
    steps: [
      { title: "Advance beyond Cold Wake", detail: "Later worlds generate a small passive Null signal; deeper campaign progress strengthens it." },
      { title: "Resolve planetary crises", detail: "Each resolved crisis awards a larger batch of Null Traces." },
      { title: "Route carefully", detail: "Null projects often need specialized processors and reveal lore the bootstrap archive omitted." },
    ],
  },
  "axiom-proofs": {
    id: "axiom-proofs",
    label: "Axiom Proofs",
    category: "Research input // AXM",
    title: "Prove which laws survive a rebuilt universe",
    summary: "Axiom Proofs are the research evidence created by Recalibration and permanent physical laws.",
    steps: [
      { title: "Recalibrate", detail: "Every Axiom earned in a Recalibration immediately awards 8 Axiom Proofs." },
      { title: "Keep lifetime Axioms", detail: "Each lifetime Axiom continues producing a small passive proof signal." },
      { title: "Transfer it", detail: "Move Proofs from Ark Supply into the Lattice only when a selected project requires them." },
    ],
  },
};

const RESOURCE_TOPIC_IDS: readonly ManualTopicId[] = [
  "salvage",
  "calibration-data",
  "engineering-models",
  "biological-samples",
  "cultural-records",
  "schematics",
  "null-traces",
  "axiom-proofs",
];

export function HelpTrigger({
  label,
  onClick,
  withLabel = false,
}: {
  label: string;
  onClick: () => void;
  withLabel?: boolean;
}) {
  return (
    <button
      className={`context-help-trigger ${withLabel ? "with-label" : ""}`}
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <span aria-hidden="true">?</span>
      {withLabel ? <strong>Guide</strong> : null}
    </button>
  );
}

export function GameManualDialog({
  topicId,
  availablePages,
  onSelectTopic,
  onClose,
}: {
  topicId: ManualTopicId;
  availablePages: readonly ManualPageId[];
  onSelectTopic: (topicId: ManualTopicId) => void;
  onClose: () => void;
}) {
  const topic = MANUAL_TOPICS[topicId];
  const researchAvailable = availablePages.includes("research");

  return (
    <div className="manual-layer">
      <button className="modal-backdrop" type="button" aria-label="Close field manual" onClick={onClose} />
      <section className="game-manual" role="dialog" aria-modal="true" aria-labelledby="manual-title" aria-describedby="manual-summary">
        <header className="game-manual-header">
          <div>
            <p>AXIOM FIELD MANUAL // CONTEXT LINK</p>
            <h2 id="manual-title">{topic.title}</h2>
            <span id="manual-summary">{topic.summary}</span>
          </div>
          <button className="manual-close" type="button" autoFocus onClick={onClose}>Close</button>
        </header>

        <div className="game-manual-layout">
          <nav className="game-manual-index" aria-label="Unlocked page guides">
            <span>Unlocked pages</span>
            {availablePages.map((pageId) => (
              <button
                className={topicId === pageId ? "is-active" : ""}
                type="button"
                key={pageId}
                onClick={() => onSelectTopic(pageId)}
              >
                <i aria-hidden="true" />
                {MANUAL_PAGE_LABELS[pageId]}
              </button>
            ))}
            <span>Resource index</span>
            {RESOURCE_TOPIC_IDS.filter((resourceId) => resourceId === "salvage" || researchAvailable).map((resourceId) => (
              <button
                className={topicId === resourceId ? "is-active" : ""}
                type="button"
                key={resourceId}
                onClick={() => onSelectTopic(resourceId)}
              >
                <i aria-hidden="true" />
                {MANUAL_TOPICS[resourceId].label}
              </button>
            ))}
          </nav>

          <article className="game-manual-topic">
            <p className="game-manual-category">{topic.category}</p>
            <ol className="game-manual-steps">
              {topic.steps.map((step, index) => (
                <li key={step.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><strong>{step.title}</strong><p>{step.detail}</p></div>
                </li>
              ))}
            </ol>

            {topic.sources && (
              <section className="game-manual-sources" aria-label="Related concepts">
                <h3>What the readouts mean</h3>
                <div>
                  {topic.sources.map((source) => (
                    <article key={source.label}>
                      <strong>{source.label}</strong>
                      <p>{source.detail}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {topicId === "population" && (
              <section className="game-manual-rarity" aria-label="Profile rarity legend">
                <h3>Profile rarity colors</h3>
                <div>
                  {SURVIVOR_RARITY_DEFINITIONS.map((rarity) => (
                    <span className={`crew-rarity-${rarity.id}`} title={rarity.description} key={rarity.id}>
                      <i aria-hidden="true" />
                      <strong>{rarity.label} ×{rarity.learningMultiplier.toFixed(2)}</strong>
                    </span>
                  ))}
                </div>
              </section>
            )}

            {topicId === "settlement" && (
              <section className="game-manual-formulas" aria-label="Continuity expertise formulas">
                <h3>Exact Expertise formulas</h3>
                <div>
                  {Object.entries(CONTINUITY_EXPERTISE_PRESENTATION).map(([id, presentation]) => (
                    <article key={id}><strong>{presentation.label}</strong><p>{presentation.formula}</p></article>
                  ))}
                </div>
              </section>
            )}

            {topic.tip && <aside className="game-manual-tip"><span>AXIOM NOTE</span><p>{topic.tip}</p></aside>}
          </article>
        </div>
      </section>
    </div>
  );
}
