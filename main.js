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

// src/settings.ts
var DEFAULT_SETTINGS = {
  icsBinaryPath: "ics",
  stratumBaseUrl: ""
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
var CommitModal = class extends import_obsidian2.Modal {
  constructor(app, onDone) {
    super(app);
    this.onDone = onDone;
    /** Set by buttons before `close()`; `onClose` forwards to callback */
    this.result = null;
    this.finished = false;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Commit message" });
    this.input = contentEl.createEl("textarea");
    this.input.rows = 4;
    new import_obsidian2.Setting(contentEl).addButton(
      (b) => b.setButtonText("Commit").onClick(() => {
        const v = this.input.value.trim();
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
      id: "ics-status",
      name: "Status",
      callback: () => void this.runIcs(["status"])
    });
    this.addCommand({
      id: "ics-log",
      name: "Log",
      callback: () => void this.runIcs(["log"])
    });
    this.addCommand({
      id: "ics-diff",
      name: "Diff (vault)",
      callback: () => void this.runIcs(["diff"])
    });
    this.addCommand({
      id: "ics-diff-active",
      name: "Diff (active file)",
      callback: () => void this.diffActiveFile()
    });
    this.addCommand({
      id: "ics-commit",
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
  async runIcs(args) {
    const view = await this.ensureOutputView();
    view.clear();
    const cwd = vaultBasePath(this.app);
    const bin = this.settings.icsBinaryPath.trim() || "ics";
    const env = childEnv(this.settings);
    const append = (chunk, stream) => {
      const prefix = stream === "stderr" ? "[stderr] " : "";
      view.append(prefix + chunk);
    };
    try {
      const { code } = await this.runner.run(bin, args, { cwd, env, onChunk: append });
      if (code === 0) {
        new import_obsidian2.Notice("ics: finished (0)");
      } else {
        new import_obsidian2.Notice(`ics: exited with code ${code ?? "?"}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      view.append(`
[plugin error] ${msg}
`);
      new import_obsidian2.Notice(`ics spawn failed: ${msg}`);
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
      const m = new CommitModal(this.app, resolve);
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
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL3NldHRpbmdzLnRzIiwgInNyYy9ydW5uZXIudHMiLCAic3JjL3ZpZXdzL0ljc091dHB1dFZpZXcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7XG4gIEFwcCxcbiAgTW9kYWwsXG4gIE5vdGljZSxcbiAgUGx1Z2luLFxuICBQbHVnaW5TZXR0aW5nVGFiLFxuICBTZXR0aW5nLFxufSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IERFRkFVTFRfU0VUVElOR1MsIHR5cGUgSWNzU2V0dGluZ3MgfSBmcm9tIFwiLi9zZXR0aW5nc1wiO1xuaW1wb3J0IHsgSWNzUnVubmVyIH0gZnJvbSBcIi4vcnVubmVyXCI7XG5pbXBvcnQgeyBJQ1NfT1VUUFVUX1ZJRVdfVFlQRSwgSWNzT3V0cHV0VmlldyB9IGZyb20gXCIuL3ZpZXdzL0ljc091dHB1dFZpZXdcIjtcblxuZnVuY3Rpb24gdmF1bHRCYXNlUGF0aChhcHA6IEFwcCk6IHN0cmluZyB7XG4gIGNvbnN0IGFkYXB0ZXIgPSBhcHAudmF1bHQuYWRhcHRlcjtcbiAgaWYgKFwiZ2V0QmFzZVBhdGhcIiBpbiBhZGFwdGVyICYmIHR5cGVvZiBhZGFwdGVyLmdldEJhc2VQYXRoID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICByZXR1cm4gYWRhcHRlci5nZXRCYXNlUGF0aCgpO1xuICB9XG4gIHRocm93IG5ldyBFcnJvcihcIlZhdWx0IGhhcyBubyBmaWxlc3lzdGVtIGJhc2UgcGF0aCAoSUNTIHJlcXVpcmVzIGEgbG9jYWwgdmF1bHQpXCIpO1xufVxuXG5mdW5jdGlvbiBjaGlsZEVudihzZXR0aW5nczogSWNzU2V0dGluZ3MpOiBOb2RlSlMuUHJvY2Vzc0VudiB7XG4gIGNvbnN0IGVudiA9IHsgLi4ucHJvY2Vzcy5lbnYgfTtcbiAgaWYgKHNldHRpbmdzLnN0cmF0dW1CYXNlVXJsLnRyaW0oKSkge1xuICAgIGVudi5TVFJBVFVNX0JBU0VfVVJMID0gc2V0dGluZ3Muc3RyYXR1bUJhc2VVcmwudHJpbSgpO1xuICB9XG4gIHJldHVybiBlbnY7XG59XG5cbmNsYXNzIENvbW1pdE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICBwcml2YXRlIGlucHV0ITogSFRNTFRleHRBcmVhRWxlbWVudDtcbiAgLyoqIFNldCBieSBidXR0b25zIGJlZm9yZSBgY2xvc2UoKWA7IGBvbkNsb3NlYCBmb3J3YXJkcyB0byBjYWxsYmFjayAqL1xuICBwcml2YXRlIHJlc3VsdDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgZmluaXNoZWQgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9uRG9uZTogKG1lc3NhZ2U6IHN0cmluZyB8IG51bGwpID0+IHZvaWRcbiAgKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgfVxuXG4gIG9uT3BlbigpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcbiAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiQ29tbWl0IG1lc3NhZ2VcIiB9KTtcbiAgICB0aGlzLmlucHV0ID0gY29udGVudEVsLmNyZWF0ZUVsKFwidGV4dGFyZWFcIik7XG4gICAgdGhpcy5pbnB1dC5yb3dzID0gNDtcbiAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXG4gICAgICAuYWRkQnV0dG9uKChiKSA9PlxuICAgICAgICBiLnNldEJ1dHRvblRleHQoXCJDb21taXRcIikub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgY29uc3QgdiA9IHRoaXMuaW5wdXQudmFsdWUudHJpbSgpO1xuICAgICAgICAgIHRoaXMucmVzdWx0ID0gdi5sZW5ndGggPyB2IDogbnVsbDtcbiAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgIH0pXG4gICAgICApXG4gICAgICAuYWRkQnV0dG9uKChiKSA9PlxuICAgICAgICBiLnNldEJ1dHRvblRleHQoXCJDYW5jZWxcIikub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgdGhpcy5yZXN1bHQgPSBudWxsO1xuICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gIH1cblxuICBvbkNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgaWYgKHRoaXMuZmluaXNoZWQpIHJldHVybjtcbiAgICB0aGlzLmZpbmlzaGVkID0gdHJ1ZTtcbiAgICB0aGlzLm9uRG9uZSh0aGlzLnJlc3VsdCk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSWNzUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IEljc1NldHRpbmdzID0geyAuLi5ERUZBVUxUX1NFVFRJTkdTIH07XG4gIHJ1bm5lciA9IG5ldyBJY3NSdW5uZXIoKTtcblxuICBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcblxuICAgIHRoaXMucmVnaXN0ZXJWaWV3KElDU19PVVRQVVRfVklFV19UWVBFLCAobGVhZikgPT4gbmV3IEljc091dHB1dFZpZXcobGVhZikpO1xuXG4gICAgdGhpcy5hZGRSaWJib25JY29uKFwic2Nyb2xsLXRleHRcIiwgXCJPcGVuIElDUyBvdXRwdXRcIiwgKCkgPT4ge1xuICAgICAgdm9pZCB0aGlzLmVuc3VyZU91dHB1dFZpZXcoKTtcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJpY3Mtc3RhdHVzXCIsXG4gICAgICBuYW1lOiBcIlN0YXR1c1wiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5ydW5JY3MoW1wic3RhdHVzXCJdKSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJpY3MtbG9nXCIsXG4gICAgICBuYW1lOiBcIkxvZ1wiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5ydW5JY3MoW1wibG9nXCJdKSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJpY3MtZGlmZlwiLFxuICAgICAgbmFtZTogXCJEaWZmICh2YXVsdClcIixcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMucnVuSWNzKFtcImRpZmZcIl0pLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcImljcy1kaWZmLWFjdGl2ZVwiLFxuICAgICAgbmFtZTogXCJEaWZmIChhY3RpdmUgZmlsZSlcIixcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB2b2lkIHRoaXMuZGlmZkFjdGl2ZUZpbGUoKSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJpY3MtY29tbWl0XCIsXG4gICAgICBuYW1lOiBcIkNvbW1pdFx1MjAyNlwiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQgdGhpcy5wcm9tcHRDb21taXQoKSxcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgSWNzU2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpO1xuICB9XG5cbiAgYXN5bmMgbG9hZFNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBhd2FpdCB0aGlzLmxvYWREYXRhKCkpO1xuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gIH1cblxuICBhc3luYyBlbnN1cmVPdXRwdXRWaWV3KCk6IFByb21pc2U8SWNzT3V0cHV0Vmlldz4ge1xuICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmFwcDtcbiAgICBjb25zdCBleGlzdGluZyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoSUNTX09VVFBVVF9WSUVXX1RZUEUpO1xuICAgIGlmIChleGlzdGluZy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBsZWFmID0gZXhpc3RpbmdbMF0hO1xuICAgICAgYXdhaXQgd29ya3NwYWNlLnJldmVhbExlYWYobGVhZik7XG4gICAgICByZXR1cm4gbGVhZi52aWV3IGFzIEljc091dHB1dFZpZXc7XG4gICAgfVxuICAgIGNvbnN0IGxlYWYgPSB3b3Jrc3BhY2UuZ2V0UmlnaHRMZWFmKGZhbHNlKTtcbiAgICBpZiAoIWxlYWYpIHtcbiAgICAgIG5ldyBOb3RpY2UoXCJDb3VsZCBub3Qgb3BlbiByaWdodCBzaWRlYmFyIGxlYWZcIik7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJubyByaWdodCBsZWFmXCIpO1xuICAgIH1cbiAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IElDU19PVVRQVVRfVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSk7XG4gICAgYXdhaXQgd29ya3NwYWNlLnJldmVhbExlYWYobGVhZik7XG4gICAgcmV0dXJuIGxlYWYudmlldyBhcyBJY3NPdXRwdXRWaWV3O1xuICB9XG5cbiAgYXN5bmMgcnVuSWNzKGFyZ3M6IHN0cmluZ1tdKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdmlldyA9IGF3YWl0IHRoaXMuZW5zdXJlT3V0cHV0VmlldygpO1xuICAgIHZpZXcuY2xlYXIoKTtcbiAgICBjb25zdCBjd2QgPSB2YXVsdEJhc2VQYXRoKHRoaXMuYXBwKTtcbiAgICBjb25zdCBiaW4gPSB0aGlzLnNldHRpbmdzLmljc0JpbmFyeVBhdGgudHJpbSgpIHx8IFwiaWNzXCI7XG4gICAgY29uc3QgZW52ID0gY2hpbGRFbnYodGhpcy5zZXR0aW5ncyk7XG5cbiAgICBjb25zdCBhcHBlbmQgPSAoY2h1bms6IHN0cmluZywgc3RyZWFtOiBcInN0ZG91dFwiIHwgXCJzdGRlcnJcIikgPT4ge1xuICAgICAgY29uc3QgcHJlZml4ID0gc3RyZWFtID09PSBcInN0ZGVyclwiID8gXCJbc3RkZXJyXSBcIiA6IFwiXCI7XG4gICAgICB2aWV3LmFwcGVuZChwcmVmaXggKyBjaHVuayk7XG4gICAgfTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IGNvZGUgfSA9IGF3YWl0IHRoaXMucnVubmVyLnJ1bihiaW4sIGFyZ3MsIHsgY3dkLCBlbnYsIG9uQ2h1bms6IGFwcGVuZCB9KTtcbiAgICAgIGlmIChjb2RlID09PSAwKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoXCJpY3M6IGZpbmlzaGVkICgwKVwiKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYGljczogZXhpdGVkIHdpdGggY29kZSAke2NvZGUgPz8gXCI/XCJ9YCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc3QgbXNnID0gZSBpbnN0YW5jZW9mIEVycm9yID8gZS5tZXNzYWdlIDogU3RyaW5nKGUpO1xuICAgICAgdmlldy5hcHBlbmQoYFxcbltwbHVnaW4gZXJyb3JdICR7bXNnfVxcbmApO1xuICAgICAgbmV3IE5vdGljZShgaWNzIHNwYXduIGZhaWxlZDogJHttc2d9YCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZGlmZkFjdGl2ZUZpbGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZiA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk7XG4gICAgaWYgKCFmKSB7XG4gICAgICBuZXcgTm90aWNlKFwiTm8gYWN0aXZlIGZpbGVcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGF3YWl0IHRoaXMucnVuSWNzKFtcImRpZmZcIiwgZi5wYXRoXSk7XG4gIH1cblxuICBhc3luYyBwcm9tcHRDb21taXQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGF3YWl0IG5ldyBQcm9taXNlPHN0cmluZyB8IG51bGw+KChyZXNvbHZlKSA9PiB7XG4gICAgICBjb25zdCBtID0gbmV3IENvbW1pdE1vZGFsKHRoaXMuYXBwLCByZXNvbHZlKTtcbiAgICAgIG0ub3BlbigpO1xuICAgIH0pO1xuICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgbmV3IE5vdGljZShcIkNvbW1pdCBjYW5jZWxsZWRcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGF3YWl0IHRoaXMucnVuSWNzKFtcImNvbW1pdFwiLCBcIi1tXCIsIG1lc3NhZ2VdKTtcbiAgfVxufVxuXG5jbGFzcyBJY3NTZXR0aW5nVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIHBsdWdpbjogSWNzUGx1Z2luO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IEljc1BsdWdpbikge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgfVxuXG4gIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIklDU1wiIH0pO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcImljcyBiaW5hcnlcIilcbiAgICAgIC5zZXREZXNjKFwiUGF0aCBvciBjb21tYW5kIG5hbWUgKGUuZy4gaWNzLCAvdXNyL2Jpbi9pY3MsIH4vLmNhcmdvL2Jpbi9pY3MpXCIpXG4gICAgICAuYWRkVGV4dCgodCkgPT5cbiAgICAgICAgdFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcihcImljc1wiKVxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5pY3NCaW5hcnlQYXRoKVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaWNzQmluYXJ5UGF0aCA9IHY7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB9KVxuICAgICAgKTtcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJTdHJhdHVtIGJhc2UgVVJMIChvcHRpb25hbClcIilcbiAgICAgIC5zZXREZXNjKFwiU2V0cyBTVFJBVFVNX0JBU0VfVVJMIGZvciB0aGUgY2hpbGQgcHJvY2VzcyB3aGVuIG5vbi1lbXB0eS5cIilcbiAgICAgIC5hZGRUZXh0KCh0KSA9PlxuICAgICAgICB0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKFwiaHR0cHM6Ly9cdTIwMjZcIilcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Muc3RyYXR1bUJhc2VVcmwpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zdHJhdHVtQmFzZVVybCA9IHY7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB9KVxuICAgICAgKTtcbiAgfVxufVxuIiwgImV4cG9ydCBpbnRlcmZhY2UgSWNzU2V0dGluZ3Mge1xuICAvKiogRXhlY3V0YWJsZSBvciBiYXJlIG5hbWUgcmVzb2x2ZWQgdmlhIFBBVEggKi9cbiAgaWNzQmluYXJ5UGF0aDogc3RyaW5nO1xuICAvKiogV2hlbiBub24tZW1wdHksIHBhc3NlZCBhcyBTVFJBVFVNX0JBU0VfVVJMIHRvIHRoZSBjaGlsZCBwcm9jZXNzICovXG4gIHN0cmF0dW1CYXNlVXJsOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBJY3NTZXR0aW5ncyA9IHtcbiAgaWNzQmluYXJ5UGF0aDogXCJpY3NcIixcbiAgc3RyYXR1bUJhc2VVcmw6IFwiXCIsXG59O1xuIiwgImltcG9ydCB7IHNwYXduLCB0eXBlIENoaWxkUHJvY2Vzc1dpdGhvdXROdWxsU3RyZWFtcyB9IGZyb20gXCJjaGlsZF9wcm9jZXNzXCI7XG5cbmV4cG9ydCB0eXBlIFN0cmVhbUhhbmRsZXIgPSAoY2h1bms6IHN0cmluZywgc3RyZWFtOiBcInN0ZG91dFwiIHwgXCJzdGRlcnJcIikgPT4gdm9pZDtcblxuZXhwb3J0IGludGVyZmFjZSBSdW5PcHRpb25zIHtcbiAgY3dkOiBzdHJpbmc7XG4gIGVudjogTm9kZUpTLlByb2Nlc3NFbnY7XG4gIG9uQ2h1bms6IFN0cmVhbUhhbmRsZXI7XG4gIG9uU3RhcnQ/OiAoKSA9PiB2b2lkO1xufVxuXG4vKipcbiAqIFNlcmlhbGl6ZSBydW5zIHNvIHR3byBwYWxldHRlIGFjdGlvbnMgbmV2ZXIgaW50ZXJsZWF2ZSBvdXRwdXQuXG4gKi9cbmV4cG9ydCBjbGFzcyBJY3NSdW5uZXIge1xuICBwcml2YXRlIHF1ZXVlOiBQcm9taXNlPHZvaWQ+ID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgcnVuKFxuICAgIGJpbmFyeTogc3RyaW5nLFxuICAgIGFyZ3M6IHN0cmluZ1tdLFxuICAgIG9wdHM6IFJ1bk9wdGlvbnNcbiAgKTogUHJvbWlzZTx7IGNvZGU6IG51bWJlciB8IG51bGw7IHNpZ25hbDogTm9kZUpTLlNpZ25hbHMgfCBudWxsIH0+IHtcbiAgICBjb25zdCB0YXNrID0gYXN5bmMgKCkgPT4ge1xuICAgICAgb3B0cy5vblN0YXJ0Py4oKTtcbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNwYXduT25jZShiaW5hcnksIGFyZ3MsIG9wdHMpO1xuICAgIH07XG4gICAgY29uc3QgbmV4dCA9IHRoaXMucXVldWUudGhlbih0YXNrKTtcbiAgICB0aGlzLnF1ZXVlID0gbmV4dC50aGVuKCgpID0+IHVuZGVmaW5lZCk7XG4gICAgcmV0dXJuIG5leHQ7XG4gIH1cblxuICBwcml2YXRlIHNwYXduT25jZShcbiAgICBiaW5hcnk6IHN0cmluZyxcbiAgICBhcmdzOiBzdHJpbmdbXSxcbiAgICBvcHRzOiBSdW5PcHRpb25zXG4gICk6IFByb21pc2U8eyBjb2RlOiBudW1iZXIgfCBudWxsOyBzaWduYWw6IE5vZGVKUy5TaWduYWxzIHwgbnVsbCB9PiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGxldCBjaGlsZDogQ2hpbGRQcm9jZXNzV2l0aG91dE51bGxTdHJlYW1zO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2hpbGQgPSBzcGF3bihiaW5hcnksIGFyZ3MsIHtcbiAgICAgICAgICBjd2Q6IG9wdHMuY3dkLFxuICAgICAgICAgIGVudjogb3B0cy5lbnYsXG4gICAgICAgICAgc2hlbGw6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHB1bXAgPSAoc3RyZWFtOiBcInN0ZG91dFwiIHwgXCJzdGRlcnJcIiwgZGF0YTogQnVmZmVyKSA9PiB7XG4gICAgICAgIG9wdHMub25DaHVuayhkYXRhLnRvU3RyaW5nKFwidXRmOFwiKSwgc3RyZWFtKTtcbiAgICAgIH07XG5cbiAgICAgIGNoaWxkLnN0ZG91dC5vbihcImRhdGFcIiwgKGQ6IEJ1ZmZlcikgPT4gcHVtcChcInN0ZG91dFwiLCBkKSk7XG4gICAgICBjaGlsZC5zdGRlcnIub24oXCJkYXRhXCIsIChkOiBCdWZmZXIpID0+IHB1bXAoXCJzdGRlcnJcIiwgZCkpO1xuXG4gICAgICBjaGlsZC5vbihcImVycm9yXCIsIChlcnIpID0+IHJlamVjdChlcnIpKTtcbiAgICAgIGNoaWxkLm9uKFwiY2xvc2VcIiwgKGNvZGUsIHNpZ25hbCkgPT4ge1xuICAgICAgICByZXNvbHZlKHsgY29kZSwgc2lnbmFsIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBJdGVtVmlldywgV29ya3NwYWNlTGVhZiB9IGZyb20gXCJvYnNpZGlhblwiO1xuXG5leHBvcnQgY29uc3QgSUNTX09VVFBVVF9WSUVXX1RZUEUgPSBcImljcy1vdXRwdXRcIjtcblxuZXhwb3J0IGNsYXNzIEljc091dHB1dFZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XG4gIHByaXZhdGUgYnVmZmVyID0gXCJcIjtcblxuICBjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmKSB7XG4gICAgc3VwZXIobGVhZik7XG4gIH1cblxuICBnZXRWaWV3VHlwZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBJQ1NfT1VUUFVUX1ZJRVdfVFlQRTtcbiAgfVxuXG4gIGdldERpc3BsYXlUZXh0KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIFwiSUNTIG91dHB1dFwiO1xuICB9XG5cbiAgZ2V0SWNvbigpOiBzdHJpbmcge1xuICAgIHJldHVybiBcInNjcm9sbC10ZXh0XCI7XG4gIH1cblxuICBhc3luYyBvbk9wZW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZWwgPSB0aGlzLmNvbnRlbnRFbDtcbiAgICBlbC5lbXB0eSgpO1xuICAgIGVsLmNyZWF0ZUVsKFwicHJlXCIsIHtcbiAgICAgIGNsczogXCJpY3Mtb3V0cHV0LXByZVwiLFxuICAgICAgdGV4dDogdGhpcy5idWZmZXIgfHwgXCIobm8gb3V0cHV0IHlldCBcdTIwMTQgcnVuIGFuIElDUyBjb21tYW5kKVwiLFxuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgb25DbG9zZSgpOiBQcm9taXNlPHZvaWQ+IHt9XG5cbiAgY2xlYXIoKTogdm9pZCB7XG4gICAgdGhpcy5idWZmZXIgPSBcIlwiO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICBhcHBlbmQodGV4dDogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5idWZmZXIgKz0gdGV4dDtcbiAgICBpZiAodGhpcy5idWZmZXIubGVuZ3RoID4gNTAwXzAwMCkge1xuICAgICAgdGhpcy5idWZmZXIgPSB0aGlzLmJ1ZmZlci5zbGljZSgtNDAwXzAwMCk7XG4gICAgfVxuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlcigpOiB2b2lkIHtcbiAgICBjb25zdCBlbCA9IHRoaXMuY29udGVudEVsO1xuICAgIGVsLmVtcHR5KCk7XG4gICAgZWwuY3JlYXRlRWwoXCJwcmVcIiwge1xuICAgICAgY2xzOiBcImljcy1vdXRwdXQtcHJlXCIsXG4gICAgICB0ZXh0OiB0aGlzLmJ1ZmZlciB8fCBcIihlbXB0eSlcIixcbiAgICB9KTtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFBQUEsbUJBT087OztBQ0FBLElBQU0sbUJBQWdDO0FBQUEsRUFDM0MsZUFBZTtBQUFBLEVBQ2YsZ0JBQWdCO0FBQ2xCOzs7QUNWQSwyQkFBMkQ7QUFjcEQsSUFBTSxZQUFOLE1BQWdCO0FBQUEsRUFBaEI7QUFDTCxTQUFRLFFBQXVCLFFBQVEsUUFBUTtBQUFBO0FBQUEsRUFFL0MsSUFDRSxRQUNBLE1BQ0EsTUFDaUU7QUFDakUsVUFBTSxPQUFPLFlBQVk7QUFDdkIsV0FBSyxVQUFVO0FBQ2YsYUFBTyxNQUFNLEtBQUssVUFBVSxRQUFRLE1BQU0sSUFBSTtBQUFBLElBQ2hEO0FBQ0EsVUFBTSxPQUFPLEtBQUssTUFBTSxLQUFLLElBQUk7QUFDakMsU0FBSyxRQUFRLEtBQUssS0FBSyxNQUFNLE1BQVM7QUFDdEMsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUVRLFVBQ04sUUFDQSxNQUNBLE1BQ2lFO0FBQ2pFLFdBQU8sSUFBSSxRQUFRLENBQUMsU0FBUyxXQUFXO0FBQ3RDLFVBQUk7QUFDSixVQUFJO0FBQ0Ysb0JBQVEsNEJBQU0sUUFBUSxNQUFNO0FBQUEsVUFDMUIsS0FBSyxLQUFLO0FBQUEsVUFDVixLQUFLLEtBQUs7QUFBQSxVQUNWLE9BQU87QUFBQSxRQUNULENBQUM7QUFBQSxNQUNILFNBQVMsR0FBRztBQUNWLGVBQU8sQ0FBQztBQUNSO0FBQUEsTUFDRjtBQUVBLFlBQU0sT0FBTyxDQUFDLFFBQTZCLFNBQWlCO0FBQzFELGFBQUssUUFBUSxLQUFLLFNBQVMsTUFBTSxHQUFHLE1BQU07QUFBQSxNQUM1QztBQUVBLFlBQU0sT0FBTyxH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
