import type { EdgeEverPluginContext } from "./edgeever-api";
import { SafeHtmlReaderPanel } from "./panel";

export interface LegacyReaderDialog {
  close(): void;
  refresh(): Promise<void>;
}

export const openLegacyReaderDialog = (
  context: EdgeEverPluginContext,
): LegacyReaderDialog => {
  const ownerDocument = window.document;
  const previouslyFocused = ownerDocument.activeElement instanceof HTMLElement
    ? ownerDocument.activeElement
    : null;
  const backdrop = ownerDocument.createElement("div");
  backdrop.className = "shr-legacy-backdrop";
  const dialog = ownerDocument.createElement("section");
  dialog.className = "shr-legacy-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "shr-legacy-dialog-title");

  const header = ownerDocument.createElement("header");
  header.className = "shr-legacy-dialog-header";
  const title = ownerDocument.createElement("h2");
  title.id = "shr-legacy-dialog-title";
  title.textContent = "Safe HTML Reader";
  const closeButton = ownerDocument.createElement("button");
  closeButton.type = "button";
  closeButton.className = "shr-legacy-dialog-close";
  closeButton.setAttribute("aria-label", "关闭 Safe HTML Reader");
  closeButton.textContent = "×";
  header.append(title, closeButton);

  const panelContainer = ownerDocument.createElement("div");
  panelContainer.className = "shr-legacy-dialog-content";
  dialog.append(header, panelContainer);
  backdrop.append(dialog);
  ownerDocument.body.append(backdrop);

  const panel = new SafeHtmlReaderPanel(context, panelContainer);
  panel.start();
  let closed = false;
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") close();
  };
  const close = () => {
    if (closed) return;
    closed = true;
    ownerDocument.removeEventListener("keydown", onKeyDown);
    panel.dispose();
    backdrop.remove();
    previouslyFocused?.focus();
  };
  closeButton.addEventListener("click", close, { once: true });
  backdrop.addEventListener("pointerdown", (event) => {
    if (event.target === backdrop) close();
  });
  ownerDocument.addEventListener("keydown", onKeyDown);
  closeButton.focus();

  return {
    close,
    refresh: () => panel.refresh(true),
  };
};
