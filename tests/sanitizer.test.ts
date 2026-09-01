import { describe, expect, it } from "vitest";
import { markdownToSafeFragment } from "../src/sanitizer";

const render = async (markdown: string) => {
  const container = document.createElement("div");
  container.append(await markdownToSafeFragment(markdown));
  return container;
};

describe("markdownToSafeFragment", () => {
  it("keeps Markdown and the documented safe HTML subset", async () => {
    const container = await render(`
# Heading

**bold** <abbr title="中文释义"><strong>word</strong></abbr>

<mark>important</mark> H<sub>2</sub>O <sup>2</sup> <u>underlined</u>

<details open><summary>More</summary>Safe text</details>
`);

    expect(container.querySelector("h1")?.textContent).toBe("Heading");
    expect(container.querySelector("abbr")?.getAttribute("title")).toBe("中文释义");
    expect(container.querySelector("mark")?.textContent).toBe("important");
    expect(container.querySelector("details")?.hasAttribute("open")).toBe(true);
    expect(container.querySelector("summary")?.textContent).toBe("More");
  });

  it("removes executable markup, event handlers, styles, and javascript URLs", async () => {
    const container = await render(`
<script>window.pwned = true</script>
<iframe src="https://evil.example"></iframe>
<style>body { display: none }</style>
<img src="https://example.com/image.png" onerror="alert(1)" style="position:fixed">
<a href="javascript:alert(1)" onclick="alert(2)">unsafe link</a>
<abbr title="safe" onmouseover="alert(3)">term</abbr>
`);

    expect(container.querySelector("script, iframe, style")).toBeNull();
    expect(container.querySelector("img")?.hasAttribute("onerror")).toBe(false);
    expect(container.querySelector("img")?.hasAttribute("style")).toBe(false);
    expect(container.querySelector("a")?.hasAttribute("href")).toBe(false);
    expect(container.querySelector("a")?.hasAttribute("onclick")).toBe(false);
    expect(container.querySelector("abbr")?.hasAttribute("onmouseover")).toBe(false);
  });

  it("drops unsupported wrappers while retaining readable text", async () => {
    const container = await render("Before <custom-widget data-value=\"x\">readable text</custom-widget> after");
    expect(container.querySelector("custom-widget")).toBeNull();
    expect(container.textContent).toContain("readable text");
  });

  it("restores only allowlisted HTML escaped by the legacy rich editor", async () => {
    const container = await render(`
Backslash \\<sup>[1]\\</sup>

Entity &lt;abbr title=&quot;令人震惊的；惊人的&quot;&gt;&lt;strong&gt;staggering&lt;/strong&gt;&lt;/abbr&gt;

Blocked &lt;script&gt;window.pwned = true&lt;/script&gt;
`);

    expect(container.querySelector("sup")?.textContent).toBe("[1]");
    expect(container.querySelector("abbr")?.getAttribute("title")).toBe("令人震惊的；惊人的");
    expect(container.querySelector("abbr strong")?.textContent).toBe("staggering");
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<script>");
  });

  it("preserves safe links and blocks unsafe image schemes", async () => {
    const container = await render(`
[safe](https://example.com/page)

![bad](javascript:alert(1))
`);
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://example.com/page");
    expect(link?.getAttribute("target")).toBe("_blank");
    const image = container.querySelector("img");
    expect(image?.hasAttribute("src") ?? false).toBe(false);
  });
});
