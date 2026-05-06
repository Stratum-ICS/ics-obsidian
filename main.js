/*
THIS IS A GENERATED FILE
*/

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => IcsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/commitTemplate.ts
var DEFAULT_PATTERN = "[{writer}][research][{paper_id}][{phase}] {summary}";
function applyCommitTemplate(pattern, vars) {
  return pattern.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    return v !== void 0 && v !== null ? String(v) : `{${key}}`;
  });
}
function defaultCommitPattern() {
  return DEFAULT_PATTERN;
}

// src/settings.ts
var DEFAULT_SETTINGS = {
  icsBinaryPath: "ics",
  stratumBaseUrl: "",
  commitDefaultWriter: "human",
  commitDefaultPaperId: "",
  commitDefaultPhase: "inbox",
  commitMessagePattern: "[{writer}][research][{paper_id}][{phase}] {summary}",
  logFilterPathSubstring: ""
};

// src/runner.ts
var import_child_process = require("child_process");
var IcsRunner = class {
  constructor() {
    this.queue = Promise.resolve();
  }
  run(binary, args, opts) {
    const task = async () => {
      opts.onStart?.();
      return await this.spawnOnce(binary, args, opts);
    };
    const next = this.queue.then(task);
    this.queue = next.then(() => void 0);
    return next;
  }
  spawnOnce(binary, args, opts) {
    return new Promise((resolve, reject) => {
      let child;
      try {
        child = (0, import_child_process.spawn)(binary, args, {
          cwd: opts.cwd,
          env: opts.env,
          shell: false
        });
      } catch (e) {
        reject(e);
        return;
      }
      const pump = (stream, data) => {
        opts.onChunk(data.toString("utf8"), stream);
      };
      child.stdout.on("data", (d) => pump("stdout", d));
      child.stderr.on("data", (d) => pump("stderr", d));
      child.on("error", (err) => reject(err));
      child.on("close", (code, signal) => {
        resolve({ code, signal });
      });
    });
  }
};

// src/views/IcsOutputView.ts
var import_obsidian = require("obsidian");
var ICS_OUTPUT_VIEW_TYPE = "ics-output";
var IcsOutputView = class extends import_obsidian.ItemView {
  constructor(leaf) {
    super(leaf);
    this.buffer = "";
  }
  getViewType() {
    return ICS_OUTPUT_VIEW_TYPE;
  }
  getDisplayText() {
    return "ICS output";
  }
  getIcon() {
    return "scroll-text";
  }
  async onOpen() {
    const el = this.contentEl;
    el.empty();
    el.createEl("pre", {
      cls: "ics-output-pre",
      text: this.buffer || "(no output yet \u2014 run an ICS command)"
    });
  }
  async onClose() {
  }
  clear() {
    this.buffer = "";
    this.render();
  }
  append(text) {
    this.buffer += text;
    if (this.buffer.length > 5e5) {
      this.buffer = this.buffer.slice(-4e5);
    }
    this.render();
  }
  render() {
    const el = this.contentEl;
    el.empty();
    el.createEl("pre", {
      cls: "ics-output-pre",
      text: this.buffer || "(empty)"
    });
  }
};

