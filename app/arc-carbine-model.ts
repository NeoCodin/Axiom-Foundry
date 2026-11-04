/*
 * The Arc Carbine in AXIOM's hands, for the simulator's modes: the attachments the
 * loadout fits onto the issue body (sights, a reflex sight or a scope on the rail, a
 * suppressor or a focus coil past the emitter, the cell underneath with a window
 * that shows its charge, a heat sink's fins), the coils that glow hotter as it
 * fires, and the bolts it throws: crooked lines of light that last a moment.
 */

import * as THREE from "three";
import type { CarbineLoadout } from "./arc-carbine";

const COOL = new THREE.Color("#9ac4ff");
const HOT = new THREE.Color("#ff7a3a");
const VENTING = new THREE.Color("#ff3a2a");

/**
 * Fit the loadout onto a carbine built pointing down -z with its body centred on the
 * origin, the shape both simulator modes give it. Returns where the muzzle now is,
 * and a way to show the cell's charge in its window.
 */
export function dressCarbine(gun: THREE.Group, loadout: CarbineLoadout) {
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const material = (color: string, lit = false) => {
    const made = lit ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color, flatShading: true });
    materials.push(made);
    return made;
  };
  const dark = material("#1a1820");
  const metal = material("#4a4f5e");
  const add = (geometry: THREE.BufferGeometry, made: THREE.Material, x: number, y: number, z: number) => {
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, made);
    mesh.position.set(x, y, z);
    mesh.raycast = () => {};
    gun.add(mesh);
    return mesh;
  };
  const box = (w: number, h: number, d: number, made: THREE.Material, x: number, y: number, z: number) => add(new THREE.BoxGeometry(w, h, d), made, x, y, z);
  const tube = (radius: number, length: number, made: THREE.Material, x: number, y: number, z: number) => {
    const mesh = add(new THREE.CylinderGeometry(radius, radius, length, 10), made, x, y, z);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  };

  // The optic, on the rail over the body: a post and a notch, a lit dot on glass, or a scope.
  if (loadout.optic === "iron") {
    box(0.02, 0.06, 0.02, material("#ffe34a", true), 0, 0.11, -0.25);
    box(0.05, 0.025, 0.02, dark, 0, 0.095, 0.18);
  } else if (loadout.optic === "reflex") {
    box(0.07, 0.012, 0.05, dark, 0, 0.082, -0.02);
    box(0.008, 0.06, 0.012, dark, -0.032, 0.115, -0.04);
    box(0.008, 0.06, 0.012, dark, 0.032, 0.115, -0.04);
    box(0.064, 0.008, 0.012, dark, 0, 0.146, -0.04);
    box(0.012, 0.012, 0.004, material("#ff4a3a", true), 0, 0.115, -0.04);
  } else {
    box(0.03, 0.03, 0.03, dark, 0, 0.09, -0.1);
    box(0.03, 0.03, 0.03, dark, 0, 0.09, 0.1);
    tube(0.034, 0.3, metal, 0, 0.125, 0);
    tube(0.042, 0.04, dark, 0, 0.125, -0.15);
    tube(0.04, 0.04, dark, 0, 0.125, 0.15);
  }

  // The barrel piece, past the emitter.
  let muzzle = -0.68;
  if (loadout.barrel === "suppressor") {
    tube(0.045, 0.26, dark, 0, 0.02, -0.76);
    muzzle = -0.92;
  } else if (loadout.barrel === "focus") {
    const ring = material("#c9b6ff", true);
    for (const z of [-0.56, -0.62, -0.68]) add(new THREE.TorusGeometry(0.045, 0.012, 4, 10), ring, 0, 0.02, z);
    muzzle = -0.74;
  }

  // The cell, seated under the body, its window lit as deep as its charge; a heat sink's fins over the coils.
  const cellDepth = loadout.cell === "extended" ? 0.27 : 0.18;
  const cellTop = -0.07;
  box(0.085, cellDepth, 0.105, metal, 0, cellTop - cellDepth / 2, 0.12);
  const window = cellDepth - 0.04;
  const charge = box(0.088, window, 0.02, material("#9ac4ff", true), 0, cellTop - cellDepth / 2, 0.175);
  if (loadout.cell === "heatsink") {
    for (const z of [-0.2, -0.12, -0.04, 0.04]) box(0.2, 0.06, 0.012, metal, 0, 0.03, z);
  }

  return {
    /** Where the muzzle now is, along the barrel. */
    muzzle,
    /** Light the cell's window as deep as its charge, 0 to 1, from the bottom up. */
    showCharge(level: number) {
      const shown = Math.max(0.02, Math.min(1, level));
      charge.scale.y = shown;
      charge.position.y = cellTop - 0.02 - window + (window * shown) / 2;
    },
    dispose() {
      for (const made of materials) made.dispose();
      for (const geometry of geometries) geometry.dispose();
    },
  };
}

/** The coils' colour: cool blue, warming to orange as the carbine heats, flickering red while it vents. */
export function heatColour(heat: number, venting: boolean, time: number, target: THREE.Color) {
  if (venting) return target.copy(Math.floor(time / 90) % 2 === 0 ? VENTING : HOT);
  return target.copy(COOL).lerp(HOT, Math.min(1, Math.max(0, heat)));
}

/** Bolts of arc: crooked lines from the muzzle to where each one struck, gone in a moment. */
export function createArcs(scene: THREE.Scene, random: () => number = Math.random) {
  const material = new THREE.LineBasicMaterial({ color: "#dce8ff" });
  const resonant = new THREE.LineBasicMaterial({ color: "#ffe08a" });
  const live: { line: THREE.Line; life: number }[] = [];
  const kink = new THREE.Vector3();
  return {
    /** A bolt from the muzzle to where it struck; gold when it landed on the Law-Heart's beat. */
    fire(from: THREE.Vector3, to: THREE.Vector3, onBeat = false) {
      const steps = Math.max(3, Math.min(10, Math.round(from.distanceTo(to) / 2)));
      const points: THREE.Vector3[] = [];
      for (let step = 0; step <= steps; step += 1) {
        const point = from.clone().lerp(to, step / steps);
        if (step > 0 && step < steps) point.add(kink.set(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.22));
        points.push(point);
      }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), onBeat ? resonant : material);
      line.raycast = () => {};
      line.frustumCulled = false;
      scene.add(line);
      live.push({ line, life: 0.07 });
    },
    update(dt: number) {
      for (let index = live.length - 1; index >= 0; index -= 1) {
        const bolt = live[index];
        bolt.life -= dt;
        if (bolt.life > 0) continue;
        scene.remove(bolt.line);
        bolt.line.geometry.dispose();
        live.splice(index, 1);
      }
    },
    dispose() {
      for (const bolt of live) {
        scene.remove(bolt.line);
        bolt.line.geometry.dispose();
      }
      live.length = 0;
      material.dispose();
      resonant.dispose();
    },
  };
}
