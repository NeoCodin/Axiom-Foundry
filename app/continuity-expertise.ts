import type { ExpertiseId } from "./campaign-content.ts";
import {
  PROFESSIONAL_ROLES,
  getSurvivorSkillLevel,
  type ProfessionalRole,
  type Survivor,
} from "./survivor-engine.ts";

export const CONTINUITY_EXPERTISE_PRESENTATION: Record<
  ExpertiseId,
  { label: string; formula: string }
> = {
  engineering: {
    label: "Engineering",
    formula: "Engineer level + 60% of Technician level (rounded down)",
  },
  medicine: {
    label: "Medicine",
    formula: "Doctor level",
  },
  ecology: {
    label: "Ecology",
    formula: "Farmer level",
  },
  education: {
    label: "Education",
    formula: "Teacher level",
  },
  leadership: {
    label: "Leadership",
    formula: "70% of Security level + 40% of Navigator level (each rounded up)",
  },
  fabrication: {
    label: "Fabrication",
    formula: "Fabricator level + 50% of Technician level (rounded down)",
  },
  research: {
    label: "Research",
    formula: "Researcher level",
  },
  navigation: {
    label: "Navigation",
    formula: "Navigator level",
  },
  communications: {
    label: "Communications",
    formula: "60% of Navigator level + 40% of Researcher level (rounded down)",
  },
  "null-studies": {
    label: "Null Studies",
    formula: "Researcher level + a 50% Null Dreamer bonus (rounded up)",
  },
};

export function getSurvivorContinuityExpertise(survivor: Survivor) {
  const skill = (role: ProfessionalRole) =>
    getSurvivorSkillLevel(survivor, role);
  const researcher = skill("researcher");
  return {
    engineering: skill("engineer") + Math.floor(skill("technician") * 0.6),
    medicine: skill("doctor"),
    ecology: skill("farmer"),
    education: skill("teacher"),
    leadership:
      Math.ceil(skill("security") * 0.7) +
      Math.ceil(skill("navigator") * 0.4),
    fabrication:
      skill("fabricator") + Math.floor(skill("technician") * 0.5),
    research: researcher,
    navigation: skill("navigator"),
    communications:
      Math.floor(skill("navigator") * 0.6) +
      Math.floor(researcher * 0.4),
    "null-studies":
      researcher +
      (survivor.traits.includes("null-dreamer")
        ? Math.max(1, Math.ceil(researcher * 0.5))
        : 0),
  } satisfies Record<ExpertiseId, number>;
}

export function getQualifiedSurvivorRoles(survivor: Survivor) {
  return Array.from(
    new Set([
      survivor.role,
      survivor.assignedRole,
      ...PROFESSIONAL_ROLES.filter(
        (role) => getSurvivorSkillLevel(survivor, role) > 0,
      ),
    ].filter((role): role is Survivor["role"] => Boolean(role))),
  );
}
