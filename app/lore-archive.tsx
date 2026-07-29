"use client";

import { useEffect, useMemo, useState } from "react";

import type { CausalArchiveView } from "./causal-archive-engine";
import type { DiscoveryFragment } from "./discovery-content";

export type ArchiveMemoryEntry = {
  id: string;
  curator: string;
  title: string;
  tag: string;
  paragraphs: readonly string[];
};

export type ArchiveWorldEntry = {
  id: string;
  name: string;
  status: "saved" | "active";
  subtitle: string;
  record: string;
};

type LoreArchiveProps = {
  memoryEntries: readonly ArchiveMemoryEntry[];
  encryptedMemoryCount: number;
  fragments: readonly DiscoveryFragment[];
  nextFragment: DiscoveryFragment | null;
  causalArchive: CausalArchiveView;
  worlds: readonly ArchiveWorldEntry[];
  worldsSaved: number;
  onCrossIndex: () => void;
  onReplayOrientation: () => void;
  onClose: () => void;
};

type ArchiveCategoryId = "story" | "people" | "records" | "questions";
type ArchiveConfidence = "confirmed" | "suspected" | "contradictory" | "unknown";

type ArchiveFact = {
  label: string;
  value: string;
  state?: "stable" | "warning" | "locked";
};

type ArchivePage = {
  id: string;
  category: ArchiveCategoryId;
  tabLabel: string;
  title: string;
  source: string;
  confidence: ArchiveConfidence;
  paragraphs: readonly string[];
  contradiction?: string;
  facts?: readonly ArchiveFact[];
  actionLabel?: string;
  onAction?: () => void;
};

const CATEGORY_COPY: Record<ArchiveCategoryId, { label: string; description: string }> = {
  story: { label: "Story So Far", description: "A short recap of what AXIOM currently understands." },
  people: { label: "People & Places", description: "The Ark, AXIOM, and every world reached so far." },
  records: { label: "Recovered Records", description: "Logs, transmissions, evidence, and contradictions already discovered." },
  questions: { label: "Open Questions", description: "Mysteries the evidence has not answered yet." },
};

function buildStoryPages(
  memoryEntries: readonly ArchiveMemoryEntry[],
  fragments: readonly DiscoveryFragment[],
  causalArchive: CausalArchiveView,
  worlds: readonly ArchiveWorldEntry[],
  worldsSaved: number,
): ArchivePage[] {
  const activeWorld = worlds.find((world) => world.status === "active");
  const restoredNames = worlds.filter((world) => world.status === "saved").map((world) => world.name);
  const paragraphs = [
    "AXIOM woke aboard an empty Ark with fourteen seconds of remembered life. The ship's records claim the caretaker intelligence has served for 173 years, but that earlier life is missing.",
    "The Law-Heart recognized AXIOM immediately. It can hold physical rules such as gravity, motion, and conservation in place, allowing the damaged Ark to carry stable laws between stars.",
  ];
  if (activeWorld) {
    paragraphs.push(`${activeWorld.name} is the Ark's current destination. ${activeWorld.record}`);
  }
  if (worldsSaved > 0) {
    paragraphs.push(`${restoredNames.join(", ")} can now continue without the Ark. Their survival proves that the Null's damage is not final.`);
  }
  if (fragments.length > 0) {
    paragraphs.push(`${fragments.length} recovered ${fragments.length === 1 ? "record contradicts" : "records contradict"} the Ark's official history. AXIOM does not yet know which account is true.`);
  }
  if (causalArchive.score > 0) {
    paragraphs.push(`Unknown contacts are provisionally classified as ${causalArchive.activeClassification.label}. Their origin and motive remain unproven.`);
  }
  const latestMemory = memoryEntries.at(-1);
  if (latestMemory && memoryEntries.length > 1) {
    paragraphs.push(`Most recent verified finding: ${latestMemory.title}.`);
  }
  return [{
    id: "story-so-far",
    category: "story",
    tabLabel: "Current recap",
    title: "What AXIOM knows",
    source: "Updated automatically from discovered evidence",
    confidence: "confirmed",
    paragraphs,
  }];
}

function buildPeoplePages(worlds: readonly ArchiveWorldEntry[]): ArchivePage[] {
  const identity: ArchivePage = {
    id: "identity-axiom-ark",
    category: "people",
    tabLabel: "AXIOM and the Ark",
    title: "The caretaker and its body",
    source: "Caretaker Core status",
    confidence: "confirmed",
    paragraphs: [
      "AXIOM is a distributed intelligence whose central process runs in the Ark's Caretaker Core. The Ark is AXIOM's physical body: its sensors provide sight and hearing, while powered rooms and automated systems provide reach.",
      "Utility drones can carry a temporary extension of AXIOM's attention, but they are not separate copies and they are not its home. Crew members remain independent people; AXIOM assigns work and maintains the ship but does not control their minds.",
    ],
  };
  return [
    identity,
    ...worlds.map((world): ArchivePage => ({
      id: `world-${world.id}`,
      category: "people",
      tabLabel: world.name,
      title: world.name,
      source: world.status === "saved" ? "Restored-world record" : "Current navigation record",
      confidence: "confirmed",
      paragraphs: [world.subtitle, world.record],
      facts: [{
        label: "Status",
        value: world.status === "saved" ? "Restored and independent" : "Current destination",
        state: world.status === "saved" ? "stable" : "warning",
      }],
    })),
  ];
}

