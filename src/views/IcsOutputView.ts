import { ItemView, WorkspaceLeaf } from "obsidian";

export const ICS_OUTPUT_VIEW_TYPE = "ics-output";

export class IcsOutputView extends ItemView {
  private buffer = "";

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return ICS_OUTPUT_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "ICS output";
  }

  getIcon(): string {
    return "scroll-text";
  }

  async onOpen(): Promise<void> {
    const el = this.contentEl;
    el.empty();
    el.createEl("pre", {
      cls: "ics-output-pre",
      text: this.buffer || "(no output yet — run an ICS command)",
    });
  }

  async onClose(): Promise<void> {}

  clear(): void {
    this.buffer = "";
    this.render();
  }

  append(text: string): void {
    this.buffer += text;
    if (this.buffer.length > 500_000) {
      this.buffer = this.buffer.slice(-400_000);
    }
    this.render();
  }

  private render(): void {
    const el = this.contentEl;
    el.empty();
    el.createEl("pre", {
      cls: "ics-output-pre",
      text: this.buffer || "(empty)",
    });
  }
}
