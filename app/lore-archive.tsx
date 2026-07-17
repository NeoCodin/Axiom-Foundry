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

type ArchiveCategoryId = "memory" | "fragments" | "causal" | "worlds";

type ArchiveFact = {
  label: string;
  value: string;
  state?: "stable" | "warning" | "locked";
};

type ArchivePage = {
  id: string;
  category: ArchiveCategoryId;
  code: string;
  tabLabel: string;
  title: string;
  source: string;
  paragraphs: readonly string[];
  contradiction?: string;
  facts?: readonly ArchiveFact[];
  actionLabel?: string;
  onAction?: () => void;
};

const CATEGORY_COPY: Record<ArchiveCategoryId, { code: string; label: string; description: string }> = {
  memory: { code: "MEM", label: "Core Memory", description: "Verified records AXIOM is currently authorized to read." },
  fragments: { code: "ERR", label: "Contradictions", description: "Recovered records that disagree with the official archive." },
  causal: { code: "CAU", label: "Contacts", description: "Evidence concerning vessels that do not obey local chronology." },
  worlds: { code: "WRL", label: "Known Worlds", description: "Only destinations AXIOM has reached or is presently approaching." },
};

function buildMemoryPages(entries: readonly ArchiveMemoryEntry[]): ArchivePage[] {
  return entries.map((entry, index) => ({
    id: entry.id,
    category: "memory",
    code: `MEM-${String(index + 1).padStart(2, "0")}`,
    tabLabel: entry.tag,
    title: entry.title,
    source: entry.curator,
    paragraphs: entry.paragraphs,
  }));
}

function buildFragmentPages(
  fragments: readonly DiscoveryFragment[],
  nextFragment: DiscoveryFragment | null,
  onCrossIndex: () => void,
): ArchivePage[] {
  const indexPage: ArchivePage = {
    id: "contradiction-index",
    category: "fragments",
    code: "ERR-INDEX",
    tabLabel: "Index status",
    title: "The archive does not agree with itself",
    source: "AXIOM contradiction process",
    paragraphs: [
      fragments.length === 0
        ? "No contradiction has survived verification yet. This section remains quiet until the Ark discovers a record that the bootstrap history cannot explain."
        : `${fragments.length} contradiction ${fragments.length === 1 ? "record has" : "records have"} survived checksum, source comparison, and chronology review.`,
      "New fragments appear through survivor histories, Null research, colony transmissions, expeditions, and deliberate Archive cross-indexing. Unknown records remain unnamed until recovered.",
    ],
    actionLabel: nextFragment ? `Cross-index ${nextFragment.title}` : undefined,
    onAction: nextFragment ? onCrossIndex : undefined,
  };
  return [
    indexPage,
    ...fragments.map((fragment, index): ArchivePage => ({
      id: fragment.id,
      category: "fragments",
      code: `ERR-${String(index + 1).padStart(2, "0")}`,
      tabLabel: fragment.title,
      title: fragment.title,
      source: fragment.source,
      paragraphs: fragment.excerpt,
      contradiction: fragment.contradiction,
    })),
  ];
}

function buildCausalPages(archive: CausalArchiveView): ArchivePage[] {
  if (archive.score <= 0) return [];
  const overview: ArchivePage = {
    id: "causal-classification",
    category: "causal",
    code: archive.activeClassification.code,
    tabLabel: "Current classification",
    title: archive.activeClassification.label,
    source: "Causal Archive // provisional analysis",
    paragraphs: [
      archive.activeClassification.summary,
      archive.nextClassification
        ? `${archive.evidenceToNext} more indexed evidence ${archive.evidenceToNext === 1 ? "entry is" : "entries are"} required before ${archive.nextClassification.label} can be considered. Supporting Research may also be required.`
        : "Every classification supported by the current campaign has been reached. Identity and motive remain unproven.",
    ],
    facts: archive.classifications.map((classification) => ({
      label: classification.code,
      value: classification.unlocked ? `${classification.label} // ${classification.operationalBenefit}` : "CLASSIFIED // insufficient evidence",
      state: classification.unlocked ? "stable" : "locked",
    })),
  };
  return [
    overview,
    ...archive.recoveredEvidence.map((evidence, index): ArchivePage => ({
      id: evidence.id,
      category: "causal",
      code: `CAU-${String(index + 1).padStart(2, "0")}`,
      tabLabel: evidence.title,
      title: evidence.title,
      source: evidence.source.replaceAll("-", " "),
      paragraphs: [evidence.finding],
    })),
  ];
}