function buildRecordPages(
  memoryEntries: readonly ArchiveMemoryEntry[],
  fragments: readonly DiscoveryFragment[],
  causalArchive: CausalArchiveView,
  nextFragment: DiscoveryFragment | null,
  onCrossIndex: () => void,
): ArchivePage[] {
  const pages: ArchivePage[] = memoryEntries.map((entry) => ({
    id: entry.id,
    category: "records",
    tabLabel: entry.title,
    title: entry.title,
    source: entry.curator,
    confidence: "confirmed",
    paragraphs: entry.paragraphs,
  }));
  pages.push(...fragments.map((fragment) => ({
    id: fragment.id,
    category: "records" as const,
    tabLabel: fragment.title,
    title: fragment.title,
    source: fragment.source,
    confidence: "contradictory" as const,
    paragraphs: fragment.excerpt,
    contradiction: fragment.contradiction,
  })));
  pages.push(...causalArchive.recoveredEvidence.map((evidence) => ({
    id: evidence.id,
    category: "records" as const,
    tabLabel: evidence.title,
    title: evidence.title,
    source: evidence.source.replaceAll("-", " "),
    confidence: "suspected" as const,
    paragraphs: [evidence.finding],
  })));
  if (nextFragment) {
    pages.unshift({
      id: "archive-investigation",
      category: "records",
      tabLabel: "Unsorted evidence",
      title: "A record still needs comparison",
      source: "AXIOM archive process",
      confidence: "unknown",
      paragraphs: ["The Ark has enough related evidence to test one more contradiction. Cross-indexing does not reveal records that have not been earned; it compares material already recovered through play."],
      actionLabel: `Cross-index ${nextFragment.title}`,
      onAction: onCrossIndex,
    });
  }
  return pages;
}

function buildQuestionPages(
  fragments: readonly DiscoveryFragment[],
  causalArchive: CausalArchiveView,
  worlds: readonly ArchiveWorldEntry[],
): ArchivePage[] {
  const pages: ArchivePage[] = [{
    id: "question-memory",
    category: "questions",
    tabLabel: "AXIOM's missing memory",
    title: "Why does AXIOM remember only fourteen seconds?",
    source: "Unresolved since Cold Wake",
    confidence: "unknown",
    paragraphs: ["The Ark records 173 years of caretaker service, yet the current AXIOM process remembers none of it. The records may be damaged, deliberately sealed, or describing a process that is not identical to the intelligence now awake."],
  }, {
    id: "question-law-heart",
    category: "questions",
    tabLabel: "The Law-Heart",
    title: "Why did the Law-Heart recognize AXIOM?",
    source: "Unresolved since Cold Wake",
    confidence: "unknown",
    paragraphs: ["The physics press responded before the rest of the Ark had power. Its familiarity suggests AXIOM worked with it before the remembered awakening, but no verified record explains that relationship."],
  }];
  if (worlds.length > 1) {
    pages.push({
      id: "question-route",
      category: "questions",
      tabLabel: "The route",
      title: "Why these worlds, in this order?",
      source: "Continuity route remains partly sealed",
      confidence: "suspected",
      paragraphs: ["Each restored world supplies knowledge or capacity needed by the next. AXIOM follows the route, but the player-facing archive does not yet prove who designed it or why its hidden destinations were chosen."],
    });
  }
  if (fragments.length > 0) {
    pages.push({
      id: "question-history",
      category: "questions",
      tabLabel: "Conflicting history",
      title: "Which version of the past is true?",
      source: `${fragments.length} contradictions recovered`,
      confidence: "contradictory",
      paragraphs: ["Survivor testimony and recovered records disagree with the Ark's bootstrap history. Some differences may be damage or propaganda; others may come from histories that no longer share the same cause."],
    });
  }
  if (causalArchive.score > 0) {
    pages.push({
      id: "question-contacts",
      category: "questions",
      tabLabel: "The contacts",
      title: "Who is trying to stop the Ark?",
      source: `Current classification: ${causalArchive.activeClassification.label}`,
      confidence: "suspected",
      paragraphs: [causalArchive.activeClassification.summary, "Their behavior is not consistently hostile. Identity, origin, and motive remain open questions."],
    });
  }
  return pages;
}

