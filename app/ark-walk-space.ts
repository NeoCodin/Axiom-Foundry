/*
 * What is outside the Ark's windows. Every world has a star of its own and sits in that star's
 * habitable reach: Cinder close in under a huge white-hot sun, Nox far out by a small dim red one,
 * Vesper under a pair. The sun is really what lights the planet, so its day side, terminator and
 * night follow it. Planets are drawn on the graphics card from noise, each by what the campaign
 * says it is, with moons, neighbouring planets and a nebula behind. Drawn for the richer pixel
 * finish: light and colour fall in flat steps. In deep space there is no world to see, only the
 * star ahead.
 */
import * as THREE from "three";

export type PlanetLook = {
  kind: "ocean" | "jungle" | "lava" | "ice" | "storm" | "rock";
  seed: number;
  deep: string;
  shallow: string;
  low: string;
  high: string;
  peak: string;
  ice: string;
  cloud: string;
  air: string;
  sea: number;
  cover: number;
  glow: string;
};

type Body = { radius: number; at: [number, number, number]; look: PlanetLook; ring?: string };

export type StarSystem = {
  world: string;
  sun: { color: string; hot: string; size: number; dir: [number, number, number] };
  companion?: { color: string; size: number; dir: [number, number, number] };
  planet: PlanetLook;
  moons: { radius: number; orbit: number; speed: number; tilt: number; look: PlanetLook }[];
  neighbours: Body[];
  nebula: [string, string];
};

const moon = (seed: number, low: string, high: string): PlanetLook => ({
  kind: "rock", seed, deep: low, shallow: low, low, high, peak: "#e8e4dc", ice: "#ffffff", cloud: "#ffffff", air: "#000000", sea: 0, cover: 0, glow: "#000000",
});

export const SYSTEMS: readonly StarSystem[] = [
  {
    world: "Pelagos",
    sun: { color: "#fff0d0", hot: "#ffffff", size: 44, dir: [-0.5, 0.18, -0.85] },
    planet: { kind: "ocean", seed: 17, deep: "#06305a", shallow: "#0d7fa8", low: "#c9b98a", high: "#5f8a5a", peak: "#d8dcd4", ice: "#eef6fa", cloud: "#f2f8fa", air: "#6fd8ff", sea: 0.62, cover: 0.5, glow: "#ffd79a" },
    moons: [
      { radius: 9, orbit: 190, speed: 0.012, tilt: 0.3, look: moon(4, "#6a6a70", "#b4b2ac") },
      { radius: 4, orbit: 240, speed: 0.02, tilt: -0.2, look: moon(9, "#7a6a5c", "#b8a48c") },
    ],
    neighbours: [{ radius: 13, at: [-300, 110, 240], look: { ...moon(21, "#c9a878", "#e8d4ac"), kind: "storm", cloud: "#f4e8d0" } }],
    nebula: ["#10305a", "#3a2a6a"],
  },
  {
    world: "Viridia",
    sun: { color: "#ffd890", hot: "#fff4d0", size: 58, dir: [0.55, 0.3, 0.78] },
    planet: { kind: "jungle", seed: 31, deep: "#0a3a4a", shallow: "#14707a", low: "#1f6a3a", high: "#4fa050", peak: "#a8b878", ice: "#dff0e0", cloud: "#e4f4dc", air: "#8cffb4", sea: 0.42, cover: 0.46, glow: "#7dffa0" },
    moons: [{ radius: 12, orbit: 210, speed: 0.01, tilt: 0.4, look: moon(13, "#5a6a5c", "#a8b4a0") }],
    neighbours: [{ radius: 18, at: [-260, 150, -280], look: { ...moon(27, "#7a5a8a", "#c8a8c8"), kind: "storm", cloud: "#e8d8ec" }, ring: "#c8b8d8" }],
    nebula: ["#0f3a30", "#2a4a2a"],
  },
  {
    world: "Cinder",
    sun: { color: "#ffc890", hot: "#ffffff", size: 130, dir: [0.3, 0.28, 0.91] },
    planet: { kind: "lava", seed: 47, deep: "#1a0a08", shallow: "#32140e", low: "#2a1410", high: "#4a2418", peak: "#6a3a26", ice: "#8a7a70", cloud: "#6a5a54", air: "#ff8a3a", sea: 0.5, cover: 0.22, glow: "#ff6a1e" },
    moons: [{ radius: 5, orbit: 170, speed: 0.03, tilt: 0.1, look: moon(33, "#4a3a34", "#8a6a58") }],
    neighbours: [],
    nebula: ["#4a1a10", "#5a2a14"],
  },
  {
    world: "Nox",
    sun: { color: "#ff8a6a", hot: "#ffc8a8", size: 20, dir: [-0.72, 0.2, -0.66] },
    planet: { kind: "ice", seed: 73, deep: "#120a2a", shallow: "#2a1a52", low: "#3a2a6a", high: "#6a5aa0", peak: "#b8b0e0", ice: "#dcd8f4", cloud: "#a898e0", air: "#b17cff", sea: 0.46, cover: 0.3, glow: "#7dffcf" },
    moons: [
      { radius: 7, orbit: 200, speed: 0.008, tilt: 0.5, look: moon(41, "#3a3448", "#7a7490") },
      { radius: 3, orbit: 150, speed: 0.024, tilt: -0.4, look: moon(44, "#3a3448", "#8a84a0") },
    ],
    neighbours: [{ radius: 26, at: [300, 120, -260], look: { ...moon(52, "#2a3a6a", "#7a9ad0"), kind: "storm", cloud: "#b8c8ec" }, ring: "#8a94c0" }],
    nebula: ["#1a0f3a", "#3a1a5a"],
  },
  {
    world: "Vesper",
    sun: { color: "#e4ecff", hot: "#ffffff", size: 40, dir: [0.34, 0.2, -0.92] },
    companion: { color: "#ffb078", size: 15, dir: [0.54, 0.13, -0.83] },
    planet: { kind: "storm", seed: 91, deep: "#5a2018", shallow: "#8a3a22", low: "#a85a30", high: "#d0844a", peak: "#f0b878", ice: "#fff0dc", cloud: "#f4d4b0", air: "#ff9a6a", sea: 0.5, cover: 0.55, glow: "#fff4dc" },
    moons: [{ radius: 8, orbit: 220, speed: 0.011, tilt: 0.25, look: moon(61, "#6a4a40", "#b48c78") }],
    neighbours: [],
    nebula: ["#3a1420", "#4a2a18"],
  },
];

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
    for (int octave = 0; octave < 5; octave++) {
      total += amount * vnoise(p);
      p = p * 2.03 + vec3(1.7, 9.2, 3.1);
      amount *= 0.5;
    }
    return total / 0.97;
  }
