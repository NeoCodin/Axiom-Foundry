import assert from "node:assert/strict";
import test from "node:test";
import {
  TALK_COVERAGE,
  busyLine,
  chatter,
  rumours,
  standInProfile,
  talkTopics,
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
const said = (topics: string[][]) => topics.flat().join(" ");

test("every world, background, nature and job has something to say", () => {
  for (const world of ["pelagos", "viridia", "cinder", "nox", "vesper", "ark", "unknown"]) assert.ok(TALK_COVERAGE.homes.includes(world), world);
  for (const background of BACKGROUND_DEFINITIONS) assert.ok(TALK_COVERAGE.work.includes(background.id), background.id);
  for (const trait of TRAIT_DEFINITIONS) assert.ok(TALK_COVERAGE.natures.includes(trait.id), trait.id);
  for (const role of [...PROFESSIONAL_ROLES, "civilian"]) assert.ok(TALK_COVERAGE.roles.includes(role), role);
});

test("a survivor talks about home, their old work, their nature and their job, one topic at a time", () => {
  const topics = talkTopics(person(), early);
  assert.ok(topics.length >= 4);
  assert.ok(topics.every((topic) => topic.length >= 1 && topic.length <= 3));
  const all = said(topics);
  assert.match(all, /Viridia|forest|leaves/, "home");
  assert.match(all, /records/, "their old work");
  assert.match(all, /static/, "their nature");
  assert.match(all, /Analysis Core/, "their job");
  assert.notDeepEqual(talkTopics(person({ name: "Tobin Ash", origin: "cinder" }), early), topics, "different people, different things");
});

test("the Altered speak in their own words; children and the hurt talk differently", () => {
  for (const alteration of SURVIVOR_ALTERATIONS) {
    assert.ok(said(talkTopics(person({ alterationId: alteration.id }), early)).includes(alteration.perspective), alteration.id);
  }
  const child = said(talkTopics(person({ ageGroup: "child", role: "civilian" }), early));
  assert.doesNotMatch(child, /Analysis Core|records out of/, "a child has no job to talk about");
  const resting = talkTopics(person({ resting: true }), early);
  assert.equal(resting.length, 1);
  assert.match(resting[0][0], /rest|soon/);
});

test("rumours follow the records the Ark has found, newest first", () => {
  assert.deepEqual(rumours(early), []);
  const later = { ...early, discovered: ["helion.impossible-registry", "fabrication.preconcordance-keel"] };
  assert.match(rumours(later)[0], /seam/);
  assert.match(said(talkTopics(person(), later)), /seam in the Fabrication floor/);
});

test("the rare survivors give up their secrets slowly, and the forty-third keeps his longest", () => {
  for (const hook of RARE_SURVIVOR_HOOKS) {
    assert.ok(talkTopics(person({ storyHookId: hook.id, name: hook.name }), early)[0].length >= 1, hook.id);
  }
  const tovan = person({ storyHookId: "forty-third-foreman", name: "Tovan Rees" });
  assert.doesNotMatch(said(talkTopics(tovan, { ...early, worldsSaved: 5 })), /Forty-three/);
  assert.match(said(talkTopics(tovan, { ...early, worldsSaved: 6, discovered: ["vesper.revision-ledger"] })), /Forty-three/);
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
