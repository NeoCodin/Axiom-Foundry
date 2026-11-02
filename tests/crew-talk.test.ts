import assert from "node:assert/strict";
import test from "node:test";
import {
  TALK_COVERAGE,
  busyLine,
  chatter,
  exchanges,
  farewell,
  greeting,
  restingLine,
  rumours,
  standInProfile,
  type TalkContext,
  type TalkProfile,
} from "../app/crew-talk.ts";
import {
  BACKGROUND_DEFINITIONS,
  PROFESSIONAL_ROLES,
  RARE_SURVIVOR_HOOKS,
  SURVIVOR_ALTERATIONS,
  TRAIT_DEFINITIONS,
} from "../app/survivor-engine.ts";

const early: TalkContext = { worldId: "pelagos", worldsSaved: 1, discovered: ["lyra.official-brief"] };
const person = (extra: Partial<TalkProfile> = {}): TalkProfile => ({
  name: "Ama Reyes",
  origin: "viridia",
  backgroundId: "reef-archive",
  role: "researcher",
  ageGroup: "adult",
  traits: ["signal-ear"],
  ...extra,
});
const topics = (profile: TalkProfile, context = early) => exchanges(profile, context).map((exchange) => exchange.topic);
const answer = (profile: TalkProfile, topic: string, context = early) =>
  exchanges(profile, context).find((exchange) => exchange.topic === topic)?.answer.join(" ") ?? "";

test("every world, background, nature and job has something to say", () => {
  for (const world of ["pelagos", "viridia", "cinder", "nox", "vesper", "ark", "unknown"]) assert.ok(TALK_COVERAGE.homes.includes(world), world);
  for (const background of BACKGROUND_DEFINITIONS) assert.ok(TALK_COVERAGE.work.includes(background.id), background.id);
  for (const trait of TRAIT_DEFINITIONS) assert.ok(TALK_COVERAGE.natures.includes(trait.id), trait.id);
  for (const role of [...PROFESSIONAL_ROLES, "civilian"]) assert.ok(TALK_COVERAGE.roles.includes(role), role);
});

test("AXIOM can ask about home, their old work, how they are and their work aboard, and answer back two ways", () => {
  assert.deepEqual(topics(person()), ["home", "work", "self", "job"]);
  for (const exchange of exchanges(person(), early)) {
    assert.ok(exchange.ask.endsWith("?") || exchange.ask.endsWith("."), exchange.ask);
    assert.ok(exchange.answer.length >= 1);
    assert.equal(exchange.replies.length, 2, `${exchange.topic}: two ways to answer back`);
    for (const reply of exchange.replies) assert.ok(reply.say && reply.reaction);
  }
  assert.match(answer(person(), "home"), /Viridia|forest|leaves/);
  assert.match(answer(person(), "work"), /records/);
  assert.match(answer(person(), "self"), /static/);
  assert.match(answer(person(), "job"), /Analysis Core/);
  assert.notEqual(answer(person({ name: "Tobin Ash", origin: "cinder" }), "home"), answer(person(), "home"), "different people, different things");
});

test("the Altered can be asked about the Null; children and the hurt talk differently", () => {
  for (const alteration of SURVIVOR_ALTERATIONS) {
    const profile = person({ alterationId: alteration.id });
    assert.equal(topics(profile)[0], "altered", alteration.id);
    assert.ok(answer(profile, "altered").includes(alteration.perspective), alteration.id);
  }
  const child = person({ ageGroup: "child", role: "civilian", name: "Pip Marsh" });
  assert.deepEqual(topics(child), ["home", "play"], "a child has no job to talk about");
  assert.match(greeting(child, 0), /Hi|Hello/);
  assert.match(restingLine(person(), 0), /rest|soon/);
});

test("rumours follow the records the Ark has found, newest first", () => {
  assert.deepEqual(rumours(early), []);
  assert.ok(!topics(person()).includes("rumour"), "nothing to whisper about yet");
  const later = { ...early, discovered: ["helion.impossible-registry", "fabrication.preconcordance-keel"] };
  assert.match(rumours(later)[0], /seam/);
  assert.match(answer(person(), "rumour", later), /seam in the Fabrication floor/);
});

test("the rare survivors are asked about their secret first, and the forty-third keeps his longest", () => {
  for (const hook of RARE_SURVIVOR_HOOKS) {
    const first = exchanges(person({ storyHookId: hook.id, name: hook.name }), early)[0];
    assert.equal(first.topic, "secret", hook.id);
    assert.equal(first.replies.length, 2);
  }
  const tovan = person({ storyHookId: "forty-third-foreman", name: "Tovan Rees" });
  assert.equal(greeting(tovan, 0), "Foreman.");
  assert.doesNotMatch(answer(tovan, "secret", { ...early, worldsSaved: 5 }), /Forty-three/);
  assert.match(answer(tovan, "secret", { ...early, worldsSaved: 6, discovered: ["vesper.revision-ledger"] }), /Forty-three/);
  assert.match(farewell(tovan, 0).reaction, /Foreman/);
});

test("busy crew say a word in passing; two crew have a short exchange", () => {
  assert.match(busyLine(person({ role: "doctor" }), 1), /patient|minute/);
  const pair = chatter(person(), person({ name: "Tobin Ash", origin: "cinder", role: "engineer" }), early, 0);
  assert.ok(pair.length >= 2 && pair.length <= 3);
  assert.deepEqual([...new Set(pair.map((line) => line.speaker))].sort(), ["Ama", "Tobin"]);
  const gossip = chatter(person(), person({ name: "Tobin Ash" }), { ...early, discovered: ["helion.impossible-registry"] }, 1);
  assert.match(gossip[0].text, /Have you heard\? .*registry/);
  assert.ok(standInProfile("Crew 3", "engineer").origin.length > 0, "the QA crew can talk too");
});