`;

const KINDS = { ocean: 0, jungle: 1, lava: 2, ice: 3, storm: 4, rock: 5 };

/** A world's surface and clouds, lit by its sun in flat steps with a warm line at the terminator. */
export function planetMaterial(look: PlanetLook, sun: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      sun: { value: sun.clone() },
      seed: { value: look.seed },
      kind: { value: KINDS[look.kind] },
      sea: { value: look.sea },
      cover: { value: look.cover },
      cDeep: { value: new THREE.Color(look.deep) },
      cShallow: { value: new THREE.Color(look.shallow) },
      cLow: { value: new THREE.Color(look.low) },
      cHigh: { value: new THREE.Color(look.high) },
      cPeak: { value: new THREE.Color(look.peak) },
      cIce: { value: new THREE.Color(look.ice) },
      cCloud: { value: new THREE.Color(look.cloud) },
      cAir: { value: new THREE.Color(look.air) },
      cGlow: { value: new THREE.Color(look.glow) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vSphere;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vSphere = normalize(position);
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 world = modelMatrix * vec4(position, 1.);
        vView = normalize(cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 sun;
      uniform float seed;
      uniform float kind;
      uniform float sea;
      uniform float cover;
      uniform vec3 cDeep;
      uniform vec3 cShallow;
      uniform vec3 cLow;
      uniform vec3 cHigh;
      uniform vec3 cPeak;
      uniform vec3 cIce;
      uniform vec3 cCloud;
      uniform vec3 cAir;
      uniform vec3 cGlow;
      varying vec3 vSphere;
      varying vec3 vNormal;
      varying vec3 vView;
      ${NOISE}
      vec3 ramp(vec3 a, vec3 b, float t) { return mix(a, b, floor(clamp(t, 0., 1.) * 4. + 0.5) / 4.); }
      void main() {
        vec3 p = vSphere;
        vec3 q = p + seed * 0.37;
        float warp = fbm(q * 1.7) - 0.5;
        float land = fbm(q * 2.3 + warp * 1.2);
        float rough = fbm(q * 9. + 3.);
        float lat = abs(p.y);
        vec3 color;
        vec3 emit = vec3(0.);
        float cloudAmount = 0.;
        float wind = time * 0.004;
        if (kind < 0.5 || kind > 0.5 && kind < 1.5) {
          // Water and land: seas by depth, shores, plains up to bare peaks, ice at the poles.
          float above = land - sea + (rough - 0.5) * 0.08;
          if (above < 0.) color = ramp(cDeep, cShallow, 1. + above * 7.);
          else if (above < 0.02) color = cLow;
          else color = above < 0.13 ? ramp(cLow, cHigh, above * 9.) : ramp(cHigh, cPeak, (above - 0.13) * 6.);
          if (kind < 0.5 && above >= 0.) color = mix(color, cHigh, 0.4);
          float cap = smoothstep(0.8, 0.9, lat + (rough - 0.5) * 0.22);
          color = mix(color, cIce, cap);
          float swirl = fbm(vec3(p.x * 2.2 + wind, p.y * 4.4, p.z * 2.2 - wind) + warp * 2.2 + seed);
          cloudAmount = smoothstep(cover, cover + 0.05, swirl);
          // Lights along the coasts where anyone is left.
          if (kind > 0.5 && above > 0. && above < 0.08 && hash31(floor(p * 240.)) > 0.9) emit = cGlow * 1.4;
        } else if (kind < 2.5) {
          // Basalt plates split by rivers of lava, brighter in the deep cracks.
          float plates = abs(fbm(q * 3.4 + warp * 1.6) - 0.5);
          color = ramp(cLow, cPeak, rough * 1.1 - 0.1);
          float crack = smoothstep(0.03, 0.006, plates);
          float wide = smoothstep(0.075, 0.02, plates);
          emit = cGlow * wide * 0.7 + vec3(1., 0.82, 0.46) * crack * 1.9;
          color = mix(color, cDeep, wide * 0.7);
          float ash = fbm(vec3(p.x * 2. + wind, p.y * 3.5, p.z * 2.) + warp + seed);
          cloudAmount = smoothstep(cover + 0.34, cover + 0.42, ash) * 0.8;
        } else if (kind < 3.5) {
          // Frozen seas and pressure ridges, with relays lit along them and the aurora at the poles.
          float ridge = abs(fbm(q * 4. + warp) - 0.5);
          color = ramp(cShallow, cHigh, land * 1.5 - 0.1);
          color = mix(color, cIce, smoothstep(0.05, 0.015, ridge) * 0.8);
          color = mix(color, cPeak, smoothstep(0.62, 0.8, lat + (rough - 0.5) * 0.3));
          if (ridge < 0.03 && hash31(floor(p * 70.)) > 0.94) emit = cGlow * 1.6;
          float swirl = fbm(p * 3. + wind + seed);
          cloudAmount = smoothstep(cover + 0.28, cover + 0.34, swirl) * 0.55;
        } else if (kind < 4.5) {
          // Bands of storm wrapped round the world, broken by eddies.
          float flow = warp * 1.6 + (fbm(q * 5.) - 0.5) * 0.6;
          float bands = 0.5 + 0.5 * sin((p.y + flow * 0.32) * 19. + seed);
          color = ramp(cDeep, cHigh, bands);
          color = mix(color, cPeak, smoothstep(0.66, 0.84, fbm(vec3(p.x * 3. + wind * 2., p.y * 11., p.z * 3.) + seed)) * 0.8);
          float eye = length(p - normalize(vec3(0.5, 0.3 * sin(seed), 0.8)));
          color = mix(color, cIce, smoothstep(0.17, 0.09, eye + warp * 0.2) * 0.7);
          // Only Vesper's law is broken: white scars across its face.
          if (cGlow.r > 0.5) {
            float scar = abs(fbm(q * vec3(1.6, 4.4, 1.6) + 7.3) - 0.5);
            float mask = smoothstep(0.5, 0.62, fbm(p * 1.4 + 4.1));
            emit = cGlow * smoothstep(0.012, 0.003, scar) * mask * 2.2;
          }
        } else {
          // Bare rock and craters.
          color = ramp(cLow, cHigh, land * 1.4 - 0.15);
          vec3 cell = floor(p * 9.);
          float pit = length(fract(p * 9.) - 0.5);
          if (hash31(cell + seed) > 0.8) color *= pit < 0.3 ? 0.68 : pit < 0.36 ? 1.2 : 1.;
        }
        float sunlit = dot(normalize(vNormal), sun);
        float light = clamp(sunlit * 1.3 + 0.12, 0., 1.);
        float stepped = floor(light * 6. + 0.5) / 6.;
        vec3 surface = mix(color, cCloud, cloudAmount);
        vec3 lit = surface * (0.02 + stepped * 1.2);
        // A warm line where day turns to night.
        lit += cAir * smoothstep(0.12, 0., abs(sunlit)) * smoothstep(-0.12, 0.02, sunlit) * 0.14;
        // The air thickens at the rim of the lit side.
        float rim = pow(1. - clamp(dot(normalize(vNormal), vView), 0., 1.), 2.6);
        lit = mix(lit, cAir * (0.5 + stepped), rim * 0.8 * clamp(sunlit + 0.2, 0., 1.));
        // What glows shows best on the dark side; cloud dims it.
        lit += emit * (1. - cloudAmount * 0.7) * (0.5 + 0.5 * (1. - stepped));
        gl_FragColor = vec4(lit, 1.);
        #include <colorspace_fragment>
      }
    `,
  });
}

