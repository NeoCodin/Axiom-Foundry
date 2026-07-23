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
  assert.match(html, /AXIOM LAW-HEART/);
  assert.match(html, /law-press-canvas/);
  assert.match(html, /STRIKE LAW/);
  assert.doesNotMatch(html, /law-heart-ring/);
  assert.match(html, /CORE DECK \/\/ COLD WAKE/);
  assert.match(html, /FIRST AUTOMATION/);
  assert.match(html, /PORTABLE PHYSICS/);
  assert.doesNotMatch(html, /destinations awake|Your next move|ACTIVE QUEST|nav-sprite sprite-ark/);
  assert.match(html, /Open guide for this page/);
  assert.match(html, /Wake the caretaker core/);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /property="og:image"/);
  assert.doesNotMatch(html, /Cohesion window|If the clock expires/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("removes all temporary starter-preview wiring", async () => {
  const [page, arkDeck, lawHeart, foundryLawHeart, lawPress, loreArchive, layout, pagesEntry, packageJson, css, arkCss, continuityCss, researchCss, manualCss, awakeningCss, pixelCss, lawHeartCss, loreArchiveCss, story, manual, survivorEngine, populationConsole, settlementConsole, continuityExpertise, campaignContent, researchEngine] =
    await Promise.all([
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/ark-deck.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/axiom-law-heart.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/foundry-law-heart.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/law-press-canvas.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/lore-archive.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
      readFile(new URL("../github-pages/main.tsx", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
      readFile(new URL("../app/ark-deck.css", import.meta.url), "utf8"),
      readFile(new URL("../app/continuity-console.css", import.meta.url), "utf8"),
      readFile(new URL("../app/research-lattice.css", import.meta.url), "utf8"),
      readFile(new URL("../app/game-manual.css", import.meta.url), "utf8"),
       readFile(new URL("../app/awakening.css", import.meta.url), "utf8"),
       readFile(new URL("../app/pixel-ui.css", import.meta.url), "utf8"),
      readFile(new URL("../app/axiom-law-heart.css", import.meta.url), "utf8"),
      readFile(new URL("../app/lore-archive.css", import.meta.url), "utf8"),
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
  assert.match(page, /getCommandPriorities/);
  assert.match(page, /GameNavigation/);
  assert.match(page, /The Planet forecast is online/);
  assert.match(page, /destinationIntroduction\?\.view/);
  assert.match(page, /setInterfaceIntroduction/);
  assert.match(page, /Commission the Foundry Deck/);
  assert.match(page, /The Ark has people, not statistics/);
  assert.match(page, /createQaPlanetIntroductionCheckpoint/);
  assert.doesNotMatch(arkDeck, /onTuneCore|Tune the Core/);
  assert.match(arkDeck, /Foundry output monitor/);
  assert.match(foundryLawHeart, /Strike the Law-Heart/);
  assert.match(foundryLawHeart, /LawPressCanvas/);
  assert.match(lawHeart, /AXIOM LAW-HEART/);
  assert.match(lawHeart, /LawPressCanvas/);
  assert.doesNotMatch(lawHeart, /law-heart-ring|law-heart-particle-field/);
  assert.match(lawPress, /requestAnimationFrame/);
  assert.match(lawPress, /prefers-reduced-motion/);
  assert.match(lawPress, /document\.visibilityState/);
  assert.match(lawPress, /const TIER_COLORS/);
  assert.match(lawPress, /type PurchaseEvent/);
  assert.match(lawPress, /manualPulses > 0 \|\| props\.tiers\.some/);
  assert.match(lawPress, /safe\(props\.fluxPerSecond\)/);
  assert.match(lawPress, /safe\(props\.lifetimeAxioms\)/);
  assert.match(lawHeart, /Three laws for Pelagos/);
  assert.match(lawHeart, /APPROACH_SYSTEMS/);
  assert.match(lawHeart, /COMMIT.*FLUX/);
  assert.match(lawHeart, /Every commitment is permanent and counts toward approach/);
  assert.match(page, /<LoreArchive/);
  assert.match(page, /unlockedLoreIds/);
  assert.match(page, /archive\.public\.null-tide/);
  assert.match(page, /status !== "saved" && status !== "active"/);
  assert.doesNotMatch(page, /className="lore-grid"|className="ledger-worlds"/);
  assert.match(loreArchive, /archive-category-tabs/);
  assert.match(loreArchive, /archive-reader-page/);
  assert.match(loreArchive, /Previous record/);
  assert.match(loreArchive, /unknown records remain unnamed/i);
  assert.doesNotMatch(loreArchive, /lore-grid|ledger-worlds/);
  assert.match(page, /!game\.missions\.awaitingAcknowledgement/);
  assert.match(page, /The Foundry Floor/);
  assert.match(page, /Planetary planning remains in Continuity/);
  assert.match(page, /has-reactor-workspace/);
  assert.match(page, /foundry-chain-sidebar/);
  assert.doesNotMatch(foundryLawHeart, /A visible history of the fabrication chain|law-heart-spectrum/);
  assert.match(lawPress, /fillPixelOctagon/);
  assert.match(lawPress, /progressionAngularSpeed/);
  assert.match(page, /is-affordable/);
  assert.match(page, /Not enough Flux/);
  assert.doesNotMatch(page, /className=.*tune-button/);
  assert.match(page, /Fabrication Chain/);
  assert.match(settlementConsole, /Nothing expires/);
  assert.match(layout, /Axiom Foundry — Restore Worlds\. Question Your Orders\./);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(css, /\.machine-panel\s*\{[^}]*overflow:\s*clip/s);
  assert.doesNotMatch(page, /<FoundryVista/);
  assert.match(lawHeartCss, /\.foundry-law-heart\s*\{/);
  assert.match(css, /\.mission-stages\s*\{/);
  assert.match(arkCss, /\.ark-visual-stage\s*\{/);
  assert.match(continuityCss, /\.settler-selection-list\s*\{/);
  assert.match(continuityCss, /\.crew-career-summary\s*\{/);
  assert.match(continuityCss, /\.crew-continuity-contribution\s*\{/);
  assert.match(researchCss, /\.research-lattice-analysis-core\s*\{/);
  assert.match(manualCss, /\.game-manual\s*\{/);
  assert.match(awakeningCss, /\.living-foundry-nav\s*\{[^}]*position:\s*fixed/s);
  assert.match(pixelCss, /Share Tech Mono/);
  assert.match(pixelCss, /VT323/);
  assert.match(pixelCss, /image-rendering:\s*pixelated/);
  assert.match(pixelCss, /repeating-linear-gradient/);
  assert.match(pixelCss, /\.destination-guide-card\s*\{/);
  assert.match(pixelCss, /\.is-guided-destination/);
  assert.match(lawHeartCss, /.law-heart-core\s*\{/);
  assert.match(lawHeartCss, /steps\(/);
  assert.match(loreArchiveCss, /\.archive-tablet-body\s*\{/);
  assert.match(loreArchiveCss, /\.archive-reader-page\s*\{/);
  assert.match(loreArchiveCss, /@media \(max-width: 800px\)/);
  assert.match(pixelCss, /\.personnel-console-tabs\s*\{/);
  for (const stylesheet of ["ark-deck", "continuity-console", "research-lattice", "game-manual", "awakening", "pixel-ui", "axiom-law-heart", "lore-archive"]) {
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
  await assert.rejects(access(new URL("../app/foundry-deck.tsx", import.meta.url)));
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/og-cold-wake.png", import.meta.url));
  await assert.rejects(access(new URL("../dist/server/og.png", import.meta.url)));
  await assert.rejects(
    access(new URL("app/_sites-preview/SkeletonPreview.tsx", projectRoot)),
  );
});
