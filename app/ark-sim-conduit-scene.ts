/*
 * The Conduit drawn (ark-sim-conduit.ts has its shape and rules): a simulation that
 * doesn't pretend to be anywhere. Dark tubes ribbed with light that pulses on the
 * Law-Heart's beat, a lit line down each floor, elbows where they turn; then the Core
 * Hall, a drum with a grid for a floor, bands of light up its wall, and in its middle
 * a simulated Lawheart, a small star held in three turning rings between two columns.
 * Containment anchors hang in the hall's air for the tether to catch. Returns what
 * bolts and the tether strike, and a per-frame update.
 */

import * as THREE from "three";
import { HALL, SPINE, TUBE } from "./ark-sim-conduit";

const VOID = "#0b0814";
const HULL = "#2a2140";
const FLOOR = "#3a2f58";
const RIB = "#ff8ae0";
const RIB_DIM = new THREE.Color("#8a3a7a");
const STAR = "#ffd27a";

export function buildConduit(scene: THREE.Scene, keep: <T extends { dispose(): void }>(thing: T) => T) {
  scene.background = new THREE.Color(VOID);
  scene.fog = new THREE.Fog("#140d22", 24, 130);
  scene.add(new THREE.HemisphereLight("#d8c8ff", "#1a1028", 1));
  scene.add(new THREE.AmbientLight("#8a7ab8", 0.4));

  // A floor grid: pale lines on the dark, every two metres.
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const paint = canvas.getContext("2d");
  if (paint) {
    paint.fillStyle = FLOOR;
    paint.fillRect(0, 0, 32, 32);
    paint.fillStyle = "#6a4f9a";
    paint.fillRect(0, 0, 32, 1);
    paint.fillRect(0, 0, 1, 32);
  }
  const grid = keep(new THREE.CanvasTexture(canvas));
  grid.magFilter = THREE.NearestFilter;
  grid.wrapS = grid.wrapT = THREE.RepeatWrapping;
  const floorGrid = (repeatX: number, repeatY: number) => {
    const texture = keep(grid.clone());
    texture.needsUpdate = true;
    texture.repeat.set(repeatX, repeatY);
    return keep(new THREE.MeshLambertMaterial({ map: texture }));
  };
  const hull = keep(new THREE.MeshLambertMaterial({ color: HULL, side: THREE.BackSide, flatShading: true }));
  const hullBoth = keep(new THREE.MeshLambertMaterial({ color: HULL, side: THREE.DoubleSide, flatShading: true }));
  const rib = keep(new THREE.MeshBasicMaterial({ color: RIB }));
  const line = keep(new THREE.MeshBasicMaterial({ color: RIB, transparent: true, opacity: 0.7 }));
  const surfaces: THREE.Object3D[] = [];
  const solid = <T extends THREE.Mesh>(mesh: T) => {
    scene.add(mesh);
    surfaces.push(mesh);
    return mesh;
  };
  const inert = <T extends THREE.Object3D>(object: T) => {
    object.raycast = () => {};
    scene.add(object);
    return object;
  };

  // ---- The tubes. ----
  const floorWidth = 2 * Math.sqrt(TUBE.bore ** 2 - TUBE.centre ** 2);
  const ribGeometry = keep(new THREE.TorusGeometry(TUBE.bore - 0.08, 0.07, 4, 28));
  const ribs: THREE.Matrix4[] = [];
  for (let at = 0; at < SPINE.length - 1; at += 1) {
    const from = SPINE[at];
    const to = SPINE[at + 1];
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const length = Math.hypot(dx, dz);
    const turn = Math.atan2(dx, dz);
    const middle = { x: (from.x + to.x) / 2, z: (from.z + to.z) / 2 };
    const bore = keep(new THREE.CylinderGeometry(TUBE.bore, TUBE.bore, length, 20, 1, true));
    bore.rotateX(Math.PI / 2);
    const tube = solid(new THREE.Mesh(bore, hull));
    tube.position.set(middle.x, TUBE.centre, middle.z);
    tube.rotation.y = turn;
    const floor = solid(new THREE.Mesh(keep(new THREE.BoxGeometry(floorWidth, 0.2, length)), floorGrid(floorWidth / 2, length / 2)));
    floor.position.set(middle.x, -0.1, middle.z);
    floor.rotation.y = turn;
    const strip = inert(new THREE.Mesh(keep(new THREE.BoxGeometry(0.12, 0.02, length)), line));
    strip.position.set(middle.x, 0.02, middle.z);
    strip.rotation.y = turn;
    for (let along = 1.5; along < length; along += 3) {
      ribs.push(new THREE.Matrix4().compose(
        new THREE.Vector3(from.x + (dx / length) * along, TUBE.centre, from.z + (dz / length) * along),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, turn, 0)),
        new THREE.Vector3(1, 1, 1),
      ));
    }
  }
  const ribMesh = inert(new THREE.InstancedMesh(ribGeometry, rib, ribs.length));
  ribs.forEach((matrix, at) => ribMesh.setMatrixAt(at, matrix));
  ribMesh.instanceMatrix.needsUpdate = true;
  // Elbows where the tubes turn, and the closed end where the run begins.
  const elbow = keep(new THREE.SphereGeometry(TUBE.bore, 20, 12));
  const elbowFloor = keep(new THREE.CircleGeometry(floorWidth / 2, 20));
  elbowFloor.rotateX(-Math.PI / 2);
  const elbowGrid = floorGrid(floorWidth / 2, floorWidth / 2);
  for (const point of SPINE.slice(0, -1)) {
    solid(new THREE.Mesh(elbow, hull)).position.set(point.x, TUBE.centre, point.z);
    solid(new THREE.Mesh(elbowFloor, elbowGrid)).position.set(point.x, 0.001, point.z);
  }

  // ---- The Core Hall. ----
  const mouth = SPINE[SPINE.length - 1];
  const gap = 2 * Math.asin((TUBE.bore + 0.3) / HALL.radius);
  const height = HALL.ceiling + 1;
  const wall = solid(new THREE.Mesh(keep(new THREE.CylinderGeometry(HALL.radius, HALL.radius, height, 80, 1, true, gap / 2, Math.PI * 2 - gap)), hull));
  wall.position.set(HALL.x, height / 2 - 0.5, HALL.z);
  // Over the tube's mouth, the wall closes again; around the mouth, a collar.
  const top = TUBE.centre + TUBE.bore;
  const lintel = solid(new THREE.Mesh(keep(new THREE.CylinderGeometry(HALL.radius, HALL.radius, height - top, 6, 1, true, -gap / 2, gap)), hull));
  lintel.position.set(HALL.x, top + (height - top) / 2 - 0.5, HALL.z);
  const collarShape = new THREE.Shape();
  const halfWidth = TUBE.bore + 0.35;
  collarShape.moveTo(-halfWidth, -0.5);
  collarShape.lineTo(halfWidth, -0.5);
  collarShape.lineTo(halfWidth, top + 0.2);
  collarShape.lineTo(-halfWidth, top + 0.2);
  collarShape.lineTo(-halfWidth, -0.5);
  const hole = new THREE.Path();
  hole.absarc(0, TUBE.centre, TUBE.bore, 0, Math.PI * 2, true);
  collarShape.holes.push(hole);
  const collar = solid(new THREE.Mesh(keep(new THREE.ShapeGeometry(collarShape, 24)), hullBoth));
  collar.position.set(mouth.x, 0, mouth.z - 0.15);
  const mouthRing = inert(new THREE.Mesh(keep(new THREE.TorusGeometry(TUBE.bore, 0.12, 4, 32)), rib));
  mouthRing.position.set(mouth.x, TUBE.centre, mouth.z - 0.2);
  const hallFloorGeometry = keep(new THREE.CircleGeometry(HALL.radius, 80));
  hallFloorGeometry.rotateX(-Math.PI / 2);
  solid(new THREE.Mesh(hallFloorGeometry, floorGrid(HALL.radius, HALL.radius))).position.set(HALL.x, 0, HALL.z);
  const ceilingGeometry = keep(new THREE.CircleGeometry(HALL.radius, 80));
  ceilingGeometry.rotateX(Math.PI / 2);
  solid(new THREE.Mesh(ceilingGeometry, keep(new THREE.MeshLambertMaterial({ color: "#1c1530" })))).position.set(HALL.x, HALL.ceiling, HALL.z);
  for (const band of [12, 21, 30]) {
    const ring = inert(new THREE.Mesh(keep(new THREE.TorusGeometry(HALL.radius - 0.12, 0.1, 4, 120)), line));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(HALL.x, band, HALL.z);
  }

  // ---- The simulated Lawheart: a small star in three rings, between two columns. ----
  const starHeight = 18;
  const column = hullBoth;
  const lower = solid(new THREE.Mesh(keep(new THREE.CylinderGeometry(HALL.core, HALL.core * 1.2, starHeight - 6, 16)), column));
  lower.position.set(HALL.x, (starHeight - 6) / 2, HALL.z);
  const upperLength = HALL.ceiling - (starHeight + 6);
  const upper = solid(new THREE.Mesh(keep(new THREE.CylinderGeometry(HALL.core * 1.2, HALL.core, upperLength, 16)), column));
  upper.position.set(HALL.x, starHeight + 6 + upperLength / 2, HALL.z);
  const star = solid(new THREE.Mesh(keep(new THREE.SphereGeometry(2.4, 20, 14)), keep(new THREE.MeshBasicMaterial({ color: STAR }))));
  star.position.set(HALL.x, starHeight, HALL.z);
  const starLight = new THREE.PointLight(STAR, 2.4, 70, 1.3);
  starLight.position.copy(star.position);
  scene.add(starLight);
  const gimbals = [5.2, 4.4, 3.6].map((radius, at) => {
    const ring = inert(new THREE.Mesh(keep(new THREE.TorusGeometry(radius, 0.16, 6, 48)), keep(new THREE.MeshBasicMaterial({ color: at === 1 ? "#fff0c8" : STAR }))));
    ring.position.copy(star.position);
    return ring;
  });

  // ---- Containment anchors hanging in the hall, for the tether. ----
  const anchorMaterial = keep(new THREE.MeshBasicMaterial({ color: RIB }));
  const anchorGeometry = keep(new THREE.OctahedronGeometry(0.85));
  const haloGeometry = keep(new THREE.TorusGeometry(1.5, 0.06, 4, 24));
  const anchors = Array.from({ length: 8 }, (_, at) => {
    const angle = (at / 8) * Math.PI * 2 + 0.3;
    const reach = at % 2 === 0 ? 24 : 15;
    const lift = 10 + ((at * 7) % 5) * 4;
    const anchor = solid(new THREE.Mesh(anchorGeometry, anchorMaterial));
    anchor.position.set(HALL.x + Math.cos(angle) * reach, lift, HALL.z + Math.sin(angle) * reach);
    const halo = inert(new THREE.Mesh(haloGeometry, line));
    halo.position.copy(anchor.position);
    return { anchor, halo, lift, phase: at * 1.3 };
  });

  return {
    /** What bolts and the tether can strike. */
    surfaces,
    /** Each frame: the star throbs and the ribs brighten on the beat, the rings turn, the anchors drift. */
    update(now: number, beat: number) {
      star.scale.setScalar(1 + beat * 0.14);
      starLight.intensity = 2.2 + beat * 1.4;
      rib.color.copy(RIB_DIM).lerp(new THREE.Color(RIB), 0.45 + beat * 0.55);
      gimbals[0].rotation.set(now * 0.0004, now * 0.0003, 0);
      gimbals[1].rotation.set(0, now * -0.0005, now * 0.0004);
      gimbals[2].rotation.set(now * 0.0006, 0, now * -0.0003);
      for (const { anchor, halo, lift, phase } of anchors) {
        anchor.position.y = lift + Math.sin(now * 0.0009 + phase) * 0.6;
        anchor.rotation.y = now * 0.001 + phase;
        halo.position.y = anchor.position.y;
        halo.rotation.x = Math.PI / 2 + Math.sin(now * 0.0007 + phase) * 0.4;
      }
    },
  };
}