/** The thin glow of air beyond the planet's edge, on the side the sun is on. */
export function airMaterial(color: string, sun: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    uniforms: { glow: { value: new THREE.Color(color) }, sun: { value: sun.clone() } },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.);
        vNormal = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 glow;
      uniform vec3 sun;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float edge = pow(clamp(dot(-normalize(vNormal), normalize(vView)), 0., 1.), 5.);
        float day = clamp(dot(normalize(vNormal), sun) + 0.3, 0., 1.);
        gl_FragColor = vec4(glow * floor(edge * day * 5. + 0.5) / 5. * 1.1, 1.);
        #include <colorspace_fragment>
      }
    `,
  });
}

/** A sun: a white disc, a blazing limb, flickering tongues and a wide stepped glare. */
function sunMaterial(color: string, hot: string) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    uniforms: { time: { value: 0 }, cColor: { value: new THREE.Color(color) }, cHot: { value: new THREE.Color(hot) } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 cColor;
      uniform vec3 cHot;
      varying vec2 vUv;
      ${NOISE}
      void main() {
        vec2 p = vUv * 2. - 1.;
        float r = length(p);
        float angle = atan(p.y, p.x);
        const float DISC = 0.17;
        float tongues = fbm(vec3(cos(angle) * 2.6, sin(angle) * 2.6, time * 0.16));
        float corona = pow(clamp(1. - (r - DISC) / (0.42 * (0.45 + tongues)), 0., 1.), 2.2);
        float glare = pow(clamp(1. - r, 0., 1.), 3.2) * 0.65;
        float rays = pow(max(0., cos(angle * 3. + 0.4)), 40.) * pow(clamp(1. - r, 0., 1.), 1.4) * 0.4;
        float total = floor((corona * 0.9 + glare + rays) * 7.) / 7.;
        float grain = fbm(vec3(p * 9., time * 0.2));
        vec3 color = cColor * total * 1.6;
        if (r < DISC) color = mix(cColor * 2.2, cHot * 3.2, smoothstep(DISC, DISC * 0.7, r) * (0.75 + grain * 0.4));
        gl_FragColor = vec4(color * smoothstep(1., 0.94, r), 1.);
      }
    `,
  });
}

