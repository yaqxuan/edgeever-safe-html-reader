import { afterEach, describe, expect, it, vi } from "vitest";
import { renderReadingView } from "../src/renderer";

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("renderReadingView", () => {
  it("enhances vocabulary without retaining the native title tooltip", async () => {
    const article = document.createElement("article");
    document.body.append(article);
    const rendered = await renderReadingView(
      article,
      'This was <abbr title="令人震惊的；惊人的"><strong>staggering</strong></abbr>.',
    );

    const abbreviation = article.querySelector<HTMLElement>("abbr");
    expect(abbreviation?.dataset.shrTooltip).toBe("令人震惊的；惊人的");
    expect(abbreviation?.hasAttribute("title")).toBe(false);
    expect(abbreviation?.tabIndex).toBe(0);
    expect(document.body.querySelector(".shr-tooltip")).not.toBeNull();

    rendered.dispose();
    expect(document.body.querySelector(".shr-tooltip")).toBeNull();
  });

  it("indexes matching reference headings and makes superscripts navigable", async () => {
    const article = document.createElement("article");
    document.body.append(article);
    HTMLElement.prototype.scrollIntoView = vi.fn();

    const rendered = await renderReadingView(article, `
正文。<sup>[1]</sup>

## 注释

### [1] MySpace

MySpace 是一项代表性的社交网络服务。
`);

    const reference = article.querySelector<HTMLElement>("sup[data-shr-reference='1']");
    const target = article.querySelector<HTMLElement>("[data-shr-reference-target='1']");
    expect(rendered.referenceCount).toBe(1);
    expect(reference?.getAttribute("role")).toBe("link");
    expect(reference?.dataset.shrTooltip).toContain("MySpace");
    expect(target?.id).toBe("safe-html-reader-reference-1");

    reference?.click();
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledOnce();
    rendered.dispose();
  });

  it("keeps ordinary superscripts non-interactive when they are not references", async () => {
    const article = document.createElement("article");
    document.body.append(article);
    const rendered = await renderReadingView(article, "2<sup>10</sup> is 1024.");
    const superscript = article.querySelector("sup");
    expect(superscript?.dataset.shrReference).toBeUndefined();
    expect(superscript?.hasAttribute("tabindex")).toBe(false);
    rendered.dispose();
  });

  it("handles a long article without creating per-abbreviation tooltip elements", async () => {
    const article = document.createElement("article");
    document.body.append(article);
    const paragraph = 'A <abbr title="释义"><strong>term</strong></abbr> appears here. ';
    const rendered = await renderReadingView(article, paragraph.repeat(2_000));
    expect(article.querySelectorAll("abbr")).toHaveLength(2_000);
    expect(document.body.querySelectorAll(".shr-tooltip")).toHaveLength(1);
    rendered.dispose();
  });
});