// src/main.ts
var NOTICE_OUTPUT_MAX = 2048;
var WRITER_OPTIONS = ["human", "claude", "cursor", "ics-bot"];
function truncateForNotice(text, max) {
  const t = text.replace(/\r\n/g, "\n").trim();
  if (t.length <= max) return t;
  return "\u2026" + t.slice(-(max - 1));
}
function vaultBasePath(app) {
  const adapter = app.vault.adapter;
  if ("getBasePath" in adapter && typeof adapter.getBasePath === "function") {
    return adapter.getBasePath();
  }
  throw new Error("Vault has no filesystem base path (ICS requires a local vault)");
}
function childEnv(settings) {
  const env = { ...process.env };
  if (settings.stratumBaseUrl.trim()) {
    env.STRATUM_BASE_URL = settings.stratumBaseUrl.trim();
  }
  return env;
}
var ResearchCommitModal = class extends import_obsidian2.Modal {
  constructor(app, plugin, onDone) {
    super(app);
    this.plugin = plugin;
    this.onDone = onDone;
    this.finished = false;
    this.result = null;
    this.writerValue = plugin.settings.commitDefaultWriter || "human";
  }
  pattern() {
    const p = this.plugin.settings.commitMessagePattern?.trim();
    return p?.length ? p : defaultCommitPattern();
  }
  refreshPreview() {
    const summary = this.summaryInput?.value ?? "";
    const line = applyCommitTemplate(this.pattern(), {
      writer: this.writerValue,
      paper_id: this.paperIdInput?.value ?? "",
      phase: this.phaseInput?.value ?? "",
      summary
    });
    if (this.previewInput) {
      this.previewInput.value = line;
    }
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "ICS commit" });
    new import_obsidian2.Setting(contentEl).setName("Writer").addDropdown((dd) => {
      for (const a of WRITER_OPTIONS) {
        dd.addOption(a, a);
      }
      const initial = WRITER_OPTIONS.includes(
        this.writerValue
      ) ? this.writerValue : "human";
      dd.setValue(initial);
      this.writerValue = initial;
      dd.onChange((v) => {
        this.writerValue = v;
        this.refreshPreview();
      });
    });
    new import_obsidian2.Setting(contentEl).setName("Phase").addText((t) => {
      t.setPlaceholder("inbox, eli5, gaps, \u2026").setValue(this.plugin.settings.commitDefaultPhase).onChange(() => this.refreshPreview());
      this.phaseInput = t.inputEl;
    });
    new import_obsidian2.Setting(contentEl).setName("Paper id").addText((t) => {
      t.setPlaceholder("e.g. s41534-021-00368-4").setValue(this.plugin.settings.commitDefaultPaperId).onChange(() => this.refreshPreview());
      this.paperIdInput = t.inputEl;
    });
    contentEl.createEl("div", { text: "Summary", cls: "setting-item-name" });
    this.summaryInput = contentEl.createEl("textarea");
    this.summaryInput.rows = 4;
    this.summaryInput.addEventListener("input", () => this.refreshPreview());
    contentEl.createEl("div", {
      text: "Preview (sent to ics commit -m)",
      cls: "setting-item-name"
    });
    this.previewInput = contentEl.createEl("textarea");
    this.previewInput.rows = 3;
    this.previewInput.readOnly = true;
    this.refreshPreview();
    new import_obsidian2.Setting(contentEl).addButton(
      (b) => b.setButtonText("Commit").onClick(() => {
        const v = this.previewInput.value.trim();
        this.result = v.length ? v : null;
        this.close();
      })
    ).addButton(
      (b) => b.setButtonText("Cancel").onClick(() => {
        this.result = null;
        this.close();
      })
    );
  }
  onClose() {
    this.contentEl.empty();
    if (this.finished) return;
    this.finished = true;
    this.onDone(this.result);
  }
};
var IcsPlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULT_SETTINGS };
    this.runner = new IcsRunner();
  }
  async onload() {
    await this.loadSettings();
    this.registerView(ICS_OUTPUT_VIEW_TYPE, (leaf) => new IcsOutputView(leaf));
    this.addRibbonIcon("scroll-text", "Open ICS output", () => {
      void this.ensureOutputView();
    });
    this.addCommand({
      id: "status",
      name: "Status",
      callback: () => void this.runIcs(["status"])
    });
    this.addCommand({
      id: "log",
      name: "Log",
      callback: () => void this.runIcs(["log"])
    });
    this.addCommand({
      id: "log-filtered",
      name: "Log (filtered)",
      callback: () => void this.runFilteredLog()
    });
    this.addCommand({
      id: "diff-vault",
      name: "Diff (vault)",
      callback: () => void this.runIcs(["diff"])
    });
    this.addCommand({
      id: "diff-active-file",
      name: "Diff (active file)",
      callback: () => void this.diffActiveFile()
    });
    this.addCommand({
      id: "commit",
      name: "Commit\u2026",
      callback: () => void this.promptCommit()
    });
    this.addSettingTab(new IcsSettingTab(this.app, this));
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async ensureOutputView() {
    const { workspace } = this.app;
    const existing = workspace.getLeavesOfType(ICS_OUTPUT_VIEW_TYPE);
    if (existing.length > 0) {
      const leaf2 = existing[0];
      await workspace.revealLeaf(leaf2);
      return leaf2.view;
    }
    const leaf = workspace.getRightLeaf(false);
    if (!leaf) {
      new import_obsidian2.Notice("Could not open right sidebar leaf");
      throw new Error("no right leaf");
    }
    await leaf.setViewState({ type: ICS_OUTPUT_VIEW_TYPE, active: true });
    await workspace.revealLeaf(leaf);
    return leaf.view;
  }
  async runFilteredLog() {
    const sub = this.settings.logFilterPathSubstring.trim();
    if (!sub.length) {
      new import_obsidian2.Notice(
        "Set \u201CLog filter substring\u201D in ICS settings, or use ICS: Log for full output."
      );
      return;
    }
    await this.runIcs(["log"], {
      streamMode: "buffer-line-filter",
      lineFilterSubstring: sub
    });
  }
  async runIcs(args, options) {
    const view = await this.ensureOutputView();
    view.clear();
    const cwd = vaultBasePath(this.app);
    const bin = this.settings.icsBinaryPath.trim() || "ics";
    const env = childEnv(this.settings);
    const useLineFilter = options?.streamMode === "buffer-line-filter";
    const filterSub = options?.lineFilterSubstring?.trim() ?? "";
    if (useLineFilter && !filterSub.length) {
      new import_obsidian2.Notice("Log filter: empty substring");
      return;
    }
    let acc = "";
    let combinedForNotice = "";
    const append = (chunk, stream) => {
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
        const text = kept.length > 0 ? kept.join("\n") + "\n" : "(no matching log lines)\n";
        view.clear();
        view.append(text);
      }
      if (code === 0) {
        new import_obsidian2.Notice("ics: finished (0)");
      } else {
        const tail = truncateForNotice(combinedForNotice, NOTICE_OUTPUT_MAX);
        const summary = `ics: exited with code ${code ?? "?"}.`;
        new import_obsidian2.Notice(tail ? `${summary}
${tail}` : summary);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      view.append(`
[plugin error] ${msg}
`);
      new import_obsidian2.Notice(`ics spawn failed (${bin}): ${msg}`);
    }
  }
  async diffActiveFile() {
    const f = this.app.workspace.getActiveFile();
    if (!f) {
      new import_obsidian2.Notice("No active file");
      return;
    }
    await this.runIcs(["diff", f.path]);
  }
  async promptCommit() {
    const message = await new Promise((resolve) => {
      const m = new ResearchCommitModal(this.app, this, resolve);
      m.open();
    });
    if (!message) {
      new import_obsidian2.Notice("Commit cancelled");
      return;
    }
    await this.runIcs(["commit", "-m", message]);
  }
};
var IcsSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "ICS" });
    new import_obsidian2.Setting(containerEl).setName("ics binary").setDesc("Path or command name (e.g. ics, /usr/bin/ics, ~/.cargo/bin/ics)").addText(
      (t) => t.setPlaceholder("ics").setValue(this.plugin.settings.icsBinaryPath).onChange(async (v) => {
        this.plugin.settings.icsBinaryPath = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Stratum base URL (optional)").setDesc("Sets STRATUM_BASE_URL for the child process when non-empty.").addText(
      (t) => t.setPlaceholder("https://\u2026").setValue(this.plugin.settings.stratumBaseUrl).onChange(async (v) => {
        this.plugin.settings.stratumBaseUrl = v;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "Research commit template" });
    new import_obsidian2.Setting(containerEl).setName("Default writer").setDesc("Prefills the commit modal: human, claude, cursor, or ics-bot.").addDropdown((dd) => {
      for (const a of WRITER_OPTIONS) {
        dd.addOption(a, a);
      }
      dd.setValue(
        WRITER_OPTIONS.includes(
          this.plugin.settings.commitDefaultWriter
        ) ? this.plugin.settings.commitDefaultWriter : "human"
      );
      dd.onChange(async (v) => {
        this.plugin.settings.commitDefaultWriter = v;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian2.Setting(containerEl).setName("Default phase").setDesc("Prefills the commit modal (e.g. inbox, eli5, gaps, peer, synthesis).").addText(
      (t) => t.setValue(this.plugin.settings.commitDefaultPhase).onChange(async (v) => {
        this.plugin.settings.commitDefaultPhase = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Default paper id").setDesc("Prefills the commit modal (e.g. s41534-021-00368-4).").addText(
      (t) => t.setValue(this.plugin.settings.commitDefaultPaperId).onChange(async (v) => {
        this.plugin.settings.commitDefaultPaperId = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Commit message pattern").setDesc(
      "Placeholders: {writer}, {paper_id}, {phase}, {summary}. Example: [{writer}][research][{paper_id}][{phase}] {summary}"
    ).addText(
      (t) => t.setPlaceholder(defaultCommitPattern()).setValue(this.plugin.settings.commitMessagePattern).onChange(async (v) => {
        this.plugin.settings.commitMessagePattern = v;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "Log filter" });
    new import_obsidian2.Setting(containerEl).setName("Log filter substring").setDesc(
      "ICS: Log (filtered) runs ics log, then shows only lines containing this substring (e.g. a paper id or Research/papers/...). Run `ics log --help` to see if your CLI supports path-scoped log; this plugin does not pass extra args yet."
    ).addText(
      (t) => t.setPlaceholder("e.g. s41534-021-00368-4").setValue(this.plugin.settings.logFilterPathSubstring).onChange(async (v) => {
        this.plugin.settings.logFilterPathSubstring = v;
        await this.plugin.saveSettings();
      })
    );
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2NvbW1pdFRlbXBsYXRlLnRzIiwgInNyYy9zZXR0aW5ncy50cyIsICJzcmMvcnVubmVyLnRzIiwgInNyYy92aWV3cy9JY3NPdXRwdXRWaWV3LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQge1xuICBBcHAsXG4gIE1vZGFsLFxuICBOb3RpY2UsXG4gIFBsdWdpbixcbiAgUGx1Z2luU2V0dGluZ1RhYixcbiAgU2V0dGluZyxcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQge1xuICBhcHBseUNvbW1pdFRlbXBsYXRlLFxuICBkZWZhdWx0Q29tbWl0UGF0dGVybixcbn0gZnJvbSBcIi4vY29tbWl0VGVtcGxhdGVcIjtcbmltcG9ydCB7IERFRkFVTFRfU0VUVElOR1MsIHR5cGUgSWNzU2V0dGluZ3MgfSBmcm9tIFwiLi9zZXR0aW5nc1wiO1xuaW1wb3J0IHsgSWNzUnVubmVyIH0gZnJvbSBcIi4vcnVubmVyXCI7XG5pbXBvcnQgeyBJQ1NfT1VUUFVUX1ZJRVdfVFlQRSwgSWNzT3V0cHV0VmlldyB9IGZyb20gXCIuL3ZpZXdzL0ljc091dHB1dFZpZXdcIjtcblxuLyoqIERlc2lnbiBcdTAwQTc3IC8gZmVhdHVyZSBzcGVjIFx1MDBBNzQuMTogbm9uLXplcm8gZXhpdCBub3RpY2VzIGluY2x1ZGUgdHJpbW1lZCBjb21iaW5lZCBvdXRwdXQgKi9cbmNvbnN0IE5PVElDRV9PVVRQVVRfTUFYID0gMjA0ODtcblxuY29uc3QgV1JJVEVSX09QVElPTlMgPSBbXCJodW1hblwiLCBcImNsYXVkZVwiLCBcImN1cnNvclwiLCBcImljcy1ib3RcIl0gYXMgY29uc3Q7XG5cbmZ1bmN0aW9uIHRydW5jYXRlRm9yTm90aWNlKHRleHQ6IHN0cmluZywgbWF4OiBudW1iZXIpOiBzdHJpbmcge1xuICBjb25zdCB0ID0gdGV4dC5yZXBsYWNlKC9cXHJcXG4vZywgXCJcXG5cIikudHJpbSgpO1xuICBpZiAodC5sZW5ndGggPD0gbWF4KSByZXR1cm4gdDtcbiAgcmV0dXJuIFwiXHUyMDI2XCIgKyB0LnNsaWNlKC0obWF4IC0gMSkpO1xufVxuXG5mdW5jdGlvbiB2YXVsdEJhc2VQYXRoKGFwcDogQXBwKTogc3RyaW5nIHtcbiAgY29uc3QgYWRhcHRlciA9IGFwcC52YXVsdC5hZGFwdGVyO1xuICBpZiAoXCJnZXRCYXNlUGF0aFwiIGluIGFkYXB0ZXIgJiYgdHlwZW9mIGFkYXB0ZXIuZ2V0QmFzZVBhdGggPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHJldHVybiBhZGFwdGVyLmdldEJhc2VQYXRoKCk7XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKFwiVmF1bHQgaGFzIG5vIGZpbGVzeXN0ZW0gYmFzZSBwYXRoIChJQ1MgcmVxdWlyZXMgYSBsb2NhbCB2YXVsdClcIik7XG59XG5cbmZ1bmN0aW9uIGNoaWxkRW52KHNldHRpbmdzOiBJY3NTZXR0aW5ncyk6IE5vZGVKUy5Qcm9jZXNzRW52IHtcbiAgY29uc3QgZW52ID0geyAuLi5wcm9jZXNzLmVudiB9O1xuICBpZiAoc2V0dGluZ3Muc3RyYXR1bUJhc2VVcmwudHJpbSgpKSB7XG4gICAgZW52LlNUUkFUVU1fQkFTRV9VUkwgPSBzZXR0aW5ncy5zdHJhdHVtQmFzZVVybC50cmltKCk7XG4gIH1cbiAgcmV0dXJuIGVudjtcbn1cblxuZXhwb3J0IHR5cGUgUnVuSWNzU3RyZWFtTW9kZSA9IFwic3RyZWFtXCIgfCBcImJ1ZmZlci1saW5lLWZpbHRlclwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJ1bkljc09wdGlvbnMge1xuICAvKiogRGVmYXVsdCBzdHJlYW06IGNodW5rcyBnbyB0byB0aGUgcGFuZWwgYXMgdGhleSBhcnJpdmUuICovXG4gIHN0cmVhbU1vZGU/OiBSdW5JY3NTdHJlYW1Nb2RlO1xuICAvKiogUmVxdWlyZWQgd2hlbiBzdHJlYW1Nb2RlIGlzIGJ1ZmZlci1saW5lLWZpbHRlcjsgbGluZXMgbm90IGNvbnRhaW5pbmcgdGhpcyBhcmUgZHJvcHBlZC4gKi9cbiAgbGluZUZpbHRlclN1YnN0cmluZz86IHN0cmluZztcbn1cblxuY2xhc3MgUmVzZWFyY2hDb21taXRNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgcHJpdmF0ZSBwaGFzZUlucHV0ITogSFRNTElucHV0RWxlbWVudDtcbiAgcHJpdmF0ZSBwYXBlcklkSW5wdXQhOiBIVE1MSW5wdXRFbGVtZW50O1xuICBwcml2YXRlIHN1bW1hcnlJbnB1dCE6IEhUTUxUZXh0QXJlYUVsZW1lbnQ7XG4gIHByaXZhdGUgcHJldmlld0lucHV0ITogSFRNTFRleHRBcmVhRWxlbWVudDtcbiAgcHJpdmF0ZSB3cml0ZXJWYWx1ZTogc3RyaW5nO1xuICBwcml2YXRlIGZpbmlzaGVkID0gZmFsc2U7XG4gIHByaXZhdGUgcmVzdWx0OiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHBsdWdpbjogSWNzUGx1Z2luLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgb25Eb25lOiAobWVzc2FnZTogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZFxuICApIHtcbiAgICBzdXBlcihhcHApO1xuICAgIHRoaXMud3JpdGVyVmFsdWUgPSBwbHVnaW4uc2V0dGluZ3MuY29tbWl0RGVmYXVsdFdyaXRlciB8fCBcImh1bWFuXCI7XG4gIH1cblxuICBwcml2YXRlIHBhdHRlcm4oKTogc3RyaW5nIHtcbiAgICBjb25zdCBwID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29tbWl0TWVzc2FnZVBhdHRlcm4/LnRyaW0oKTtcbiAgICByZXR1cm4gcD8ubGVuZ3RoID8gcCA6IGRlZmF1bHRDb21taXRQYXR0ZXJuKCk7XG4gIH1cblxuICBwcml2YXRlIHJlZnJlc2hQcmV2aWV3KCk6IHZvaWQge1xuICAgIGNvbnN0IHN1bW1hcnkgPSB0aGlzLnN1bW1hcnlJbnB1dD8udmFsdWUgPz8gXCJcIjtcbiAgICBjb25zdCBsaW5lID0gYXBwbHlDb21taXRUZW1wbGF0ZSh0aGlzLnBhdHRlcm4oKSwge1xuICAgICAgd3JpdGVyOiB0aGlzLndyaXRlclZhbHVlLFxuICAgICAgcGFwZXJfaWQ6IHRoaXMucGFwZXJJZElucHV0Py52YWx1ZSA/PyBcIlwiLFxuICAgICAgcGhhc2U6IHRoaXMucGhhc2VJbnB1dD8udmFsdWUgPz8gXCJcIixcbiAgICAgIHN1bW1hcnksXG4gICAgfSk7XG4gICAgaWYgKHRoaXMucHJldmlld0lucHV0KSB7XG4gICAgICB0aGlzLnByZXZpZXdJbnB1dC52YWx1ZSA9IGxpbmU7XG4gICAgfVxuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJJQ1MgY29tbWl0XCIgfSk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJXcml0ZXJcIikuYWRkRHJvcGRvd24oKGRkKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IGEgb2YgV1JJVEVSX09QVElPTlMpIHtcbiAgICAgICAgZGQuYWRkT3B0aW9uKGEsIGEpO1xuICAgICAgfVxuICAgICAgY29uc3QgaW5pdGlhbCA9IFdSSVRFUl9PUFRJT05TLmluY2x1ZGVzKFxuICAgICAgICB0aGlzLndyaXRlclZhbHVlIGFzICh0eXBlb2YgV1JJVEVSX09QVElPTlMpW251bWJlcl1cbiAgICAgIClcbiAgICAgICAgPyB0aGlzLndyaXRlclZhbHVlXG4gICAgICAgIDogXCJodW1hblwiO1xuICAgICAgZGQuc2V0VmFsdWUoaW5pdGlhbCk7XG4gICAgICB0aGlzLndyaXRlclZhbHVlID0gaW5pdGlhbDtcbiAgICAgIGRkLm9uQ2hhbmdlKCh2KSA9PiB7XG4gICAgICAgIHRoaXMud3JpdGVyVmFsdWUgPSB2O1xuICAgICAgICB0aGlzLnJlZnJlc2hQcmV2aWV3KCk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIlBoYXNlXCIpLmFkZFRleHQoKHQpID0+IHtcbiAgICAgIHQuc2V0UGxhY2Vob2xkZXIoXCJpbmJveCwgZWxpNSwgZ2FwcywgXHUyMDI2XCIpXG4gICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21taXREZWZhdWx0UGhhc2UpXG4gICAgICAgIC5vbkNoYW5nZSgoKSA9PiB0aGlzLnJlZnJlc2hQcmV2aWV3KCkpO1xuICAgICAgdGhpcy5waGFzZUlucHV0ID0gdC5pbnB1dEVsO1xuICAgIH0pO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiUGFwZXIgaWRcIikuYWRkVGV4dCgodCkgPT4ge1xuICAgICAgdC5zZXRQbGFjZWhvbGRlcihcImUuZy4gczQxNTM0LTAyMS0wMDM2OC00XCIpXG4gICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21taXREZWZhdWx0UGFwZXJJZClcbiAgICAgICAgLm9uQ2hhbmdlKCgpID0+IHRoaXMucmVmcmVzaFByZXZpZXcoKSk7XG4gICAgICB0aGlzLnBhcGVySWRJbnB1dCA9IHQuaW5wdXRFbDtcbiAgICB9KTtcblxuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImRpdlwiLCB7IHRleHQ6IFwiU3VtbWFyeVwiLCBjbHM6IFwic2V0dGluZy1pdGVtLW5hbWVcIiB9KTtcbiAgICB0aGlzLnN1bW1hcnlJbnB1dCA9IGNvbnRlbnRFbC5jcmVhdGVFbChcInRleHRhcmVhXCIpO1xuICAgIHRoaXMuc3VtbWFyeUlucHV0LnJvd3MgPSA0O1xuICAgIHRoaXMuc3VtbWFyeUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJpbnB1dFwiLCAoKSA9PiB0aGlzLnJlZnJlc2hQcmV2aWV3KCkpO1xuXG4gICAgY29udGVudEVsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcbiAgICAgIHRleHQ6IFwiUHJldmlldyAoc2VudCB0byBpY3MgY29tbWl0IC1tKVwiLFxuICAgICAgY2xzOiBcInNldHRpbmctaXRlbS1uYW1lXCIsXG4gICAgfSk7XG4gICAgdGhpcy5wcmV2aWV3SW5wdXQgPSBjb250ZW50RWwuY3JlYXRlRWwoXCJ0ZXh0YXJlYVwiKTtcbiAgICB0aGlzLnByZXZpZXdJbnB1dC5yb3dzID0gMztcbiAgICB0aGlzLnByZXZpZXdJbnB1dC5yZWFkT25seSA9IHRydWU7XG5cbiAgICB0aGlzLnJlZnJlc2hQcmV2aWV3KCk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXG4gICAgICAuYWRkQnV0dG9uKChiKSA9PlxuICAgICAgICBiLnNldEJ1dHRvblRleHQoXCJDb21taXRcIikub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgY29uc3QgdiA9IHRoaXMucHJldmlld0lucHV0LnZhbHVlLnRyaW0oKTtcbiAgICAgICAgICB0aGlzLnJlc3VsdCA9IHYubGVuZ3RoID8gdiA6IG51bGw7XG4gICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICB9KVxuICAgICAgKVxuICAgICAgLmFkZEJ1dHRvbigoYikgPT5cbiAgICAgICAgYi5zZXRCdXR0b25UZXh0KFwiQ2FuY2VsXCIpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgIHRoaXMucmVzdWx0ID0gbnVsbDtcbiAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgIH0pXG4gICAgICApO1xuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGlmICh0aGlzLmZpbmlzaGVkKSByZXR1cm47XG4gICAgdGhpcy5maW5pc2hlZCA9IHRydWU7XG4gICAgdGhpcy5vbkRvbmUodGhpcy5yZXN1bHQpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEljc1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzOiBJY3NTZXR0aW5ncyA9IHsgLi4uREVGQVVMVF9TRVRUSU5HUyB9O1xuICBydW5uZXIgPSBuZXcgSWNzUnVubmVyKCk7XG5cbiAgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG5cbiAgICB0aGlzLnJlZ2lzdGVyVmlldyhJQ1NfT1VUUFVUX1ZJRVdfVFlQRSwgKGxlYWYpID0+IG5ldyBJY3NPdXRwdXRWaWV3KGxlYWYpKTtcblxuICAgIHRoaXMuYWRkUmliYm9uSWNvbihcInNjcm9sbC10ZXh0XCIsIFwiT3BlbiBJQ1Mgb3V0cHV0XCIsICgpID0+IHtcbiAgICAgIHZvaWQgdGhpcy5lbnN1cmVPdXRwdXRWaWV3KCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwic3RhdHVzXCIsXG4gICAgICBuYW1lOiBcIlN0YXR1c1wiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5ydW5JY3MoW1wic3RhdHVzXCJdKSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJsb2dcIixcbiAgICAgIG5hbWU6IFwiTG9nXCIsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLnJ1bkljcyhbXCJsb2dcIl0pLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcImxvZy1maWx0ZXJlZFwiLFxuICAgICAgbmFtZTogXCJMb2cgKGZpbHRlcmVkKVwiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5ydW5GaWx0ZXJlZExvZygpLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcImRpZmYtdmF1bHRcIixcbiAgICAgIG5hbWU6IFwiRGlmZiAodmF1bHQpXCIsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLnJ1bkljcyhbXCJkaWZmXCJdKSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJkaWZmLWFjdGl2ZS1maWxlXCIsXG4gICAgICBuYW1lOiBcIkRpZmYgKGFjdGl2ZSBmaWxlKVwiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5kaWZmQWN0aXZlRmlsZSgpLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcImNvbW1pdFwiLFxuICAgICAgbmFtZTogXCJDb21taXRcdTIwMjZcIixcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMucHJvbXB0Q29tbWl0KCksXG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IEljc1NldHRpbmdUYWIodGhpcy5hcHAsIHRoaXMpKTtcbiAgfVxuXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgYXdhaXQgdGhpcy5sb2FkRGF0YSgpKTtcbiAgfVxuXG4gIGFzeW5jIHNhdmVTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICB9XG5cbiAgYXN5bmMgZW5zdXJlT3V0cHV0VmlldygpOiBQcm9taXNlPEljc091dHB1dFZpZXc+IHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHA7XG4gICAgY29uc3QgZXhpc3RpbmcgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKElDU19PVVRQVVRfVklFV19UWVBFKTtcbiAgICBpZiAoZXhpc3RpbmcubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgbGVhZiA9IGV4aXN0aW5nWzBdITtcbiAgICAgIGF3YWl0IHdvcmtzcGFjZS5yZXZlYWxMZWFmKGxlYWYpO1xuICAgICAgcmV0dXJuIGxlYWYudmlldyBhcyBJY3NPdXRwdXRWaWV3O1xuICAgIH1cbiAgICBjb25zdCBsZWFmID0gd29ya3NwYWNlLmdldFJpZ2h0TGVhZihmYWxzZSk7XG4gICAgaWYgKCFsZWFmKSB7XG4gICAgICBuZXcgTm90aWNlKFwiQ291bGQgbm90IG9wZW4gcmlnaHQgc2lkZWJhciBsZWFmXCIpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwibm8gcmlnaHQgbGVhZlwiKTtcbiAgICB9XG4gICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBJQ1NfT1VUUFVUX1ZJRVdfVFlQRSwgYWN0aXZlOiB0cnVlIH0pO1xuICAgIGF3YWl0IHdvcmtzcGFjZS5yZXZlYWxMZWFmKGxlYWYpO1xuICAgIHJldHVybiBsZWFmLnZpZXcgYXMgSWNzT3V0cHV0VmlldztcbiAgfVxuXG4gIGFzeW5jIHJ1bkZpbHRlcmVkTG9nKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHN1YiA9IHRoaXMuc2V0dGluZ3MubG9nRmlsdGVyUGF0aFN1YnN0cmluZy50cmltKCk7XG4gICAgaWYgKCFzdWIubGVuZ3RoKSB7XG4gICAgICBuZXcgTm90aWNlKFxuICAgICAgICBcIlNldCBcdTIwMUNMb2cgZmlsdGVyIHN1YnN0cmluZ1x1MjAxRCBpbiBJQ1Mgc2V0dGluZ3MsIG9yIHVzZSBJQ1M6IExvZyBmb3IgZnVsbCBvdXRwdXQuXCJcbiAgICAgICk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGF3YWl0IHRoaXMucnVuSWNzKFtcImxvZ1wiXSwge1xuICAgICAgc3RyZWFtTW9kZTogXCJidWZmZXItbGluZS1maWx0ZXJcIixcbiAgICAgIGxpbmVGaWx0ZXJTdWJzdHJpbmc6IHN1YixcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIHJ1bkljcyhhcmdzOiBzdHJpbmdbXSwgb3B0aW9ucz86IFJ1bkljc09wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB2aWV3ID0gYXdhaXQgdGhpcy5lbnN1cmVPdXRwdXRWaWV3KCk7XG4gICAgdmlldy5jbGVhcigpO1xuICAgIGNvbnN0IGN3ZCA9IHZhdWx0QmFzZVBhdGgodGhpcy5hcHApO1xuICAgIGNvbnN0IGJpbiA9IHRoaXMuc2V0dGluZ3MuaWNzQmluYXJ5UGF0aC50cmltKCkgfHwgXCJpY3NcIjtcbiAgICBjb25zdCBlbnYgPSBjaGlsZEVudih0aGlzLnNldHRpbmdzKTtcblxuICAgIGNvbnN0IHVzZUxpbmVGaWx0ZXIgPSBvcHRpb25zPy5zdHJlYW1Nb2RlID09PSBcImJ1ZmZlci1saW5lLWZpbHRlclwiO1xuICAgIGNvbnN0IGZpbHRlclN1YiA9IG9wdGlvbnM/LmxpbmVGaWx0ZXJTdWJzdHJpbmc/LnRyaW0oKSA/PyBcIlwiO1xuICAgIGlmICh1c2VMaW5lRmlsdGVyICYmICFmaWx0ZXJTdWIubGVuZ3RoKSB7XG4gICAgICBuZXcgTm90aWNlKFwiTG9nIGZpbHRlcjogZW1wdHkgc3Vic3RyaW5nXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBhY2MgPSBcIlwiO1xuICAgIGxldCBjb21iaW5lZEZvck5vdGljZSA9IFwiXCI7XG5cbiAgICBjb25zdCBhcHBlbmQgPSAoY2h1bms6IHN0cmluZywgc3RyZWFtOiBcInN0ZG91dFwiIHwgXCJzdGRlcnJcIikgPT4ge1xuICAgICAgY29uc3QgcHJlZml4ID0gc3RyZWFtID09PSBcInN0ZGVyclwiID8gXCJbc3RkZXJyXSBcIiA6IFwiXCI7XG4gICAgICBjb25zdCBwaWVjZSA9IHByZWZpeCArIGNodW5rO1xuICAgICAgaWYgKHVzZUxpbmVGaWx0ZXIpIHtcbiAgICAgICAgYWNjICs9IHBpZWNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmlldy5hcHBlbmQocGllY2UpO1xuICAgICAgfVxuICAgICAgY29tYmluZWRGb3JOb3RpY2UgKz0gcGllY2U7XG4gICAgfTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IGNvZGUgfSA9IGF3YWl0IHRoaXMucnVubmVyLnJ1bihiaW4sIGFyZ3MsIHsgY3dkLCBlbnYsIG9uQ2h1bms6IGFwcGVuZCB9KTtcbiAgICAgIGlmICh1c2VMaW5lRmlsdGVyICYmIGNvZGUgPT09IDApIHtcbiAgICAgICAgY29uc3QgbGluZXMgPSBhY2Muc3BsaXQoL1xccj9cXG4vKTtcbiAgICAgICAgY29uc3Qga2VwdCA9IGxpbmVzLmZpbHRlcigobG4pID0+IGxuLmluY2x1ZGVzKGZpbHRlclN1YikpO1xuICAgICAgICBjb25zdCB0ZXh0ID1cbiAgICAgICAgICBrZXB0Lmxlbmd0aCA+IDBcbiAgICAgICAgICAgID8ga2VwdC5qb2luKFwiXFxuXCIpICsgXCJcXG5cIlxuICAgICAgICAgICAgOiBcIihubyBtYXRjaGluZyBsb2cgbGluZXMpXFxuXCI7XG4gICAgICAgIHZpZXcuY2xlYXIoKTtcbiAgICAgICAgdmlldy5hcHBlbmQodGV4dCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb2RlID09PSAwKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoXCJpY3M6IGZpbmlzaGVkICgwKVwiKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHRhaWwgPSB0cnVuY2F0ZUZvck5vdGljZShjb21iaW5lZEZvck5vdGljZSwgTk9USUNFX09VVFBVVF9NQVgpO1xuICAgICAgICBjb25zdCBzdW1tYXJ5ID0gYGljczogZXhpdGVkIHdpdGggY29kZSAke2NvZGUgPz8gXCI/XCJ9LmA7XG4gICAgICAgIG5ldyBOb3RpY2UodGFpbCA/IGAke3N1bW1hcnl9XFxuJHt0YWlsfWAgOiBzdW1tYXJ5KTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb25zdCBtc2cgPSBlIGluc3RhbmNlb2YgRXJyb3IgPyBlLm1lc3NhZ2UgOiBTdHJpbmcoZSk7XG4gICAgICB2aWV3LmFwcGVuZChgXFxuW3BsdWdpbiBlcnJvcl0gJHttc2d9XFxuYCk7XG4gICAgICBuZXcgTm90aWNlKGBpY3Mgc3Bhd24gZmFpbGVkICgke2Jpbn0pOiAke21zZ31gKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkaWZmQWN0aXZlRmlsZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBmID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcbiAgICBpZiAoIWYpIHtcbiAgICAgIG5ldyBOb3RpY2UoXCJObyBhY3RpdmUgZmlsZVwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy5ydW5JY3MoW1wiZGlmZlwiLCBmLnBhdGhdKTtcbiAgfVxuXG4gIGFzeW5jIHByb21wdENvbW1pdCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBtZXNzYWdlID0gYXdhaXQgbmV3IFByb21pc2U8c3RyaW5nIHwgbnVsbD4oKHJlc29sdmUpID0+IHtcbiAgICAgIGNvbnN0IG0gPSBuZXcgUmVzZWFyY2hDb21taXRNb2RhbCh0aGlzLmFwcCwgdGhpcywgcmVzb2x2ZSk7XG4gICAgICBtLm9wZW4oKTtcbiAgICB9KTtcbiAgICBpZiAoIW1lc3NhZ2UpIHtcbiAgICAgIG5ldyBOb3RpY2UoXCJDb21taXQgY2FuY2VsbGVkXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLnJ1bkljcyhbXCJjb21taXRcIiwgXCItbVwiLCBtZXNzYWdlXSk7XG4gIH1cbn1cblxuY2xhc3MgSWNzU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICBwbHVnaW46IEljc1BsdWdpbjtcblxuICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBJY3NQbHVnaW4pIHtcbiAgICBzdXBlcihhcHAsIHBsdWdpbik7XG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gIH1cblxuICBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJJQ1NcIiB9KTtcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJpY3MgYmluYXJ5XCIpXG4gICAgICAuc2V0RGVzYyhcIlBhdGggb3IgY29tbWFuZCBuYW1lIChlLmcuIGljcywgL3Vzci9iaW4vaWNzLCB+Ly5jYXJnby9iaW4vaWNzKVwiKVxuICAgICAgLmFkZFRleHQoKHQpID0+XG4gICAgICAgIHRcbiAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoXCJpY3NcIilcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuaWNzQmluYXJ5UGF0aClcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmljc0JpbmFyeVBhdGggPSB2O1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiU3RyYXR1bSBiYXNlIFVSTCAob3B0aW9uYWwpXCIpXG4gICAgICAuc2V0RGVzYyhcIlNldHMgU1RSQVRVTV9CQVNFX1VSTCBmb3IgdGhlIGNoaWxkIHByb2Nlc3Mgd2hlbiBub24tZW1wdHkuXCIpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcihcImh0dHBzOi8vXHUyMDI2XCIpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnN0cmF0dW1CYXNlVXJsKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc3RyYXR1bUJhc2VVcmwgPSB2O1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJSZXNlYXJjaCBjb21taXQgdGVtcGxhdGVcIiB9KTtcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWZhdWx0IHdyaXRlclwiKVxuICAgICAgLnNldERlc2MoXCJQcmVmaWxscyB0aGUgY29tbWl0IG1vZGFsOiBodW1hbiwgY2xhdWRlLCBjdXJzb3IsIG9yIGljcy1ib3QuXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRkKSA9PiB7XG4gICAgICAgIGZvciAoY29uc3QgYSBvZiBXUklURVJfT1BUSU9OUykge1xuICAgICAgICAgIGRkLmFkZE9wdGlvbihhLCBhKTtcbiAgICAgICAgfVxuICAgICAgICBkZC5zZXRWYWx1ZShcbiAgICAgICAgICBXUklURVJfT1BUSU9OUy5pbmNsdWRlcyhcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbW1pdERlZmF1bHRXcml0ZXIgYXMgKHR5cGVvZiBXUklURVJfT1BUSU9OUylbbnVtYmVyXVxuICAgICAgICAgIClcbiAgICAgICAgICAgID8gdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29tbWl0RGVmYXVsdFdyaXRlclxuICAgICAgICAgICAgOiBcImh1bWFuXCJcbiAgICAgICAgKTtcbiAgICAgICAgZGQub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21taXREZWZhdWx0V3JpdGVyID0gdjtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWZhdWx0IHBoYXNlXCIpXG4gICAgICAuc2V0RGVzYyhcIlByZWZpbGxzIHRoZSBjb21taXQgbW9kYWwgKGUuZy4gaW5ib3gsIGVsaTUsIGdhcHMsIHBlZXIsIHN5bnRoZXNpcykuXCIpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21taXREZWZhdWx0UGhhc2UpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21taXREZWZhdWx0UGhhc2UgPSB2O1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVmYXVsdCBwYXBlciBpZFwiKVxuICAgICAgLnNldERlc2MoXCJQcmVmaWxscyB0aGUgY29tbWl0IG1vZGFsIChlLmcuIHM0MTUzNC0wMjEtMDAzNjgtNCkuXCIpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21taXREZWZhdWx0UGFwZXJJZClcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbW1pdERlZmF1bHRQYXBlcklkID0gdjtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIH0pXG4gICAgICApO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkNvbW1pdCBtZXNzYWdlIHBhdHRlcm5cIilcbiAgICAgIC5zZXREZXNjKFxuICAgICAgICBcIlBsYWNlaG9sZGVyczoge3dyaXRlcn0sIHtwYXBlcl9pZH0sIHtwaGFzZX0sIHtzdW1tYXJ5fS4gRXhhbXBsZTogW3t3cml0ZXJ9XVtyZXNlYXJjaF1be3BhcGVyX2lkfV1be3BoYXNlfV0ge3N1bW1hcnl9XCJcbiAgICAgIClcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKGRlZmF1bHRDb21taXRQYXR0ZXJuKCkpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbW1pdE1lc3NhZ2VQYXR0ZXJuKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29tbWl0TWVzc2FnZVBhdHRlcm4gPSB2O1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJMb2cgZmlsdGVyXCIgfSk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiTG9nIGZpbHRlciBzdWJzdHJpbmdcIilcbiAgICAgIC5zZXREZXNjKFxuICAgICAgICBcIklDUzogTG9nIChmaWx0ZXJlZCkgcnVucyBpY3MgbG9nLCB0aGVuIHNob3dzIG9ubHkgbGluZXMgY29udGFpbmluZyB0aGlzIHN1YnN0cmluZyAoZS5nLiBhIHBhcGVyIGlkIG9yIFJlc2VhcmNoL3BhcGVycy8uLi4pLiBSdW4gYGljcyBsb2cgLS1oZWxwYCB0byBzZWUgaWYgeW91ciBDTEkgc3VwcG9ydHMgcGF0aC1zY29wZWQgbG9nOyB0aGlzIHBsdWdpbiBkb2VzIG5vdCBwYXNzIGV4dHJhIGFyZ3MgeWV0LlwiXG4gICAgICApXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcihcImUuZy4gczQxNTM0LTAyMS0wMDM2OC00XCIpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmxvZ0ZpbHRlclBhdGhTdWJzdHJpbmcpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb2dGaWx0ZXJQYXRoU3Vic3RyaW5nID0gdjtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIH0pXG4gICAgICApO1xuICB9XG59XG4iLCAiZXhwb3J0IHR5cGUgQ29tbWl0VGVtcGxhdGVWYXJzID0ge1xuICB3cml0ZXI6IHN0cmluZztcbiAgcGFwZXJfaWQ6IHN0cmluZztcbiAgcGhhc2U6IHN0cmluZztcbiAgc3VtbWFyeTogc3RyaW5nO1xufTtcblxuY29uc3QgREVGQVVMVF9QQVRURVJOID0gXCJbe3dyaXRlcn1dW3Jlc2VhcmNoXVt7cGFwZXJfaWR9XVt7cGhhc2V9XSB7c3VtbWFyeX1cIjtcblxuLyoqIFJlcGxhY2UgYHtrZXl9YCBwbGFjZWhvbGRlcnM7IHVua25vd24ga2V5cyBsZWZ0IHVuY2hhbmdlZC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcHBseUNvbW1pdFRlbXBsYXRlKFxuICBwYXR0ZXJuOiBzdHJpbmcsXG4gIHZhcnM6IENvbW1pdFRlbXBsYXRlVmFyc1xuKTogc3RyaW5nIHtcbiAgcmV0dXJuIHBhdHRlcm4ucmVwbGFjZSgvXFx7KFxcdyspXFx9L2csIChfLCBrZXk6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHYgPSB2YXJzW2tleSBhcyBrZXlvZiBDb21taXRUZW1wbGF0ZVZhcnNdO1xuICAgIHJldHVybiB2ICE9PSB1bmRlZmluZWQgJiYgdiAhPT0gbnVsbCA/IFN0cmluZyh2KSA6IGB7JHtrZXl9fWA7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdENvbW1pdFBhdHRlcm4oKTogc3RyaW5nIHtcbiAgcmV0dXJuIERFRkFVTFRfUEFUVEVSTjtcbn1cbiIsICJleHBvcnQgaW50ZXJmYWNlIEljc1NldHRpbmdzIHtcbiAgLyoqIEV4ZWN1dGFibGUgb3IgYmFyZSBuYW1lIHJlc29sdmVkIHZpYSBQQVRIICovXG4gIGljc0JpbmFyeVBhdGg6IHN0cmluZztcbiAgLyoqIFdoZW4gbm9uLWVtcHR5LCBwYXNzZWQgYXMgU1RSQVRVTV9CQVNFX1VSTCB0byB0aGUgY2hpbGQgcHJvY2VzcyAqL1xuICBzdHJhdHVtQmFzZVVybDogc3RyaW5nO1xuICAvKiogRGVmYXVsdCB3cml0ZXI6IGh1bWFuIHwgY2xhdWRlIHwgY3Vyc29yIHwgaWNzLWJvdCAqL1xuICBjb21taXREZWZhdWx0V3JpdGVyOiBzdHJpbmc7XG4gIGNvbW1pdERlZmF1bHRQYXBlcklkOiBzdHJpbmc7XG4gIGNvbW1pdERlZmF1bHRQaGFzZTogc3RyaW5nO1xuICAvKiogUGF0dGVybiB3aXRoIHt3cml0ZXJ9LCB7cGFwZXJfaWR9LCB7cGhhc2V9LCB7c3VtbWFyeX0gKi9cbiAgY29tbWl0TWVzc2FnZVBhdHRlcm46IHN0cmluZztcbiAgLyoqXG4gICAqIFN1YnN0cmluZyBmb3IgKipJQ1M6IExvZyAoZmlsdGVyZWQpKiogXHUyMDE0IGxpbmVzIGNvbnRhaW5pbmcgdGhpcyBzdWJzdHJpbmcgYXJlIGtlcHQuXG4gICAqIERvZXMgbm90IGludm9rZSBgaWNzYCB3aXRoIHBhdGggYXJncyB1bmxlc3MgeW91IGV4dGVuZCB0aGUgQ0xJOyBzZWUgUkVBRE1FIChJQ1MgQ0xJIGNvbXBhdGliaWxpdHkpLlxuICAgKi9cbiAgbG9nRmlsdGVyUGF0aFN1YnN0cmluZzogc3RyaW5nO1xufVxuXG5leHBvcnQgY29uc3QgREVGQVVMVF9TRVRUSU5HUzogSWNzU2V0dGluZ3MgPSB7XG4gIGljc0JpbmFyeVBhdGg6IFwiaWNzXCIsXG4gIHN0cmF0dW1CYXNlVXJsOiBcIlwiLFxuICBjb21taXREZWZhdWx0V3JpdGVyOiBcImh1bWFuXCIsXG4gIGNvbW1pdERlZmF1bHRQYXBlcklkOiBcIlwiLFxuICBjb21taXREZWZhdWx0UGhhc2U6IFwiaW5ib3hcIixcbiAgY29tbWl0TWVzc2FnZVBhdHRlcm46IFwiW3t3cml0ZXJ9XVtyZXNlYXJjaF1be3BhcGVyX2lkfV1be3BoYXNlfV0ge3N1bW1hcnl9XCIsXG4gIGxvZ0ZpbHRlclBhdGhTdWJzdHJpbmc6IFwiXCIsXG59O1xuIiwgImltcG9ydCB7IHNwYXduLCB0eXBlIENoaWxkUHJvY2Vzc1dpdGhvdXROdWxsU3RyZWFtcyB9IGZyb20gXCJjaGlsZF9wcm9jZXNzXCI7XG5cbmV4cG9ydCB0eXBlIFN0cmVhbUhhbmRsZXIgPSAoY2h1bms6IHN0cmluZywgc3RyZWFtOiBcInN0ZG91dFwiIHwgXCJzdGRlcnJcIikgPT4gdm9pZDtcblxuZXhwb3J0IGludGVyZmFjZSBSdW5PcHRpb25zIHtcbiAgY3dkOiBzdHJpbmc7XG4gIGVudjogTm9kZUpTLlByb2Nlc3NFbnY7XG4gIG9uQ2h1bms6IFN0cmVhbUhhbmRsZXI7XG4gIG9uU3RhcnQ/OiAoKSA9PiB2b2lkO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBydW5zIHNvIHR3byBwYWxldHRlIGFjdGlvbnMgbmV2ZXIgaW50ZXJsZWF2ZSBvdXRwdXQuXG4gKi9cbmV4cG9ydCBjbGFzcyBJY3NSdW5uZXIge1xuICBwcml2YXRlIHF1ZXVlOiBQcm9taXNlPHZvaWQ+ID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgcnVuKFxuICAgIGJpbmFyeTogc3RyaW5nLFxuICAgIGFyZ3M6IHN0cmluZ1tdLFxuICAgIG9wdHM6IFJ1bk9wdGlvbnNcbiAgKTogUHJvbWlzZTx7IGNvZGU6IG51bWJlciB8IG51bGw7IHNpZ25hbDogTm9kZUpTLlNpZ25hbHMgfCBudWxsIH0+IHtcbiAgICBjb25zdCB0YXNrID0gYXN5bmMgKCkgPT4ge1xuICAgICAgb3B0cy5vblN0YXJ0Py4oKTtcbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNwYXduT25jZShiaW5hcnksIGFyZ3MsIG9wdHMpO1xuICAgIH07XG4gICAgY29uc3QgbmV4dCA9IHRoaXMucXVldWUudGhlbih0YXNrKTtcbiAgICB0aGlzLnF1ZXVlID0gbmV4dC50aGVuKCgpID0+IHVuZGVmaW5lZCk7XG4gICAgcmV0dXJuIG5leHQ7XG4gIH1cblxuICBwcml2YXRlIHNwYXduT25jZShcbiAgICBiaW5hcnk6IHN0cmluZyxcbiAgICBhcmdzOiBzdHJpbmdbXSxcbiAgICBvcHRzOiBSdW5PcHRpb25zXG4gICk6IFByb21pc2U8eyBjb2RlOiBudW1iZXIgfCBudWxsOyBzaWduYWw6IE5vZGVKUy5TaWduYWxzIHwgbnVsbCB9PiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGxldCBjaGlsZDogQ2hpbGRQcm9jZXNzV2l0aG91dE51bGxTdHJlYW1zO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2hpbGQgPSBzcGF3bihiaW5hcnksIGFyZ3MsIHtcbiAgICAgICAgICBjd2Q6IG9wdHMuY3dkLFxuICAgICAgICAgIGVudjogb3B0cy5lbnYsXG4gICAgICAgICAgc2hlbGw6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHB1bXAgPSAoc3RyZWFtOiBcInN0ZG91dFwiIHwgXCJzdGRlcnJcIiwgZGF0YTogQnVmZmVyKSA9PiB7XG4gICAgICAgIG9wdHMub25DaHVuayhkYXRhLnRvU3RyaW5nKFwidXRmOFwiKSwgc3RyZWFtKTtcbiAgICAgIH07XG5cbiAgICAgIGNoaWxkLnN0ZG91dC5vbihcImRhdGFcIiwgKGQ6IEJ1ZmZlcikgPT4gcHVtcChcInN0ZG91dFwiLCBkKSk7XG4gICAgICBjaGlsZC5zdGRlcnIub24oXCJkYXRhXCIsIChkOiBCdWZmZXIpID0+IHB1bXAoXCJzdGRlcnJcIiwgZCkpO1xuXG4gICAgICBjaGlsZC5vbihcImVycm9yXCIsIChlcnIpID0+IHJlamVjdChlcnIpKTtcbiAgICAgIGNoaWxkLm9uKFwiY2xvc2VcIiwgKGNvZGUsIHNpZ25hbCkgPT4ge1xuICAgICAgICByZXNvbHZlKHsgY29kZSwgc2lnbmFsIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBJdGVtVmlldywgV29ya3NwYWNlTGVhZiB9IGZyb20gXCJvYnNpZGlhblwiO1xuXG5leHBvcnQgY29uc3QgSUNTX09VVFBVVF9WSUVXX1RZUEUgPSBcImljcy1vdXRwdXRcIjtcblxuZXhwb3J0IGNsYXNzIEljc091dHB1dFZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XG4gIHByaXZhdGUgYnVmZmVyID0gXCJcIjtcblxuICBjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmKSB7XG4gICAgc3VwZXIobGVhZik7XG4gIH1cblxuICBnZXRWaWV3VHlwZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBJQ1NfT1VUUFVUX1ZJRVdfVFlQRTtcbiAgfVxuXG4gIGdldERpc3BsYXlUZXh0KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIFwiSUNTIG91dHB1dFwiO1xuICB9XG5cbiAgZ2V0SWNvbigpOiBzdHJpbmcge1xuICAgIHJldHVybiBcInNjcm9sbC10ZXh0XCI7XG4gIH1cblxuICBhc3luYyBvbk9wZW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZWwgPSB0aGlzLmNvbnRlbnRFbDtcbiAgICBlbC5lbXB0eSgpO1xuICAgIGVsLmNyZWF0ZUVsKFwicHJlXCIsIHtcbiAgICAgIGNsczogXCJpY3Mtb3V0cHV0LXByZVwiLFxuICAgICAgdGV4dDogdGhpcy5idWZmZXIgfHwgXCIobm8gb3V0cHV0IHlldCBcdTIwMTQgcnVuIGFuIElDUyBjb21tYW5kKVwiLFxuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgb25DbG9zZSgpOiBQcm9taXNlPHZvaWQ+IHt9XG5cbiAgY2xlYXIoKTogdm9pZCB7XG4gICAgdGhpcy5idWZmZXIgPSBcIlwiO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICBhcHBlbmQodGV4dDogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5idWZmZXIgKz0gdGV4dDtcbiAgICBpZiAodGhpcy5idWZmZXIubGVuZ3RoID4gNTAwXzAwMCkge1xuICAgICAgdGhpcy5idWZmZXIgPSB0aGlzLmJ1ZmZlci5zbGljZSgtNDAwXzAwMCk7XG4gICAgfVxuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlcigpOiB2b2lkIHtcbiAgICBjb25zdCBlbCA9IHRoaXMuY29udGVudEVsO1xuICAgIGVsLmVtcHR5KCk7XG4gICAgZWwuY3JlYXRlRWwoXCJwcmVcIiwge1xuICAgICAgY2xzOiBcImljcy1vdXRwdXQtcHJlXCIsXG4gICAgICB0ZXh0OiB0aGlzLmJ1ZmZlciB8fCBcIihlbXB0eSlcIixcbiAgICB9KTtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFBQUEsbUJBT087OztBQ0FQLElBQU0sa0JBQWtCO0FBR2pCLFNBQVMsb0JBQ2QsU0FDQSxNQUNRO0FBQ1IsU0FBTyxRQUFRLFFBQVEsY0FBYyxDQUFDLEdBQUcsUUFBZ0I7QUFDdkQsVUFBTSxJQUFJLEtBQUssR0FBK0I7QUFDOUMsV0FBTyxNQUFNLFVBQWEsTUFBTSxPQUFPLE9BQU8sQ0FBQyxJQUFJLElBQUksR0FBRztBQUFBLEVBQzVELENBQUM7QUFDSDtBQUVPLFNBQVMsdUJBQStCO0FBQzdDLFNBQU87QUFDVDs7O0FDSk8sSUFBTSxtQkFBZ0M7QUFBQSxFQUMzQyxlQUFlO0FBQUEsRUFDZixnQkFBZ0I7QUFBQSxFQUNoQixxQkFBcUI7QUFBQSxFQUNyQixzQkFBc0I7QUFBQSxFQUN0QixvQkFBb0I7QUFBQSxFQUNwQixzQkFBc0I7QUFBQSxFQUN0Qix3QkFBd0I7QUFDMUI7OztBQzFCQSwyQkFBMkQ7QUFjcEQsSUFBTSxZQUFOLE1BQWdCO0FBQUEsRUFBaEI7QUFDTCxTQUFRLFFBQXVCLFFBQVEsUUFBUTtBQUFBO0FBQUEsRUFFL0MsSUFDRSxRQUNBLE1BQ0EsTUFDaUU7QUFDakUsVUFBTSxPQUFPLFlBQVk7QUFDdkIsV0FBSyxVQUFVO0FBQ2YsYUFBTyxNQUFNLEtBQUssVUFBVSxRQUFRLE1BQU0sSUFBSTtBQUFBLElBQ2hEO0FBQ0EsVUFBTSxPQUFPLEtBQUssTUFBTSxLQUFLLElBQUk7QUFDakMsU0FBSyxRQUFRLEtBQUssS0FBSyxNQUFNLE1BQVM7QUFDdEMsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUVRLFVBQ04sUUFDQSxNQUNBLE1BQ2lFO0FBQ2pFLFdBQU8sSUFBSSxRQUFRLENBQUMsU0FBUyxXQUFXO0FBQ3RDLFVBQUk7QUFDSixVQUFJO0FBQ0Ysb0JBQVEsNEJBQU0sUUFBUSxNQUFNO0FBQUEsVUFDMUIsS0FBSyxLQUFLO0FBQUEsVUFDVixLQUFLLEtBQUs7QUFBQSxVQUNWLE9BQU87QUFBQSxRQUNULENBQUM7QUFBQSxNQUNILFNBQVMsR0FBRztBQUNWLGVBQU8sQ0FBQztBQUNSO0FBQUEsTUFDRjtBQUVBLFlBQU0sT0FBTyxDQUFDLFFBQTZCLFNBQWlCO0FBQzFELGFBQUssUUFBUSxLQUFLLFNBQVMsTUFBTSxHQUFHLE1BQU07QUFBQSxNQUM1QztBQUVBLFlBQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxNQUFjLEtBQUssVUFBVSxDQUFDLENBQUM7QUFDeEQsWUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLE1BQWMsS0FBSyxVQUFVLENBQUMsQ0FBQztBQUV4RCxZQUFNLEdBQUcsU0FBUyxDQUFDLFFBQVEsT0FBTyxHQUFHLENBQUM7QUFDdEMsWUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLFdBQVc7QUFDbEMsZ0JBQVEsRUFBRSxNQUFNLE9BQU8sQ0FBQztBQUFBLE1BQzFCLENBQUM7QUFBQSxJQUNILENBQUM7QUFBQSxFQUNIO0FBQ0Y7OztBQzlEQSxzQkFBd0M7QUFFakMsSUFBTSx1QkFBdUI7QUFFN0IsSUFBTSxnQkFBTixjQUE0Qix5QkFBUztBQUFBLEVBRzFDLFlBQVksTUFBcUI7QUFDL0IsVUFBTSxJQUFJO0FBSFosU0FBUSxTQUFTO0FBQUEsRUFJakI7QUFBQSxFQUVBLGNBQXNCO0FBQ3BCLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFFQSxpQkFBeUI7QUFDdkIsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUVBLFVBQWtCO0FBQ2hCLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFFQSxNQUFNLFNBQXdCO0FBQzVCLFVBQU0sS0FBSyxLQUFLO0FBQ2hCLE9BQUcsTUFBTTtBQUNULE9BQUcsU0FBUyxPQUFPO0FBQUEsTUFDakIsS0FBSztBQUFBLE1BQ0wsTUFBTSxLQUFLLFVBQVU7QUFBQSxJQUN2QixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBRUEsTUFBTSxVQUF5QjtBQUFBLEVBQUM7QUFBQSxFQUVoQyxRQUFjO0FBQ1osU0FBSyxTQUFTO0FBQ2QsU0FBSyxPQUFPO0FBQUEsRUFDZDtBQUFBLEVBRUEsT0FBTyxNQUFvQjtBQUN6QixTQUFLLFVBQVU7QUFDZixRQUFJLEtBQUssT0FBTyxTQUFTLEtBQVM7QUFDaEMsV0FBSyxTQUFTLEtBQUssT0FBTyxNQUFNLElBQVE7QUFBQSxJQUMxQztBQUNBLFNBQUssT0FBTztBQUFBLEVBQ2Q7QUFBQSxFQUVRLFNBQWU7QUFDckIsVUFBTSxLQUFLLEtBQUs7QUFDaEIsT0FBRyxNQUFNO0FBQ1QsT0FBRyxTQUFTLE9BQU87QUFBQSxNQUNqQixLQUFLO0FBQUEsTUFDTCxNQUFNLEtBQUssVUFBVTtBQUFBLElBQ3ZCLENBQUM7QUFBQSxFQUNIO0FBQ0Y7OztBSnRDQSxJQUFNLG9CQUFvQjtBQUUxQixJQUFNLGlCQUFpQixDQUFDLFNBQVMsVUFBVSxVQUFVLFNBQVM7QUFFOUQsU0FBUyxrQkFBa0IsTUFBYyxLQUFxQjtBQUM1RCxRQUFNLElBQUksS0FBSyxRQUFRLFNBQVMsSUFBSSxFQUFFLEtBQUs7QUFDM0MsTUFBSSxFQUFFLFVBQVUsSUFBSyxRQUFPO0FBQzVCLFNBQU8sV0FBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7QUFDakM7QUFFQSxTQUFTLGNBQWMsS0FBa0I7QUFDdkMsUUFBTSxVQUFVLElBQUksTUFBTTtBQUMxQixNQUFJLGlCQUFpQixXQUFXLE9BQU8sUUFBUSxnQkFBZ0IsWUFBWTtBQUN6RSxXQUFPLFFBQVEsWUFBWTtBQUFBLEVBQzdCO0FBQ0EsUUFBTSxJQUFJLE1BQU0sZ0VBQWdFO0FBQ2xGO0FBRUEsU0FBUyxTQUFTLFVBQTBDO0FBQzFELFFBQU0sTUFBTSxFQUFFLEdBQUcsUUFBUSxJQUFJO0FBQzdCLE1BQUksU0FBUyxlQUFlLEtBQUssR0FBRztBQUNsQyxRQUFJLG1CQUFtQixTQUFTLGVBQWUsS0FBSztBQUFBLEVBQ3REO0FBQ0EsU0FBTztBQUNUO0FBV0EsSUFBTSxzQkFBTixjQUFrQyx1QkFBTTtBQUFBLEVBU3RDLFlBQ0UsS0FDaUIsUUFDQSxRQUNqQjtBQUNBLFVBQU0sR0FBRztBQUhRO0FBQ0E7QUFObkIsU0FBUSxXQUFXO0FBQ25CLFNBQVEsU0FBd0I7QUFROUIsU0FBSyxjQUFjLE9BQU8sU0FBUyx1QkFBdUI7QUFBQSxFQUM1RDtBQUFBLEVBRVEsVUFBa0I7QUFDeEIsVUFBTSxJQUFJLEtBQUssT0FBTyxTQUFTLHNCQUFzQixLQUFLO0FBQzFELFdBQU8sR0FBRyxTQUFTLElBQUkscUJBQXFCO0FBQUEsRUFDOUM7QUFBQSxFQUVRLGlCQUF1QjtBQUM3QixVQUFNLFVBQVUsS0FBSyxjQUFjLFNBQVM7QUFDNUMsVUFBTSxPQUFPLG9CQUFvQixLQUFLLFFBQVEsR0FBRztBQUFBLE1BQy9DLFFBQVEsS0FBSztBQUFBLE1BQ2IsVUFBVSxLQUFLLGNBQWMsU0FBUztBQUFBLE1BQ3RDLE9BQU8sS0FBSyxZQUFZLFNBQVM7QUFBQSxNQUNqQztBQUFBLElBQ0YsQ0FBQztBQUNELFFBQUksS0FBSyxjQUFjO0FBQ3JCLFdBQUssYUFBYSxRQUFRO0FBQUEsSUFDNUI7QUFBQSxFQUNGO0FBQUEsRUFFQSxTQUFlO0FBQ2IsVUFBTSxFQUFFLFVBQVUsSUFBSTtBQUN0QixjQUFVLFNBQVMsTUFBTSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRS9DLFFBQUkseUJBQVEsU0FBUyxFQUFFLFFBQVEsUUFBUSxFQUFFLFlBQVksQ0FBQyxPQUFPO0FBQzNELGlCQUFXLEtBQUssZ0JBQWdCO0FBQzlCLFdBQUcsVUFBVSxHQUFHLENBQUM7QUFBQSxNQUNuQjtBQUNBLFlBQU0sVUFBVSxlQUFlO0FBQUEsUUFDN0IsS0FBSztBQUFBLE1BQ1AsSUFDSSxLQUFLLGNBQ0w7QUFDSixTQUFHLFNBQVMsT0FBTztBQUNuQixXQUFLLGNBQWM7QUFDbkIsU0FBRyxTQUFTLENBQUMsTUFBTTtBQUNqQixhQUFLLGNBQWM7QUFDbkIsYUFBSyxlQUFlO0FBQUEsTUFDdEIsQ0FBQztBQUFBLElBQ0gsQ0FBQztBQUVELFFBQUkseUJBQVEsU0FBUyxFQUFFLFFBQVEsT0FBTyxFQUFFLFFBQVEsQ0FBQyxNQUFNO0FBQ3JELFFBQUUsZUFBZSwyQkFBc0IsRUFDcEMsU0FBUyxLQUFLLE9BQU8sU0FBUyxrQkFBa0IsRUFDaEQsU0FBUyxNQUFNLEtBQUssZUFBZSxDQUFDO0FBQ3ZDLFdBQUssYUFBYSxFQUFFO0FBQUEsSUFDdEIsQ0FBQztBQUVELFFBQUkseUJBQVEsU0FBUyxFQUFFLFFBQVEsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNO0FBQ3hELFFBQUUsZUFBZSx5QkFBeUIsRUFDdkMsU0FBUyxLQUFLLE9BQU8sU0FBUyxvQkFBb0IsRUFDbEQsU0FBUyxNQUFNLEtBQUssZUFBZSxDQUFDO0FBQ3ZDLFdBQUssZUFBZSxFQUFFO0FBQUEsSUFDeEIsQ0FBQztBQUVELGNBQVUsU0FBUyxPQUFPLEVBQUUsTUFBTSxXQUFXLEtBQUssb0JBQW9CLENBQUM7QUFDdkUsU0FBSyxlQUFlLFVBQVUsU0FBUyxVQUFVO0FBQ2pELFNBQUssYUFBYSxPQUFPO0FBQ3pCLFNBQUssYUFBYSxpQkFBaUIsU0FBUyxNQUFNLEtBQUssZUFBZSxDQUFDO0FBRXZFLGNBQVUsU0FBUyxPQUFPO0FBQUEsTUFDeEIsTUFBTTtBQUFBLE1BQ04sS0FBSztBQUFBLElBQ1AsQ0FBQztBQUNELFNBQUssZUFBZSxVQUFVLFNBQVMsVUFBVTtBQUNqRCxTQUFLLGFBQWEsT0FBTztBQUN6QixTQUFLLGFBQWEsV0FBVztBQUU3QixTQUFLLGVBQWU7QUFFcEIsUUFBSSx5QkFBUSxTQUFTLEVBQ2xCO0FBQUEsTUFBVSxDQUFDLE1BQ1YsRUFBRSxjQUFjLFFBQVEsRUFBRSxRQUFRLE1BQU07QUFDdEMsY0FBTSxJQUFJLEtBQUssYUFBYSxNQUFNLEtBQUs7QUFDdkMsYUFBSyxTQUFTLEVBQUUsU0FBUyxJQUFJO0FBQzdCLGFBQUssTUFBTTtBQUFBLE1BQ2IsQ0FBQztBQUFBLElBQ0gsRUFDQztBQUFBLE1BQVUsQ0FBQyxNQUNWLEVBQUUsY0FBYyxRQUFRLEVBQUUsUUFBUSxNQUFNO0FBQ3RDLGFBQUssU0FBUztBQUNkLGFBQUssTUFBTTtBQUFBLE1BQ2IsQ0FBQztBQUFBLElBQ0g7QUFBQSxFQUNKO0FBQUEsRUFFQSxVQUFnQjtBQUNkLFNBQUssVUFBVSxNQUFNO0FBQ3JCLFFBQUksS0FBSyxTQUFVO0FBQ25CLFNBQUssV0FBVztBQUNoQixTQUFLLE9BQU8sS0FBSyxNQUFNO0FBQUEsRUFDekI7QUFDRjtBQUVBLElBQXFCLFlBQXJCLGNBQXVDLHdCQUFPO0FBQUEsRUFBOUM7QUFBQTtBQUNFLG9CQUF3QixFQUFFLEdBQUcsaUJBQWlCO0FBQzlDLGtCQUFTLElBQUksVUFBVTtBQUFBO0FBQUEsRUFFdkIsTUFBTSxTQUF3QjtBQUM1QixVQUFNLEtBQUssYUFBYTtBQUV4QixTQUFLLGFBQWEsc0JBQXNCLENBQUMsU0FBUyxJQUFJLGNBQWMsSUFBSSxDQUFDO0FBRXpFLFNBQUssY0FBYyxlQUFlLG1CQUFtQixNQUFNO0FBQ3pELFdBQUssS0FBSyxpQkFBaUI7QUFBQSxJQUM3QixDQUFDO0FBRUQsU0FBSyxXQUFXO0FBQUEsTUFDZCxJQUFJO0FBQUEsTUFDSixNQUFNO0FBQUEsTUFDTixVQUFVLE1BQU0sS0FBSyxLQUFLLE9BQU8sQ0FBQyxRQUFRLENBQUM7QUFBQSxJQUM3QyxDQUFDO0FBRUQsU0FBSyxXQUFXO0FBQUEsTUFDZCxJQUFJO0FBQUEsTUFDSixNQUFNO0FBQUEsTUFDTixVQUFVLE1BQU0sS0FBSyxLQUFLLE9BQU8sQ0FBQyxLQUFLLENBQUM7QUFBQSxJQUMxQyxDQUFDO0FBRUQsU0FBSyxXQUFXO0FBQUEsTUFDZCxJQUFJO0FBQUEsTUFDSixNQUFNO0FBQUEsTUFDTixVQUFVLE1BQU0sS0FBSyxLQUFLLGVBQWU7QUFBQSxJQUMzQyxDQUFDO0FBRUQsU0FBSyxXQUFXO0FBQUEsTUFDZCxJQUFJO0FBQUEsTUFDSixNQUFNO0FBQUEsTUFDTixVQUFVLE1BQU0sS0FBSyxLQUFLLE9BQU8sQ0FBQyxNQUFNLENBQUM7QUFBQSxJQUMzQyxDQUFDO0FBRUQsU0FBSyxXQUFXO0FBQUEsTUFDZCxJQUFJO0FBQUEsTUFDSixNQUFNO0FBQUEsTUFDTixVQUFVLE1BQU0sS0FBSyxLQUFLLGVBQWU7QUFBQSxJQUMzQyxDQUFDO0FBRUQsU0FBSyxXQUFXO0FBQUEsTUFDZCxJQUFJO0FBQUEsTUFDSixNQUFNO0FBQUEsTUFDTixVQUFVLE1BQU0sS0FBSyxLQUFLLGFBQWE7QUFBQSxJQUN6QyxDQUFDO0FBRUQsU0FBSyxjQUFjLElBQUksY0FBYyxLQUFLLEtBQUssSUFBSSxDQUFDO0FBQUEsRUFDdEQ7QUFBQSxFQUVBLE1BQU0sZUFBOEI7QUFDbEMsU0FBSyxXQUFXLE9BQU8sT0FBTyxDQUFDLEdBQUcsa0JBQWtCLE1BQU0sS0FBSyxTQUFTLENBQUM7QUFBQSxFQUMzRTtBQUFBLEVBRUEsTUFBTSxlQUE4QjtBQUNsQyxVQUFNLEtBQUssU0FBUyxLQUFLLFFBQVE7QUFBQSxFQUNuQztBQUFBLEVBRUEsTUFBTSxtQkFBMkM7QUFDL0MsVUFBTSxFQUFFLFVBQVUsSUFBSSxLQUFLO0FBQzNCLFVBQU0sV0FBVyxVQUFVLGdCQUFnQixvQkFBb0I7QUFDL0QsUUFBSSxTQUFTLFNBQVMsR0FBRztBQUN2QixZQUFNQyxRQUFPLFNBQVMsQ0FBQztBQUN2QixZQUFNLFVBQVUsV0FBV0EsS0FBSTtBQUMvQixhQUFPQSxNQUFLO0FBQUEsSUFDZDtBQUNBLFVBQU0sT0FBTyxVQUFVLGFBQWEsS0FBSztBQUN6QyxRQUFJLENBQUMsTUFBTTtBQUNULFVBQUksd0JBQU8sbUNBQW1DO0FBQzlDLFlBQU0sSUFBSSxNQUFNLGVBQWU7QUFBQSxJQUNqQztBQUNBLFVBQU0sS0FBSyxhQUFhLEVBQUUsTUFBTSxzQkFBc0IsUUFBUSxLQUFLLENBQUM7QUFDcEUsVUFBTSxVQUFVLFdBQVcsSUFBSTtBQUMvQixXQUFPLEtBQUs7QUFBQSxFQUNkO0FBQUEsRUFFQSxNQUFNLGlCQUFnQztBQUNwQyxVQUFNLE1BQU0sS0FBSyxTQUFTLHVCQUF1QixLQUFLO0FBQ3RELFFBQUksQ0FBQyxJQUFJLFFBQVE7QUFDZixVQUFJO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFDQTtBQUFBLElBQ0Y7QUFDQSxVQUFNLEtBQUssT0FBTyxDQUFDLEtBQUssR0FBRztBQUFBLE1BQ3pCLFlBQVk7QUFBQSxNQUNaLHFCQUFxQjtBQUFBLElBQ3ZCLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFFQSxNQUFNLE9BQU8sTUFBZ0IsU0FBd0M7QUFDbkUsVUFBTSxPQUFPLE1BQU0sS0FBSyxpQkFBaUI7QUFDekMsU0FBSyxNQUFNO0FBQ1gsVUFBTSxNQUFNLGNBQWMsS0FBSyxHQUFHO0FBQ2xDLFVBQU0sTUFBTSxLQUFLLFNBQVMsY0FBYyxLQUFLLEtBQUs7QUFDbEQsVUFBTSxNQUFNLFNBQVMsS0FBSyxRQUFRO0FBRWxDLFVBQU0sZ0JBQWdCLFNBQVMsZUFBZTtBQUM5QyxVQUFNLFlBQVksU0FBUyxxQkFBcUIsS0FBSyxLQUFLO0FBQzFELFFBQUksaUJBQWlCLENBQUMsVUFBVSxRQUFRO0FBQ3RDLFVBQUksd0JBQU8sNkJBQTZCO0FBQ3hDO0FBQUEsSUFDRjtBQUVBLFFBQUksTUFBTTtBQUNWLFFBQUksb0JBQW9CO0FBRXhCLFVBQU0sU0FBUyxDQUFDLE9BQWUsV0FBZ0M7QUFDN0QsWUFBTSxTQUFTLFdBQVcsV0FBVyxjQUFjO0FBQ25ELFlBQU0sUUFBUSxTQUFTO0FBQ3ZCLFVBQUksZUFBZTtBQUNqQixlQUFPO0FBQUEsTUFDVCxPQUFPO0FBQ0wsYUFBSyxPQUFPLEtBQUs7QUFBQSxNQUNuQjtBQUNBLDJCQUFxQjtBQUFBLElBQ3ZCO0FBRUEsUUFBSTtBQUNGLFlBQU0sRUFBRSxLQUFLLElBQUksTUFBTSxLQUFLLE9BQU8sSUFBSSxLQUFLLE1BQU0sRUFBRSxLQUFLLEtBQUssU0FBUyxPQUFPLENBQUM7QUFDL0UsVUFBSSxpQkFBaUIsU0FBUyxHQUFHO0FBQy9CLGNBQU0sUUFBUSxJQUFJLE1BQU0sT0FBTztBQUMvQixjQUFNLE9BQU8sTUFBTSxPQUFPLENBQUMsT0FBTyxHQUFHLFNBQVMsU0FBUyxDQUFDO0FBQ3hELGNBQU0sT0FDSixLQUFLLFNBQVMsSUFDVixLQUFLLEtBQUssSUFBSSxJQUFJLE9BQ2xCO0FBQ04sYUFBSyxNQUFNO0FBQ1gsYUFBSyxPQUFPLElBQUk7QUFBQSxNQUNsQjtBQUVBLFVBQUksU0FBUyxHQUFHO0FBQ2QsWUFBSSx3QkFBTyxtQkFBbUI7QUFBQSxNQUNoQyxPQUFPO0FBQ0wsY0FBTSxPQUFPLGtCQUFrQixtQkFBbUIsaUJBQWlCO0FBQ25FLGNBQU0sVUFBVSx5QkFBeUIsUUFBUSxHQUFHO0FBQ3BELFlBQUksd0JBQU8sT0FBTyxHQUFHLE9BQU87QUFBQSxFQUFLLElBQUksS0FBSyxPQUFPO0FBQUEsTUFDbkQ7QUFBQSxJQUNGLFNBQVMsR0FBRztBQUNWLFlBQU0sTUFBTSxhQUFhLFFBQVEsRUFBRSxVQUFVLE9BQU8sQ0FBQztBQUNyRCxXQUFLLE9BQU87QUFBQSxpQkFBb0IsR0FBRztBQUFBLENBQUk7QUFDdkMsVUFBSSx3QkFBTyxxQkFBcUIsR0FBRyxNQUFNLEdBQUcsRUFBRTtBQUFBLElBQ2hEO0FBQUEsRUFDRjtBQUFBLEVBRUEsTUFBTSxpQkFBZ0M7QUFDcEMsVUFBTSxJQUFJLEtBQUssSUFBSSxVQUFVLGNBQWM7QUFDM0MsUUFBSSxDQUFDLEdBQUc7QUFDTixVQUFJLHdCQUFPLGdCQUFnQjtBQUMzQjtBQUFBLElBQ0Y7QUFDQSxVQUFNLEtBQUssT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUM7QUFBQSxFQUNwQztBQUFBLEVBRUEsTUFBTSxlQUE4QjtBQUNsQyxVQUFNLFVBQVUsTUFBTSxJQUFJLFFBQXVCLENBQUMsWUFBWTtBQUM1RCxZQUFNLElBQUksSUFBSSxvQkFBb0IsS0FBSyxLQUFLLE1BQU0sT0FBTztBQUN6RCxRQUFFLEtBQUs7QUFBQSxJQUNULENBQUM7QUFDRCxRQUFJLENBQUMsU0FBUztBQUNaLFVBQUksd0JBQU8sa0JBQWtCO0FBQzdCO0FBQUEsSUFDRjtBQUNBLFVBQU0sS0FBSyxPQUFPLENBQUMsVUFBVSxNQUFNLE9BQU8sQ0FBQztBQUFBLEVBQzdDO0FBQ0Y7QUFFQSxJQUFNLGdCQUFOLGNBQTRCLGtDQUFpQjtBQUFBLEVBRzNDLFlBQVksS0FBVSxRQUFtQjtBQUN2QyxVQUFNLEtBQUssTUFBTTtBQUNqQixTQUFLLFNBQVM7QUFBQSxFQUNoQjtBQUFBLEVBRUEsVUFBZ0I7QUFDZCxVQUFNLEVBQUUsWUFBWSxJQUFJO0FBQ3hCLGdCQUFZLE1BQU07QUFDbEIsZ0JBQVksU0FBUyxNQUFNLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFFMUMsUUFBSSx5QkFBUSxXQUFXLEVBQ3BCLFFBQVEsWUFBWSxFQUNwQixRQUFRLGlFQUFpRSxFQUN6RTtBQUFBLE1BQVEsQ0FBQyxNQUNSLEVBQ0csZUFBZSxLQUFLLEVBQ3BCLFNBQVMsS0FBSyxPQUFPLFNBQVMsYUFBYSxFQUMzQyxTQUFTLE9BQU8sTUFBTTtBQUNyQixhQUFLLE9BQU8sU0FBUyxnQkFBZ0I7QUFDckMsY0FBTSxLQUFLLE9BQU8sYUFBYTtBQUFBLE1BQ2pDLENBQUM7QUFBQSxJQUNMO0FBRUYsUUFBSSx5QkFBUSxXQUFXLEVBQ3BCLFFBQVEsNkJBQTZCLEVBQ3JDLFFBQVEsNkRBQTZELEVBQ3JFO0FBQUEsTUFBUSxDQUFDLE1BQ1IsRUFDRyxlQUFlLGdCQUFXLEVBQzFCLFNBQVMsS0FBSyxPQUFPLFNBQVMsY0FBYyxFQUM1QyxTQUFTLE9BQU8sTUFBTTtBQUNyQixhQUFLLE9BQU8sU0FBUyxpQkFBaUI7QUFDdEMsY0FBTSxLQUFLLE9BQU8sYUFBYTtBQUFBLE1BQ2pDLENBQUM7QUFBQSxJQUNMO0FBRUYsZ0JBQVksU0FBUyxNQUFNLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUUvRCxRQUFJLHlCQUFRLFdBQVcsRUFDcEIsUUFBUSxnQkFBZ0IsRUFDeEIsUUFBUSwrREFBK0QsRUFDdkUsWUFBWSxDQUFDLE9BQU87QUFDbkIsaUJBQVcsS0FBSyxnQkFBZ0I7QUFDOUIsV0FBRyxVQUFVLEdBQUcsQ0FBQztBQUFBLE1BQ25CO0FBQ0EsU0FBRztBQUFBLFFBQ0QsZUFBZTtBQUFBLFVBQ2IsS0FBSyxPQUFPLFNBQVM7QUFBQSxRQUN2QixJQUNJLEtBQUssT0FBTyxTQUFTLHNCQUNyQjtBQUFBLE1BQ047QUFDQSxTQUFHLFNBQVMsT0FBTyxNQUFNO0FBQ3ZCLGFBQUssT0FBTyxTQUFTLHNCQUFzQjtBQUMzQyxjQUFNLEtBQUssT0FBTyxhQUFhO0FBQUEsTUFDakMsQ0FBQztBQUFBLElBQ0gsQ0FBQztBQUVILFFBQUkseUJBQVEsV0FBVyxFQUNwQixRQUFRLGVBQWUsRUFDdkIsUUFBUSxzRUFBc0UsRUFDOUU7QUFBQSxNQUFRLENBQUMsTUFDUixFQUNHLFNBQVMsS0FBSyxPQUFPLFNBQVMsa0JBQWtCLEVBQ2hELFNBQVMsT0FBTyxNQUFNO0FBQ3JCLGFBQUssT0FBTyxTQUFTLHFCQUFxQjtBQUMxQyxjQUFNLEtBQUssT0FBTyxhQUFhO0FBQUEsTUFDakMsQ0FBQztBQUFBLElBQ0w7QUFFRixRQUFJLHlCQUFRLFdBQVcsRUFDcEIsUUFBUSxrQkFBa0IsRUFDMUIsUUFBUSxzREFBc0QsRUFDOUQ7QUFBQSxNQUFRLENBQUMsTUFDUixFQUNHLFNBQVMsS0FBSyxPQUFPLFNBQVMsb0JBQW9CLEVBQ2xELFNBQVMsT0FBTyxNQUFNO0FBQ3JCLGFBQUssT0FBTyxTQUFTLHVCQUF1QjtBQUM1QyxjQUFNLEtBQUssT0FBTyxhQUFhO0FBQUEsTUFDakMsQ0FBQztBQUFBLElBQ0w7QUFFRixRQUFJLHlCQUFRLFdBQVcsRUFDcEIsUUFBUSx3QkFBd0IsRUFDaEM7QUFBQSxNQUNDO0FBQUEsSUFDRixFQUNDO0FBQUEsTUFBUSxDQUFDLE1BQ1IsRUFDRyxlQUFlLHFCQUFxQixDQUFDLEVBQ3JDLFNBQVMsS0FBSyxPQUFPLFNBQVMsb0JBQW9CLEVBQ2xELFNBQVMsT0FBTyxNQUFNO0FBQ3JCLGFBQUssT0FBTyxTQUFTLHVCQUF1QjtBQUM1QyxjQUFNLEtBQUssT0FBTyxhQUFhO0FBQUEsTUFDakMsQ0FBQztBQUFBLElBQ0w7QUFFRixnQkFBWSxTQUFTLE1BQU0sRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUVqRCxRQUFJLHlCQUFRLFdBQVcsRUFDcEIsUUFBUSxzQkFBc0IsRUFDOUI7QUFBQSxNQUNDO0FBQUEsSUFDRixFQUNDO0FBQUEsTUFBUSxDQUFDLE1BQ1IsRUFDRyxlQUFlLHlCQUF5QixFQUN4QyxTQUFTLEtBQUssT0FBTyxTQUFTLHNCQUFzQixFQUNwRCxTQUFTLE9BQU8sTUFBTTtBQUNyQixhQUFLLE9BQU8sU0FBUyx5QkFBeUI7QUFDOUMsY0FBTSxLQUFLLE9BQU8sYUFBYTtBQUFBLE1BQ2pDLENBQUM7QUFBQSxJQUNMO0FBQUEsRUFDSjtBQUNGOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfb2JzaWRpYW4iLCAibGVhZiJdCn0K