/** Deep space behind everything, in two faint colours of dust, in steps. */
function nebulaMaterial(a: string, b: string) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { cA: { value: new THREE.Color(a) }, cB: { value: new THREE.Color(b) } },
    vertexShader: "varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
    fragmentShader: /* glsl */ `
      uniform vec3 cA;
      uniform vec3 cB;
      varying vec3 vDir;
      ${NOISE}
      void main() {
        vec3 d = normalize(vDir);
        float cloud = fbm(d * 2.1 + fbm(d * 1.3) * 1.4);
        float other = fbm(d * 2.7 + 7.);
        float a = floor(smoothstep(0.56, 0.86, cloud) * 4.) / 4.;
        float b = floor(smoothstep(0.58, 0.86, other) * 4.) / 4.;
        gl_FragColor = vec4(cA * a * 0.3 + cB * b * 0.24, 1.);
      }
    `,
  });
}

const inert = <T extends THREE.Object3D>(object: T) => {
  object.raycast = () => {};
  return object;
};

/** Which world the Ark is at, and which star it is flying towards if it is at none. */
export function systemFor(worldName: string) {
  const here = SYSTEMS.find((system) => system.world === worldName);
  if (here) return { system: here, deep: false };
  const ahead = SYSTEMS.find((system) => worldName.includes(system.world));
  return { system: ahead ?? SYSTEMS[0], deep: true };
}

