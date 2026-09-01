import {
  getCurrentEditorDocument,
  type EdgeEverEditorDocument,
  type EdgeEverPluginContext,
} from "./edgeever-api";
import { renderReadingView, type RenderedReadingView } from "./renderer";

const AUTO_REFRESH_INTERVAL_MS = 1_500;

interface ReaderSnapshot {
  document: EdgeEverEditorDocument;
  title: string;
}

const element = <K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tagName: K,
  className: string,
  text?: string,
) => {
  const node = document.createElement(tagName);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

export class SafeHtmlReaderPanel {
  private readonly context: EdgeEverPluginContext;
  private readonly container: HTMLElement;
  private readonly root: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly status: HTMLParagraphElement;
  private readonly article: HTMLElement;
  private readonly emptyState: HTMLDivElement;
  private readonly errorState: HTMLDivElement;
  private readonly refreshButton: HTMLButtonElement;
  private renderResult: RenderedReadingView | null = null;
  private interval: number | null = null;
  private renderSequence = 0;
  private disposed = false;
  private lastDocument: EdgeEverEditorDocument | null = null;

  constructor(context: EdgeEverPluginContext, container: HTMLElement) {
    this.context = context;
    this.container = container;
    const document = container.ownerDocument;

    this.root = element(document, "div", "safe-html-reader-root");
    const toolbar = element(document, "header", "shr-toolbar");
    const headingGroup = element(document, "div", "shr-heading-group");
    const eyebrow = element(document, "p", "shr-eyebrow", "Safe HTML Reader");
    this.title = element(document, "h2", "shr-note-title", "阅读视图");
    this.status = element(document, "p", "shr-status", "正在读取当前笔记…");
    this.refreshButton = element(document, "button", "shr-refresh-button", "刷新");
    this.refreshButton.type = "button";
    this.refreshButton.addEventListener("click", this.onRefresh);
    headingGroup.append(eyebrow, this.title, this.status);
    toolbar.append(headingGroup, this.refreshButton);

    this.errorState = element(document, "div", "shr-message shr-error");
    this.errorState.setAttribute("role", "alert");
    this.errorState.hidden = true;
    this.emptyState = element(document, "div", "shr-message shr-empty", "请先在 EdgeEver 中打开一篇可编辑的笔记。");
    this.emptyState.hidden = true;
    this.article = element(document, "article", "shr-article");
    this.article.setAttribute("aria-live", "polite");

    this.root.append(toolbar, this.errorState, this.emptyState, this.article);
    container.replaceChildren(this.root);
  }

  start() {
    void this.refresh(true);
    this.interval = window.setInterval(() => void this.refresh(false), AUTO_REFRESH_INTERVAL_MS);
  }

  async refresh(force: boolean) {
    if (this.disposed) return;
    let sequence = this.renderSequence;
    let renderStarted = false;
    try {
      const document = await getCurrentEditorDocument(this.context);
      if (this.disposed) return;
      if (!document) {
        if (force || this.lastDocument) this.showEmptyState();
        return;
      }

      const previous = this.lastDocument;
      const unchanged = previous
        && previous.noteId === document.noteId
        && previous.contentMarkdown === document.contentMarkdown
        && previous.hasUnsavedChanges === document.hasUnsavedChanges;
      if (!force && unchanged) return;

      sequence = ++this.renderSequence;
      renderStarted = true;
      this.refreshButton.disabled = true;
      this.root.setAttribute("aria-busy", "true");
      const snapshot = await this.readSnapshot(document);
      if (this.disposed || sequence !== this.renderSequence) return;
      this.lastDocument = { ...snapshot.document };
      this.title.textContent = snapshot.title;
      this.status.textContent = snapshot.document.hasUnsavedChanges === true
        ? "正在显示当前编辑器内容（包含尚未保存的修改）"
        : snapshot.document.hasUnsavedChanges === false
          ? "正在显示当前笔记的最新 Markdown"
          : "正在显示当前编辑器 Markdown";
      this.errorState.hidden = true;
      this.emptyState.hidden = true;
      this.article.hidden = false;

      this.renderResult?.dispose();
      this.renderResult = null;
      const rendered = await renderReadingView(this.article, snapshot.document.contentMarkdown);
      if (this.disposed || sequence !== this.renderSequence) {
        rendered.dispose();
        return;
      }
      this.renderResult = rendered;
    } catch (error) {
      if (!this.disposed && (!renderStarted || sequence === this.renderSequence)) this.showError(error);
    } finally {
      if (!this.disposed && (!renderStarted || sequence === this.renderSequence)) {
        this.refreshButton.disabled = false;
        this.root.removeAttribute("aria-busy");
      }
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.renderSequence += 1;
    if (this.interval !== null) window.clearInterval(this.interval);
    this.refreshButton.removeEventListener("click", this.onRefresh);
    this.renderResult?.dispose();
    // Only remove the node owned by this panel instance. EdgeEver can mount a
    // replacement panel before an older async disposer runs (notably under
    // React Strict Mode); clearing the shared container here would erase the
    // newly mounted panel and leave an unexplained empty dialog.
    this.root.remove();
  }

  private async readSnapshot(document: EdgeEverEditorDocument): Promise<ReaderSnapshot> {
    let title = "未命名笔记";
    try {
      const note = await this.context.notes.get(document.noteId);
      title = note.title?.trim() || title;
    } catch {
      // The live editor document is still safe to render if the saved title
      // cannot be fetched (for example during a temporary sync failure).
    }
    return { document, title };
  }

  private showEmptyState() {
    this.lastDocument = null;
    this.renderResult?.dispose();
    this.renderResult = null;
    this.article.replaceChildren();
    this.article.hidden = true;
    this.errorState.hidden = true;
    this.emptyState.hidden = false;
    this.title.textContent = "阅读视图";
    this.status.textContent = "没有打开的笔记";
  }

  private showError(error: unknown) {
    this.errorState.textContent = `无法生成阅读视图：${error instanceof Error ? error.message : String(error)}`;
    this.errorState.hidden = false;
    this.emptyState.hidden = true;
    this.article.hidden = true;
    this.status.textContent = "读取失败；你可以修改笔记后再次刷新";
  }

  private readonly onRefresh = () => {
    void this.refresh(true);
  };
}
