import {
  App,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
} from "obsidian";
import {
  applyCommitTemplate,
  defaultCommitPattern,
} from "./commitTemplate";
import { DEFAULT_SETTINGS, type IcsSettings } from "./settings";
import { IcsRunner } from "./runner";
import { ICS_OUTPUT_VIEW_TYPE, IcsOutputView } from "./views/IcsOutputView";

/** Design §7 / feature spec §4.1: non-zero exit notices include trimmed combined output */
const NOTICE_OUTPUT_MAX = 2048;

const ACTOR_OPTIONS = ["human", "claude", "cursor", "ics-bot"] as const;

function truncateForNotice(text: string, max: number): string {
  const t = text.replace(/\r\n/g, "\n").trim();
  if (t.length <= max) return t;
  return "…" + t.slice(-(max - 1));
}

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

export type RunIcsStreamMode = "stream" | "buffer-line-filter";

export interface RunIcsOptions {
  /** Default stream: chunks go to the panel as they arrive. */
  streamMode?: RunIcsStreamMode;
  /** Required when streamMode is buffer-line-filter; lines not containing this are dropped. */
  lineFilterSubstring?: string;
}

class ResearchCommitModal extends Modal {
  private phaseInput!: HTMLInputElement;
  private paperIdInput!: HTMLInputElement;
  private summaryInput!: HTMLTextAreaElement;
  private previewInput!: HTMLTextAreaElement;
  private actorValue: string;
  private finished = false;
  private result: string | null = null;

  constructor(
    app: App,
    private readonly plugin: IcsPlugin,
    private readonly onDone: (message: string | null) => void
  ) {
    super(app);
    this.actorValue = plugin.settings.commitDefaultActor || "human";
  }

  private pattern(): string {
    const p = this.plugin.settings.commitMessagePattern?.trim();
    return p?.length ? p : defaultCommitPattern();
  }

