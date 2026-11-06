import assert from "node:assert/strict";
import test from "node:test";
import {
  TALK_COVERAGE,
  busyLine,
  chatter,
  crewMood,
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
  const later = { ...early, worldsSaved: 4, discovered: ["helion.impossible-registry", "fabrication.preconcordance-keel"] };
  assert.deepEqual(rumours({ ...later, worldsSaved: 3 }), [], "until Nox the records stay between AXIOM and Lyra");
  assert.match(rumours(later)[0], /Recon Dock wall/);
  assert.match(rumours(later)[1], /beacon knew this ship/);
  assert.match(answer(person(), "rumour", later), /older than the way it was made/);
});

test("the crew grow wary of the drone as the truth comes out", () => {
  const at = (discovered: string[]): TalkContext => ({ ...early, worldsSaved: 4, discovered });
  const grateful = { ...at(["helion.impossible-registry", "archive.construction-zero", "ilyra.axiom-wake"]), worldsSaved: 3 };
  const uneasy = at(["helion.impossible-registry", "archive.construction-zero"]);
  const guarded = at(["helion.impossible-registry", "archive.suppressed-correlation"]);
  const haunted = at(["vesper.revision-ledger"]);
  assert.equal(crewMood(grateful), "grateful", "whatever has been found, trust holds until Nox");
  assert.equal(crewMood(uneasy), "uneasy", "the second-to-last world");
  assert.equal(crewMood(guarded), "guarded", "once it is plain the Foundry feeds the Null");
  assert.equal(crewMood(haunted), "haunted");
  assert.equal(crewMood(at(["archive.lyra-composite-index"])), "haunted", "or once Lyra's making is out");

  const greetings = (context: TalkContext) => new Set(Array.from({ length: 12 }, (_, seed) => greeting(person(), seed, context)));
  assert.ok([...greetings(grateful)].some((line) => /Thank you|hello back|light/.test(line)));
  assert.ok([...greetings(guarded)].some((line) => /check|wasn't saying/.test(line)));
  assert.ok([...greetings(haunted)].some((line) => /still AXIOM|how many times|Which one/.test(line)));
  for (const line of greetings(haunted)) assert.ok(!greetings(grateful).has(line), "the warmth is gone by then");

  const child = person({ ageGroup: "child", role: "civilian", name: "Pip Marsh" });
  assert.match(greeting(child, 0, grateful), /Hi|Hello/);
  assert.match(greeting(child, 0, haunted), /whispering about you/, "children still talk, and say what they hear");
  assert.equal(greeting(person({ storyHookId: "forty-third-foreman", name: "Tovan Rees" }), 0, haunted), "Foreman.");
  assert.match(farewell(person(), 0, haunted).reaction, /forget|remember/);

  const overheard = (context: TalkContext) =>
    Array.from({ length: 16 }, (_, seed) => chatter(person(), person({ name: "Tobin Ash" }), context, seed).map((line) => line.text).join(" ")).join(" ");
  assert.doesNotMatch(overheard(grateful), /drone's listening|hears everything/, "nobody lowers their voice yet");
  assert.match(overheard(guarded), /listening|hears everything|feeding/);
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
  const gossip = chatter(person(), person({ name: "Tobin Ash" }), { ...early, worldsSaved: 4, discovered: ["helion.impossible-registry"] }, 1);
  assert.match(gossip[0].text, /Have you heard\? .*beacon knew this ship/);
  assert.ok(standInProfile("Crew 3", "engineer").origin.length > 0, "the QA crew can talk too");
});
