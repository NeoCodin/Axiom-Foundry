/*
 * The things in the simulation, built for the richer pixel look: tapered limbs and lumped flesh
 * in place of boxes, every hide a small hand-pixelled tile, and each kind with a silhouette you
 * can read at a distance. The stalker runs on arched bone stilts with its back full of spines.
 * The spitter is a swollen, lit gland carried on thin legs, with a funnel for a mouth. The brute
 * is all shoulder and jaw, with light in the cracks of its plates. The harrier is a torn wing with
 * a glowing gland under it and tendrils hanging off, and it stays up there.
 */
import * as THREE from "three";
import type { AlienKind } from "./ark-sim-rules";

export type Beast = {
  group: THREE.Group;
  legs: THREE.Object3D[];
  arms: THREE.Object3D[];
  skin: THREE.MeshLambertMaterial[];
  head: THREE.Object3D | null;
  jaw: THREE.Object3D | null;
  wings: THREE.Object3D[];
  eyes: THREE.Object3D[];
  /** Glands that swell and fall as it breathes. */
  glands: THREE.Object3D[];
};

type Disposable = { dispose(): void };

const HIDES: Record<AlienKind, { ramp: readonly string[]; plate: readonly string[]; seam: string; eye: string }> = {
  stalker: { ramp: ["#120c1a", "#1f1430", "#2e1f45", "#43305e"], plate: ["#4a4258", "#6a6078", "#8e8498", "#b8aec0"], seam: "#c04aff", eye: "#ffe34a" },
  spitter: { ramp: ["#27301a", "#3c4a22", "#5a6a2c", "#80923a"], plate: ["#3a2a2e", "#55404a", "#755a62", "#98808a"], seam: "#d8ff4a", eye: "#ff5a2a" },
  brute: { ramp: ["#180a0a", "#2a1210", "#401c16", "#5c2a1e"], plate: ["#2e2a2c", "#48403e", "#665a54", "#8a7a6e"], seam: "#ff5a22", eye: "#ffd04a" },
  harrier: { ramp: ["#0c1224", "#151f3a", "#203054", "#2f4470"], plate: ["#2a1e3e", "#402c58", "#5c3f78", "#7c5a9c"], seam: "#ff7ae0", eye: "#e8f4ff" },
};

const hash = (x: number, y: number, seed: number) => {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return value - Math.floor(value);
};

