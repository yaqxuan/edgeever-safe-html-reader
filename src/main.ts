import {
  getCurrentEditorDocument,
  type EdgeEverPlugin,
  type EdgeEverPluginContext,
} from "./edgeever-api";
import { SafeHtmlReaderPanel } from "./panel";

const PANEL_ID = "safe-html-reading-view";
const COMMAND_ID = "open-safe-html-reading-view";

export const createSafeHtmlReaderPlugin = (): EdgeEverPlugin => ({
  activate(context: EdgeEverPluginContext) {
    let activePanel: SafeHtmlReaderPanel | null = null;

    const disposePanel = context.ui.panels.register({
      id: PANEL_ID,
      title: "Safe HTML Reader",
      mount(container) {
        const panel = new SafeHtmlReaderPanel(context, container);
        activePanel = panel;
        panel.start();
        return () => {
          if (activePanel === panel) activePanel = null;
          panel.dispose();
        };
      },
    });

    const disposeCommand = typeof context.ui.panels.open === "function"
      ? context.commands.register({
          id: COMMAND_ID,
          title: "Open Safe HTML Reading View",
          async run() {
            const document = await getCurrentEditorDocument(context);
            if (!document) context.ui.showNotice("请先打开一篇笔记，再进入阅读模式。");
            await context.ui.panels.open?.(PANEL_ID);
            await activePanel?.refresh(true);
          },
        })
      : () => undefined;

    return () => {
      activePanel?.dispose();
      activePanel = null;
      disposeCommand();
      disposePanel();
    };
  },
});

export default createSafeHtmlReaderPlugin();