/**
 * Everything outside, put in `sky`. `below` is where the planet sits relative to the sky's centre
 * and `radius` its size. In deep space the world is a far point of light by a small far sun.
 */
export function buildSpace(sky: THREE.Object3D, worldName: string, below: THREE.Vector3, radius: number) {
  const { system, deep } = systemFor(worldName);
  const sunDir = new THREE.Vector3(...system.sun.dir).normalize();
  const nebula = inert(new THREE.Mesh(new THREE.SphereGeometry(460, 32, 24), nebulaMaterial(system.nebula[0], system.nebula[1])));
  nebula.renderOrder = -2;
  sky.add(nebula);

  const suns: { mesh: THREE.Mesh; material: THREE.ShaderMaterial }[] = [];
  const addSun = (dir: THREE.Vector3, color: string, hot: string, size: number) => {
    const material = sunMaterial(color, hot);
    const mesh = inert(new THREE.Mesh(new THREE.PlaneGeometry(size * 2 / 0.17, size * 2 / 0.17), material));
    mesh.position.copy(dir).multiplyScalar(430);
    mesh.renderOrder = -1;
    sky.add(mesh);
    suns.push({ mesh, material });
  };
  addSun(sunDir, system.sun.color, system.sun.hot, deep ? 4 : system.sun.size * 0.6);
  if (system.companion && !deep) addSun(new THREE.Vector3(...system.companion.dir).normalize(), system.companion.color, system.companion.color, system.companion.size * 0.6);

  const planet = new THREE.Group();
  planet.position.copy(below);
  planet.rotation.z = 0.32;
  sky.add(planet);
  const surface = planetMaterial(system.planet, sunDir);
  const ground = inert(new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 44), surface));
  const air = inert(new THREE.Mesh(new THREE.SphereGeometry(radius * 1.05, 48, 32), airMaterial(system.planet.air, sunDir)));
  planet.add(ground, air);

  const moons = (deep ? [] : system.moons).map((entry) => {
    const material = planetMaterial(entry.look, sunDir);
    const mesh = inert(new THREE.Mesh(new THREE.SphereGeometry(entry.radius, 24, 16), material));
    sky.add(mesh);
    return { mesh, entry };
  });
  const neighbours = deep ? [] : system.neighbours;
  for (const body of neighbours) {
    const mesh = inert(new THREE.Mesh(new THREE.SphereGeometry(body.radius, 32, 20), planetMaterial(body.look, sunDir)));
    mesh.position.set(...body.at);
    sky.add(mesh);
    if (body.ring) {
      const ring = inert(new THREE.Mesh(
        new THREE.RingGeometry(body.radius * 1.4, body.radius * 2.2, 48),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(body.ring).multiplyScalar(0.5), side: THREE.DoubleSide, fog: false }),
      ));
      ring.position.copy(mesh.position);
      ring.rotation.set(1.2, 0.2, 0);
      sky.add(ring);
    }
  }

  return {
    system,
    deep,
    sunDir,
    update(time: number, camera: THREE.Camera) {
      const seconds = time / 1000;
      ground.rotation.y = seconds * 0.006;
      surface.uniforms.time.value = seconds;
      for (const { mesh, material } of suns) {
        material.uniforms.time.value = seconds;
        mesh.quaternion.copy(camera.quaternion);
      }
      for (const { mesh, entry } of moons) {
        const angle = seconds * entry.speed + entry.radius;
        mesh.position.set(
          below.x + Math.cos(angle) * entry.orbit,
          below.y + Math.sin(angle) * entry.orbit * Math.sin(entry.tilt) + 40,
          below.z + Math.sin(angle) * entry.orbit,
        );
      }
    },
  };
}
