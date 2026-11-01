import assert from "node:assert/strict";
import test from "node:test";

// A small stand-in for Web Audio: enough to build the soundscape graph and read it back.
class FakeParam {
  value = 0;
  setTargetAtTime(value: number) {
    this.value = value;
  }
  setValueAtTime(value: number) {
    this.value = value;
  }
  exponentialRampToValueAtTime(value: number) {
    this.value = value;
  }
}
class FakeNode {
  connections: FakeNode[] = [];
  connect(target: FakeNode | FakeParam) {
    if (target instanceof FakeNode) this.connections.push(target);
    return target;
  }
  disconnect() {
    this.connections = [];
  }
}
let started = 0;
let stopped = 0;
class FakeScheduled extends FakeNode {
  start() {
    started += 1;
  }
  stop() {
    stopped += 1;
  }
}
class FakeGain extends FakeNode { gain = new FakeParam(); }
class FakePanner extends FakeNode { pan = new FakeParam(); }
class FakeOscillator extends FakeScheduled { frequency = new FakeParam(); type = "sine"; }
class FakeFilter extends FakeNode { frequency = new FakeParam(); Q = new FakeParam(); type = "lowpass"; }
class FakeSource extends FakeScheduled { buffer: unknown = null; loop = false; }
class FakeContext {
  state = "running";
  currentTime = 1;
  sampleRate = 8000;
  destination = new FakeNode();
  createGain() { return new FakeGain(); }
  createStereoPanner() { return new FakePanner(); }
  createOscillator() { return new FakeOscillator(); }
  createBiquadFilter() { return new FakeFilter(); }
  createBufferSource() { return new FakeSource(); }
  createBuffer(_channels: number, length: number, sampleRate: number) {
    return { sampleRate, getChannelData: () => new Float32Array(length) };
  }
  resume() {}
}
Object.assign(globalThis, {
  window: {
    AudioContext: FakeContext,
    localStorage: { getItem: () => null, setItem: () => {} },
    setTimeout: (run: () => void) => run(),
  },
});

const { unlockPulseAudio } = await import("../app/law-heart-audio.ts");
const { createSoundscape, hearing } = await import("../app/ark-walk-audio.ts");

const listener = { x: 0, y: 1.6, z: 0, yaw: 0, deck: 0, speed: 0 };

test("a sound is loud close by, silent far off, and faint through a deck's floor", () => {
  const close = hearing(listener, { x: 1, y: 1.6, z: 0 }, 0, 12, 1);
  const far = hearing(listener, { x: 30, y: 1.6, z: 0 }, 0, 12, 1);
  const below = hearing(listener, { x: 1, y: 1.6, z: 0 }, 1, 12, 1);
  assert.ok(close.gain > 0.8);
  assert.equal(far.gain, 0);
  assert.ok(below.gain < close.gain * 0.2 && below.gain > 0);
  assert.equal(hearing(listener, { x: 1, y: 1.6, z: 0 }, null, 12, 1).gain, close.gain, "the core is heard from both decks");
});

test("a sound on the drone's right comes from the right speaker", () => {
  // Facing +x (yaw 0), the drone's right is +z, the way it strafes.
  assert.ok(hearing(listener, { x: 0, y: 1.6, z: 5 }, 0, 12, 1).pan > 0.5);
  assert.ok(hearing(listener, { x: 0, y: 1.6, z: -5 }, 0, 12, 1).pan < -0.5);
  assert.equal(hearing(listener, { x: 5, y: 1.6, z: 0 }, 0, 12, 1).pan, 0, "dead ahead is centred");
});

test("the soundscape builds on the shared output, follows the drone and the bay, and stops cleanly", () => {
  assert.equal(createSoundscape([], () => ({ alarm: false, venting: false, engines: 0, ship: null })), null, "silent until a press starts audio");
  unlockPulseAudio();
  const bay = { alarm: true, venting: true, engines: 1, ship: { x: 5, y: 2, z: 0 } };
  const scape = createSoundscape(
    ["press", "conveyor", "star", "tanks", "fan", "servers", "helm", "mess", "bay"].map((kind, index) => ({
      kind: kind as "press",
      x: index * 3,
      y: 1,
      z: 0,
      deck: kind === "star" ? null : 0,
      online: true,
    })),
    () => bay,
  );
  assert.ok(scape);
  for (let frame = 0; frame < 5; frame += 1) scape.update({ ...listener, speed: 6 });
  scape.lift(true);
  assert.ok(started > 10, "loops and tones are running");
  scape.dispose();
  assert.ok(stopped >= started - 2, "closing the walk stops them");
});