/** A hide tile: mottled, banded across the grain, and crisp when drawn. */
function hide(ramp: readonly string[], seed: number, bands: number) {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const band = Math.sin((y + Math.sin(x * 0.5) * 1.2) * (bands * 0.32)) * 0.5 + 0.5;
      const speck = hash(x, y, seed);
      const shade = Math.min(ramp.length - 1, Math.floor((band * 0.55 + speck * 0.5) * ramp.length));
      context.fillStyle = ramp[Math.max(0, shade)];
      context.fillRect(x, y, 1, 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Each kind's materials are made once for a world and shared by all of that kind, but for the skin that flashes. */
export function beastBuilder(keep: <T extends Disposable>(thing: T) => T) {
  const skins = new Map<AlienKind, THREE.CanvasTexture>();
  const plates = new Map<AlienKind, THREE.CanvasTexture>();
  const glowOf = new Map<string, THREE.MeshBasicMaterial>();
  const glow = (color: string) => {
    const made = glowOf.get(color) ?? keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.5) }));
    glowOf.set(color, made);
    return made;
  };
  const up = new THREE.Vector3(0, 1, 0);
  const spike = keep(new THREE.ConeGeometry(1, 1, 4));
  const unit = keep(new THREE.CylinderGeometry(1, 1, 1, 5));
  const lumps = [0, 1, 2, 3].map((seed) => {
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const position = geometry.attributes.position;
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      const z = position.getZ(index);
      const swell = 0.82 + hash(Math.round(x * 9), Math.round(y * 9 + z * 5), seed + 20) * 0.36;
      position.setXYZ(index, x * swell, y * swell, z * swell);
    }
    geometry.computeVertexNormals();
    return keep(geometry);
  });

  return (kind: AlienKind): Beast => {
    const palette = HIDES[kind];
    const skinMap = skins.get(kind) ?? keep(hide(palette.ramp, 11, 3));
    skins.set(kind, skinMap);
    const plateMap = plates.get(kind) ?? keep(hide(palette.plate, 29, 6));
    plates.set(kind, plateMap);
    const group = new THREE.Group();
    group.rotation.order = "YXZ";
    const skin = keep(new THREE.MeshLambertMaterial({ map: skinMap, flatShading: true, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0 }));
    const plate = keep(new THREE.MeshLambertMaterial({ map: plateMap, flatShading: true, side: THREE.DoubleSide }));
    const seam = glow(palette.seam);
    const eye = glow(palette.eye);
    const tooth = glow("#e8e0d0");
    const maw = glow("#ff2a4a");
    const legs: THREE.Object3D[] = [];
    const arms: THREE.Object3D[] = [];
    const eyes: THREE.Object3D[] = [];
    const wings: THREE.Object3D[] = [];
    const glands: THREE.Object3D[] = [];
    let head: THREE.Object3D | null = null;
    let jaw: THREE.Object3D | null = null;

    const pivot = (parent: THREE.Object3D, x: number, y: number, z: number) => {
      const made = new THREE.Group();
      made.position.set(x, y, z);
      parent.add(made);
      return made;
    };
    const lump = (parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, seed = 0) => {
      const mesh = new THREE.Mesh(lumps[seed % lumps.length], material);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      parent.add(mesh);
      return mesh;
    };
    /** A tapered length from one point to another. */
    const limb = (parent: THREE.Object3D, material: THREE.Material, a: readonly number[], b: readonly number[], start: number, end: number) => {
      const from = new THREE.Vector3(a[0], a[1], a[2]);
      const to = new THREE.Vector3(b[0], b[1], b[2]);
      const length = from.distanceTo(to);
      const geometry = keep(new THREE.CylinderGeometry(end, start, length, 5));
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(from).add(to).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(up, to.clone().sub(from).normalize());
      parent.add(mesh);
      return mesh;
    };
    const thorn = (parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, length: number, width: number, tiltX: number, tiltZ = 0) => {
      const mesh = new THREE.Mesh(spike, material);
      mesh.position.set(x, y, z);
      mesh.scale.set(width, length, width);
      mesh.rotation.set(tiltX, 0, tiltZ);
      mesh.translateY(length / 2);
      parent.add(mesh);
      return mesh;
    };
    /** Eyes set unevenly, as if more grew wherever there was room. */
    const cluster = (parent: THREE.Object3D, x: number, y: number, z: number, count: number, spread: number) => {
      for (let index = 0; index < count; index += 1) {
        const angle = (index / count) * Math.PI * 2 + index * 0.7;
        const far = index % 2 === 0 ? 1 : 0.5;
        const size = 0.035 + (index % 3) * 0.018;
        const mesh = new THREE.Mesh(unit, eye);
        mesh.position.set(x + Math.cos(angle) * spread * far, y + Math.sin(angle) * spread * 0.7 * far, z);
        mesh.scale.set(size, 0.03, size);
        mesh.rotation.x = Math.PI / 2;
        parent.add(mesh);
        eyes.push(mesh);
      }
    };
    const teeth = (parent: THREE.Object3D, y: number, z: number, count: number, wide: number, length: number, down = false) => {
      for (let index = 0; index < count; index += 1) {
        const x = (index / Math.max(1, count - 1) - 0.5) * wide;
        thorn(parent, tooth, x, y, z, length, length * 0.22, down ? Math.PI : 0);
      }
    };

    if (kind === "stalker") {
      // A low, long back on arched bone stilts, its spine standing out of it.
      for (let index = 0; index < 7; index += 1) {
        const z = 0.85 - index * 0.5;
        const y = 1.28 - index * 0.05 - Math.max(0, index - 3) * 0.13;
        const radius = 0.44 - index * 0.047;
        lump(group, skin, 0, y, z, radius * 0.86, radius * 0.72, 0.42, index);
        thorn(group, index % 2 === 0 ? seam : plate, 0, y + radius * 0.5, z, 0.62 - index * 0.06, 0.06, -0.62);
      }
      limb(group, seam, [0, 0.72, -2.1], [0, 0.5, -3.1], 0.07, 0.01);
      head = pivot(group, 0, 1.28, 1.1);
      lump(head, plate, 0, 0.08, 0.34, 0.26, 0.18, 0.52, 1);
      for (const side of [-1, 1]) thorn(head, plate, side * 0.16, 0.16, 0.1, 0.62, 0.05, -1.25, side * 0.3);
      thorn(head, seam, 0, 0.2, 0.2, 0.5, 0.05, -1.1);
      lump(head, maw, 0, -0.06, 0.42, 0.18, 0.05, 0.36, 2);
      jaw = pivot(head, 0, -0.1, 0.05);
      lump(jaw, plate, 0, -0.05, 0.36, 0.23, 0.08, 0.5, 3);
      teeth(jaw, -0.02, 0.72, 5, 0.32, 0.18);
      teeth(head, -0.04, 0.72, 4, 0.28, 0.16, true);
      cluster(head, 0, 0.1, 0.84, 6, 0.13);
      for (const side of [-1, 1]) {
        for (const along of [-0.75, 0, 0.75]) {
          const hip = pivot(group, side * 0.2, 1.22, along);
          limb(hip, skin, [0, 0, 0], [side * 0.95, 0.95, 0.12], 0.09, 0.06);
          limb(hip, plate, [side * 0.95, 0.95, 0.12], [side * 1.45, -1.22, 0.22], 0.06, 0.012);
          legs.push(hip);
        }
      }
    } else if (kind === "spitter") {
      // A swollen gland, lit from inside, carried high on stilts.
      const sac = lump(group, skin, 0, 1.75, -0.1, 0.92, 1, 0.92, 2);
      glands.push(sac);
      for (const [x, y, z, size] of [[0.62, 1.95, 0.42, 0.25], [-0.55, 1.5, 0.55, 0.2], [0.2, 2.45, -0.3, 0.26], [-0.62, 2, -0.42, 0.22], [0.66, 1.3, -0.3, 0.18], [0, 1.3, 0.8, 0.17], [-0.2, 2.3, 0.55, 0.15]]) {
        glands.push(lump(group, seam, x, y, z, size, size, size, 1));
      }
      limb(group, plate, [0, 2.45, 0.35], [0, 2.85, 0.95], 0.2, 0.13);
      head = pivot(group, 0, 2.88, 1);
      const funnel = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.42, 0.12, 0.55, 7, 1, true)), plate);
      funnel.rotation.x = Math.PI / 2;
      funnel.position.z = 0.26;
      head.add(funnel);
      lump(head, maw, 0, 0, 0.14, 0.2, 0.2, 0.07, 0);
      jaw = pivot(head, 0, -0.18, 0.2);
      for (let index = 0; index < 7; index += 1) {
        const angle = (index / 7) * Math.PI * 2;
        thorn(head, tooth, Math.cos(angle) * 0.36, Math.sin(angle) * 0.36, 0.5, 0.2, 0.03, Math.PI / 2 + Math.sin(angle) * 0.5, Math.cos(angle) * -0.5);
      }
      cluster(head, 0, 0.5, 0.2, 7, 0.24);
      for (let index = 0; index < 5; index += 1) {
        const angle = (index / 5) * Math.PI * 2 + 0.4;
        const hip = pivot(group, Math.sin(angle) * 0.42, 1.1, Math.cos(angle) * 0.42 - 0.1);
        limb(hip, plate, [0, 0, 0], [Math.sin(angle) * 0.95, 0.15, Math.cos(angle) * 0.95], 0.1, 0.06);
        limb(hip, skin, [Math.sin(angle) * 0.95, 0.15, Math.cos(angle) * 0.95], [Math.sin(angle) * 1.25, -1.1, Math.cos(angle) * 1.25], 0.06, 0.012);
        legs.push(hip);
      }
    } else if (kind === "brute") {
      // All shoulder and jaw, with the head sunk low between them and fire in the cracks.
      lump(group, skin, 0, 2.3, -0.1, 1.15, 1.05, 1, 1);
      lump(group, skin, 0, 1.45, -0.35, 0.82, 0.75, 0.72, 2);
      for (const side of [-1, 1]) {
        lump(group, plate, side * 0.98, 2.95, 0.05, 0.86, 0.66, 0.92, 3);
        lump(group, plate, side * 0.5, 2.5, 0.72, 0.5, 0.6, 0.34, 1);
        for (const along of [-0.3, 0.2, 0.6]) thorn(group, tooth, side * 1.08, 3.42, along, 0.55, 0.11, -0.25, -side * 0.4);
        const leg = pivot(group, side * 0.55, 1.3, -0.3);
        limb(leg, skin, [0, 0, 0], [side * 0.14, -0.7, 0.1], 0.36, 0.26);
        limb(leg, plate, [side * 0.14, -0.7, 0.1], [side * 0.08, -1.28, 0.2], 0.27, 0.34);
        legs.push(leg);
        const arm = pivot(group, side * 1.45, 2.9, 0.25);
        limb(arm, skin, [0, 0, 0], [side * 0.18, -1.25, 0.2], 0.34, 0.28);
        limb(arm, plate, [side * 0.18, -1.25, 0.2], [side * 0.1, -2.5, 0.35], 0.3, 0.42);
        for (const claw of [-0.2, 0, 0.2]) thorn(arm, tooth, side * 0.1 + claw, -2.5, 0.42, 0.6, 0.08, Math.PI);
        arms.push(arm);
      }
      for (const [x, y] of [[-0.6, 2.2], [-0.2, 1.95], [0.25, 2.1], [0.62, 1.85]]) limb(group, seam, [x, y, 0.95], [x + 0.12, y + 0.45, 0.82], 0.035, 0.012);
      for (let index = 0; index < 5; index += 1) thorn(group, plate, (index - 2) * 0.42, 3.05 - Math.abs(index - 2) * 0.12, -0.55, 0.85, 0.13, -0.5);
      head = pivot(group, 0, 2.5, 0.92);
      lump(head, plate, 0, 0.1, 0.18, 0.5, 0.36, 0.5, 0);
      lump(head, maw, 0, -0.14, 0.46, 0.34, 0.09, 0.24, 2);
      jaw = pivot(head, 0, -0.28, 0.1);
      lump(jaw, plate, 0, -0.1, 0.34, 0.6, 0.2, 0.62, 3);
      for (const side of [-1, 1]) thorn(jaw, tooth, side * 0.42, 0, 0.72, 0.78, 0.09, 0.3, -side * 0.2);
      teeth(jaw, 0, 0.84, 5, 0.6, 0.2);
      cluster(head, 0, 0.2, 0.62, 7, 0.2);
    } else {
      // A torn wing that hangs in the air, a lit gland slung under it, tendrils trailing.
      lump(group, skin, 0, 0, 0, 0.52, 0.26, 1.15, 1);
      const gland = lump(group, seam, 0, -0.34, 0.12, 0.34, 0.3, 0.46, 2);
      glands.push(gland);
      head = pivot(group, 0, 0.04, 1);
      lump(head, plate, 0, 0, 0.2, 0.28, 0.17, 0.4, 3);
      lump(head, maw, 0, -0.07, 0.34, 0.16, 0.04, 0.2, 0);
      jaw = pivot(head, 0, -0.1, 0.1);
      lump(jaw, plate, 0, -0.03, 0.22, 0.2, 0.05, 0.34, 1);
      teeth(jaw, 0, 0.5, 4, 0.2, 0.12);
      cluster(head, 0, 0.09, 0.52, 7, 0.14);
      const shape = new THREE.Shape();
      for (const [index, [x, y]] of [[0, 0.75], [1.5, 1.1], [3.6, 0.5], [2.9, -0.3], [3.1, -1.05], [2.2, -0.8], [2.1, -1.65], [1.25, -1.05], [1, -1.9], [0.35, -0.95], [0, -1]].entries()) {
        if (index === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      const membrane = keep(new THREE.ShapeGeometry(shape));
      const position = membrane.attributes.position;
      const uv = membrane.attributes.uv;
      for (let index = 0; index < position.count; index += 1) uv.setXY(index, position.getX(index) * 0.8, position.getY(index) * 0.8);
      for (const side of [-1, 1]) {
        const wing = pivot(group, side * 0.34, 0.05, 0.1);
        const sheet = new THREE.Mesh(membrane, plate);
        sheet.rotation.x = -Math.PI / 2;
        if (side < 0) sheet.scale.x = -1;
        wing.add(sheet);
        limb(wing, seam, [0, 0.03, -0.75], [side * 1.5, 0.05, -1.1], 0.05, 0.03);
        limb(wing, seam, [side * 1.5, 0.05, -1.1], [side * 3.6, 0.04, -0.5], 0.03, 0.01);
        for (const [x, z] of [[2.1, 1.65], [1, 1.9]]) limb(wing, skin, [side * 1.2, 0.03, -0.6], [side * x, 0.02, z], 0.035, 0.008);
        wings.push(wing);
      }
      for (const [x, z, length] of [[-0.3, -0.7, 2.4], [0.3, -0.7, 2.6], [-0.14, -1, 3], [0.16, -1, 2.2], [0, 0.4, 1.9]]) {
        const tendril = pivot(group, x, -0.2, z);
        limb(tendril, skin, [0, 0, 0], [x * 0.5, -length * 0.55, -0.2], 0.05, 0.03);
        limb(tendril, seam, [x * 0.5, -length * 0.55, -0.2], [x * 0.9, -length, -0.1], 0.03, 0.006);
        arms.push(tendril);
      }
    }
    return { group, legs, arms, skin: [skin], head, jaw, wings, eyes, glands };
  };
}
