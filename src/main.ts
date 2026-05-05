import {
  App,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
} from "obsidian";
import { DEFAULT_SETTINGS, type IcsSettings } from "./settings";
import { IcsRunner } from "./runner";
import { ICS_OUTPUT_VIEW_TYPE, IcsOutputView } from "./views/IcsOutputView";

function vaultBasePath(app: App): string {
  const adapter = app.vault.adapter;
  if ("getBasePath" in adapter && typeof adapter.getBasePath === "function") {
    return adapter.getBasePath();
  }
  throw new Error("Vault has no filesystem base path (ICS requires a local vault)");
}

function childEnv(settings: IcsSettings): NodeJS.ProcessEnv {
  const env = { ...process.env };
  if (settings.stratumBaseUrl.trim()) {
    env.STRATUM_BASE_URL = settings.stratumBaseUrl.trim();
  }
  return env;
}

class CommitModal extends Modal {
  private input!: HTMLTextAreaElement;
  /** Set by buttons before `close()`; `onClose` forwards to callback */
  private result: string | null = null;
  private finished = false;

  constructor(
    app: App,
    private readonly onDone: (message: string | null) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Commit message" });
    this.input = contentEl.createEl("textarea");
    this.input.rows = 4;
    new Setting(contentEl)
      .addButton((b) =>
        b.setButtonText("Commit").onClick(() => {
          const v = this.input.value.trim();
          this.result = v.length ? v : null;
          this.close();
        })
      )
      .addButton((b) =>
        b.setButtonText("Cancel").onClick(() => {
          this.result = null;
          this.close();
        })
      );
  }

  onClose(): void {
    this.contentEl.empty();
    if (this.finished) return;
    this.finished = true;
    this.onDone(this.result);
  }
}

export default class IcsPlugin extends Plugin {
  settings: IcsSettings = { ...DEFAULT_SETTINGS };
  runner = new IcsRunner();

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(ICS_OUTPUT_VIEW_TYPE, (leaf) => new IcsOutputView(leaf));

    this.addRibbonIcon("scroll-text", "Open ICS output", () => {
      void this.ensureOutputView();
    });

    this.addCommand({
      id: "ics-status",
      name: "Status",
      callback: () => void this.runIcs(["status"]),
    });

    this.addCommand({
      id: "ics-log",
      name: "Log",
      callback: () => void this.runIcs(["log"]),
    });

    this.addCommand({
      id: "ics-diff",
      name: "Diff (vault)",
      callback: () => void this.runIcs(["diff"]),
    });

    this.addCommand({
      id: "ics-diff-active",
      name: "Diff (active file)",
      callback: () => void this.diffActiveFile(),
    });

    this.addCommand({
      id: "ics-commit",
      name: "Commit…",
      callback: () => void this.promptCommit(),
    });

    this.addSettingTab(new IcsSettingTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async ensureOutputView(): Promise<IcsOutputView> {
    const { workspace } = this.app;
    const existing = workspace.getLeavesOfType(ICS_OUTPUT_VIEW_TYPE);
    if (existing.length > 0) {
      const leaf = existing[0]!;
      await workspace.revealLeaf(leaf);
      return leaf.view as IcsOutputView;
    }
    const leaf = workspace.getRightLeaf(false);
    if (!leaf) {
      new Notice("Could not open right sidebar leaf");
      throw new Error("no right leaf");
    }
    await leaf.setViewState({ type: ICS_OUTPUT_VIEW_TYPE, active: true });
    await workspace.revealLeaf(leaf);
    return leaf.view as IcsOutputView;
  }

  async runIcs(args: string[]): Promise<void> {
    const view = await this.ensureOutputView();
    view.clear();
    const cwd = vaultBasePath(this.app);
    const bin = this.settings.icsBinaryPath.trim() || "ics";
    const env = childEnv(this.settings);

    const append = (chunk: string, stream: "stdout" | "stderr") => {
      const prefix = stream === "stderr" ? "[stderr] " : "";
      view.append(prefix + chunk);
    };

    try {
      const { code } = await this.runner.run(bin, args, { cwd, env, onChunk: append });
      if (code === 0) {
        new Notice("ics: finished (0)");
      } else {
        new Notice(`ics: exited with code ${code ?? "?"}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      view.append(`\n[plugin error] ${msg}\n`);
      new Notice(`ics spawn failed: ${msg}`);
    }
  }

  async diffActiveFile(): Promise<void> {
    const f = this.app.workspace.getActiveFile();
    if (!f) {
      new Notice("No active file");
      return;
    }
    await this.runIcs(["diff", f.path]);
  }

  async promptCommit(): Promise<void> {
    const message = await new Promise<string | null>((resolve) => {
      const m = new CommitModal(this.app, resolve);
      m.open();
    });
    if (!message) {
      new Notice("Commit cancelled");
      return;
    }
    await this.runIcs(["commit", "-m", message]);
  }
}

class IcsSettingTab extends PluginSettingTab {
  plugin: IcsPlugin;

  constructor(app: App, plugin: IcsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "ICS" });

    new Setting(containerEl)
      .setName("ics binary")
      .setDesc("Path or command name (e.g. ics, /usr/bin/ics, ~/.cargo/bin/ics)")
      .addText((t) =>
        t
          .setPlaceholder("ics")
          .setValue(this.plugin.settings.icsBinaryPath)
          .onChange(async (v) => {
            this.plugin.settings.icsBinaryPath = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Stratum base URL (optional)")
      .setDesc("Sets STRATUM_BASE_URL for the child process when non-empty.")
      .addText((t) =>
        t
          .setPlaceholder("https://…")
          .setValue(this.plugin.settings.stratumBaseUrl)
          .onChange(async (v) => {
            this.plugin.settings.stratumBaseUrl = v;
            await this.plugin.saveSettings();
          })
      );
  }
}
