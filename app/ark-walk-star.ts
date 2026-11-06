/*
 * The Law-Heart in the Axiom Chamber, the star from the Foundry page stood up in 3D: a small
 * white-hot core with flickering rays, a swarm of Flux that fills the chamber and grows with the
 * machines feeding it, sparkling shards for the proven Axioms, and a heartbeat that really swells
 * it, on each star's own rhythm. The motion is the Foundry star's (law-heart-particle-field.tsx),
 * scaled from canvas pixels to metres, with each mote given an orbit of its own. It is drawn for
 * the richer pixel finish: heat falls in flat steps, and rays and motes are hard-edged.
 */
import * as THREE from "three";
import { getPulseProfile } from "./law-heart-pulse";

/** The core is small: the swarm round it is what fills the room. */
export const STAR_RADII = [1.5, 2, 2.4, 2.8, 3.1, 3.4, 3.7];
const CRADLE = [9, 9.7, 10.35];
const SWARM_REACH = 10.1;
const SWARM_SIZE = 1400;
const SHARD_SIZE = 20;
const RAY_COUNT = 40;
/** Lifetime Axioms well inside each stage, which is all the rhythm depends on. */
const STAGE_AXIOMS = [0, 2, 4, 8, 17, 40, 90];
/** How fast the swarm turns at each stage, in turns a second. */
const SWARM_TURNS = [0.015, 0.045, 0.07, 0.1, 0.13, 0.21, 0.11];
/** How many motes each stage can hold once its machines are all running. */
const SWARM_FULL = [50, 260, 460, 680, 900, 1150, SWARM_SIZE];
const TAU = Math.PI * 2;

export type StarSpec = {
  stage: number;
  core: string;
  surface: string;
  bright: string;
  limb: string;
  corona: readonly string[];
  shard: string;
  shards: number;
  machines: readonly { count: number; color: string }[];
};

const hash = (value: number) => {
  const sine = Math.sin(value * 12.9898) * 43758.5453;
  return sine - Math.floor(sine);
};

const NOISE = /* glsl */ `
  float hash31(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3. - 2. * f);
    return mix(
      mix(mix(hash31(i), hash31(i + vec3(1., 0., 0.)), f.x), mix(hash31(i + vec3(0., 1., 0.)), hash31(i + vec3(1., 1., 0.)), f.x), f.y),
      mix(mix(hash31(i + vec3(0., 0., 1.)), hash31(i + vec3(1., 0., 1.)), f.x), mix(hash31(i + vec3(0., 1., 1.)), hash31(i + vec3(1., 1., 1.)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float amount = 0.5;
    float total = 0.;
    for (int octave = 0; octave < 3; octave++) {
      total += amount * vnoise(p);
      p = p * 2.03 + vec3(1.7, 9.2, 3.1);
      amount *= 0.5;
    }
    return total / 0.875;
  }
`;

/** Lumpy and restless, white at the middle, breaking up toward a dark limb. */
const coreMaterial = (spec: StarSpec, gain: number) => new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    swell: { value: 0 },
    gain: { value: gain },
    cCore: { value: new THREE.Color(spec.core) },
    cSurface: { value: new THREE.Color(spec.surface) },
    cBright: { value: new THREE.Color(spec.bright) },
    cLimb: { value: new THREE.Color(spec.limb) },
  },
  vertexShader: /* glsl */ `
    uniform float time;
    varying vec3 vNormalView;
    varying vec3 vToEye;
    varying vec3 vSphere;
    ${NOISE}
    void main() {
      vec3 n = normalize(position);
      vSphere = n;
      float lump = fbm(n * 2.6 + vec3(0., time * 0.7, time * 0.45)) - 0.5;
      vec4 view = modelViewMatrix * vec4(n * (1. + lump * 0.24), 1.);
      vNormalView = normalMatrix * normal;
      vToEye = -view.xyz;
      gl_Position = projectionMatrix * view;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float time;
    uniform float swell;
    uniform float gain;
    uniform vec3 cCore;
    uniform vec3 cSurface;
    uniform vec3 cBright;
    uniform vec3 cLimb;
    varying vec3 vNormalView;
    varying vec3 vToEye;
    varying vec3 vSphere;
    ${NOISE}
    void main() {
      vec3 viewNormal = normalize(vNormalView);
      float facing = clamp(dot(viewNormal, normalize(vToEye)), 0., 1.);
      // Granules churning both ways over the surface, far quicker than a real sun.
      float churn = fbm(vSphere * 5.5 + vec3(time * 0.9, -time * 0.6, time * 0.4));
      float cells = fbm(vSphere * 13. - vec3(time * 1.3, time * 0.5, -time * 0.8));
      float heat = pow(facing, 1.35) + (churn * 0.62 + cells * 0.38 - 0.5) * 0.62 + swell * 0.08;
      // The bright band that sweeps up and down the face.
      heat += smoothstep(0.035, 0.0, abs(viewNormal.y - sin(time * 0.8) * 0.34)) * 0.2;
      heat = floor(heat * 6. + 0.5) / 6.;
      vec3 color = mix(cLimb, cSurface, smoothstep(0.12, 0.34, heat));
      color = mix(color, cBright, smoothstep(0.5, 0.74, heat));
      color = mix(color, cCore, smoothstep(0.78, 0.96, heat));
      gl_FragColor = vec4(color * gain * (1. + swell * 0.35), 1.);
    }
  `,
});