  private refreshPreview(): void {
    const summary = this.summaryInput?.value ?? "";
    const line = applyCommitTemplate(this.pattern(), {
      actor: this.actorValue,
      paper_id: this.paperIdInput?.value ?? "",
      phase: this.phaseInput?.value ?? "",
      summary,
    });
    if (this.previewInput) {
      this.previewInput.value = line;
    }
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "ICS commit" });

    new Setting(contentEl).setName("Actor").addDropdown((dd) => {
      for (const a of ACTOR_OPTIONS) {
        dd.addOption(a, a);
      }
      const initial = ACTOR_OPTIONS.includes(
        this.actorValue as (typeof ACTOR_OPTIONS)[number]
      )
        ? this.actorValue
        : "human";
      dd.setValue(initial);
      this.actorValue = initial;
      dd.onChange((v) => {
        this.actorValue = v;
        this.refreshPreview();
      });
    });

    new Setting(contentEl).setName("Phase").addText((t) => {
      t.setPlaceholder("inbox, eli5, gaps, …")
        .setValue(this.plugin.settings.commitDefaultPhase)
        .onChange(() => this.refreshPreview());
      this.phaseInput = t.inputEl;
    });

    new Setting(contentEl).setName("Paper id").addText((t) => {
      t.setPlaceholder("e.g. s41534-021-00368-4")
        .setValue(this.plugin.settings.commitDefaultPaperId)
        .onChange(() => this.refreshPreview());
      this.paperIdInput = t.inputEl;
    });

    contentEl.createEl("div", { text: "Summary", cls: "setting-item-name" });
    this.summaryInput = contentEl.createEl("textarea");
    this.summaryInput.rows = 4;
    this.summaryInput.addEventListener("input", () => this.refreshPreview());

    contentEl.createEl("div", {
      text: "Preview (sent to ics commit -m)",
      cls: "setting-item-name",
    });
    this.previewInput = contentEl.createEl("textarea");
    this.previewInput.rows = 3;
    this.previewInput.readOnly = true;

    this.refreshPreview();

    new Setting(contentEl)
      .addButton((b) =>
        b.setButtonText("Commit").onClick(() => {
          const v = this.previewInput.value.trim();
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
      id: "status",
      name: "Status",
      callback: () => void this.runIcs(["status"]),
    });

    this.addCommand({
      id: "log",
      name: "Log",
      callback: () => void this.runIcs(["log"]),
    });

    this.addCommand({
      id: "log-filtered",
      name: "Log (filtered)",
      callback: () => void this.runFilteredLog(),
    });

    this.addCommand({
      id: "diff-vault",
      name: "Diff (vault)",
      callback: () => void this.runIcs(["diff"]),
    });

    this.addCommand({
      id: "diff-active-file",
      name: "Diff (active file)",
      callback: () => void this.diffActiveFile(),
    });

    this.addCommand({
      id: "commit",
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

  async runFilteredLog(): Promise<void> {
    const sub = this.settings.logFilterPathSubstring.trim();
    if (!sub.length) {
      new Notice(
        "Set “Log filter substring” in ICS settings, or use ICS: Log for full output."
      );
      return;
    }
    await this.runIcs(["log"], {
      streamMode: "buffer-line-filter",
      lineFilterSubstring: sub,
    });
  }

  async runIcs(args: string[], options?: RunIcsOptions): Promise<void> {
    const view = await this.ensureOutputView();
    view.clear();
    const cwd = vaultBasePath(this.app);
    const bin = this.settings.icsBinaryPath.trim() || "ics";
    const env = childEnv(this.settings);

    const useLineFilter = options?.streamMode === "buffer-line-filter";
    const filterSub = options?.lineFilterSubstring?.trim() ?? "";
    if (useLineFilter && !filterSub.length) {
      new Notice("Log filter: empty substring");
      return;
    }

    let acc = "";
    let combinedForNotice = "";

    const append = (chunk: string, stream: "stdout" | "stderr") => {
      const prefix = stream === "stderr" ? "[stderr] " : "";
      const piece = prefix + chunk;
      if (useLineFilter) {
        acc += piece;
      } else {
        view.append(piece);
      }
      combinedForNotice += piece;
    };

    try {
      const { code } = await this.runner.run(bin, args, { cwd, env, onChunk: append });
      if (useLineFilter && code === 0) {
        const lines = acc.split(/\r?\n/);
        const kept = lines.filter((ln) => ln.includes(filterSub));
        const text =
          kept.length > 0
            ? kept.join("\n") + "\n"
            : "(no matching log lines)\n";
        view.clear();
        view.append(text);
      }

      if (code === 0) {
        new Notice("ics: finished (0)");
      } else {
        const tail = truncateForNotice(combinedForNotice, NOTICE_OUTPUT_MAX);
        const summary = `ics: exited with code ${code ?? "?"}.`;
        new Notice(tail ? `${summary}\n${tail}` : summary);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      view.append(`\n[plugin error] ${msg}\n`);
      new Notice(`ics spawn failed (${bin}): ${msg}`);
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
      const m = new ResearchCommitModal(this.app, this, resolve);
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

    containerEl.createEl("h3", { text: "Research commit template" });

    new Setting(containerEl)
      .setName("Default actor")
      .setDesc("Prefills the commit modal: human, claude, cursor, or ics-bot.")
      .addDropdown((dd) => {
        for (const a of ACTOR_OPTIONS) {
          dd.addOption(a, a);
        }
        dd.setValue(
          ACTOR_OPTIONS.includes(
            this.plugin.settings.commitDefaultActor as (typeof ACTOR_OPTIONS)[number]
          )
            ? this.plugin.settings.commitDefaultActor
            : "human"
        );
        dd.onChange(async (v) => {
          this.plugin.settings.commitDefaultActor = v;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Default phase")
      .setDesc("Prefills the commit modal (e.g. inbox, eli5, gaps, peer, synthesis).")
      .addText((t) =>
        t
          .setValue(this.plugin.settings.commitDefaultPhase)
          .onChange(async (v) => {
            this.plugin.settings.commitDefaultPhase = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Default paper id")
      .setDesc("Prefills the commit modal (e.g. s41534-021-00368-4).")
      .addText((t) =>
        t
          .setValue(this.plugin.settings.commitDefaultPaperId)
          .onChange(async (v) => {
            this.plugin.settings.commitDefaultPaperId = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Commit message pattern")
      .setDesc(
        "Placeholders: {actor}, {paper_id}, {phase}, {summary}. Example: [{actor}][research][{paper_id}][{phase}] {summary}"
      )
      .addText((t) =>
        t
          .setPlaceholder(defaultCommitPattern())
          .setValue(this.plugin.settings.commitMessagePattern)
          .onChange(async (v) => {
            this.plugin.settings.commitMessagePattern = v;
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("h3", { text: "Log filter" });

    new Setting(containerEl)
      .setName("Log filter substring")
      .setDesc(
        "ICS: Log (filtered) runs ics log, then shows only lines containing this substring (e.g. a paper id or Research/papers/...). Run `ics log --help` to see if your CLI supports path-scoped log; this plugin does not pass extra args yet."
      )
      .addText((t) =>
        t
          .setPlaceholder("e.g. s41534-021-00368-4")
          .setValue(this.plugin.settings.logFilterPathSubstring)
          .onChange(async (v) => {
            this.plugin.settings.logFilterPathSubstring = v;
            await this.plugin.saveSettings();
          })
      );
  }
}
