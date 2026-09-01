const REFERENCE_PATTERN = /^\s*\[(\d+)](?:\s+(.+))?\s*$/;
const MAX_PREVIEW_LENGTH = 700;

export interface ReferenceIndex {
  targets: Map<string, HTMLElement>;
  dispose(): void;
}

const headingLevel = (heading: Element) => Number.parseInt(heading.tagName.slice(1), 10);

const collectPreview = (heading: HTMLElement) => {
  const level = headingLevel(heading);
  const blocks: string[] = [];
  let sibling = heading.nextElementSibling;
  while (sibling) {
    if (/^H[1-6]$/.test(sibling.tagName) && headingLevel(sibling) <= level) break;
    const text = sibling.textContent?.replace(/\s+/g, " ").trim();
    if (text) blocks.push(text);
    if (blocks.join(" ").length >= MAX_PREVIEW_LENGTH) break;
    sibling = sibling.nextElementSibling;
  }
  const headingText = heading.textContent?.replace(/\s+/g, " ").trim() ?? "";
  const preview = [headingText, blocks.join(" ")].filter(Boolean).join(" — ");
  return preview.length > MAX_PREVIEW_LENGTH ? `${preview.slice(0, MAX_PREVIEW_LENGTH - 1)}…` : preview;
};

const findReferenceElement = (event: Event, root: HTMLElement) => {
  const view = root.ownerDocument.defaultView;
  if (!view || !(event.target instanceof view.Element)) return null;
  const reference = event.target.closest<HTMLElement>("sup[data-shr-reference]");
  return reference && root.contains(reference) ? reference : null;
};

export const enhanceReferences = (root: HTMLElement): ReferenceIndex => {
  const targets = new Map<string, HTMLElement>();
  const highlightTimers = new Set<number>();

  for (const heading of root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")) {
    const match = REFERENCE_PATTERN.exec(heading.textContent ?? "");
    if (!match || targets.has(match[1])) continue;
    const key = match[1];
    heading.id = `safe-html-reader-reference-${key}`;
    heading.tabIndex = -1;
    heading.dataset.shrReferenceTarget = key;
    heading.dataset.shrReferencePreview = collectPreview(heading);
    targets.set(key, heading);
  }

  for (const superscript of root.querySelectorAll<HTMLElement>("sup")) {
    const match = /^\s*\[(\d+)]\s*$/.exec(superscript.textContent ?? "");
    if (!match) continue;
    const key = match[1];
    const target = targets.get(key);
    superscript.dataset.shrReference = key;
    superscript.dataset.shrTooltip = target?.dataset.shrReferencePreview || `未找到注释 [${key}]`;
    superscript.classList.add("shr-reference");
    superscript.tabIndex = 0;
    superscript.setAttribute("role", target ? "link" : "note");
    if (target) superscript.setAttribute("aria-label", `跳转到注释 ${key}`);
  }

  const navigate = (reference: HTMLElement) => {
    const target = targets.get(reference.dataset.shrReference ?? "");
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.focus({ preventScroll: true });
    target.classList.add("shr-reference-target-active");
    const timer = window.setTimeout(() => {
      target.classList.remove("shr-reference-target-active");
      highlightTimers.delete(timer);
    }, 1800);
    highlightTimers.add(timer);
  };

  const onClick = (event: MouseEvent) => {
    const reference = findReferenceElement(event, root);
    if (!reference) return;
    event.preventDefault();
    navigate(reference);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const reference = findReferenceElement(event, root);
    if (!reference) return;
    event.preventDefault();
    navigate(reference);
  };

  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeyDown);

  return {
    targets,
    dispose() {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeyDown);
      for (const timer of highlightTimers) window.clearTimeout(timer);
    },
  };
};