/** A tight, flickering skin of light close round the core. */
const coronaMaterial = (near: string, far: string, gain: number) => new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: {
    time: { value: 0 },
    swell: { value: 0 },
    gain: { value: gain },
    cNear: { value: new THREE.Color(near) },
    cFar: { value: new THREE.Color(far) },
  },
  vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
  fragmentShader: /* glsl */ `
    uniform float time;
    uniform float swell;
    uniform float gain;
    uniform vec3 cNear;
    uniform vec3 cFar;
    varying vec2 vUv;
    ${NOISE}
    void main() {
      vec2 p = vUv * 2. - 1.;
      float r = length(p);
      float angle = atan(p.y, p.x);
      const float INNER = 1. / 2.5;
      float out_ = clamp((r - INNER) / (1. - INNER), 0., 1.);
      float tongues = fbm(vec3(cos(angle) * 2.6, sin(angle) * 2.6, time * 1.1));
      float strength = pow(1. - out_, 3.4) * (0.45 + tongues * 1.15) * (1. + swell * 0.9) * smoothstep(1., 0.92, r);
      strength = floor(strength * 4.) / 4.;
      gl_FragColor = vec4(mix(cNear, cFar, clamp(out_ * 1.6, 0., 1.)) * strength * gain, 1.);
    }
  `,
});