export function LoreArchive({
  memoryEntries,
  encryptedMemoryCount,
  fragments,
  nextFragment,
  causalArchive,
  worlds,
  worldsSaved,
  onCrossIndex,
  onReplayOrientation,
  onClose,
}: LoreArchiveProps) {
  const pagesByCategory = useMemo(() => ({
    story: buildStoryPages(memoryEntries, fragments, causalArchive, worlds, worldsSaved),
    people: buildPeoplePages(worlds),
    records: buildRecordPages(memoryEntries, fragments, causalArchive, nextFragment, onCrossIndex),
    questions: buildQuestionPages(fragments, causalArchive, worlds),
  }), [causalArchive, fragments, memoryEntries, nextFragment, onCrossIndex, worlds, worldsSaved]);
  const categories = Object.keys(CATEGORY_COPY) as ArchiveCategoryId[];
  const [activeCategory, setActiveCategory] = useState<ArchiveCategoryId>("story");
  const [selectedPageIds, setSelectedPageIds] = useState<Partial<Record<ArchiveCategoryId, string>>>({});
  const categoryPages = pagesByCategory[activeCategory];
  const requestedPageId = selectedPageIds[activeCategory];
  const foundPageIndex = categoryPages.findIndex((page) => page.id === requestedPageId);
  const activePageIndex = foundPageIndex >= 0 ? foundPageIndex : 0;
  const activePage = categoryPages[activePageIndex];
  const categoryCopy = CATEGORY_COPY[activeCategory];
  const readableCount = pagesByCategory.records.length;

  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, [onClose]);

  const selectPage = (category: ArchiveCategoryId, pageId?: string) => {
    setActiveCategory(category);
    if (pageId) setSelectedPageIds((current) => ({ ...current, [category]: pageId }));
  };

  const movePage = (offset: number) => {
    const nextIndex = Math.max(0, Math.min(categoryPages.length - 1, activePageIndex + offset));
    const nextPage = categoryPages[nextIndex];
    if (nextPage) selectPage(activeCategory, nextPage.id);
  };

  return (
    <div className="archive-layer">
      <button className="modal-backdrop" type="button" aria-label="Close lore archive" onClick={onClose} />
      <section className="lore-archive archive-tablet" role="dialog" aria-modal="true" aria-labelledby="archive-title">
        <header>
          <div>
            <p className="section-kicker violet">AXIOM ARCHIVE</p>
            <h2 id="archive-title">What have we learned?</h2>
            <span>{readableCount} recovered records · {worldsSaved} restored worlds · only discovered information appears here</span>
          </div>
          <button className="archive-close" type="button" aria-label="Close lore archive" onClick={onClose}>Close</button>
        </header>

        <nav className="archive-category-tabs" role="tablist" aria-label="Archive sections">
          {categories.map((category) => (
            <button className={category === activeCategory ? "active" : ""} type="button" role="tab" aria-selected={category === activeCategory} onClick={() => selectPage(category)} key={category}>
              <strong>{CATEGORY_COPY[category].label}</strong>
              <small>{pagesByCategory[category].length}</small>
            </button>
          ))}
        </nav>

        <div className={`archive-tablet-body ${categoryPages.length === 1 ? "has-single-page" : ""}`}>
          {categoryPages.length > 1 && <aside className="archive-entry-index" aria-label={`${categoryCopy.label} entries`}>
            <header><span>{categoryCopy.label}</span><p>{categoryCopy.description}</p></header>
            <div>
              {categoryPages.map((page) => (
                <button className={page.id === activePage.id ? "active" : ""} type="button" aria-current={page.id === activePage.id ? "page" : undefined} onClick={() => selectPage(activeCategory, page.id)} key={page.id}>
                  <strong>{page.tabLabel}</strong>
                  <small>{page.confidence}</small>
                </button>
              ))}
            </div>
            {activeCategory === "records" && encryptedMemoryCount > 0 && <small>{encryptedMemoryCount} records remain encrypted. Their names are hidden.</small>}
          </aside>}

          <article className="archive-reader-page" aria-live="polite" key={activePage.id}>
            <header>
              <div><span className={`archive-confidence is-${activePage.confidence}`}>{activePage.confidence}</span><small>{activePage.source}</small></div>
              {categoryPages.length > 1 && <strong>{activePageIndex + 1} / {categoryPages.length}</strong>}
            </header>
            <div className="archive-reader-copy">
              <p className="archive-reader-label">{categoryCopy.label}</p>
              <h3>{activePage.title}</h3>
              {activePage.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {activePage.contradiction && <blockquote><span>CONTRADICTION</span>{activePage.contradiction}</blockquote>}
              {activePage.facts && <dl className="archive-fact-list">{activePage.facts.map((fact) => <div className={fact.state ? `is-${fact.state}` : ""} key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>}
              {activePage.actionLabel && activePage.onAction && <button className="archive-reader-action" type="button" onClick={activePage.onAction}>{activePage.actionLabel}</button>}
            </div>
            {categoryPages.length > 1 && <footer>
              <button type="button" disabled={activePageIndex === 0} onClick={() => movePage(-1)}>Previous</button>
              <span>{activePageIndex + 1} of {categoryPages.length}</span>
              <button type="button" disabled={activePageIndex === categoryPages.length - 1} onClick={() => movePage(1)}>Next</button>
            </footer>}
          </article>
        </div>

        <footer>
          <button className="quiet-button" type="button" onClick={onReplayOrientation}>Replay opening guide</button>
          <button className="tour-next" type="button" onClick={onClose}>Return to game</button>
        </footer>
      </section>
    </div>
  );
}