function buildWorldPages(worlds: readonly ArchiveWorldEntry[]): ArchivePage[] {
  return worlds.map((world, index) => ({
    id: `world-${world.id}`,
    category: "worlds",
    code: `WRL-${String(index + 1).padStart(2, "0")}`,
    tabLabel: world.name,
    title: world.name,
    source: `${world.status === "saved" ? "Continuity record" : "Current navigation solution"} // ${world.subtitle}`,
    paragraphs: [world.record],
    facts: [
      {
        label: "Continuity status",
        value: world.status === "saved" ? "WORLD SECURED" : "ACTIVE DESTINATION",
        state: world.status === "saved" ? "stable" : "warning",
      },
    ],
  }));
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
    memory: buildMemoryPages(memoryEntries),
    fragments: buildFragmentPages(fragments, nextFragment, onCrossIndex),
    causal: buildCausalPages(causalArchive),
    worlds: buildWorldPages(worlds),
  }), [causalArchive, fragments, memoryEntries, nextFragment, onCrossIndex, worlds]);
  const categories = (Object.keys(CATEGORY_COPY) as ArchiveCategoryId[]).filter((category) => {
    if (category === "fragments") return fragments.length > 0;
    return pagesByCategory[category].length > 0;
  });
  const [requestedCategory, setRequestedCategory] = useState<ArchiveCategoryId>("memory");
  const [selectedPageIds, setSelectedPageIds] = useState<Partial<Record<ArchiveCategoryId, string>>>({});
  const activeCategory = categories.includes(requestedCategory) ? requestedCategory : categories[0] ?? "memory";
  const categoryPages = pagesByCategory[activeCategory];
  const requestedPageId = selectedPageIds[activeCategory];
  const activePageIndex = Math.max(0, categoryPages.findIndex((page) => page.id === requestedPageId));
  const activePage = categoryPages[activePageIndex] ?? pagesByCategory.memory[0];
  const categoryCopy = CATEGORY_COPY[activeCategory];
  const readableCount = categories.reduce((total, category) => total + pagesByCategory[category].length, 0);

  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, [onClose]);

  const selectPage = (category: ArchiveCategoryId, pageId: string) => {
    setRequestedCategory(category);
    setSelectedPageIds((current) => ({ ...current, [category]: pageId }));
  };

  const movePage = (offset: number) => {
    const nextIndex = Math.max(0, Math.min(categoryPages.length - 1, activePageIndex + offset));
    const nextPage = categoryPages[nextIndex];
    if (nextPage) selectPage(activeCategory, nextPage.id);
  };

  if (!activePage) return null;

  return (
    <div className="archive-layer">
      <button className="modal-backdrop" type="button" aria-label="Close lore archive" onClick={onClose} />
      <section className="lore-archive archive-tablet" role="dialog" aria-modal="true" aria-labelledby="archive-title">
        <header>
          <div>
            <p className="section-kicker violet">AXIOM memory tablet // read-only</p>
            <h2 id="archive-title">The Axiom Archive</h2>
            <span>{readableCount} readable records · {worldsSaved} restored worlds · unknown records remain unnamed</span>
          </div>
          <button className="archive-close" type="button" aria-label="Close lore archive" onClick={onClose}>Close tablet</button>
        </header>

        <nav className="archive-category-tabs" role="tablist" aria-label="Archive record groups">
          {categories.map((category) => (
            <button
              className={category === activeCategory ? "active" : ""}
              type="button"
              role="tab"
              aria-pressed={category === activeCategory}
              aria-selected={category === activeCategory}
              onClick={() => setRequestedCategory(category)}
              key={category}
            >
              <span>{CATEGORY_COPY[category].code}</span>
              <strong>{CATEGORY_COPY[category].label}</strong>
              <small>{pagesByCategory[category].length}</small>
            </button>
          ))}
        </nav>

        <div className="archive-tablet-body">
          <aside className="archive-entry-index" aria-label={`${categoryCopy.label} records`}>
            <header>
              <span>{categoryCopy.code} // index</span>
              <p>{categoryCopy.description}</p>
            </header>
            <div>
              {categoryPages.map((page, index) => (
                <button
                  className={page.id === activePage.id ? "active" : ""}
                  type="button"
                  aria-current={page.id === activePage.id ? "page" : undefined}
                  onClick={() => selectPage(activeCategory, page.id)}
                  key={page.id}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{page.tabLabel}</strong>
                </button>
              ))}
            </div>
            {activeCategory === "memory" && encryptedMemoryCount > 0 && (
              <small>{encryptedMemoryCount} additional core {encryptedMemoryCount === 1 ? "record is" : "records are"} still encrypted.</small>
            )}
          </aside>

          <article className="archive-reader-page" aria-live="polite" key={activePage.id}>
            <header>
              <div>
                <span>{activePage.code}</span>
                <small>{activePage.source}</small>
              </div>
              <strong>{String(activePageIndex + 1).padStart(2, "0")} / {String(categoryPages.length).padStart(2, "0")}</strong>
            </header>
            <div className="archive-reader-copy">
              <p className="archive-reader-label">{categoryCopy.label}</p>
              <h3>{activePage.title}</h3>
              {activePage.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {activePage.contradiction && (
                <blockquote><span>CONTRADICTION</span>{activePage.contradiction}</blockquote>
              )}
              {activePage.facts && activePage.facts.length > 0 && (
                <dl className="archive-fact-list">
                  {activePage.facts.map((fact) => (
                    <div className={fact.state ? `is-${fact.state}` : ""} key={`${fact.label}-${fact.value}`}>
                      <dt>{fact.label}</dt>
                      <dd>{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {activePage.actionLabel && activePage.onAction && (
                <button className="archive-reader-action" type="button" onClick={activePage.onAction}>{activePage.actionLabel}</button>
              )}
            </div>
            <footer>
              <button type="button" disabled={activePageIndex === 0} onClick={() => movePage(-1)}>Previous record</button>
              <span>{categoryCopy.code} // {String(activePageIndex + 1).padStart(2, "0")}</span>
              <button type="button" disabled={activePageIndex >= categoryPages.length - 1} onClick={() => movePage(1)}>Next record</button>
            </footer>
          </article>
        </div>

        <footer>
          <button className="quiet-button" type="button" onClick={onReplayOrientation}>Replay field orientation</button>
          <button className="tour-next" type="button" onClick={onClose}>Return to Ark</button>
        </footer>
      </section>
    </div>
  );
}