/** Rays round the disc as you see it, each flickering on its own clock, as the Foundry star's do. */
function makeRays(corona: readonly string[]) {
  const positions = new Float32Array(RAY_COUNT * 4 * 3);
  const rayData = new Float32Array(RAY_COUNT * 4 * 4);
  const colors = new Float32Array(RAY_COUNT * 4 * 3);
  const indices: number[] = [];
  const tint = new THREE.Color();
  for (let ray = 0; ray < RAY_COUNT; ray += 1) {
    const seed = hash(ray * 18.47 + 2.1);
    tint.set(corona[ray % corona.length]);
    [[0, -1], [0, 1], [1, -1], [1, 1]].forEach(([end, side], corner) => {
      rayData.set([(ray / RAY_COUNT) * TAU, seed, end, side], (ray * 4 + corner) * 4);
      tint.toArray(colors, (ray * 4 + corner) * 3);
    });
    const start = ray * 4;
    indices.push(start, start + 1, start + 2, start + 2, start + 1, start + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aRay", new THREE.BufferAttribute(rayData, 4));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { time: { value: 0 }, radius: { value: 1 }, energy: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec4 aRay;
      attribute vec3 aColor;
      uniform float time;
      uniform float radius;
      uniform float energy;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float seed = aRay.y;
        float angle = aRay.x + sin(time * (0.36 + seed * 0.18) + seed * 17.) * 0.08;
        float bright = max(0., 0.45 + 0.55 * sin(time * (2. + seed * 2.2) + seed * 31.));
        float reach = radius * (0.16 + seed * 0.29 + energy * (0.13 + seed * 0.26) + bright * 0.16);
        vec2 out_ = vec2(cos(angle), sin(angle));
        float thick = (mod(floor(aRay.x * 6.366), 5.) < 0.5 ? 0.085 : 0.055) * (1.6 + radius * 0.4) * (1. - aRay.z * 0.72);
        vec4 centre = modelViewMatrix * vec4(0., 0., 0., 1.);
        centre.xy += out_ * (radius * 1.02 + aRay.z * reach) + vec2(-out_.y, out_.x) * aRay.w * thick;
        vAlpha = (0.34 + bright * 0.5) * (1. - aRay.z * 0.55);
        vColor = aColor;
        gl_Position = projectionMatrix * centre;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        if (vAlpha < 0.4) discard;
        gl_FragColor = vec4(vColor * 1.3, 1.);
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  return { mesh, material };
}

/** The Flux swarm: each mote works out its own place from its seeds, on the graphics card. */
function makeSwarm(spec: StarSpec, inner: number, shown: number) {
  const seeds = new Float32Array(SWARM_SIZE * 4);
  const colors = new Float32Array(SWARM_SIZE * 3);
  const sizes = new Float32Array(SWARM_SIZE);
  const order = new Float32Array(SWARM_SIZE);
  const fed = spec.machines.filter((machine) => machine.count > 0);
  const tiers = (fed.length > 0 ? fed : spec.machines.slice(0, 1)).map((machine) => new THREE.Color(machine.color));
  const weights = tiers.map((_, tier) => (tier === 0 ? 3 : 1.6));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const white = new THREE.Color("#eaffff");
  for (let index = 0; index < SWARM_SIZE; index += 1) {
    seeds.set([hash(index * 4.37), hash(index * 9.91 + 3.1), hash(index * 15.13 + 7.7), index % 2 === 0 ? 1 : -1], index * 4);
    const seed = hash(index * 22.51);
    sizes[index] = seed > 0.93 ? 3 : seed > 0.72 ? 2 : 1;
    order[index] = hash(index * 3.3 + 0.9) * 0.999;
    let target = hash(index * 7.171 + 4.13) * total;
    let tier = 0;
    for (let candidate = 0; candidate < weights.length; candidate += 1) {
      target -= weights[candidate];
      if (target <= 0) {
        tier = candidate;
        break;
      }
    }
    const mote = index % 29 === 0 ? white : tiers[tier] ?? white;
    colors.set([mote.r, mote.g, mote.b], index * 3);
  }
  const place = /* glsl */ `
    attribute vec4 aSeed;
    uniform float phase;
    uniform float impulse;
    uniform float reach;
    uniform float inner;
    vec3 swarmAt(float t) {
      float seedA = aSeed.x;
      float seedB = aSeed.y;
      float seedC = aSeed.z;
      float base = inner + pow(seedA, 0.68) * (reach - inner);
      float wave = sin(t * (0.42 + seedB * 0.72) + seedC * 19.) * (0.29 + seedC * 1.);
      float breath = cos(t * (0.19 + seedA * 0.33) + seedB * 31.) * (0.12 + seedA * 0.45);
      float r = clamp(base + wave + breath + impulse * (0.4 + seedB * 1.4), inner * 0.72, reach + 0.3);
      float angle = seedB * 6.2832 + t * aSeed.w * (0.58 + seedA * 1.08) + sin(t * (0.23 + seedC * 0.28) + seedA * 25.) * 0.48;
      vec2 drift = vec2(sin(t * 0.21 + seedC * 13.) * (0.16 + seedB * 0.7), cos(t * 0.16 + seedA * 15.) * (0.16 + seedC * 0.58));
      vec3 p = vec3(cos(angle) * r + drift.x, sin(angle) * r * (0.78 + seedA * 0.17) + drift.y, 0.);
      // On the Foundry page they swirl in one plane; here each has an orbit of its own.
      float tiltA = (seedC - 0.5) * 3.1;
      float tiltB = (fract(seedA * 7.3) - 0.5) * 3.1;
      p = vec3(p.x, p.y * cos(tiltA), p.y * sin(tiltA));
      return vec3(p.x * cos(tiltB) + p.z * sin(tiltB), p.y, -p.x * sin(tiltB) + p.z * cos(tiltB));
    }
  `;
  const shared = {
    phase: { value: 0 },
    impulse: { value: 0 },
    reach: { value: SWARM_REACH },
    inner: { value: inner },
    shown: { value: shown },
  };
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SWARM_SIZE * 3), 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aOrder", new THREE.BufferAttribute(order, 1));
  const points = new THREE.Points(geometry, new THREE.ShaderMaterial({
    uniforms: shared,
    vertexShader: /* glsl */ `
      ${place}
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aOrder;
      uniform float shown;
      varying vec3 vColor;
      void main() {
        vColor = aColor;
        gl_Position = aOrder > shown ? vec4(2., 2., 2., 1.) : projectionMatrix * modelViewMatrix * vec4(swarmAt(phase), 1.);
        gl_PointSize = aSize + 1.;
      }
    `,
    fragmentShader: "varying vec3 vColor; void main() { gl_FragColor = vec4(vColor * 1.05, 1.); }",
  }));
  points.frustumCulled = false;
  points.raycast = () => {};

  // Short streaks behind one mote in five, from where each was a moment ago.
  const streakCount = Math.floor(SWARM_SIZE / 5);
  const pair = (source: Float32Array, width: number) => {
    const out = new Float32Array(streakCount * 2 * width);
    for (let index = 0; index < streakCount; index += 1) {
      for (let lane = 0; lane < width; lane += 1) {
        out[index * 2 * width + lane] = source[index * 5 * width + lane];
        out[(index * 2 + 1) * width + lane] = source[index * 5 * width + lane];
      }
    }
    return out;
  };
  const tails = new Float32Array(streakCount * 2);
  for (let index = 0; index < streakCount; index += 1) tails[index * 2 + 1] = 1;
  const streakGeometry = new THREE.BufferGeometry();
  streakGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(streakCount * 2 * 3), 3));
  streakGeometry.setAttribute("aSeed", new THREE.BufferAttribute(pair(seeds, 4), 4));
  streakGeometry.setAttribute("aColor", new THREE.BufferAttribute(pair(colors, 3), 3));
  streakGeometry.setAttribute("aOrder", new THREE.BufferAttribute(pair(order, 1), 1));
  streakGeometry.setAttribute("aTail", new THREE.BufferAttribute(tails, 1));
  const lag = { value: 0.05 };
  const streaks = new THREE.LineSegments(streakGeometry, new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { ...shared, lag },
    vertexShader: /* glsl */ `
      ${place}
      attribute vec3 aColor;
      attribute float aOrder;
      attribute float aTail;
      uniform float shown;
      uniform float lag;
      varying vec3 vColor;
      varying float vFade;
      void main() {
        vColor = aColor;
        vFade = 1. - aTail;
        gl_Position = aOrder > shown ? vec4(2., 2., 2., 1.) : projectionMatrix * modelViewMatrix * vec4(swarmAt(phase - aTail * lag), 1.);
      }
    `,
    fragmentShader: "varying vec3 vColor; varying float vFade; void main() { gl_FragColor = vec4(vColor * vFade * 0.45, 1.); }",
  }));
  streaks.frustumCulled = false;
  streaks.raycast = () => {};
  return { points, streaks, shared, lag };
}

