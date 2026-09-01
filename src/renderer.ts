import { enhanceReferences } from "./references";
import { markdownToSafeFragment } from "./sanitizer";
import { DelegatedTooltip } from "./tooltip";

const enhanceAbbreviations = (root: HTMLElement) => {
  for (const abbreviation of root.querySelectorAll<HTMLElement>("abbr")) {
    const explanation = abbreviation.getAttribute("title")?.trim();
    abbreviation.removeAttribute("title");
    if (!explanation) continue;
    abbreviation.dataset.shrTooltip = explanation.slice(0, 1_000);
    abbreviation.classList.add("shr-abbreviation");
    abbreviation.tabIndex = 0;
    abbreviation.setAttribute("role", "button");
    abbreviation.setAttribute("aria-label", `${abbreviation.textContent?.trim() || "Vocabulary"}: ${explanation}`);
  }
};

export interface RenderedReadingView {
  referenceCount: number;
  dispose(): void;
}

export const renderReadingView = async (article: HTMLElement, markdown: string): Promise<RenderedReadingView> => {
  const fragment = await markdownToSafeFragment(markdown);
  article.replaceChildren(fragment);
  enhanceAbbreviations(article);
  const references = enhanceReferences(article);
  const tooltip = new DelegatedTooltip(article);

  return {
    referenceCount: references.targets.size,
    dispose() {
      tooltip.dispose();
      references.dispose();
    },
  };
};
