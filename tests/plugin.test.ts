import { afterEach, describe, expect, it, vi } from "vitest";
import type { EdgeEverPanel, EdgeEverPluginContext } from "../src/edgeever-api";
import { createSafeHtmlReaderPlugin } from "../src/main";

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

const createContext = (hasDocument = true, legacy = false) => {
  let panel: EdgeEverPanel | null = null;
  let command: { id: string; title: string; run(): void | Promise<void> } | null = null;
  const notices: string[] = [];
  const context: EdgeEverPluginContext = {
    pluginId: "io.github.yaqxuan.safe-html-reader",
    notes: {
      get: vi.fn(async () => ({
        id: "note-1",
        title: "Example",
        contentMarkdown: legacy ? "# Legacy Saved\n\n<mark>Whole note</mark>" : "Saved",
      })),
    },
    editor: legacy
      ? {
          getSelection: vi.fn(async () => hasDocument
            ? { noteId: "note-1", contentMarkdown: "" }
            : null),
        }
      : {
          getDocument: vi.fn(async () => hasDocument
            ? { noteId: "note-1", contentMarkdown: "# Live\n\n<mark>Current</mark>", hasUnsavedChanges: true }
            : null),
        },
    commands: {
      register: vi.fn((value) => {
        command = value;
        return vi.fn();
      }),
    },
    ui: {
      showNotice: vi.fn((message) => notices.push(message)),
      panels: {
        register: vi.fn((value) => {
          panel = value;
          return vi.fn();
        }),
        open: legacy ? undefined : vi.fn(async () => undefined),
      },
    },
  };
  return {
    context,
    notices,
    getPanel: () => panel as EdgeEverPanel | null,
    getCommand: () => command,
  };
};

describe("Safe HTML Reader plugin", () => {
  it("registers the documented command and panel with read-only permissions", async () => {
    const harness = createContext();
    const dispose = await createSafeHtmlReaderPlugin().activate(harness.context);

    expect(harness.getCommand()?.title).toBe("Open Safe HTML Reading View");
    expect(harness.getPanel()?.title).toBe("Safe HTML Reader");

    await harness.getCommand()?.run();
    expect(harness.context.ui.panels.open).toHaveBeenCalledWith("safe-html-reading-view");
    if (typeof dispose === "function") dispose();
  });

  it("renders the live editor Markdown, including unsaved changes", async () => {
    const harness = createContext();
    const disposePlugin = await createSafeHtmlReaderPlugin().activate(harness.context);
    const container = document.createElement("div");
    document.body.append(container);
    const disposePanel = await harness.getPanel()?.mount(container);

    await vi.waitFor(() => {
      expect(container.querySelector("h1")?.textContent).toBe("Live");
      expect(container.querySelector("mark")?.textContent).toBe("Current");
      expect(container.textContent).toContain("包含尚未保存的修改");
    });

    if (typeof disposePanel === "function") disposePanel();
    if (typeof disposePlugin === "function") disposePlugin();
  });

  it("does not crash when no editable note is open", async () => {
    const harness = createContext(false);
    const dispose = await createSafeHtmlReaderPlugin().activate(harness.context);
    await harness.getCommand()?.run();
    expect(harness.notices[0]).toContain("请先打开一篇笔记");
    expect(harness.context.ui.panels.open).toHaveBeenCalled();
    if (typeof dispose === "function") dispose();
  });

  it("supports EdgeEver v1.51.1 through getSelection and the panel menu", async () => {
    const harness = createContext(true, true);
    const disposePlugin = await createSafeHtmlReaderPlugin().activate(harness.context);
    expect(harness.getCommand()).toBeNull();

    const container = document.createElement("div");
    document.body.append(container);
    const disposePanel = await harness.getPanel()?.mount(container);

    await vi.waitFor(() => {
      expect(container.querySelector("h1")?.textContent).toBe("Legacy Saved");
      expect(container.querySelector("mark")?.textContent).toBe("Whole note");
      expect(container.textContent).toContain("正在显示当前笔记的最新 Markdown");
    });

    if (typeof disposePanel === "function") disposePanel();
    if (typeof disposePlugin === "function") disposePlugin();
  });
});
