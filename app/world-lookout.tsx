"use client";

/*
 * The drone on the ground at a world the Ark has reached. It lands on the one stretch of ground
 * the recon crews have marked and walks it in first person, with a few lookouts worth stopping at.
 * There is nothing to do here yet: this is the place itself, for the look of it. Pelagos has its
 * own view, where the reclamation is played.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { unlockPulseAudio } from "./law-heart-audio";
import { createPixelFinish } from "./pixel-finish";
import { buildWorldView, WORLD_FAR } from "./world-views";
import "./pelagos.css";

const PIXEL_SCALE = 3;
const EYE = 1.7;
const WALK = 5;
const HURRY = 9;

export type WorldLookoutProps = { world: string; onLeave: () => void };

export default function WorldLookout({ world, onLeave }: WorldLookoutProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const leaveRef = useRef(onLeave);
  leaveRef.current = onLeave;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(66, 1, 0.3, WORLD_FAR);
    const view = buildWorldView(scene, world);
    scene.fog = view.fog;
    const finish = createPixelFinish(renderer);
    const resize = () => {
      renderer.setSize(Math.max(1, Math.floor(mount.clientWidth / PIXEL_SCALE)), Math.max(1, Math.floor(mount.clientHeight / PIXEL_SCALE)), false);
      camera.aspect = mount.clientWidth / Math.max(1, mount.clientHeight);
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    const views = view.spec.views;
    let viewAt = 0;
    let { x, z, yaw, pitch } = views[0];
    const keys = new Set<string>();
    const locked = () => document.pointerLockElement === renderer.domElement;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      keys.add(event.code);
      if (event.code === "KeyQ") leaveRef.current();
      if (event.code === "KeyE") {
        viewAt = (viewAt + 1) % views.length;
        ({ x, z, yaw, pitch } = views[viewAt]);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    const onBlur = () => keys.clear();
    const onMouseMove = (event: MouseEvent) => {
      if (!locked()) return;
      yaw -= event.movementX * 0.0022;
      pitch = Math.max(-1.3, Math.min(1.3, pitch - event.movementY * 0.0022));
    };
    const onClick = () => {
      unlockPulseAudio();
      if (!locked()) Promise.resolve(renderer.domElement.requestPointerLock()).catch(() => {});
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("click", onClick);

    const qa = new URLSearchParams(window.location.search).has("qa");
    if (qa) {
      (window as unknown as { lookoutQa?: unknown }).lookoutQa = {
        spec: view.spec.name,
        views,
        place: (nextX: number, nextZ: number, nextYaw: number, nextPitch: number) => {
          [x, z, yaw, pitch] = [nextX, nextZ, nextYaw, nextPitch];
        },
        where: () => ({ x, z, yaw, pitch, y: camera.position.y }),
      };
    }

    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const forward = Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown"));
      const strafe = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
      if (forward !== 0 || strafe !== 0) {
        const speed = ((keys.has("ShiftLeft") ? HURRY : WALK) * dt) / Math.hypot(forward, strafe);
        const nextX = x + (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * speed;
        const nextZ = z + (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * speed;
        if (!view.blocked(nextX, z)) x = nextX;
        if (!view.blocked(x, nextZ)) z = nextZ;
      }
      camera.position.set(x, view.height(x, z) + EYE, z);
      camera.rotation.set(pitch, yaw, 0, "YXZ");
      view.update(now / 1000, camera, dt);
      finish.render(scene, camera);
      // The land and the sun hold still, so their shadows are only drawn once.
      renderer.shadowMap.autoUpdate = false;
    };
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("click", onClick);
      if (locked()) document.exitPointerLock();
      if (qa) delete (window as unknown as { lookoutQa?: unknown }).lookoutQa;
      view.dispose();
      finish.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [world]);

  return (
    <div className="pelagos" data-mode="drone" role="dialog" aria-modal="true" aria-label={`${world}: the drone on the ground`}>
      <div ref={mountRef} className="pelagos-view" />
      <div className="pelagos-left">
        <section className="pelagos-card pelagos-drone">
          <strong>Maintenance drone 03 · {world}</strong>
          <small>On the ground</small>
        </section>
      </div>
      <div className="pelagos-bottom">
        <p className="pelagos-help">Click to take the drone · WASD walk · mouse look · Shift hurry · E next lookout · Q back to the Ark</p>
      </div>
    </div>
  );
}
