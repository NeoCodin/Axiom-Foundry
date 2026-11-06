/*
 * The richer pixel finish, the look the owner chose on the comparison page: the frame is drawn
 * small, then given dark outlines where things stand in front of each other, chunky glow, a
 * palette that leans violet in shadow and warm in light, and an ordered dither down to a limited
 * set of colours. It takes any scene and camera, and draws at the renderer's current size,
 * to the screen or into a target for something else to finish off.
 */
import * as THREE from "three";

const FRAGMENT = /* glsl */ `
  uniform sampler2D tColor;
  uniform sampler2D tDepth;
  uniform vec2 resolution;
  uniform float near;
  uniform float far;
  uniform float toTarget;
  varying vec2 vUv;
  const float BAYER[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
  float distanceAt(vec2 uv) {
    float depth = texture2D(tDepth, uv).x * 2. - 1.;
    return 2. * near * far / (far + near - depth * (far - near));
  }
  void main() {
    vec2 texel = 1. / resolution;
    vec3 color = texture2D(tColor, vUv).rgb;
    // Lit things bleed a little light onto their neighbours, in chunky steps.
    vec3 glow = vec3(0.);
    for (int y = -3; y <= 3; y++) {
      for (int x = -3; x <= 3; x++) {
        vec3 nearby = texture2D(tColor, vUv + vec2(float(x), float(y)) * texel * 2.).rgb;
        glow += max(nearby - 1.05, vec3(0.)) * (1. - length(vec2(x, y)) / 5.);
      }
    }
    color += glow * 0.075;
    // A dark line wherever something stands in front of what is behind it.
    float here = distanceAt(vUv);
    float edge = 0.;
    edge = max(edge, distanceAt(vUv + vec2(texel.x, 0.)) - here);
    edge = max(edge, distanceAt(vUv - vec2(texel.x, 0.)) - here);
    edge = max(edge, distanceAt(vUv + vec2(0., texel.y)) - here);
    edge = max(edge, distanceAt(vUv - vec2(0., texel.y)) - here);
    color *= 1. - smoothstep(0.035, 0.09, edge / here) * 0.55;
    // Shadows lean violet and light leans warm, like a painted palette.
    vec3 screen = pow(max(color, vec3(0.)), vec3(1. / 2.2));
    float light = dot(screen, vec3(0.3, 0.59, 0.11));
    screen = mix(screen * vec3(0.8, 0.72, 1.02) + vec3(0.025, 0.01, 0.06), screen * vec3(1.05, 1., 0.92), smoothstep(0.1, 0.72, light));
    screen *= 1. - smoothstep(0.3, 0.8, length(vUv - 0.5)) * 0.3;
    // Limited colours with an ordered dither, the mark of the style.
    ivec2 cell = ivec2(mod(gl_FragCoord.xy, 4.));
    float dither = BAYER[cell.y * 4 + cell.x] / 16. - 0.47;
    const float LEVELS = 11.;
    screen = floor(screen * LEVELS + dither * 0.9 + 0.5) / LEVELS;
    // A target takes linear light and encodes it itself; the screen is sent the colours as they are.
    gl_FragColor = vec4(toTarget > 0.5 ? pow(max(screen, vec3(0.)), vec3(2.2)) : screen, 1.);
  }
`;

export function createPixelFinish(renderer: THREE.WebGLRenderer) {
  const depth = new THREE.DepthTexture(1, 1);
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    generateMipmaps: false,
    depthTexture: depth,
  });
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: target.texture },
      tDepth: { value: depth },
      resolution: { value: new THREE.Vector2(1, 1) },
      near: { value: 0.1 },
      far: { value: 100 },
      toTarget: { value: 0 },
    },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
    fragmentShader: FRAGMENT,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Scene();
  quad.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  const flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const size = new THREE.Vector2();
  return {
    render(scene: THREE.Scene, camera: THREE.PerspectiveCamera, output: THREE.WebGLRenderTarget | null = null) {
      renderer.getDrawingBufferSize(size);
      if (target.width !== size.x || target.height !== size.y) {
        target.setSize(size.x, size.y);
        material.uniforms.resolution.value.copy(size);
      }
      material.uniforms.near.value = camera.near;
      material.uniforms.far.value = camera.far;
      material.uniforms.toTarget.value = output ? 1 : 0;
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(output);
      renderer.render(quad, flat);
      if (output) renderer.setRenderTarget(null);
    },
    dispose() {
      target.dispose();
      depth.dispose();
      material.dispose();
    },
  };
}
