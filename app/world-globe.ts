/*
 * The worlds as the consoles show them: the same planets you see from the Ark's windows, drawn
 * small and turning, for the globes on the Command Deck and the expedition and settlement screens.
 * One hidden renderer does them all, and each frame is copied to the canvas that asked for it.
 */
import * as THREE from "three";
import { airMaterial, planetMaterial, SYSTEMS } from "./ark-walk-space";

const SIZE = 128;
/** The consoles light every world from the upper left, so you always see its day side. */
const SUN = new THREE.Vector3(-0.62, 0.42, 0.66).normalize();

type Globe = { scene: THREE.Scene; planet: THREE.Mesh; material: THREE.ShaderMaterial };

let renderer: THREE.WebGLRenderer | null | undefined;
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
camera.position.z = 4.4;
const globes = new Map<string, Globe>();

function globeFor(world: string) {
  const known = globes.get(world);
  if (known) return known;
  const system = SYSTEMS.find((entry) => entry.world === world);
  if (!system) return null;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#04050c");
  const positions = new Float32Array(90 * 3);
  for (let star = 0; star < 90; star += 1) {
    const value = (seed: number) => {
      const made = Math.sin(star * 12.9898 + seed * 78.233) * 43758.5453;
      return made - Math.floor(made);
    };
    positions.set([(value(1) - 0.5) * 7, (value(2) - 0.5) * 7, -4], star * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: "#c8ccdc", size: 1, sizeAttenuation: false })));
  const material = planetMaterial(system.planet, SUN);
  const planet = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), material);
  planet.rotation.z = 0.32;
  scene.add(planet, new THREE.Mesh(new THREE.SphereGeometry(1.06, 32, 20), airMaterial(system.planet.air, SUN)));
  const globe = { scene, planet, material };
  globes.set(world, globe);
  return globe;
}

/** Draws a world on the canvas. Says false if it has no globe, or this machine cannot draw one. */
export function drawWorldGlobe(context: CanvasRenderingContext2D, world: string, seconds: number) {
  if (renderer === undefined) {
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setSize(SIZE, SIZE, false);
    } catch {
      renderer = null;
    }
  }
  const globe = globeFor(world);
  if (!renderer || !globe) return false;
  globe.planet.rotation.y = seconds * 0.05;
  globe.material.uniforms.time.value = seconds * 6;
  renderer.render(globe.scene, camera);
  context.clearRect(0, 0, SIZE, SIZE);
  context.drawImage(renderer.domElement, 0, 0);
  return true;
}
