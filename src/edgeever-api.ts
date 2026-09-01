/**
 * Minimal Plugin API v1 contracts used by this project.
 *
 * Verified against tianma-if/edgeever commit
 * 609a589ebbeb0ed0182fe4f73cdf885b4ed62b74 on 2026-09-01.
 * The official @edgeever/plugin-api package exists in the EdgeEver monorepo
 * but was not published to npm at the time of this release. Keeping these
 * declarations local avoids a runtime SDK import in the required single-file
 * bundle. No EdgeEver implementation code is copied here.
 */

export interface EdgeEverEditorDocument {
  noteId: string;
  contentMarkdown: string;
  hasUnsavedChanges?: boolean;
}

export interface EdgeEverEditorSelection {
  noteId: string;
  contentMarkdown: string;
}

export interface EdgeEverNote {
  id: string;
  title: string | null;
  contentMarkdown: string;
}

export interface EdgeEverPanel {
  id: string;
  title: string;
  mount(container: HTMLElement): void | (() => void) | Promise<void | (() => void)>;
}

export interface EdgeEverPluginContext {
  pluginId: string;
  notes: {
    get(noteId: string): Promise<EdgeEverNote>;
  };
  editor: {
    getDocument?(): Promise<EdgeEverEditorDocument | null>;
    getSelection?(): Promise<EdgeEverEditorSelection | null>;
  };
  commands: {
    register(command: {
      id: string;
      title: string;
      run(): void | Promise<void>;
    }): () => void;
  };
  ui: {
    showNotice(message: string): void;
    panels: {
      register(panel: EdgeEverPanel): () => void;
      open?(panelId: string): Promise<void>;
    };
  };
}

export const getCurrentEditorDocument = async (
  context: EdgeEverPluginContext,
): Promise<EdgeEverEditorDocument | null> => {
  if (typeof context.editor.getDocument === "function") {
    return context.editor.getDocument();
  }
  if (typeof context.editor.getSelection === "function") {
    const selection = await context.editor.getSelection();
    return selection
      ? { noteId: selection.noteId, contentMarkdown: selection.contentMarkdown }
      : null;
  }
  throw new Error("当前 EdgeEver 版本没有提供可读取笔记内容的编辑器接口。");
};

export interface EdgeEverPlugin {
  activate(context: EdgeEverPluginContext): void | (() => void) | Promise<void | (() => void)>;
  deactivate?(): void | Promise<void>;
}
