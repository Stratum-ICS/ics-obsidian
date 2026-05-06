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
var DEFAULT_PATTERN = "[{actor}][research][{paper_id}][{phase}] {summary}";
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
  commitDefaultActor: "human",
  commitDefaultPaperId: "",
  commitDefaultPhase: "inbox",
  commitMessagePattern: "[{actor}][research][{paper_id}][{phase}] {summary}",
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
var ACTOR_OPTIONS = ["human", "claude", "cursor", "ics-bot"];
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
    this.actorValue = plugin.settings.commitDefaultActor || "human";
  }
  pattern() {
    const p = this.plugin.settings.commitMessagePattern?.trim();
    return p?.length ? p : defaultCommitPattern();
  }
  refreshPreview() {
    const summary = this.summaryInput?.value ?? "";
    const line = applyCommitTemplate(this.pattern(), {
      actor: this.actorValue,
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
    new import_obsidian2.Setting(contentEl).setName("Actor").addDropdown((dd) => {
      for (const a of ACTOR_OPTIONS) {
        dd.addOption(a, a);
      }
      const initial = ACTOR_OPTIONS.includes(
        this.actorValue
      ) ? this.actorValue : "human";
      dd.setValue(initial);
      this.actorValue = initial;
      dd.onChange((v) => {
        this.actorValue = v;
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
    new import_obsidian2.Setting(containerEl).setName("Default actor").setDesc("Prefills the commit modal: human, claude, cursor, or ics-bot.").addDropdown((dd) => {
      for (const a of ACTOR_OPTIONS) {
        dd.addOption(a, a);
      }
      dd.setValue(
        ACTOR_OPTIONS.includes(
          this.plugin.settings.commitDefaultActor
        ) ? this.plugin.settings.commitDefaultActor : "human"
      );
      dd.onChange(async (v) => {
        this.plugin.settings.commitDefaultActor = v;
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
      "Placeholders: {actor}, {paper_id}, {phase}, {summary}. Example: [{actor}][research][{paper_id}][{phase}] {summary}"
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2NvbW1pdFRlbXBsYXRlLnRzIiwgInNyYy9zZXR0aW5ncy50cyIsICJzcmMvcnVubmVyLnRzIiwgInNyYy92aWV3cy9JY3NPdXRwdXRWaWV3LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQge1xuICBBcHAsXG4gIE1vZGFsLFxuICBOb3RpY2UsXG4gIFBsdWdpbixcbiAgUGx1Z2luU2V0dGluZ1RhYixcbiAgU2V0dGluZyxcbn0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQge1xuICBhcHBseUNvbW1pdFRlbXBsYXRlLFxuICBkZWZhdWx0Q29tbWl0UGF0dGVybixcbn0gZnJvbSBcIi4vY29tbWl0VGVtcGxhdGVcIjtcbmltcG9ydCB7IERFRkFVTFRfU0VUVElOR1MsIHR5cGUgSWNzU2V0dGluZ3MgfSBmcm9tIFwiLi9zZXR0aW5nc1wiO1xuaW1wb3J0IHsgSWNzUnVubmVyIH0gZnJvbSBcIi4vcnVubmVyXCI7XG5pbXBvcnQgeyBJQ1NfT1VUUFVUX1ZJRVdfVFlQRSwgSWNzT3V0cHV0VmlldyB9IGZyb20gXCIuL3ZpZXdzL0ljc091dHB1dFZpZXdcIjtcblxuLyoqIERlc2lnbiBcdTAwQTc3IC8gZmVhdHVyZSBzcGVjIFx1MDBBNzQuMTogbm9uLXplcm8gZXhpdCBub3RpY2VzIGluY2x1ZGUgdHJpbW1lZCBjb21iaW5lZCBvdXRwdXQgKi9cbmNvbnN0IE5PVElDRV9PVVRQVVRfTUFYID0gMjA0ODtcblxuY29uc3QgQUNUT1JfT1BUSU9OUyA9IFtcImh1bWFuXCIsIFwiY2xhdWRlXCIsIFwiY3Vyc29yXCIsIFwiaWNzLWJvdFwiXSBhcyBjb25zdDtcblxuZnVuY3Rpb24gdHJ1bmNhdGVGb3JOb3RpY2UodGV4dDogc3RyaW5nLCBtYXg6IG51bWJlcik6IHN0cmluZyB7XG4gIGNvbnN0IHQgPSB0ZXh0LnJlcGxhY2UoL1xcclxcbi9nLCBcIlxcblwiKS50cmltKCk7XG4gIGlmICh0Lmxlbmd0aCA8PSBtYXgpIHJldHVybiB0O1xuICByZXR1cm4gXCJcdTIwMjZcIiArIHQuc2xpY2UoLShtYXggLSAxKSk7XG59XG5cbmZ1bmN0aW9uIHZhdWx0QmFzZVBhdGgoYXBwOiBBcHApOiBzdHJpbmcge1xuICBjb25zdCBhZGFwdGVyID0gYXBwLnZhdWx0LmFkYXB0ZXI7XG4gIGlmIChcImdldEJhc2VQYXRoXCIgaW4gYWRhcHRlciAmJiB0eXBlb2YgYWRhcHRlci5nZXRCYXNlUGF0aCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgcmV0dXJuIGFkYXB0ZXIuZ2V0QmFzZVBhdGgoKTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoXCJWYXVsdCBoYXMgbm8gZmlsZXN5c3RlbSBiYXNlIHBhdGggKElDUyByZXF1aXJlcyBhIGxvY2FsIHZhdWx0KVwiKTtcbn1cblxuZnVuY3Rpb24gY2hpbGRFbnYoc2V0dGluZ3M6IEljc1NldHRpbmdzKTogTm9kZUpTLlByb2Nlc3NFbnYge1xuICBjb25zdCBlbnYgPSB7IC4uLnByb2Nlc3MuZW52IH07XG4gIGlmIChzZXR0aW5ncy5zdHJhdHVtQmFzZVVybC50cmltKCkpIHtcbiAgICBlbnYuU1RSQVRVTV9CQVNFX1VSTCA9IHNldHRpbmdzLnN0cmF0dW1CYXNlVXJsLnRyaW0oKTtcbiAgfVxuICByZXR1cm4gZW52O1xufVxuXG5leHBvcnQgdHlwZSBSdW5JY3NTdHJlYW1Nb2RlID0gXCJzdHJlYW1cIiB8IFwiYnVmZmVyLWxpbmUtZmlsdGVyXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVuSWNzT3B0aW9ucyB7XG4gIC8qKiBEZWZhdWx0IHN0cmVhbTogY2h1bmtzIGdvIHRvIHRoZSBwYW5lbCBhcyB0aGV5IGFycml2ZS4gKi9cbiAgc3RyZWFtTW9kZT86IFJ1bkljc1N0cmVhbU1vZGU7XG4gIC8qKiBSZXF1aXJlZCB3aGVuIHN0cmVhbU1vZGUgaXMgYnVmZmVyLWxpbmUtZmlsdGVyOyBsaW5lcyBub3QgY29udGFpbmluZyB0aGlzIGFyZSBkcm9wcGVkLiAqL1xuICBsaW5lRmlsdGVyU3Vic3RyaW5nPzogc3RyaW5nO1xufVxuXG5jbGFzcyBSZXNlYXJjaENvbW1pdE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICBwcml2YXRlIHBoYXNlSW5wdXQhOiBIVE1MSW5wdXRFbGVtZW50O1xuICBwcml2YXRlIHBhcGVySWRJbnB1dCE6IEhUTUxJbnB1dEVsZW1lbnQ7XG4gIHByaXZhdGUgc3VtbWFyeUlucHV0ITogSFRNTFRleHRBcmVhRWxlbWVudDtcbiAgcHJpdmF0ZSBwcmV2aWV3SW5wdXQhOiBIVE1MVGV4dEFyZWFFbGVtZW50O1xuICBwcml2YXRlIGFjdG9yVmFsdWU6IHN0cmluZztcbiAgcHJpdmF0ZSBmaW5pc2hlZCA9IGZhbHNlO1xuICBwcml2YXRlIHJlc3VsdDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSBwbHVnaW46IEljc1BsdWdpbixcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9uRG9uZTogKG1lc3NhZ2U6IHN0cmluZyB8IG51bGwpID0+IHZvaWRcbiAgKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgICB0aGlzLmFjdG9yVmFsdWUgPSBwbHVnaW4uc2V0dGluZ3MuY29tbWl0RGVmYXVsdEFjdG9yIHx8IFwiaHVtYW5cIjtcbiAgfVxuXG4gIHByaXZhdGUgcGF0dGVybigpOiBzdHJpbmcge1xuICAgIGNvbnN0IHAgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21taXRNZXNzYWdlUGF0dGVybj8udHJpbSgpO1xuICAgIHJldHVybiBwPy5sZW5ndGggPyBwIDogZGVmYXVsdENvbW1pdFBhdHRlcm4oKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVmcmVzaFByZXZpZXcoKTogdm9pZCB7XG4gICAgY29uc3Qgc3VtbWFyeSA9IHRoaXMuc3VtbWFyeUlucHV0Py52YWx1ZSA/PyBcIlwiO1xuICAgIGNvbnN0IGxpbmUgPSBhcHBseUNvbW1pdFRlbXBsYXRlKHRoaXMucGF0dGVybigpLCB7XG4gICAgICBhY3RvcjogdGhpcy5hY3RvclZhbHVlLFxuICAgICAgcGFwZXJfaWQ6IHRoaXMucGFwZXJJZElucHV0Py52YWx1ZSA/PyBcIlwiLFxuICAgICAgcGhhc2U6IHRoaXMucGhhc2VJbnB1dD8udmFsdWUgPz8gXCJcIixcbiAgICAgIHN1bW1hcnksXG4gICAgfSk7XG4gICAgaWYgKHRoaXMucHJldmlld0lucHV0KSB7XG4gICAgICB0aGlzLnByZXZpZXdJbnB1dC52YWx1ZSA9IGxpbmU7XG4gICAgfVxuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJJQ1MgY29tbWl0XCIgfSk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJBY3RvclwiKS5hZGREcm9wZG93bigoZGQpID0+IHtcbiAgICAgIGZvciAoY29uc3QgYSBvZiBBQ1RPUl9PUFRJT05TKSB7XG4gICAgICAgIGRkLmFkZE9wdGlvbihhLCBhKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGluaXRpYWwgPSBBQ1RPUl9PUFRJT05TLmluY2x1ZGVzKFxuICAgICAgICB0aGlzLmFjdG9yVmFsdWUgYXMgKHR5cGVvZiBBQ1RPUl9PUFRJT05TKVtudW1iZXJdXG4gICAgICApXG4gICAgICAgID8gdGhpcy5hY3RvclZhbHVlXG4gICAgICAgIDogXCJodW1hblwiO1xuICAgICAgZGQuc2V0VmFsdWUoaW5pdGlhbCk7XG4gICAgICB0aGlzLmFjdG9yVmFsdWUgPSBpbml0aWFsO1xuICAgICAgZGQub25DaGFuZ2UoKHYpID0+IHtcbiAgICAgICAgdGhpcy5hY3RvclZhbHVlID0gdjtcbiAgICAgICAgdGhpcy5yZWZyZXNoUHJldmlldygpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJQaGFzZVwiKS5hZGRUZXh0KCh0KSA9PiB7XG4gICAgICB0LnNldFBsYWNlaG9sZGVyKFwiaW5ib3gsIGVsaTUsIGdhcHMsIFx1MjAyNlwiKVxuICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuY29tbWl0RGVmYXVsdFBoYXNlKVxuICAgICAgICAub25DaGFuZ2UoKCkgPT4gdGhpcy5yZWZyZXNoUHJldmlldygpKTtcbiAgICAgIHRoaXMucGhhc2VJbnB1dCA9IHQuaW5wdXRFbDtcbiAgICB9KTtcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIlBhcGVyIGlkXCIpLmFkZFRleHQoKHQpID0+IHtcbiAgICAgIHQuc2V0UGxhY2Vob2xkZXIoXCJlLmcuIHM0MTUzNC0wMjEtMDAzNjgtNFwiKVxuICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuY29tbWl0RGVmYXVsdFBhcGVySWQpXG4gICAgICAgIC5vbkNoYW5nZSgoKSA9PiB0aGlzLnJlZnJlc2hQcmV2aWV3KCkpO1xuICAgICAgdGhpcy5wYXBlcklkSW5wdXQgPSB0LmlucHV0RWw7XG4gICAgfSk7XG5cbiAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJkaXZcIiwgeyB0ZXh0OiBcIlN1bW1hcnlcIiwgY2xzOiBcInNldHRpbmctaXRlbS1uYW1lXCIgfSk7XG4gICAgdGhpcy5zdW1tYXJ5SW5wdXQgPSBjb250ZW50RWwuY3JlYXRlRWwoXCJ0ZXh0YXJlYVwiKTtcbiAgICB0aGlzLnN1bW1hcnlJbnB1dC5yb3dzID0gNDtcbiAgICB0aGlzLnN1bW1hcnlJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgKCkgPT4gdGhpcy5yZWZyZXNoUHJldmlldygpKTtcblxuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImRpdlwiLCB7XG4gICAgICB0ZXh0OiBcIlByZXZpZXcgKHNlbnQgdG8gaWNzIGNvbW1pdCAtbSlcIixcbiAgICAgIGNsczogXCJzZXR0aW5nLWl0ZW0tbmFtZVwiLFxuICAgIH0pO1xuICAgIHRoaXMucHJldmlld0lucHV0ID0gY29udGVudEVsLmNyZWF0ZUVsKFwidGV4dGFyZWFcIik7XG4gICAgdGhpcy5wcmV2aWV3SW5wdXQucm93cyA9IDM7XG4gICAgdGhpcy5wcmV2aWV3SW5wdXQucmVhZE9ubHkgPSB0cnVlO1xuXG4gICAgdGhpcy5yZWZyZXNoUHJldmlldygpO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgLmFkZEJ1dHRvbigoYikgPT5cbiAgICAgICAgYi5zZXRCdXR0b25UZXh0KFwiQ29tbWl0XCIpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHYgPSB0aGlzLnByZXZpZXdJbnB1dC52YWx1ZS50cmltKCk7XG4gICAgICAgICAgdGhpcy5yZXN1bHQgPSB2Lmxlbmd0aCA/IHYgOiBudWxsO1xuICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgfSlcbiAgICAgIClcbiAgICAgIC5hZGRCdXR0b24oKGIpID0+XG4gICAgICAgIGIuc2V0QnV0dG9uVGV4dChcIkNhbmNlbFwiKS5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgICB0aGlzLnJlc3VsdCA9IG51bGw7XG4gICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgfVxuXG4gIG9uQ2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICBpZiAodGhpcy5maW5pc2hlZCkgcmV0dXJuO1xuICAgIHRoaXMuZmluaXNoZWQgPSB0cnVlO1xuICAgIHRoaXMub25Eb25lKHRoaXMucmVzdWx0KTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBJY3NQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBzZXR0aW5nczogSWNzU2V0dGluZ3MgPSB7IC4uLkRFRkFVTFRfU0VUVElOR1MgfTtcbiAgcnVubmVyID0gbmV3IEljc1J1bm5lcigpO1xuXG4gIGFzeW5jIG9ubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xuXG4gICAgdGhpcy5yZWdpc3RlclZpZXcoSUNTX09VVFBVVF9WSUVXX1RZUEUsIChsZWFmKSA9PiBuZXcgSWNzT3V0cHV0VmlldyhsZWFmKSk7XG5cbiAgICB0aGlzLmFkZFJpYmJvbkljb24oXCJzY3JvbGwtdGV4dFwiLCBcIk9wZW4gSUNTIG91dHB1dFwiLCAoKSA9PiB7XG4gICAgICB2b2lkIHRoaXMuZW5zdXJlT3V0cHV0VmlldygpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcInN0YXR1c1wiLFxuICAgICAgbmFtZTogXCJTdGF0dXNcIixcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMucnVuSWNzKFtcInN0YXR1c1wiXSksXG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwibG9nXCIsXG4gICAgICBuYW1lOiBcIkxvZ1wiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5ydW5JY3MoW1wibG9nXCJdKSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJsb2ctZmlsdGVyZWRcIixcbiAgICAgIG5hbWU6IFwiTG9nIChmaWx0ZXJlZClcIixcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMucnVuRmlsdGVyZWRMb2coKSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJkaWZmLXZhdWx0XCIsXG4gICAgICBuYW1lOiBcIkRpZmYgKHZhdWx0KVwiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5ydW5JY3MoW1wiZGlmZlwiXSksXG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwiZGlmZi1hY3RpdmUtZmlsZVwiLFxuICAgICAgbmFtZTogXCJEaWZmIChhY3RpdmUgZmlsZSlcIixcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMuZGlmZkFjdGl2ZUZpbGUoKSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJjb21taXRcIixcbiAgICAgIG5hbWU6IFwiQ29tbWl0XHUyMDI2XCIsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdm9pZCB0aGlzLnByb21wdENvbW1pdCgpLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBJY3NTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG4gIH1cblxuICBhc3luYyBsb2FkU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGF3YWl0IHRoaXMubG9hZERhdGEoKSk7XG4gIH1cblxuICBhc3luYyBzYXZlU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTtcbiAgfVxuXG4gIGFzeW5jIGVuc3VyZU91dHB1dFZpZXcoKTogUHJvbWlzZTxJY3NPdXRwdXRWaWV3PiB7XG4gICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuYXBwO1xuICAgIGNvbnN0IGV4aXN0aW5nID0gd29ya3NwYWNlLmdldExlYXZlc09mVHlwZShJQ1NfT1VUUFVUX1ZJRVdfVFlQRSk7XG4gICAgaWYgKGV4aXN0aW5nLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IGxlYWYgPSBleGlzdGluZ1swXSE7XG4gICAgICBhd2FpdCB3b3Jrc3BhY2UucmV2ZWFsTGVhZihsZWFmKTtcbiAgICAgIHJldHVybiBsZWFmLnZpZXcgYXMgSWNzT3V0cHV0VmlldztcbiAgICB9XG4gICAgY29uc3QgbGVhZiA9IHdvcmtzcGFjZS5nZXRSaWdodExlYWYoZmFsc2UpO1xuICAgIGlmICghbGVhZikge1xuICAgICAgbmV3IE5vdGljZShcIkNvdWxkIG5vdCBvcGVuIHJpZ2h0IHNpZGViYXIgbGVhZlwiKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIm5vIHJpZ2h0IGxlYWZcIik7XG4gICAgfVxuICAgIGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogSUNTX09VVFBVVF9WSUVXX1RZUEUsIGFjdGl2ZTogdHJ1ZSB9KTtcbiAgICBhd2FpdCB3b3Jrc3BhY2UucmV2ZWFsTGVhZihsZWFmKTtcbiAgICByZXR1cm4gbGVhZi52aWV3IGFzIEljc091dHB1dFZpZXc7XG4gIH1cblxuICBhc3luYyBydW5GaWx0ZXJlZExvZygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBzdWIgPSB0aGlzLnNldHRpbmdzLmxvZ0ZpbHRlclBhdGhTdWJzdHJpbmcudHJpbSgpO1xuICAgIGlmICghc3ViLmxlbmd0aCkge1xuICAgICAgbmV3IE5vdGljZShcbiAgICAgICAgXCJTZXQgXHUyMDFDTG9nIGZpbHRlciBzdWJzdHJpbmdcdTIwMUQgaW4gSUNTIHNldHRpbmdzLCBvciB1c2UgSUNTOiBMb2cgZm9yIGZ1bGwgb3V0cHV0LlwiXG4gICAgICApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLnJ1bkljcyhbXCJsb2dcIl0sIHtcbiAgICAgIHN0cmVhbU1vZGU6IFwiYnVmZmVyLWxpbmUtZmlsdGVyXCIsXG4gICAgICBsaW5lRmlsdGVyU3Vic3RyaW5nOiBzdWIsXG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBydW5JY3MoYXJnczogc3RyaW5nW10sIG9wdGlvbnM/OiBSdW5JY3NPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdmlldyA9IGF3YWl0IHRoaXMuZW5zdXJlT3V0cHV0VmlldygpO1xuICAgIHZpZXcuY2xlYXIoKTtcbiAgICBjb25zdCBjd2QgPSB2YXVsdEJhc2VQYXRoKHRoaXMuYXBwKTtcbiAgICBjb25zdCBiaW4gPSB0aGlzLnNldHRpbmdzLmljc0JpbmFyeVBhdGgudHJpbSgpIHx8IFwiaWNzXCI7XG4gICAgY29uc3QgZW52ID0gY2hpbGRFbnYodGhpcy5zZXR0aW5ncyk7XG5cbiAgICBjb25zdCB1c2VMaW5lRmlsdGVyID0gb3B0aW9ucz8uc3RyZWFtTW9kZSA9PT0gXCJidWZmZXItbGluZS1maWx0ZXJcIjtcbiAgICBjb25zdCBmaWx0ZXJTdWIgPSBvcHRpb25zPy5saW5lRmlsdGVyU3Vic3RyaW5nPy50cmltKCkgPz8gXCJcIjtcbiAgICBpZiAodXNlTGluZUZpbHRlciAmJiAhZmlsdGVyU3ViLmxlbmd0aCkge1xuICAgICAgbmV3IE5vdGljZShcIkxvZyBmaWx0ZXI6IGVtcHR5IHN1YnN0cmluZ1wiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgYWNjID0gXCJcIjtcbiAgICBsZXQgY29tYmluZWRGb3JOb3RpY2UgPSBcIlwiO1xuXG4gICAgY29uc3QgYXBwZW5kID0gKGNodW5rOiBzdHJpbmcsIHN0cmVhbTogXCJzdGRvdXRcIiB8IFwic3RkZXJyXCIpID0+IHtcbiAgICAgIGNvbnN0IHByZWZpeCA9IHN0cmVhbSA9PT0gXCJzdGRlcnJcIiA/IFwiW3N0ZGVycl0gXCIgOiBcIlwiO1xuICAgICAgY29uc3QgcGllY2UgPSBwcmVmaXggKyBjaHVuaztcbiAgICAgIGlmICh1c2VMaW5lRmlsdGVyKSB7XG4gICAgICAgIGFjYyArPSBwaWVjZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZpZXcuYXBwZW5kKHBpZWNlKTtcbiAgICAgIH1cbiAgICAgIGNvbWJpbmVkRm9yTm90aWNlICs9IHBpZWNlO1xuICAgIH07XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBjb2RlIH0gPSBhd2FpdCB0aGlzLnJ1bm5lci5ydW4oYmluLCBhcmdzLCB7IGN3ZCwgZW52LCBvbkNodW5rOiBhcHBlbmQgfSk7XG4gICAgICBpZiAodXNlTGluZUZpbHRlciAmJiBjb2RlID09PSAwKSB7XG4gICAgICAgIGNvbnN0IGxpbmVzID0gYWNjLnNwbGl0KC9cXHI/XFxuLyk7XG4gICAgICAgIGNvbnN0IGtlcHQgPSBsaW5lcy5maWx0ZXIoKGxuKSA9PiBsbi5pbmNsdWRlcyhmaWx0ZXJTdWIpKTtcbiAgICAgICAgY29uc3QgdGV4dCA9XG4gICAgICAgICAga2VwdC5sZW5ndGggPiAwXG4gICAgICAgICAgICA/IGtlcHQuam9pbihcIlxcblwiKSArIFwiXFxuXCJcbiAgICAgICAgICAgIDogXCIobm8gbWF0Y2hpbmcgbG9nIGxpbmVzKVxcblwiO1xuICAgICAgICB2aWV3LmNsZWFyKCk7XG4gICAgICAgIHZpZXcuYXBwZW5kKHRleHQpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29kZSA9PT0gMCkge1xuICAgICAgICBuZXcgTm90aWNlKFwiaWNzOiBmaW5pc2hlZCAoMClcIik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB0YWlsID0gdHJ1bmNhdGVGb3JOb3RpY2UoY29tYmluZWRGb3JOb3RpY2UsIE5PVElDRV9PVVRQVVRfTUFYKTtcbiAgICAgICAgY29uc3Qgc3VtbWFyeSA9IGBpY3M6IGV4aXRlZCB3aXRoIGNvZGUgJHtjb2RlID8/IFwiP1wifS5gO1xuICAgICAgICBuZXcgTm90aWNlKHRhaWwgPyBgJHtzdW1tYXJ5fVxcbiR7dGFpbH1gIDogc3VtbWFyeSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc3QgbXNnID0gZSBpbnN0YW5jZW9mIEVycm9yID8gZS5tZXNzYWdlIDogU3RyaW5nKGUpO1xuICAgICAgdmlldy5hcHBlbmQoYFxcbltwbHVnaW4gZXJyb3JdICR7bXNnfVxcbmApO1xuICAgICAgbmV3IE5vdGljZShgaWNzIHNwYXduIGZhaWxlZCAoJHtiaW59KTogJHttc2d9YCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZGlmZkFjdGl2ZUZpbGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZiA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk7XG4gICAgaWYgKCFmKSB7XG4gICAgICBuZXcgTm90aWNlKFwiTm8gYWN0aXZlIGZpbGVcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGF3YWl0IHRoaXMucnVuSWNzKFtcImRpZmZcIiwgZi5wYXRoXSk7XG4gIH1cblxuICBhc3luYyBwcm9tcHRDb21taXQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGF3YWl0IG5ldyBQcm9taXNlPHN0cmluZyB8IG51bGw+KChyZXNvbHZlKSA9PiB7XG4gICAgICBjb25zdCBtID0gbmV3IFJlc2VhcmNoQ29tbWl0TW9kYWwodGhpcy5hcHAsIHRoaXMsIHJlc29sdmUpO1xuICAgICAgbS5vcGVuKCk7XG4gICAgfSk7XG4gICAgaWYgKCFtZXNzYWdlKSB7XG4gICAgICBuZXcgTm90aWNlKFwiQ29tbWl0IGNhbmNlbGxlZFwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy5ydW5JY3MoW1wiY29tbWl0XCIsIFwiLW1cIiwgbWVzc2FnZV0pO1xuICB9XG59XG5cbmNsYXNzIEljc1NldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgcGx1Z2luOiBJY3NQbHVnaW47XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogSWNzUGx1Z2luKSB7XG4gICAgc3VwZXIoYXBwLCBwbHVnaW4pO1xuICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICB9XG5cbiAgZGlzcGxheSgpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiSUNTXCIgfSk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiaWNzIGJpbmFyeVwiKVxuICAgICAgLnNldERlc2MoXCJQYXRoIG9yIGNvbW1hbmQgbmFtZSAoZS5nLiBpY3MsIC91c3IvYmluL2ljcywgfi8uY2FyZ28vYmluL2ljcylcIilcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKFwiaWNzXCIpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmljc0JpbmFyeVBhdGgpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5pY3NCaW5hcnlQYXRoID0gdjtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIH0pXG4gICAgICApO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlN0cmF0dW0gYmFzZSBVUkwgKG9wdGlvbmFsKVwiKVxuICAgICAgLnNldERlc2MoXCJTZXRzIFNUUkFUVU1fQkFTRV9VUkwgZm9yIHRoZSBjaGlsZCBwcm9jZXNzIHdoZW4gbm9uLWVtcHR5LlwiKVxuICAgICAgLmFkZFRleHQoKHQpID0+XG4gICAgICAgIHRcbiAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoXCJodHRwczovL1x1MjAyNlwiKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zdHJhdHVtQmFzZVVybClcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnN0cmF0dW1CYXNlVXJsID0gdjtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIH0pXG4gICAgICApO1xuXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiUmVzZWFyY2ggY29tbWl0IHRlbXBsYXRlXCIgfSk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVmYXVsdCBhY3RvclwiKVxuICAgICAgLnNldERlc2MoXCJQcmVmaWxscyB0aGUgY29tbWl0IG1vZGFsOiBodW1hbiwgY2xhdWRlLCBjdXJzb3IsIG9yIGljcy1ib3QuXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRkKSA9PiB7XG4gICAgICAgIGZvciAoY29uc3QgYSBvZiBBQ1RPUl9PUFRJT05TKSB7XG4gICAgICAgICAgZGQuYWRkT3B0aW9uKGEsIGEpO1xuICAgICAgICB9XG4gICAgICAgIGRkLnNldFZhbHVlKFxuICAgICAgICAgIEFDVE9SX09QVElPTlMuaW5jbHVkZXMoXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21taXREZWZhdWx0QWN0b3IgYXMgKHR5cGVvZiBBQ1RPUl9PUFRJT05TKVtudW1iZXJdXG4gICAgICAgICAgKVxuICAgICAgICAgICAgPyB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21taXREZWZhdWx0QWN0b3JcbiAgICAgICAgICAgIDogXCJodW1hblwiXG4gICAgICAgICk7XG4gICAgICAgIGRkLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29tbWl0RGVmYXVsdEFjdG9yID0gdjtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWZhdWx0IHBoYXNlXCIpXG4gICAgICAuc2V0RGVzYyhcIlByZWZpbGxzIHRoZSBjb21taXQgbW9kYWwgKGUuZy4gaW5ib3gsIGVsaTUsIGdhcHMsIHBlZXIsIHN5bnRoZXNpcykuXCIpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21taXREZWZhdWx0UGhhc2UpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21taXREZWZhdWx0UGhhc2UgPSB2O1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVmYXVsdCBwYXBlciBpZFwiKVxuICAgICAgLnNldERlc2MoXCJQcmVmaWxscyB0aGUgY29tbWl0IG1vZGFsIChlLmcuIHM0MTUzNC0wMjEtMDAzNjgtNCkuXCIpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21taXREZWZhdWx0UGFwZXJJZClcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbW1pdERlZmF1bHRQYXBlcklkID0gdjtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIH0pXG4gICAgICApO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkNvbW1pdCBtZXNzYWdlIHBhdHRlcm5cIilcbiAgICAgIC5zZXREZXNjKFxuICAgICAgICBcIlBsYWNlaG9sZGVyczoge2FjdG9yfSwge3BhcGVyX2lkfSwge3BoYXNlfSwge3N1bW1hcnl9LiBFeGFtcGxlOiBbe2FjdG9yfV1bcmVzZWFyY2hdW3twYXBlcl9pZH1dW3twaGFzZX1dIHtzdW1tYXJ5fVwiXG4gICAgICApXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcihkZWZhdWx0Q29tbWl0UGF0dGVybigpKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb21taXRNZXNzYWdlUGF0dGVybilcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbW1pdE1lc3NhZ2VQYXR0ZXJuID0gdjtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIH0pXG4gICAgICApO1xuXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiTG9nIGZpbHRlclwiIH0pO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkxvZyBmaWx0ZXIgc3Vic3RyaW5nXCIpXG4gICAgICAuc2V0RGVzYyhcbiAgICAgICAgXCJJQ1M6IExvZyAoZmlsdGVyZWQpIHJ1bnMgaWNzIGxvZywgdGhlbiBzaG93cyBvbmx5IGxpbmVzIGNvbnRhaW5pbmcgdGhpcyBzdWJzdHJpbmcgKGUuZy4gYSBwYXBlciBpZCBvciBSZXNlYXJjaC9wYXBlcnMvLi4uKS4gUnVuIGBpY3MgbG9nIC0taGVscGAgdG8gc2VlIGlmIHlvdXIgQ0xJIHN1cHBvcnRzIHBhdGgtc2NvcGVkIGxvZzsgdGhpcyBwbHVnaW4gZG9lcyBub3QgcGFzcyBleHRyYSBhcmdzIHlldC5cIlxuICAgICAgKVxuICAgICAgLmFkZFRleHQoKHQpID0+XG4gICAgICAgIHRcbiAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoXCJlLmcuIHM0MTUzNC0wMjEtMDAzNjgtNFwiKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb2dGaWx0ZXJQYXRoU3Vic3RyaW5nKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubG9nRmlsdGVyUGF0aFN1YnN0cmluZyA9IHY7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB9KVxuICAgICAgKTtcbiAgfVxufVxuIiwgImV4cG9ydCB0eXBlIENvbW1pdFRlbXBsYXRlVmFycyA9IHtcbiAgYWN0b3I6IHN0cmluZztcbiAgcGFwZXJfaWQ6IHN0cmluZztcbiAgcGhhc2U6IHN0cmluZztcbiAgc3VtbWFyeTogc3RyaW5nO1xufTtcblxuY29uc3QgREVGQVVMVF9QQVRURVJOID0gXCJbe2FjdG9yfV1bcmVzZWFyY2hdW3twYXBlcl9pZH1dW3twaGFzZX1dIHtzdW1tYXJ5fVwiO1xuXG4vKiogUmVwbGFjZSBge2tleX1gIHBsYWNlaG9sZGVyczsgdW5rbm93biBrZXlzIGxlZnQgdW5jaGFuZ2VkLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5Q29tbWl0VGVtcGxhdGUoXG4gIHBhdHRlcm46IHN0cmluZyxcbiAgdmFyczogQ29tbWl0VGVtcGxhdGVWYXJzXG4pOiBzdHJpbmcge1xuICByZXR1cm4gcGF0dGVybi5yZXBsYWNlKC9cXHsoXFx3KylcXH0vZywgKF8sIGtleTogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgdiA9IHZhcnNba2V5IGFzIGtleW9mIENvbW1pdFRlbXBsYXRlVmFyc107XG4gICAgcmV0dXJuIHYgIT09IHVuZGVmaW5lZCAmJiB2ICE9PSBudWxsID8gU3RyaW5nKHYpIDogYHske2tleX19YDtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0Q29tbWl0UGF0dGVybigpOiBzdHJpbmcge1xuICByZXR1cm4gREVGQVVMVF9QQVRURVJOO1xufVxuIiwgImV4cG9ydCBpbnRlcmZhY2UgSWNzU2V0dGluZ3Mge1xuICAvKiogRXhlY3V0YWJsZSBvciBiYXJlIG5hbWUgcmVzb2x2ZWQgdmlhIFBBVEggKi9cbiAgaWNzQmluYXJ5UGF0aDogc3RyaW5nO1xuICAvKiogV2hlbiBub24tZW1wdHksIHBhc3NlZCBhcyBTVFJBVFVNX0JBU0VfVVJMIHRvIHRoZSBjaGlsZCBwcm9jZXNzICovXG4gIHN0cmF0dW1CYXNlVXJsOiBzdHJpbmc7XG4gIC8qKiBEZWZhdWx0IGFjdG9yOiBodW1hbiB8IGNsYXVkZSB8IGN1cnNvciB8IGljcy1ib3QgKi9cbiAgY29tbWl0RGVmYXVsdEFjdG9yOiBzdHJpbmc7XG4gIGNvbW1pdERlZmF1bHRQYXBlcklkOiBzdHJpbmc7XG4gIGNvbW1pdERlZmF1bHRQaGFzZTogc3RyaW5nO1xuICAvKiogUGF0dGVybiB3aXRoIHthY3Rvcn0sIHtwYXBlcl9pZH0sIHtwaGFzZX0sIHtzdW1tYXJ5fSAqL1xuICBjb21taXRNZXNzYWdlUGF0dGVybjogc3RyaW5nO1xuICAvKipcbiAgICogU3Vic3RyaW5nIGZvciAqKklDUzogTG9nIChmaWx0ZXJlZCkqKiBcdTIwMTQgbGluZXMgY29udGFpbmluZyB0aGlzIHN1YnN0cmluZyBhcmUga2VwdC5cbiAgICogRG9lcyBub3QgaW52b2tlIGBpY3NgIHdpdGggcGF0aCBhcmdzIHVubGVzcyB5b3UgZXh0ZW5kIHRoZSBDTEk7IHNlZSBSRUFETUUgKElDUyBDTEkgY29tcGF0aWJpbGl0eSkuXG4gICAqL1xuICBsb2dGaWx0ZXJQYXRoU3Vic3RyaW5nOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBJY3NTZXR0aW5ncyA9IHtcbiAgaWNzQmluYXJ5UGF0aDogXCJpY3NcIixcbiAgc3RyYXR1bUJhc2VVcmw6IFwiXCIsXG4gIGNvbW1pdERlZmF1bHRBY3RvcjogXCJodW1hblwiLFxuICBjb21taXREZWZhdWx0UGFwZXJJZDogXCJcIixcbiAgY29tbWl0RGVmYXVsdFBoYXNlOiBcImluYm94XCIsXG4gIGNvbW1pdE1lc3NhZ2VQYXR0ZXJuOiBcIlt7YWN0b3J9XVtyZXNlYXJjaF1be3BhcGVyX2lkfV1be3BoYXNlfV0ge3N1bW1hcnl9XCIsXG4gIGxvZ0ZpbHRlclBhdGhTdWJzdHJpbmc6IFwiXCIsXG59O1xuIiwgImltcG9ydCB7IHNwYXduLCB0eXBlIENoaWxkUHJvY2Vzc1dpdGhvdXROdWxsU3RyZWFtcyB9IGZyb20gXCJjaGlsZF9wcm9jZXNzXCI7XG5cbmV4cG9ydCB0eXBlIFN0cmVhbUhhbmRsZXIgPSAoY2h1bms6IHN0cmluZywgc3RyZWFtOiBcInN0ZG91dFwiIHwgXCJzdGRlcnJcIikgPT4gdm9pZDtcblxuZXhwb3J0IGludGVyZmFjZSBSdW5PcHRpb25zIHtcbiAgY3dkOiBzdHJpbmc7XG4gIGVudjogTm9kZUpTLlByb2Nlc3NFbnY7XG4gIG9uQ2h1bms6IFN0cmVhbUhhbmRsZXI7XG4gIG9uU3RhcnQ/OiAoKSA9PiB2b2lkO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBydW5zIHNvIHR3byBwYWxldHRlIGFjdGlvbnMgbmV2ZXIgaW50ZXJsZWF2ZSBvdXRwdXQuXG4gKi9cbmV4cG9ydCBjbGFzcyBJY3NSdW5uZXIge1xuICBwcml2YXRlIHF1ZXVlOiBQcm9taXNlPHZvaWQ+ID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgcnVuKFxuICAgIGJpbmFyeTogc3RyaW5nLFxuICAgIGFyZ3M6IHN0cmluZ1tdLFxuICAgIG9wdHM6IFJ1bk9wdGlvbnNcbiAgKTogUHJvbWlzZTx7IGNvZGU6IG51bWJlciB8IG51bGw7IHNpZ25hbDogTm9kZUpTLlNpZ25hbHMgfCBudWxsIH0+IHtcbiAgICBjb25zdCB0YXNrID0gYXN5bmMgKCkgPT4ge1xuICAgICAgb3B0cy5vblN0YXJ0Py4oKTtcbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNwYXduT25jZShiaW5hcnksIGFyZ3MsIG9wdHMpO1xuICAgIH07XG4gICAgY29uc3QgbmV4dCA9IHRoaXMucXVldWUudGhlbih0YXNrKTtcbiAgICB0aGlzLnF1ZXVlID0gbmV4dC50aGVuKCgpID0+IHVuZGVmaW5lZCk7XG4gICAgcmV0dXJuIG5leHQ7XG4gIH1cblxuICBwcml2YXRlIHNwYXduT25jZShcbiAgICBiaW5hcnk6IHN0cmluZyxcbiAgICBhcmdzOiBzdHJpbmdbXSxcbiAgICBvcHRzOiBSdW5PcHRpb25zXG4gICk6IFByb21pc2U8eyBjb2RlOiBudW1iZXIgfCBudWxsOyBzaWduYWw6IE5vZGVKUy5TaWduYWxzIHwgbnVsbCB9PiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGxldCBjaGlsZDogQ2hpbGRQcm9jZXNzV2l0aG91dE51bGxTdHJlYW1zO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2hpbGQgPSBzcGF3bihiaW5hcnksIGFyZ3MsIHtcbiAgICAgICAgICBjd2Q6IG9wdHMuY3dkLFxuICAgICAgICAgIGVudjogb3B0cy5lbnYsXG4gICAgICAgICAgc2hlbGw6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHB1bXAgPSAoc3RyZWFtOiBcInN0ZG91dFwiIHwgXCJzdGRlcnJcIiwgZGF0YTogQnVmZmVyKSA9PiB7XG4gICAgICAgIG9wdHMub25DaHVuayhkYXRhLnRvU3RyaW5nKFwidXRmOFwiKSwgc3RyZWFtKTtcbiAgICAgIH07XG5cbiAgICAgIGNoaWxkLnN0ZG91dC5vbihcImRhdGFcIiwgKGQ6IEJ1ZmZlcikgPT4gcHVtcChcInN0ZG91dFwiLCBkKSk7XG4gICAgICBjaGlsZC5zdGRlcnIub24oXCJkYXRhXCIsIChkOiBCdWZmZXIpID0+IHB1bXAoXCJzdGRlcnJcIiwgZCkpO1xuXG4gICAgICBjaGlsZC5vbihcImVycm9yXCIsIChlcnIpID0+IHJlamVjdChlcnIpKTtcbiAgICAgIGNoaWxkLm9uKFwiY2xvc2VcIiwgKGNvZGUsIHNpZ25hbCkgPT4ge1xuICAgICAgICByZXNvbHZlKHsgY29kZSwgc2lnbmFsIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBJdGVtVmlldywgV29ya3NwYWNlTGVhZiB9IGZyb20gXCJvYnNpZGlhblwiO1xuXG5leHBvcnQgY29uc3QgSUNTX09VVFBVVF9WSUVXX1RZUEUgPSBcImljcy1vdXRwdXRcIjtcblxuZXhwb3J0IGNsYXNzIEljc091dHB1dFZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XG4gIHByaXZhdGUgYnVmZmVyID0gXCJcIjtcblxuICBjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmKSB7XG4gICAgc3VwZXIobGVhZik7XG4gIH1cblxuICBnZXRWaWV3VHlwZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBJQ1NfT1VUUFVUX1ZJRVdfVFlQRTtcbiAgfVxuXG4gIGdldERpc3BsYXlUZXh0KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIFwiSUNTIG91dHB1dFwiO1xuICB9XG5cbiAgZ2V0SWNvbigpOiBzdHJpbmcge1xuICAgIHJldHVybiBcInNjcm9sbC10ZXh0XCI7XG4gIH1cblxuICBhc3luYyBvbk9wZW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZWwgPSB0aGlzLmNvbnRlbnRFbDtcbiAgICBlbC5lbXB0eSgpO1xuICAgIGVsLmNyZWF0ZUVsKFwicHJlXCIsIHtcbiAgICAgIGNsczogXCJpY3Mtb3V0cHV0LXByZVwiLFxuICAgICAgdGV4dDogdGhpcy5idWZmZXIgfHwgXCIobm8gb3V0cHV0IHlldCBcdTIwMTQgcnVuIGFuIElDUyBjb21tYW5kKVwiLFxuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgb25DbG9zZSgpOiBQcm9taXNlPHZvaWQ+IHt9XG5cbiAgY2xlYXIoKTogdm9pZCB7XG4gICAgdGhpcy5idWZmZXIgPSBcIlwiO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICBhcHBlbmQodGV4dDogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5idWZmZXIgKz0gdGV4dDtcbiAgICBpZiAodGhpcy5idWZmZXIubGVuZ3RoID4gNTAwXzAwMCkge1xuICAgICAgdGhpcy5idWZmZXIgPSB0aGlzLmJ1ZmZlci5zbGljZSgtNDAwXzAwMCk7XG4gICAgfVxuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlcigpOiB2b2lkIHtcbiAgICBjb25zdCBlbCA9IHRoaXMuY29udGVudEVsO1xuICAgIGVsLmVtcHR5KCk7XG4gICAgZWwuY3JlYXRlRWwoXCJwcmVcIiwge1xuICAgICAgY2xzOiBcImljcy1vdXRwdXQtcHJlXCIsXG4gICAgICB0ZXh0OiB0aGlzLmJ1ZmZlciB8fCBcIihlbXB0eSlcIixcbiAgICB9KTtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFBQUEsbUJBT087OztBQ0FQLElBQU0sa0JBQWtCO0FBR2pCLFNBQVMsb0JBQ2QsU0FDQSxNQUNRO0FBQ1IsU0FBTyxRQUFRLFFBQVEsY0FBYyxDQUFDLEdBQUcsUUFBZ0I7QUFDdkQsVUFBTSxJQUFJLEtBQUssR0FBK0I7QUFDOUMsV0FBTyxNQUFNLFVBQWEsTUFBTSxPQUFPLE9BQU8sQ0FBQyxJQUFJLElBQUksR0FBRztBQUFBLEVBQzVELENBQUM7QUFDSDtBQUVPLFNBQVMsdUJBQStCO0FBQzdDLFNBQU87QUFDVDs7O0FDSk8sSUFBTSxtQkFBZ0M7QUFBQSxFQUMzQyxlQUFlO0FBQUEsRUFDZixnQkFBZ0I7QUFBQSxFQUNoQixvQkFBb0I7QUFBQSxFQUNwQixzQkFBc0I7QUFBQSxFQUN0QixvQkFBb0I7QUFBQSxFQUNwQixzQkFBc0I7QUFBQSxFQUN0Qix3QkFBd0I7QUFDMUI7OztBQzFCQSwyQkFBMkQ7QUFjcEQsSUFBTSxZQUFOLE1BQWdCO0FBQUEsRUFBaEI7QUFDTCxTQUFRLFFBQXVCLFFBQVEsUUFBUTtBQUFBO0FBQUEsRUFFL0MsSUFDRSxRQUNBLE1BQ0EsTUFDaUU7QUFDakUsVUFBTSxPQUFPLFlBQVk7QUFDdkIsV0FBSyxVQUFVO0FBQ2YsYUFBTyxNQUFNLEtBQUssVUFBVSxRQUFRLE1BQU0sSUFBSTtBQUFBLElBQ2hEO0FBQ0EsVUFBTSxPQUFPLEtBQUssTUFBTSxLQUFLLElBQUk7QUFDakMsU0FBSyxRQUFRLEtBQUssS0FBSyxNQUFNLE1BQVM7QUFDdEMsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUVRLFVBQ04sUUFDQSxNQUNBLE1BQ2lFO0FBQ2pFLFdBQU8sSUFBSSxRQUFRLENBQUMsU0FBUyxXQUFXO0FBQ3RDLFVBQUk7QUFDSixV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LE1BQ047QUFDQSxTQUFHLFNBQVMsT0FBTyxNQUFNO0FBQ3ZCLGFBQUssT0FBTyxTQUFTLHFCQUFxQjtBQUMxQyxjQUFNLEtBQUssT0FBTyxhQUFhO0FBQUEsTUFDakMsQ0FBQztBQUFBLElBQ0gsQ0FBQztBQUVILFFBQUkseUJBQVEsV0FBVyxFQUNwQixRQUFRLGVBQWUsRUFDdkIsUUFBUSxzRUFBc0UsRUFDOUU7QUFBQSxNQUFRLENBQUMsTUFDUixFQUNHLFNBQVMsS0FBSyxPQUFPLFNBQVMsa0JBQWtCLEVBQ2hELFNBQVMsT0FBTyxNQUFNO0FBQ3JCLGFBQUssT0FBTyxTQUFTLHFCQUFxQjtBQUMxQyxjQUFNLEtBQUssT0FBTyxhQUFhO0FBQUEsTUFDakMsQ0FBQztBQUFBLElBQ0w7QUFFRixRQUFJLHlCQUFRLFdBQVcsRUFDcEIsUUFBUSxrQkFBa0IsRUFDMUIsUUFBUSxzREFBc0QsRUFDOUQ7QUFBQSxNQUFRLENBQUMsTUFDUixFQUNHLFNBQVMsS0FBSyxPQUFPLFNBQVMsb0JBQW9CLEVBQ2xELFNBQVMsT0FBTyxNQUFNO0FBQ3JCLGFBQUssT0FBTyxTQUFTLHVCQUF1QjtBQUM1QyxjQUFNLEtBQUssT0FBTyxhQUFhO0FBQUEsTUFDakMsQ0FBQztBQUFBLElBQ0w7QUFFRixRQUFJLHlCQUFRLFdBQVcsRUFDcEIsUUFBUSx3QkFBd0IsRUFDaEM7QUFBQSxNQUNDO0FBQUEsSUFDRixFQUNDO0FBQUEsTUFBUSxDQUFDLE1BQ1IsRUFDRyxlQUFlLHFCQUFxQixDQUFDLEVBQ3JDLFNBQVMsS0FBSyxPQUFPLFNBQVMsb0JBQW9CLEVBQ2xELFNBQVMsT0FBTyxNQUFNO0FBQ3JCLGFBQUssT0FBTyxTQUFTLHVCQUF1QjtBQUM1QyxjQUFNLEtBQUssT0FBTyxhQUFhO0FBQUEsTUFDakMsQ0FBQztBQUFBLElBQ0w7QUFFRixnQkFBWSxTQUFTLE1BQU0sRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUVqRCxRQUFJLHlCQUFRLFdBQVcsRUFDcEIsUUFBUSxzQkFBc0IsRUFDOUI7QUFBQSxNQUNDO0FBQUEsSUFDRixFQUNDO0FBQUEsTUFBUSxDQUFDLE1BQ1IsRUFDRyxlQUFlLHlCQUF5QixFQUN4QyxTQUFTLEtBQUssT0FBTyxTQUFTLHNCQUFzQixFQUNwRCxTQUFTLE9BQU8sTUFBTTtBQUNyQixhQUFLLE9BQU8sU0FBUyx5QkFBeUI7QUFDOUMsY0FBTSxLQUFLLE9BQU8sYUFBYTtBQUFBLE1BQ2pDLENBQUM7QUFBQSxJQUNMO0FBQUEsRUFDSjtBQUNGOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfb2JzaWRpYW4iLCAibGVhZiJdCn0K
