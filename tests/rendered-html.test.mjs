import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Axiom Foundry game surface", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Axiom Foundry/);
  assert.match(html, /The Ark drifts through black space/);
  assert.match(html, /Ark systems awake/);
  assert.match(html, /CARETAKER INTELLIGENCE/);
  assert.match(html, /Biological command authority/);
  assert.match(html, /Life Support/);
  assert.match(html, /Analysis Core/);
  assert.match(html, /Continuity Bridge/);
  assert.match(html, /Awakens later/);
  assert.match(html, /Salvage/);
  assert.match(html, /Open guide for this page/);
  assert.match(html, /Wake the caretaker core/);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /property="og:image"/);
  assert.doesNotMatch(html, /Cohesion window|If the clock expires/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("removes all temporary starter-preview wiring", async () => {
  const [page, arkDeck, layout, pagesEntry, packageJson, css, arkCss, continuityCss, researchCss, manualCss, awakeningCss, story, manual, survivorEngine, populationConsole, settlementConsole, continuityExpertise, campaignContent, researchEngine] =
    await Promise.all([
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/ark-deck.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
      readFile(new URL("../github-pages/main.tsx", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
      readFile(new URL("../app/ark-deck.css", import.meta.url), "utf8"),
      readFile(new URL("../app/continuity-console.css", import.meta.url), "utf8"),
      readFile(new URL("../app/research-lattice.css", import.meta.url), "utf8"),
      readFile(new URL("../app/game-manual.css", import.meta.url), "utf8"),
      readFile(new URL("../app/awakening.css", import.meta.url), "utf8"),
      readFile(new URL("../app/story-content.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/game-manual.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/survivor-engine.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/population-console.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/settlement-console.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/continuity-expertise.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/campaign-content.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/research-engine.ts", import.meta.url), "utf8"),
    ]);

  assert.match(page, /from "\.\/game-engine"/);
  assert.match(arkDeck, /Tune the Core/);
  assert.match(page, /The Foundry Floor/);
  assert.match(page, /Core tuning remains aboard the Ark/);
  assert.doesNotMatch(page, /className=.*tune-button/);
  assert.match(page, /Fabrication Chain/);
  assert.match(page, /No deadline/);
  assert.match(layout, /Axiom Foundry — Restore Worlds\. Question Your Orders\./);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(css, /\.machine-panel\s*\{[^}]*overflow:\s*clip/s);
  assert.match(css, /\.foundry-vista\s*\{/);
  assert.match(css, /\.mission-stages\s*\{/);
  assert.match(arkCss, /\.ark-visual-stage\s*\{/);
  assert.match(continuityCss, /\.settler-selection-list\s*\{/);
  assert.match(continuityCss, /\.crew-career-summary\s*\{/);
  assert.match(continuityCss, /\.crew-continuity-contribution\s*\{/);
  assert.match(researchCss, /\.research-lattice-analysis-core\s*\{/);
  assert.match(manualCss, /\.game-manual\s*\{/);
  assert.match(awakeningCss, /\.living-foundry-nav\s*\{[^}]*position:\s*fixed/s);
  for (const stylesheet of ["ark-deck", "continuity-console", "research-lattice", "game-manual", "awakening"]) {
    assert.match(layout, new RegExp(`import "\\./${stylesheet}\\.css"`));
    assert.match(pagesEntry, new RegExp(`import "\\.\\./app/${stylesheet}\\.css"`));
  }
  assert.match(story, /Axioms are not fuel for space travel/);
  assert.match(story, /When the Ark may leave/);
  for (const topic of ["Ark", "Foundry", "Research", "Crew", "Continuity", "Biological Samples", "Cultural Records", "Ark Supply", "Salvage"]) {
    assert.match(manual, new RegExp(topic));
  }
  assert.match(survivorEngine, /SURVIVOR_RARITY_DEFINITIONS/);
  assert.match(survivorEngine, /anomalous/);
  assert.match(survivorEngine, /QUALITY_PITY_LIMIT/);
  assert.match(survivorEngine, /learningMultiplier: 2/);
  assert.match(populationConsole, /CURRENT PROFESSION/);
  assert.match(populationConsole, /PROFESSION XP/);
  assert.match(populationConsole, /CONTINUITY CONTRIBUTION/);
  assert.match(settlementConsole, /How this is counted/);
  assert.match(settlementConsole, /quality safety net active/);
  assert.match(continuityExpertise, /70% of Soldier level/);
  assert.match(continuityExpertise, /Researcher level \+ a 50% Null Dreamer bonus/);
  assert.match(campaignContent, /vesper-exceptional-founders/);
  assert.match(manual, /Profile Depth/);
  assert.match(researchEngine, /"engineering-models": 220/);
  await access(new URL("../public/og.png", import.meta.url));
  await assert.rejects(access(new URL("../dist/server/og.png", import.meta.url)));
  await assert.rejects(
    access(new URL("app/_sites-preview/SkeletonPreview.tsx", projectRoot)),
  );
});
