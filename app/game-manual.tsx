"use client";

import { useMemo, useState } from "react";

import { SURVIVOR_RARITY_DEFINITIONS } from "./survivor-engine";
import { CONTINUITY_EXPERTISE_PRESENTATION } from "./continuity-expertise";
import type { ResearchInputId } from "./research-engine";
import type { CommandPriority } from "./command-priorities";

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
    category: "Page guide · command deck",
    title: "Wake the Ark one system at a time",
    summary:
      "You are AXIOM, the distributed intelligence inside the Ark. Cold Wake begins on one focused Law-Heart, then gradually restores access to the rest of your ship.",
    steps: [
      { title: "Understand where AXIOM exists", detail: "Your central process runs in the Caretaker Core. The Ark is your physical body: cameras and receivers provide senses, while powered rooms and automated systems let you act." },
      { title: "Respect the people aboard", detail: "Crew remain independent people. Your controls issue assignments and ship policy. Later utility drones become temporary extensions of your reach." },
      { title: "Strike the Law Press", detail: "The opening machine is completely still. Each click drives one clamp strike; earned Vacuum Taps install visible banks, carry Flux packets, and gradually synchronize the mechanism." },
      { title: "Teach the first repetition", detail: "Vacuum Taps reveal after a few manual alignments. They repeat the smallest Core motion while the game is open or closed." },
      { title: "Read the first Continuity forecast", detail: "After three portable laws, Planet appears as a forecast-not an immediate exit. Review it to authorize the next single restoration step." },
      { title: "Forge three laws", detail: "Cold Wake introduces Recalibration directly on the Core Deck. Containment keeps the hull intact, Conservation protects its reserves, and Transit keeps departure connected to arrival." },
      { title: "Commission the Ark in stages", detail: "Wake one Foundry machine line, then restore navigation and the empty life-support reserve from Ark Command. Only after those steps does the saved Pelagos approach reserve appear." },
      { title: "Follow the active directive", detail: "The strip above the Ark always names the next useful action and shows its progress. Nothing in Cold Wake has a deadline." },
      { title: "Enter awakened destinations", detail: "Foundry arrives during Cold Wake. Pelagos begins with the familiar Ark, Foundry, and Planet views; Personnel opens after the first rescue. Research waits for Viridia, where Pelagos records and a living biosphere give the Analysis Core a clear purpose." },
      { title: "Read AXIOM's priorities", detail: "The command briefing names up to three useful actions, shows exactly what is missing, names the one action to take, and opens the correct page and sub-panel." },
      { title: "Travel between stars", detail: "Each destination orbits a different star. After Pelagos, the Ark crosses a folded Axiom corridor. Continuity shows route progress and arrival time. Ark systems keep working during travel and while the game is closed." },
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
    category: "Page guide · fabrication floor",
    title: "Build the machine that builds the next machine",
    summary:
      "The Foundry keeps the interactive Law-Heart on the left and every unlocked fabrication system in one tabbed console on the right. Continuity owns every planetary directive and departure requirement.",
    steps: [
      { title: "Strike the Law-Heart", detail: "The Foundry is the only page where the Law-Heart produces manual Flux. The Ark's Axiom Chamber is a read-only status monitor." },
      { title: "Buy the first mechanism", detail: "Every machine produces Flux directly-each tier simply produces far more per unit. Your Flux/sec only changes when you build or improve something; nothing grows on its own." },
      { title: "Keep adjacent tiers balanced", detail: "Groups of 15 across neighboring tiers create Resonance and improve the whole chain." },
      { title: "Follow Continuity separately", detail: "When a world needs engineering work, Continuity names the requirement and sends you here. The Foundry does not repeat the planetary plan." },
      { title: "Allocate utility drones", detail: "After Automated Personnel Logistics, fabricate up to eight support frames. Assign them to researched programs. Each active frame diverts 1.25% of production and improves qualified crew work." },
      { title: "Compile a Core Protocol", detail: "Protocols are temporary cycle configurations with three meaningful Marks. Pulse Geometry favors active strikes, Flow Compression improves the whole idle stream, Harmonic Gearing specializes upper tiers, and Resonant Mesh rewards balanced links." },
      { title: "Save an automation blueprint", detail: "Each Protocol card stores an optional target Mark. After Recalibration, Protocol routing buys only those remembered Marks; it never chooses an arbitrary build for you." },
      { title: "Recalibrate when worthwhile", detail: "Recalibration resets the current assembly but awards permanent Axioms and preserves people, research, and restored worlds. Every additional Axiom forged on the same world requires five times the previous proof threshold." },
      { title: "Cross a stellar phase gate", detail: "The Lawheart saturates before its 6th, 12th, and 24th Lifetime Axiom. Complete Resonance Stabilization, Axiomatic Stellarization, and Convergence Envelope in Axiom Theory to prove the next star phase before Recalibration can forge beyond each boundary." },
      { title: "Allocate the Legacy Matrix", detail: "Lifetime Axiom milestones reveal nine total Matrix Capacity slots. Assign them across three permanent three-Mark branches without spending Axioms. Recalibration opens a free reallocation window." },
    ],
    sources: [
      { label: "Machine multiplier", detail: "Comes from purchases, milestones, Resonance, research, world effects, and permanent upgrades." },
      { label: "Balanced links", detail: "Created when neighboring tiers hold enough matched groups of 15." },
      { label: "Lifetime Axioms", detail: "Your permanent total across every Recalibration cycle. The current world's proof ladder is separate and makes repeated Axioms progressively harder." },
      { label: "Stellar Phase Gate", detail: "A Research boundary at 6, 12, and 24 Lifetime Axioms. A saturated Lawheart keeps producing Flux normally, but cannot forge the next Axiom until its named Axiom Theory project is complete." },
      { label: "Matrix Capacity", detail: "Permanent slots earned at specific Lifetime Axiom milestones. Capacity is allocated, not purchased, and cannot grow beyond nine." },
      { label: "Operational Load", detail: "The unified share of output diverted to Medical care, utility drones, restored-world defense networks, and temporary hostile compromises." },
    ],
    tip: "You do not need to buy everything immediately. The active directive is the safest guide to the next efficient target.",
  },
  research: {
    id: "research",
    label: "Research",
    category: "Page guide · analysis core",
    title: "Choose one question and make its evidence move",
    summary:
      "The Active Project screen shows the question loaded into the Analysis Core. Gather evidence through Ark activity, load it into Lattice reservoirs, and route it through four research stages.",
    steps: [
      { title: "Choose the Ark's question", detail: "Open the Technology Map, inspect one available program, then begin it. Later eras reveal only when completed prerequisites create a real path to them." },
      { title: "Read Active Project", detail: "The center visual appears only while a program is loaded. It answers what is being studied, whether evidence is moving, and what exact condition is holding progress." },
      { title: "Transfer Ark Supply", detail: "Open Lattice and press Load beside each required resource to move it into the machine. Ark Supply and loaded reservoirs are deliberately separate." },
      { title: "Let AXIOM route safely", detail: "Evidence routing is automatic. Bright packets are moving evidence; a broken red conduit points to an empty required reservoir." },
      { title: "Staff Analysis stations", detail: "Researchers and Technicians provide stations. An on-duty level-3 Researcher automates common transfer; an Exceptional level-5 Researcher can safely automate Null Traces." },
      { title: "Match the active stage", detail: "Researchers drive Theory and Synthesis. Prototypes and validation use the branch's relevant on-duty Engineers, Fabricators, Doctors, Teachers, Ecologists, Navigators, or Soldiers." },
      { title: "Validate against the real Ark", detail: "Field Validation gains up to +25% speed from branch-specific evidence such as expeditions, clinical work, defense events, infrastructure, children and elders, and independent colonies. This is a bonus, never a gate." },
      { title: "Build the Robotics branch", detail: "Integration unlocks logistics and medical support. Synthesis adds research routing, expedition support, repair swarms, and planetary construction. Convergence adds interceptor control." },
      { title: "Authorize Bioadaptation carefully", detail: "The Synthesis-era Voluntary Adaptation Charter opens an elective clinic in each adult's Personnel File. Six protocols branch through Medicine, Continuity, planetary work, and Null studies; each protocol has its own research program before anyone may volunteer." },
      { title: "Cross-index the contacts", detail: "Late Null Studies combines evidence from Defense, expeditions, and colonies. Each project improves the Ark's working classification while leaving the final origin unresolved." },
      { title: "Develop a research lead", detail: "Integration requires an on-duty level-3 Researcher, Synthesis level 5, and Convergence a level-9 Exceptional Researcher. Levels cap at 10 and demand progressively more XP." },
    ],
    sources: [
      { label: "Law-Heart", detail: "A physics press that stabilizes local rules. Its reach includes gravity, motion, conservation, and causality." },
      { label: "Ark Supply", detail: "The reserve generated by Core work, machines, survivors, worlds, crises, and Recalibrations." },
      { label: "Lattice", detail: "The smaller inventory already transferred into the Analysis Core and available to active projects." },
      { label: "Era meter", detail: "Completed discoveries divided by total discoveries in the selected era. It is separate from the progress of the active project." },
      { label: "Throughput", detail: "Limited by routes, power, Analysis stations, stage-specific on-duty expertise, and evidence. Expertise is noticeable but bounded at +35%." },
      { label: "System rewards", detail: "Completed programs unlock Armory frames and laws, improve Medical recovery and power use, strengthen forecasts and repairs, support expeditions, and reduce selected planetary construction costs." },
      { label: "Repeatables", detail: "Later eras add capped field-study cycles for Armory project speed, research speed, and Null evidence yield." },
    ],
    tip: "If Ark Supply is above zero but a loaded reservoir reads zero, use its Load button. That is the most common stalled-research cause.",
  },
  population: {
    id: "population",
    label: "Crew",
    category: "Page guide · human continuity",
    title: "Make the Ark safe, answer signals, then shape the crew",
    summary:
      "Rescue groups never expire. The Ark holds at most 48 people; expand living space and life support, then let AXIOM handle routine staffing while you protect the assignments that matter.",
    steps: [
      { title: "Expand living systems", detail: "Living-space sections cost Flux and Salvage, and assigned Engineers speed construction. Atmosphere, water, nutrition, and medical capacity also expand with Salvage. The Ark's absolute limit is 48 people." },
      { title: "Restore the receiver", detail: "Pelagos Continuity begins with one operation at a time: build 10 new Vacuum Taps for the orbital receiver, then prepare 2 living spaces and raise Atmosphere, Water, Nutrition, and Medical capacity to at least 2." },
      { title: "Authorize first contact", detail: "Return to Continuity to authorize the SOS carrier. It decodes a persistent group after 90 seconds, including while the game is closed, and the first rescue is dispatched from the same sequence." },
      { title: "Learn Personnel gradually", detail: "The first rescue opens only the Crew Roster. Rescue & Support, Command, and the Medical Bay appear later as Pelagos creates a reason to use each one. The Armory waits until Cinder-era threats." },
      { title: "Dispatch the rescue shuttle", detail: "Spend the listed Salvage to bring the entire group aboard. Each person also brings Biological Samples and Cultural Records." },
      { title: "Let AXIOM staff the Ark", detail: "Adults default to their strongest learned profession. Manual assignments stay locked; Ark Reserve covers absences and performs light maintenance. Optimize All Crew performs a complete reshuffle." },
      { title: "Study a profession", detail: "Adults with an open profession slot can study new work. Standard profiles learn at ×1.00, Notable ×1.25, Exceptional ×1.60, and Anomalous ×2.00." },
    ],
    sources: [
      { label: "Profile rarity", detail: "Colors describe how scarce a recruit's aptitude, adaptability, trait, and archive combination is-not their human worth. Rarity accelerates training and job XP and sets profession capacity (Standard 1, Notable 2, Exceptional 3, Anomalous unlimited)." },
      { label: "Profession levels", detail: "Levels come from XP and create Continuity expertise. Rarity never multiplies that expertise directly." },
      { label: "Operational expertise", detail: "Healthy, assigned specialists improve relevant Ark work. Higher profession levels provide a larger bonus. Team Alpha doctrine trains future specialists, while current assignments produce the active bonus." },
      { label: "Profile elevation", detail: "Research can permanently recognize a mastered favorite: Standard to Notable requires level 3, Notable to Exceptional level 6, and Exceptional to Anomalous level 9. Axioms and research evidence pay for it; identity and XP are preserved." },
      { label: "Voluntary Bioadaptation", detail: "The Voluntary Adaptation Charter lets an adult choose up to two permanent protocols. Treatment uses Flux, Axioms, and research evidence, and runs offline. Participation is optional and has no effect on rarity, Continuity, or settlement eligibility." },
      { label: "Training slots", detail: "One program can run per slot. Slots grow with population (+1 per 20 people) and the Adaptive Instruction and Clinical Commons research projects, up to 12." },
      { label: "Civilians", detail: "Highly adaptable recruits who can be trained around the exact needs of a future settlement." },
      { label: "Specialists", detail: "Arrive ready for a profession and improve through assigned work. Notable-or-better specialists can cross-train additional professions." },
      { label: "Children and elders", detail: "Rescued families may include children and elders. Children attend school and become adults after two planetary chapters. Elders may work in medicine, research, navigation, or education." },
      { label: "Ark protection", detail: "Use Protect for the Ark on a personnel file to keep a favorite or essential specialist off every planetary selection list until you remove the protection." },
      { label: "Expeditions & health", detail: "The Bay projects each outcome before launch. A setback wounds the crew. Distress strands them safely at the site until you send a rescue party or choose a memorial outcome. Automatic events cannot kill crew." },
      { label: "Team Alpha", detail: "Appoint a crew leader plus up to three adult officers. Their combined Continuity Expertise becomes a Command Rating that boosts crew-wide study and job XP. A Training Doctrine fills empty study slots from Ark Reserve without pulling anyone off a station." },
    ],
    tip: "Roster order stays chronological. Color and visible labels identify rare profiles without hiding anyone or changing rescue priority.",
  },
  defense: {
    id: "defense",
    label: "Defense",
    category: "Page guide · threat operations",
    title: "Prepare the Ark, then let it defend itself",
    summary:
      "Travel introduces environmental hazards. Cinder teaches orbital defense, and Nox reveals retrograde contacts. Prepare the Ark and choose standing orders; incidents then resolve automatically online or offline.",
    steps: [
      { title: "Build installation Marks", detail: "Shield Arrays carry readiness and reduce injuries; Repair Swarms speed recovery; the Early-Warning Relay extends forecasts; Point-Defense contests debris and hostile craft. Each installation advances from Mark I to IV through one offline project at a time." },
      { title: "Assign defenders", detail: "On-duty Soldier levels raise readiness and interception, Engineer levels add readiness and repair speed, and Navigator levels extend forecast lead time. Experience matters more than headcount." },
      { title: "Develop threat support", detail: "Defensive Forecasting and Causal Threat Projection add visible readiness; Temporal Signal Analysis extends warning; Autonomous Repair Swarms multiply repair speed." },
      { title: "Choose an environmental doctrine", detail: "Brace is safest. Harvest opens collection vanes for better Salvage and telemetry at greater hull risk. Outrun improves the projected margin but recovers little." },
      { title: "Choose a contact doctrine", detail: "Defend is the safe default. Evade guarantees no automatic crew injury for little reward. Intercept exposes defenders for extra recovery. Observe gathers Calibration Data, Null Traces, and Causal Fragments." },
      { title: "Prepare actual people", detail: "Nox contacts may injure eligible on-duty adult defenders. Ready armor reduces wound damage. Wounded crew are removed from duty and protected from further exposure; automatic events never kill them." },
      { title: "Purge targeted compromises", detail: "A failed defense can temporarily siphon Flux, quarantine research, seize one drone program, spoof the beacon, desynchronize the Core, or contaminate the Archive. Purges complete automatically offline and never delete state." },
      { title: "Read the incident report", detail: "Every resolution records its target, margin, injuries, compromise, rewards, and recovery time, so offline results remain explainable." },
      { title: "Build the Causal Archive", detail: "The Archive combines contact reports with research and colony evidence. New evidence changes the working classification and grants a small operational benefit." },
    ],
    sources: [
      { label: "Location-specific hazards", detail: "Transit produces asteroid, debris, ion, drive, and later Null hazards. Cinder produces ash storms; Nox produces Null shear and ion storms; Vesper produces Null shear and debris fronts. An old forecast is discarded when the Ark changes environment." },
      { label: "Mark economy", detail: "Higher Marks cost sharply more Flux, Salvage, Engineering Models, Schematics, and eventually Null Traces. Mark II-IV also require Defensive Forecasting, Autonomous Repair Swarms, and Causal Threat Projection respectively." },
      { label: "Worst case", detail: "A battered outcome temporarily reduces production by at most 25% while repairs run (six hours maximum, faster with drones and engineers). Damage never stacks deeper." },
      { label: "Null Traces", detail: "The Observe doctrine is the active way to gather Null Traces from Cinder onward." },
      { label: "Causal Fragments", detail: "Fragments suggest that the contacts come from damaged futures and fear something the Ark may cause. Their actions sometimes protect civilians. The current campaign leaves their identity and the Ark's guilt unresolved." },
    ],
    tip: "The first corridor hazard waits 45 minutes. A fresh Defense ledger's first orbital hazard waits two hours; later environmental gaps are four to eight hours. First contact waits 90 minutes after hostile operations become possible.",
  },
  medical: {
    id: "medical",
    label: "Medical",
    category: "Page guide · medical bay",
    title: "Admit the hurt, staff the doctors, pay the power",
    summary:
      "Everyone recovers slowly at no cost. The Medical Bay speeds recovery using on-duty Doctor levels. Research can improve care and reduce the power used by occupied beds.",
    steps: [
      { title: "Admit from the ward", detail: "Anyone below their health cap can be admitted. A patient leaves all duties while healing and can be discharged at any time." },
      { title: "Staff the bay with levels", detail: "Add the levels of all on-duty Doctors to get the care pool. Care divides across patients, so crowded wards heal each person more slowly." },
      { title: "Mind the diversion", detail: "Each occupied bed diverts 5% of total Flux production, capped at 40%. The cost is reduced ship output during treatment." },
      { title: "Apply medical research", detail: "Clinical Commons, Planetary Epidemiology, and Synthetic Ecosystem Design each improve admitted recovery. The later two also lower the per-patient Flux diversion; the live summary always shows the exact rate." },
      { title: "Perform prosthetic surgery here", detail: "Permanent injuries are repaired only on ADMITTED patients: Prosthetic Fabrication research, a level-5 Doctor on duty, spare medical capacity, and Flux + Models + Bio Samples." },
    ],
    tip: "An overloaded medical life-support envelope halves healing rates. Expand medical capacity before a difficult expedition.",
  },
  expeditions: {
    id: "expeditions",
    label: "Expeditions",
    category: "Page guide · expedition command",
    title: "Read the projection, pick the crew, launch",
    summary:
      "Every inhabited world has its own operation board. Crews of 2-4 run surveys, one-time story operations, difficult Continuity work, and repeatable resource routes. Future-world operations stay hidden, and every launch projects its result first.",
    steps: [
      { title: "Read the current-world board", detail: "The Bay shows only the planet currently below the Ark. Survey routes certify terrain; story operations reveal local history; resource routes can be repeated; orange Critical operations are required for Continuity." },
      { title: "Prepare the mission", detail: "Required checks must be complete before launch. A check may ask for research, equipment, a specialist, prior field work, automation, or an adaptation. Recommended checks improve the projected result." },
      { title: "Build the crew", detail: "Each member adds their best profession level. Security specialists level 3+ add +2 strength, Researchers +1, Navigators 3+ shorten the trip. Gear from the Armory auto-equips." },
      { title: "Use research support", detail: "Surface Reconnaissance improves recovered resources. Defensive Forecasting and Specialized Field Loadouts add bounded strength, while the loadout program also improves returns. The projection shows both bonuses before launch." },
      { title: "Respect the projection", detail: "SUCCESS and LEAN are safe. SETBACK sends everyone home wounded. DISTRESS strands the party at the site - launching into either warning takes an extra confirm." },
      { title: "Handle distress calmly", detail: "Stranded crews are stable forever and the signal never expires. Send a rescue party (strength of difficulty-4 extracts cleanly; weaker parties take wounds but still bring everyone home), or - only by explicit choice - abandon them to the memorial wall." },
    ],
    sources: [
      { label: "Outcome bands", detail: "Success at strength >= difficulty; lean within 8 below; setback within 16; distress beyond that. Weapons add strength, armor absorbs wound damage." },
      { label: "XP", detail: "Members earn (60 + 6 x difficulty) XP to their profession, x1.5 when it matches the site's focus, scaled by outcome." },
    ],
    tip: "Missions resolve fully offline. Later planets introduce new kinds of preparation alongside higher difficulty.",
  },
  armory: {
    id: "armory",
    label: "Armory",
    category: "Personnel guide · equipment development",
    title: "Improve six trusted equipment frames",
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
      { label: "Weapons", detail: "Marks add a bounded amount of strength. Crew expertise and team composition remain essential." },
      { label: "Armor", detail: "Marks improve mitigation and durability, but cannot remove expedition risk or replace medical preparation." },
      { label: "Health", detail: "Wounded crew (below 40 health) recover at +2/hour, faster with assigned Doctors. Expedition setbacks and Nox-class defense incidents can deal visible, bounded damage." },
    ],
    tip: "Marks, fitted specializations, stocked gear, active projects, and Armory Laws all survive Recalibration and travel between worlds.",
  },
  settlement: {
    id: "settlement",
    label: "Continuity",
    category: "Page guide · planetary continuity",
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
    category: "Resource guide · recovery stores",
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
      { label: "Crew recovery", detail: "Generated by specialists actively working in relevant assignments." },
      { label: "Campaign caches", detail: "Awarded when Planetfall work advances and when a world is secured." },
    ],
    tip: "Early on, save enough Salvage to expand every life-support category and still pay the rescue signal's shuttle cost.",
  },
  "calibration-data": {
    id: "calibration-data",
    label: "Calibration Data",
    category: "Research input · CAL",
    title: "Record how the damaged Core responds",
    summary: "Calibration Data comes from operating and observing the Axiom Chamber.",
    steps: [
      { title: "Strike the Law-Heart", detail: "Every manual Law-Heart strike in the Foundry immediately adds 1 Calibration Data to Ark Supply." },
      { title: "Let instruments observe", detail: "The Ark also records 90 Calibration Data per hour passively." },
      { title: "Transfer it", detail: "Open Evidence Reservoirs and press +25 before a project can consume it." },
    ],
  },
  "engineering-models": {
    id: "engineering-models",
    label: "Engineering Models",
    category: "Research input · ENG",
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
    category: "Research input · BIO",
    title: "Biological evidence begins with rescued life",
    summary: "Biological Samples begin with rescued life. Clinical and ecological work produce the continuing supply.",
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
    category: "Research input · CUL",
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
    category: "Research input · SCH",
    title: "Designs the Ark can only recover",
    summary:
      "Recovered Schematics fuel the Threat Operations research branch (weapons and armor tiers). Nothing aboard generates them: they arrive only with people and expeditions, which makes them one of the scarcest reservoirs in the game.",
    steps: [
      { title: "Answer SOS signals", detail: "Every rescued group carries schematics in its cargo manifest. Later worlds provide more." },
      { title: "Fly expeditions", detail: "Every site pays schematics on return, scaled by the outcome. Surveys are the steady repeatable source." },
      { title: "Spend them on Threat Operations", detail: "Weapon and armor research tiers are priced mostly in schematics. Transfer them into the Lattice like any evidence reservoir." },
    ],
    tip: "Schematics arrive through timed rescue scans and expedition returns. Plan research around that cadence.",
  },
  "null-traces": {
    id: "null-traces",
    label: "Null Traces",
    category: "Research input · NUL",
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
    category: "Research input · AXM",
    title: "Prove which laws survive a rebuilt universe",
    summary: "Axiom Proofs are the research evidence created by Recalibration and permanent physical laws.",
    steps: [
      { title: "Recalibrate", detail: "Every Axiom earned in a Recalibration immediately awards 8 Axiom Proofs. On later worlds, each additional Axiom requires five times the previous run-Flux proof." },
      { title: "Keep lifetime Axioms", detail: "Lifetime Axioms continue producing a small passive proof signal with diminishing returns." },
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

const MANUAL_CATEGORIES: readonly {
  id: string;
  label: string;
  description: string;
  topics: readonly ManualTopicId[];
}[] = [
  { id: "ship", label: "Ark & Foundry", description: "Power, production, and ship systems", topics: ["deck", "engineering"] },
  { id: "crew", label: "Crew & Operations", description: "People, care, missions, and equipment", topics: ["population", "medical", "expeditions", "defense", "armory"] },
  { id: "research", label: "Research", description: "Projects, evidence, and the Analysis Core", topics: ["research"] },
  { id: "continuity", label: "Continuity", description: "World restoration and settlement", topics: ["settlement"] },
  { id: "resources", label: "Resources", description: "Where important materials come from", topics: RESOURCE_TOPIC_IDS },
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
  currentPageId,
  availablePages,
  priorities,
  onSelectTopic,
  onNavigate,
  onClose,
}: {
  topicId: ManualTopicId;
  currentPageId: ManualPageId;
  availablePages: readonly ManualPageId[];
  priorities: readonly CommandPriority[];
  onSelectTopic: (topicId: ManualTopicId) => void;
  onNavigate: (priority: CommandPriority) => void;
  onClose: () => void;
}) {
  const topic = MANUAL_TOPICS[topicId];
  const currentPageTopic = MANUAL_TOPICS[currentPageId];
  const researchAvailable = availablePages.includes("research");
  const [section, setSection] = useState<"next" | "page" | "manual">("next");
  const [query, setQuery] = useState("");
  const availableTopicIds = useMemo(() => [
    ...availablePages,
    ...RESOURCE_TOPIC_IDS.filter((resourceId) => resourceId === "salvage" || researchAvailable),
  ], [availablePages, researchAvailable]);
  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return availableTopicIds.filter((id) => {
      if (!normalized) return true;
      const candidate = MANUAL_TOPICS[id];
      return [
        candidate.label,
        candidate.title,
        candidate.summary,
        ...candidate.steps.flatMap((step) => [step.title, step.detail]),
        ...(candidate.sources?.flatMap((source) => [source.label, source.detail]) ?? []),
      ].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [availableTopicIds, query]);
  const availableCategories = useMemo(() => MANUAL_CATEGORIES.map((category) => ({
    ...category,
    topics: category.topics.filter((id) => availableTopicIds.includes(id)),
  })).filter((category) => category.topics.length > 0), [availableTopicIds]);
  const suggestions = query.trim() ? searchResults.slice(0, 6) : [];
  const pageStepGroups = useMemo(() => {
    const steps = currentPageTopic.steps;
    return [
      { id: "start", title: "Start here", description: "The first things worth knowing on this screen.", steps: steps.slice(0, 3) },
      { id: "systems", title: "How this page works", description: "The systems and choices you will use after the basics.", steps: steps.slice(3, 7) },
      { id: "later", title: "Later systems", description: "Details that matter after more of the Ark wakes.", steps: steps.slice(7) },
    ].filter((group) => group.steps.length > 0);
  }, [currentPageTopic]);
  const nextActions = priorities.slice(0, 3);

  return (
    <div className="manual-layer">
      <button className="modal-backdrop" type="button" aria-label="Close field manual" onClick={onClose} />
      <section className="game-manual" role="dialog" aria-modal="true" aria-labelledby="manual-title" aria-describedby="manual-summary">
        <header className="game-manual-header">
          <div>
            <p>AXIOM GUIDE</p>
            <h2 id="manual-title">What do you need?</h2>
            <span id="manual-summary">See the next useful action, understand this page, or look up one system.</span>
          </div>
          <button className="manual-close" type="button" autoFocus onClick={onClose}>Close</button>
        </header>

        <nav className="game-manual-sections" aria-label="Guide sections">
          <button className={section === "next" ? "is-active" : ""} type="button" onClick={() => setSection("next")}><strong>Do this next</strong><small>{nextActions.length} useful actions</small></button>
          <button className={`${section === "page" ? "is-active" : ""} is-page-context`} type="button" onClick={() => { onSelectTopic(currentPageId); setSection("page"); }}><strong>Current page <i>THIS SCREEN</i></strong><small>{currentPageTopic.label}</small></button>
          <button className={section === "manual" ? "is-active" : ""} type="button" onClick={() => setSection("manual")}><strong>Field manual</strong><small>Search unlocked systems</small></button>
        </nav>

        <div className="game-manual-body">
          {section === "next" && (
            <section className="manual-next-actions" aria-label="Next useful actions">
              <header><span>DO THIS NEXT</span><h3>The Ark only needs one decision at a time</h3><p>Choose any card below. The Guide will take you to the exact screen.</p></header>
              <div className={`manual-action-grid count-${Math.min(3, nextActions.length)}`}>
                {nextActions.map((priority) => (
                  <article className={`manual-action-card is-${priority.cadence}`} key={priority.id}>
                    <span>{priority.cadence === "offline" ? "SAFE TO WAIT" : priority.cadence === "automatic" ? "AUTOMATIC" : "ACTION"}</span>
                    <h4>{priority.title}</h4>
                    <p>{priority.nextAction ?? priority.detail}</p>
                    {priority.missing && <small>Missing: {priority.missing}</small>}
                    <button type="button" onClick={() => { onNavigate(priority); onClose(); }}>{priority.actionLabel}</button>
                  </article>
                ))}
                {nextActions.length === 0 && <p className="manual-empty">No urgent action is waiting. The Ark can continue producing while you are away.</p>}
              </div>
            </section>
          )}

          {section === "page" && <article className="game-manual-topic">
            <header className="manual-current-page-hero">
              <div><span>YOU ARE VIEWING</span><strong>{currentPageTopic.label}</strong></div>
              <p className="game-manual-category">{currentPageTopic.category}</p>
              <h3>{currentPageTopic.title}</h3>
              <p className="game-manual-summary">{currentPageTopic.summary}</p>
            </header>
            <div className="manual-page-groups">
              {pageStepGroups.map((group) => (
                <section key={group.id}>
                  <header><h4>{group.title}</h4><p>{group.description}</p></header>
                  <div>
                    {group.steps.map((step) => (
                      <article key={step.title}><strong>{step.title}</strong><p>{step.detail}</p></article>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {currentPageTopic.sources && (
              <section className="game-manual-sources" aria-label="Related concepts">
                <h3>What the readouts mean</h3>
                <div>
                  {currentPageTopic.sources.map((source) => (
                    <article key={source.label}>
                      <strong>{source.label}</strong>
                      <p>{source.detail}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {currentPageId === "population" && (
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

            {currentPageId === "settlement" && (
              <section className="game-manual-formulas" aria-label="Continuity expertise formulas">
                <h3>Exact Expertise formulas</h3>
                <div>
                  {Object.entries(CONTINUITY_EXPERTISE_PRESENTATION).map(([id, presentation]) => (
                    <article key={id}><strong>{presentation.label}</strong><p>{presentation.formula}</p></article>
                  ))}
                </div>
              </section>
            )}

            {currentPageTopic.tip && <aside className="game-manual-tip"><span>AXIOM NOTE</span><p>{currentPageTopic.tip}</p></aside>}
          </article>}

          {section === "manual" && (
            <section className="manual-library">
              <label>
                <span>Search the Field Manual</span>
                <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “Salvage”, “Research”, or “Crew levels”" />
                {suggestions.length > 0 && <div className="manual-search-suggestions" role="listbox" aria-label="Suggested manual results">
                  <small>Suggested results</small>
                  {suggestions.map((id) => <button type="button" role="option" aria-selected={topicId === id} key={id} onClick={() => { onSelectTopic(id); setQuery(""); }}>
                    <strong>{MANUAL_TOPICS[id].label}</strong><span>{MANUAL_TOPICS[id].category}</span>
                  </button>)}
                </div>}
              </label>
              <div className="manual-library-layout">
                <nav aria-label="Manual categories and topics">
                  {availableCategories.map((category) => <section className="manual-topic-category" key={category.id}>
                    <header><strong>{category.label}</strong><small>{category.description}</small></header>
                    <div>{category.topics.map((id) => (
                      <button className={`${topicId === id ? "is-active" : ""} ${currentPageId === id ? "is-current-page" : ""}`} type="button" key={id} onClick={() => onSelectTopic(id)}>
                        <strong>{MANUAL_TOPICS[id].label}</strong>
                        {currentPageId === id ? <span>THIS PAGE</span> : null}
                      </button>
                    ))}</div>
                  </section>)}
                </nav>
                <article>
                  <span>{topic.category}</span>
                  <h3>{topic.label}</h3>
                  <p>{topic.summary}</p>
                  <dl>
                    {topic.steps.map((step) => <div key={step.title}><dt>{step.title}</dt><dd>{step.detail}</dd></div>)}
                    {topic.sources?.map((source) => <div key={source.label}><dt>{source.label}</dt><dd>{source.detail}</dd></div>)}
                  </dl>
                </article>
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}
