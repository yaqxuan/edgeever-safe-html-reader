import plugin from "/main.js";

const noteMarkdown = `# 浏览器自测文章

This result was <abbr title="令人震惊的；惊人的"><strong>staggering</strong></abbr>.

这是一个重要背景。<sup>[1]</sup>

### [1] 自测注释

这里是完整注释。

<img src="x" onerror="window.__unsafeExecuted = true">`;

const panels = [];
const commands = [];
const context = {
  pluginId: "io.github.yaqxuan.safe-html-reader",
  notes: {
    get: async (noteId) => ({
      id: noteId,
      title: "自动化浏览器自测",
      contentMarkdown: noteMarkdown,
    }),
  },
  editor: {
    // Exact v1.51.1 shape: contentMarkdown is only the selected fragment.
    getSelection: async () => ({
      noteId: "note-browser-test",
      from: 0,
      to: 0,
      empty: true,
      text: "",
      contentMarkdown: "",
    }),
  },
  commands: {
    register: (command) => {
      commands.push(command);
      return () => undefined;
    },
  },
  ui: {
    showNotice: () => undefined,
    panels: {
      register: (panel) => {
        panels.push(panel);
        return () => undefined;
      },
    },
  },
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const run = async () => {
  await plugin.activate(context);
  assert(commands.length === 0, "v1.51.1 must not register the unsupported open-panel command");
  assert(panels.length === 1, "plugin panel was not registered");

  const container = document.querySelector("#plugin-panel");
  const disposeFirst = await panels[0].mount(container);
  const firstRoot = container.firstElementChild;
  const disposeSecond = await panels[0].mount(container);
  const secondRoot = container.firstElementChild;
  assert(firstRoot !== secondRoot, "replacement panel was not mounted");

  // Reproduce EdgeEver's delayed Strict Mode cleanup: the stale disposer runs
  // only after the replacement has already mounted.
  disposeFirst?.();
  assert(container.firstElementChild === secondRoot, "stale disposer erased the replacement panel");

  await new Promise((resolve) => setTimeout(resolve, 250));
  assert(container.querySelector("h1")?.textContent === "浏览器自测文章", "full saved note was not rendered");
  assert(container.querySelector("abbr strong")?.textContent === "staggering", "abbr vocabulary markup was not rendered");
  assert(container.querySelector("sup[data-shr-reference]")?.textContent === "[1]", "reference was not enhanced");
  assert(!container.querySelector("[onerror]"), "unsafe event attribute survived sanitization");
  assert(window.__unsafeExecuted !== true, "unsafe note script executed");

  const result = {
    passed: true,
    edgeEverApi: "v1.51.1",
    heading: container.querySelector("h1")?.textContent,
    vocabulary: container.querySelector("abbr strong")?.textContent,
    reference: container.querySelector("sup[data-shr-reference]")?.textContent,
    staleDisposerSafe: container.firstElementChild === secondRoot,
    unsafeAttributeRemoved: !container.querySelector("[onerror]"),
  };
  document.documentElement.dataset.passed = "true";
  document.querySelector("#test-results").textContent = JSON.stringify(result);
  document.title = "PASS";
};

run().catch((error) => {
  const result = { passed: false, error: error instanceof Error ? error.message : String(error) };
  document.documentElement.dataset.passed = "false";
  document.querySelector("#test-results").textContent = JSON.stringify(result);
  document.title = "FAIL";
});
