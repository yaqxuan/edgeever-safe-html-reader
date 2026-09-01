const TOOLTIP_SELECTOR = "[data-shr-tooltip]";
const SHOW_DELAY_MS = 90;
const VIEWPORT_MARGIN = 12;
const TOOLTIP_GAP = 8;

const isDomNode = (value: EventTarget | null): value is Node =>
  Boolean(value && typeof (value as Node).nodeType === "number");

const isDomElement = (value: EventTarget | null): value is Element =>
  isDomNode(value) && typeof (value as Element).closest === "function";

export class DelegatedTooltip {
  private readonly root: HTMLElement;
  private readonly tooltip: HTMLDivElement;
  private readonly view: Window;
  private activeAnchor: HTMLElement | null = null;
  private pinnedAnchor: HTMLElement | null = null;
  private showTimer: number | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.view = root.ownerDocument.defaultView ?? window;
    this.tooltip = root.ownerDocument.createElement("div");
    this.tooltip.id = `shr-tooltip-${Math.random().toString(36).slice(2)}`;
    this.tooltip.className = "shr-tooltip";
    this.tooltip.setAttribute("role", "tooltip");
    this.tooltip.hidden = true;
    root.ownerDocument.body.append(this.tooltip);

    root.addEventListener("pointerover", this.onPointerOver);
    root.addEventListener("pointerout", this.onPointerOut);
    root.addEventListener("focusin", this.onFocusIn);
    root.addEventListener("focusout", this.onFocusOut);
    root.addEventListener("click", this.onClick);
    root.ownerDocument.addEventListener("pointerdown", this.onDocumentPointerDown, true);
    root.ownerDocument.addEventListener("keydown", this.onDocumentKeyDown);
    this.view.addEventListener("resize", this.onViewportChange);
    this.view.addEventListener("scroll", this.onViewportChange, true);
  }

  dispose() {
    this.cancelShow();
    this.hide();
    this.root.removeEventListener("pointerover", this.onPointerOver);
    this.root.removeEventListener("pointerout", this.onPointerOut);
    this.root.removeEventListener("focusin", this.onFocusIn);
    this.root.removeEventListener("focusout", this.onFocusOut);
    this.root.removeEventListener("click", this.onClick);
    this.root.ownerDocument.removeEventListener("pointerdown", this.onDocumentPointerDown, true);
    this.root.ownerDocument.removeEventListener("keydown", this.onDocumentKeyDown);
    this.view.removeEventListener("resize", this.onViewportChange);
    this.view.removeEventListener("scroll", this.onViewportChange, true);
    this.tooltip.remove();
  }

  private resolveAnchor(target: EventTarget | null) {
    if (!isDomElement(target)) return null;
    const anchor = target.closest<HTMLElement>(TOOLTIP_SELECTOR);
    return anchor && this.root.contains(anchor) ? anchor : null;
  }

  private scheduleShow(anchor: HTMLElement) {
    this.cancelShow();
    this.showTimer = this.view.setTimeout(() => {
      this.showTimer = null;
      this.show(anchor);
    }, SHOW_DELAY_MS);
  }

  private cancelShow() {
    if (this.showTimer === null) return;
    this.view.clearTimeout(this.showTimer);
    this.showTimer = null;
  }

  private show(anchor: HTMLElement) {
    const content = anchor.dataset.shrTooltip?.trim();
    if (!content) return;
    if (this.activeAnchor && this.activeAnchor !== anchor) this.activeAnchor.removeAttribute("aria-describedby");
    this.activeAnchor = anchor;
    this.tooltip.textContent = content;
    this.tooltip.hidden = false;
    this.tooltip.classList.add("shr-tooltip-visible");
    anchor.setAttribute("aria-describedby", this.tooltip.id);
    this.position(anchor);
  }

  private hide() {
    this.cancelShow();
    this.activeAnchor?.removeAttribute("aria-describedby");
    this.activeAnchor = null;
    this.pinnedAnchor = null;
    this.tooltip.classList.remove("shr-tooltip-visible");
    this.tooltip.hidden = true;
  }

  private position(anchor: HTMLElement) {
    const anchorRect = anchor.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const viewportWidth = this.view.innerWidth;
    const viewportHeight = this.view.innerHeight;
    const preferredLeft = anchorRect.left + (anchorRect.width - tooltipRect.width) / 2;
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, preferredLeft),
      Math.max(VIEWPORT_MARGIN, viewportWidth - tooltipRect.width - VIEWPORT_MARGIN),
    );
    const roomBelow = viewportHeight - anchorRect.bottom;
    const top = roomBelow >= tooltipRect.height + TOOLTIP_GAP || anchorRect.top < tooltipRect.height + TOOLTIP_GAP
      ? anchorRect.bottom + TOOLTIP_GAP
      : anchorRect.top - tooltipRect.height - TOOLTIP_GAP;
    this.tooltip.style.left = `${Math.round(left)}px`;
    this.tooltip.style.top = `${Math.round(Math.max(VIEWPORT_MARGIN, top))}px`;
  }

  private readonly onPointerOver = (event: PointerEvent) => {
    const anchor = this.resolveAnchor(event.target);
    if (!anchor || anchor === this.activeAnchor) return;
    this.scheduleShow(anchor);
  };

  private readonly onPointerOut = (event: PointerEvent) => {
    const anchor = this.resolveAnchor(event.target);
    if (!anchor || anchor === this.pinnedAnchor) return;
    if (isDomNode(event.relatedTarget) && anchor.contains(event.relatedTarget)) return;
    if (anchor === this.activeAnchor) this.hide();
    else this.cancelShow();
  };

  private readonly onFocusIn = (event: FocusEvent) => {
    const anchor = this.resolveAnchor(event.target);
    if (anchor) this.show(anchor);
  };

  private readonly onFocusOut = (event: FocusEvent) => {
    const anchor = this.resolveAnchor(event.target);
    if (anchor && anchor !== this.pinnedAnchor) this.hide();
  };

  private readonly onClick = (event: MouseEvent) => {
    const anchor = this.resolveAnchor(event.target);
    if (!anchor) return;
    if (this.pinnedAnchor === anchor) {
      this.hide();
      return;
    }
    this.pinnedAnchor = anchor;
    this.show(anchor);
  };

  private readonly onDocumentPointerDown = (event: PointerEvent) => {
    if (!this.pinnedAnchor) return;
    if (isDomNode(event.target) && (this.pinnedAnchor.contains(event.target) || this.tooltip.contains(event.target))) return;
    this.hide();
  };

  private readonly onDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") this.hide();
  };

  private readonly onViewportChange = () => {
    if (this.activeAnchor) this.position(this.activeAnchor);
  };
}
