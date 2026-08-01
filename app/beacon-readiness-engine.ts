import type { LifeSupportCapacity, LifeSupportKey } from "./survivor-engine";

export const BEACON_MINIMUM_SAFE_CAPACITY = 2;

const SUPPORT_LABELS: Record<LifeSupportKey, string> = {
  atmosphere: "Atmosphere",
  water: "Water",
  nutrition: "Nutrition",
  medical: "Medical",
};

export type BeaconReadinessItem = {
  id: "orbit" | "living-spaces" | LifeSupportKey;
  label: string;
  status: string;
  ready: boolean;
};

export type BeaconReadiness = {
  ready: boolean;
  items: readonly BeaconReadinessItem[];
};

export function getBeaconReadiness({
  planetaryOrbit,
  worldName,
  livingSpaces,
  lifeSupport,
}: {
  planetaryOrbit: boolean;
  worldName: string;
  livingSpaces: number;
  lifeSupport: LifeSupportCapacity;
}): BeaconReadiness {
  const items: BeaconReadinessItem[] = [
    {
      id: "orbit",
      label: "Planetary orbit",
      status: planetaryOrbit ? `${worldName} orbit confirmed` : "Complete the planetary approach",
      ready: planetaryOrbit,
    },
    {
      id: "living-spaces",
      label: "Living spaces",
      status: `${livingSpaces} / ${BEACON_MINIMUM_SAFE_CAPACITY} ready`,
      ready: livingSpaces >= BEACON_MINIMUM_SAFE_CAPACITY,
    },
    ...(Object.keys(SUPPORT_LABELS) as LifeSupportKey[]).map((key) => ({
      id: key,
      label: `${SUPPORT_LABELS[key]} capacity`,
      status: `${lifeSupport[key]} / ${BEACON_MINIMUM_SAFE_CAPACITY} ready`,
      ready: lifeSupport[key] >= BEACON_MINIMUM_SAFE_CAPACITY,
    })),
  ];

  return {
    ready: items.every((item) => item.ready),
    items,
  };
}