export function buildStar(parent: THREE.Object3D, at: THREE.Vector3, spec: StarSpec, ringMaterial: THREE.Material) {
  const stage = Math.max(0, Math.min(STAR_RADII.length - 1, Math.round(spec.stage)));
  const core = STAR_RADII[stage];
  const root = new THREE.Group();
  root.position.copy(at);
  parent.add(root);
  const body = new THREE.Group();
  root.add(body);

  // The last star is nearly white, so it is held back to keep any surface at all.
  const hold = stage === 0 ? 0.6 : stage === 6 ? 0.72 : 1;
  const shellMaterial = coreMaterial(spec, 1.15 * hold);
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 24), shellMaterial);
  const coronaShader = coronaMaterial(spec.bright, spec.corona[0] ?? spec.surface, stage === 0 ? 0.3 : 0.7);
  const corona = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), coronaShader);
  corona.raycast = () => {};
  const rays = makeRays(spec.corona.length > 0 ? spec.corona : [spec.surface]);
  body.add(shell, corona, rays.mesh);

  // The swarm grows with the machines feeding the star, and takes their colours.
  const built = spec.machines.reduce((sum, machine) => sum + machine.count, 0);
  const shown = (SWARM_FULL[stage] * (0.55 + 0.45 * Math.min(1, built / (30 * (stage + 1))))) / SWARM_SIZE;
  const swarm = makeSwarm(spec, core * 1.25, shown);
  root.add(swarm.points, swarm.streaks);

  // One shard for each proven law: a sparkling cross on a tilted orbit.
  const shardCount = Math.min(SHARD_SIZE, spec.shards);
  const shardPositions = new Float32Array(SHARD_SIZE * 3);
  const shardColors = new Float32Array(SHARD_SIZE * 3);
  const shardSizes = new Float32Array(SHARD_SIZE);
  const trailPositions = new Float32Array(SHARD_SIZE * 2 * 3);
  const trailColors = new Float32Array(SHARD_SIZE * 2 * 3);
  const tint = new THREE.Color();
  for (let index = 0; index < SHARD_SIZE; index += 1) {
    shardSizes[index] = index % 4 === 0 ? 1 : 0.7;
    tint.set(index % 7 === 0 ? spec.core : spec.corona[index % Math.max(1, spec.corona.length)] ?? spec.shard);
    tint.toArray(shardColors, index * 3);
    tint.toArray(trailColors, index * 2 * 3);
  }
  const shardGeometry = new THREE.BufferGeometry();
  shardGeometry.setAttribute("position", new THREE.BufferAttribute(shardPositions, 3));
  shardGeometry.setAttribute("aColor", new THREE.BufferAttribute(shardColors, 3));
  shardGeometry.setAttribute("aSize", new THREE.BufferAttribute(shardSizes, 1));
  shardGeometry.setDrawRange(0, shardCount);
  const pointScale = { value: 180 };
  const shards = new THREE.Points(shardGeometry, new THREE.ShaderMaterial({
    uniforms: { pointScale, cCore: { value: new THREE.Color(spec.core) } },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aSize;
      uniform float pointScale;
      varying vec3 vColor;
      void main() {
        vec4 view = modelViewMatrix * vec4(position, 1.);
        vColor = aColor;
        gl_Position = projectionMatrix * view;
        gl_PointSize = max(7., floor(1.5 * aSize * pointScale / -view.z));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 cCore;
      varying vec3 vColor;
      void main() {
        vec2 p = abs(gl_PointCoord * 2. - 1.);
        if (p.x > 0.17 && p.y > 0.17) discard;
        gl_FragColor = vec4((p.x < 0.27 && p.y < 0.27 ? cCore : vColor) * 1.3, 1.);
      }
    `,
  }));
  shards.frustumCulled = false;
  shards.raycast = () => {};
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
  trailGeometry.setAttribute("color", new THREE.BufferAttribute(trailColors, 3));
  trailGeometry.setDrawRange(0, shardCount * 2);
  const trails = new THREE.LineSegments(trailGeometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
  trails.frustumCulled = false;
  trails.raycast = () => {};
  root.add(shards, trails);

  // The cradle: three rings, each hung inside the last, so the star can turn any way at all.
  const bandMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(spec.bright).multiplyScalar(stage === 0 ? 0.3 : 1.6) });
  const cradle: THREE.Group[] = [];
  let holder: THREE.Object3D = root;
  [...CRADLE].reverse().forEach((radius) => {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.TorusGeometry(radius, 0.15, 14, 96), ringMaterial));
    group.add(new THREE.Mesh(new THREE.TorusGeometry(radius - 0.16, 0.03, 6, 96), bandMaterial));
    for (const angle of [0, Math.PI]) {
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.46, 12), ringMaterial);
      hinge.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      hinge.rotation.z = Math.PI / 2;
      group.add(hinge);
    }
    group.traverse((object) => { object.raycast = () => {}; });
    holder.add(group);
    holder = group;
    cradle.push(group);
  });

  // The beat is this star's own, irregular where its rhythm is.
  const profile = getPulseProfile(STAGE_AXIOMS[stage]);
  const turn = SWARM_TURNS[stage] * TAU;
  swarm.lag.value = Math.min(0.14, 0.02 + turn * 0.07);
  const axiomOrder = Math.log2(STAGE_AXIOMS[stage] + 1);
  const dubAt = profile.voice === "faint" ? null : profile.voice === "racing" ? 100 : profile.voice === "serene" ? 220 : 170;
  let lastBeat = 0;
  let nextBeat = 0;
  let phase = 0;
  let orbit = 0;
  const quarter = new THREE.Quaternion();
  const info = { stage, motes: Math.round(shown * SWARM_SIZE), shards: shardCount, built, swell: 0, beats: 0 };
  const shardAt = (index: number, angle: number, out: Float32Array, cursor: number) => {
    const seedA = hash(index * 17.31 + 4.7);
    const seedB = hash(index * 29.77 + 9.1);
    const distance = core + 1.1 + (index % 3) * 0.65 + seedA * (0.5 + axiomOrder * 0.07);
    const y = Math.sin(angle) * distance * (0.52 + seedB * 0.3) + Math.sin(orbit * 0.37 + seedA * 22) * (0.1 + seedB * 0.2);
    const tilt = (index % 5) * 0.7 - 1.4 + seedA * 0.5;
    out[cursor] = Math.cos(angle) * distance;
    out[cursor + 1] = y * Math.cos(tilt);
    out[cursor + 2] = y * Math.sin(tilt);
  };
  return {
    /** What the drone strikes. */
    shell,
    info,
    /** Motes and shards are sized to the height of the picture they are drawn into. */
    setScreen: (height: number) => { pointScale.value = height / (2 * Math.tan((36 * Math.PI) / 180)); },
    /** One frame. Says how swollen the star is, and whether a beat landed on this frame. */
    update(now: number, dt: number, camera: THREE.Camera, strike: number, still: boolean) {
      const time = now / 1000;
      let beat = false;
      if (now >= nextBeat) {
        beat = true;
        lastBeat = now;
        const stray = 1 + (Math.random() * 2 - 1) * profile.jitter;
        const roll = Math.random();
        const shape = roll < profile.skip ? 1.5 : roll < profile.skip + profile.flutter ? 0.5 : 1;
        nextBeat = now + profile.periodMs * stray * shape;
      }
      const since = now - lastBeat;
      const until = nextBeat - now;
      const lub = Math.exp(-since / (profile.voice === "racing" ? 70 : 110));
      const dub = dubAt !== null && since > dubAt ? 0.45 * Math.exp(-(since - dubAt) / 90) : 0;
      const echo = profile.voice === "echo" && since > 360 ? 0.22 * Math.exp(-(since - 360) / 110) : 0;
      const swell = still ? 0 : (lub + dub + echo) * profile.strength + strike;
      info.swell = swell;
      if (beat) info.beats += 1;
      const squeeze = !still && until < 180 ? 1 - until / 180 : 0;
      // The Foundry star is 31 pixels and swells by as much as 9: the same share here.
      const radius = core * (1 + (swell * 7 - squeeze * 1.8) / 31);

      shell.scale.setScalar(radius);
      shell.rotation.y = time * 0.09;
      corona.scale.setScalar(radius * 2.5);
      corona.quaternion.copy(camera.quaternion).premultiply(root.getWorldQuaternion(quarter).invert());
      const shake = profile.tremor * (0.03 + swell * 0.09);
      body.position.set(Math.sin(time * 91) * Math.sin(time * 37 + 1.3) * shake, Math.sin(time * 73 + 2.1) * Math.sin(time * 29) * shake, 0);
      shellMaterial.uniforms.time.value = time;
      shellMaterial.uniforms.swell.value = swell;
      coronaShader.uniforms.time.value = time;
      coronaShader.uniforms.swell.value = swell;
      rays.material.uniforms.time.value = time;
      rays.material.uniforms.radius.value = radius;
      rays.material.uniforms.energy.value = 0.45 + swell * 0.55;
      phase += dt * turn;
      swarm.shared.phase.value = phase;
      swarm.shared.impulse.value = Math.min(1.4, swell * 0.42);

      orbit += dt * (0.26 + stage * 0.09);
      for (let index = 0; index < shardCount; index += 1) {
        const seedA = hash(index * 17.31 + 4.7);
        const direction = index % 5 === 0 ? -1 : 1;
        const angle = hash(index * 29.77 + 9.1) * TAU + orbit * direction * (0.72 + seedA * 0.7);
        shardAt(index, angle, shardPositions, index * 3);
        shardAt(index, angle, trailPositions, index * 2 * 3);
        shardAt(index, angle - direction * 0.32, trailPositions, (index * 2 + 1) * 3);
      }
      shardGeometry.attributes.position.needsUpdate = true;
      trailGeometry.attributes.position.needsUpdate = true;

      cradle[0].rotation.x = time * 0.11;
      cradle[1].rotation.y = time * 0.17;
      cradle[2].rotation.x = -time * 0.13;
      return { swell, beat };
    },
  };
}
