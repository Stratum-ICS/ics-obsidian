# Publish ICS on Obsidian Community Plugins

Checklist aligned with [Submission requirements for plugins](https://docs.obsidian.md/plugins/Releasing/Submission+requirements+for+plugins) and [Submit your plugin](https://docs.obsidian.md/plugins/Releasing/Submit+your+plugin). Confirm URLs against current Obsidian developer docs before submitting.

## Prerequisites

| Item | Status |
|------|--------|
| Public GitHub repo (plugin source, not only bundled drops) | **Manual:** open https://github.com/hahahuy/ics-obsidian → Settings → confirm **Public** (not Private). |
| Open-source **`LICENSE`** at repo root (MIT / Apache-2.0 / GPL — pick org policy) | **Present:** `LICENSE` (MIT, © 2026 Stratum-ICS — matches `manifest.json` `author`). |
| **`README.md`** — purpose, install, prerequisites (`ics` CLI), Flatpak note | Present |
| **`manifest.json`** — valid `id`, `name`, `version`, `minAppVersion`, `description`, `author`, `isDesktopOnly` | Present (`isDesktopOnly: true` required for Node spawn) |
| **`versions.json`** — maps each released plugin version to minimum app version | Present |
| Remove template/sample-only code | N/A — greenfield plugin |

## Manifest & listing copy

- **`description`**: ≤ 250 characters; ends with `.`; action-led (“Run…”); no emoji (per style guide).
- **`minAppVersion`**: lowest Obsidian desktop version you actually smoke-tested; bump when using newer APIs.
- **`fundingUrl`**: omit unless you accept donations (only approved funding links).
- **Command `id` values**: do not embed the plugin id — Obsidian namespaces commands automatically (this repo uses short ids: `status`, `log`, etc.).

## Release artifact (GitHub Release)

1. Bump **`manifest.json`** `version` and **`package.json`** `version` (keep in sync).
2. Update **`versions.json`** with the new version key → `minAppVersion` value.
3. Run **`npm ci`** / **`npm install`** and **`npm run build`**; commit **`main.js`** if your workflow tracks the bundle (this repo does).
4. Tag **`x.y.z`** matching `manifest.json` version.
5. Create a **GitHub Release** on that tag. Attach (or generate via CI):
   - `manifest.json`
   - `main.js`
   - `styles.css` (if any)

Obsidian’s release bot / community index expects the manifest **`version`** in the release to match the tag.

## Community Plugins PR (`obsidianmd/obsidian-releases`)

1. Read the current **`Submit your plugin`** doc for the exact PR flow (GitHub Action vs manual).
2. Open a PR that adds your plugin to the community catalog (often automated after a valid release).
3. Respond to maintainer review (copy tweaks, security, behavior).

## Execute the plan (in order)

1. ~~**Blocker:** Add **`LICENSE`** at repo root~~ **Done** — `LICENSE` committed at repo root.
2. **Remote:** Ensure GitHub repo is public; `git remote -v` points at the canonical URL you will list.
3. **Version:** Choose release **`x.y.z`** (e.g. `0.1.0` for first listing or `1.0.0` if you want to signal “stable enough”). Set the same value in **`manifest.json`**, **`package.json`**, and a new key in **`versions.json`** for that version → `minAppVersion` (use the **lowest** Obsidian app build you actually tested on).
4. **Build:** `npm install` (or `npm ci` in CI) then **`npm run build`**. Commit **`main.js`** if you ship the bundle in git (this repo does).
5. **Tag & release:** `git tag x.y.z` and push tags; create a **GitHub Release** on that tag; attach **`manifest.json`**, **`main.js`**, **`styles.css`** (per current “Submit your plugin” instructions—confirm against live docs).
6. **Submit:** Follow **Submit your plugin** for `obsidianmd/obsidian-releases` (PR or Action—process changes; read the page the day you submit).
7. **Respond** to any review: copy, security, or behavior nits.

## QA before submit (summary)

- [ ] Desktop-only path: vault on local filesystem; **`ics`** runs at vault root (`ics init` done).
- [ ] Settings persist across reload (binary path, Stratum URL).
- [ ] Each command: Status, Log, Diff (vault), Diff (active file), Commit — output in **ICS output** panel; notices sane on success / failure.
- [ ] Wrong binary path → notice names configured executable + panel shows error.
- [ ] Non-zero **`ics`** exit → notice includes trimmed output (design §7).
- [ ] Flatpak Obsidian: document full path to `ics` (README already calls this out).
- [ ] **`npm audit`**: dev tooling clean (esbuild upgraded for known advisory).

## What to test manually (detailed QA)

Do these on the **same Obsidian build** you put in **`minAppVersion`** (or newer). Use a **folder vault** on disk (not restricted sync-only modes that hide `getBasePath`).

### Environment matrix (pick what applies)

| Surface | Why |
|--------|-----|
| **Linux native** (AppImage/deb/rpm) | Baseline; `PATH` usually sees `ics` if installed for your user. |
| **Flatpak Obsidian** (optional but recommended) | Sandboxing: set **full path** to `ics` in settings; vault under home. |
| **Windows / macOS** (optional) | Confirms path separators and spawn behavior if you claim cross-platform desktop. |

### A. Install & load

1. Copy **`main.js`**, **`manifest.json`**, **`styles.css`** into `VAULT/.obsidian/plugins/ics-obsidian/` (or load the same via BRAT from your repo).
2. Enable the plugin; confirm **no console errors** on load (Obsidian **Developer Tools** → Console).

### B. Settings

| Step | Pass criteria |
|------|----------------|
| Set **ics binary** to a working executable (`ics` or absolute path). | Reload Obsidian; value still there. |
| Set **Stratum base URL** to a dummy `https://example.invalid` (non-empty). | Reload; value persists. Clear it when done unless you need it for real tests. |

### C. ICS output surface

| Step | Pass criteria |
|------|----------------|
| Ribbon **Open ICS output** | Right sidebar opens/focuses **ICS output** view; placeholder or prior text OK. |
| Run **ICS: Status** | Stream appears in panel; notice “finished (0)” if exit 0. |

### D. Commands (happy path)

Run from command palette; after each, check **panel text** and **toast**:

| Command | What to verify |
|---------|----------------|
| **ICS: Status** | Panel shows `ics status` output; exit 0 → short success notice. |
| **ICS: Log** | Log text in panel. |
| **ICS: Diff (vault)** | Diff or empty state; no uncaught exception. |
| Open a note, **ICS: Diff (active file)** | Uses vault-relative path; output or empty OK. |
| **ICS: Commit…** | Modal opens; **Commit** with a test message runs `ics commit -m "…"`; verify with terminal `ics log` at vault root. |

### E. Failure paths

| Scenario | How to trigger | Pass criteria |
|----------|----------------|----------------|
| **Missing / wrong binary** | Set **ics binary** to `/nonexistent/ics` or nonsense name; run **Status**. | Toast includes **`ics spawn failed (<that path>):`** …; panel shows `[plugin error]` / spawn message. |
| **Non-zero exit** | Use a vault/state where `ics` returns non-zero (e.g. invalid args only if you can invoke via CLI); or temporarily run a wrapper script that exits `1` with stderr text. | Toast includes **exit code** and **trimmed** combined output (~last part of stream). |
| **No active file** | Close all leaves / no editor focus; **Diff (active file)**. | “No active file” notice; no crash. |
| **Commit cancelled** | **Commit…** → **Cancel** or dismiss overlay. | “Commit cancelled” (or equivalent); no commit. |

### F. Concurrency / UX sanity

| Step | Pass criteria |
|------|----------------|
| Run **Status**, then quickly **Log** | Outputs should **not interleave** oddly (runner queues runs); latest run replaces cleared output as implemented. |

### G. Repo hygiene (automated)

| Command | Pass criteria |
|---------|----------------|
| `npm run build` | Exits 0; **`main.js`** updated. |
| `npm audit` | No high/critical (goal: **0** vulnerabilities for dev deps). |

### H. Listing copy (quick pass)

- **`manifest.json` `description`**: ≤ 250 chars, ends with `.`, no emoji (open **Community Plugins** style expectations).
- Confirm **`author`** / **`id`** match what you want public forever (`id` change is painful after listing).

## Optional polish

- **BRAT beta testers** before listing: point BRAT at the repo for early adopters (README already mentions BRAT).
- **Screenshots** for forum / readme (not always required by Obsidian, helps discoverability).
- **Forum announcement** post after listing (community norm).

## References

- [Plugin guidelines](https://docs.obsidian.md/plugins/Releasing/Plugin+guidelines)
- [Developer policies](https://docs.obsidian.md/Developer+policies)
- Style guide (linked from submission requirements)
