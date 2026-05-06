# ICS (Obsidian plugin)

Obsidian UI for the **ics** CLI (local history + Stratum ICS): run **status**, **commit**, **log**, and **diff** from the vault root.

## Related: research workflow

- **Agent skill + vault templates:** https://github.com/Stratum-ICS/ics-agents  
- **Design spec (this repo):** [docs/superpowers/specs/2026-05-06-analyzeNresearch-ics-skill-design.md](docs/superpowers/specs/2026-05-06-analyzeNresearch-ics-skill-design.md)

## Prerequisites

- **`ics` installed** — e.g. `cargo install --path …/your/ics-cli/crate` or a release binary on your `PATH`.
- **Vault layout** — a normal folder-based vault with a filesystem path (desktop app). The vault root should be where you ran `ics init` (git-less folder managed by `ics`).

## Development

1. Clone this repo and run `npm install`.
2. Run `npm run build`.
3. Run `npm test` (Vitest — commit message template helper).
4. Copy **`main.js`**, **`manifest.json`**, and **`styles.css`** into  
   `<YourVault>/.obsidian/plugins/ics-obsidian/`  
   (create the `ics-obsidian` folder if needed).
5. Reload Obsidian, open **Settings → Community plugins**, and enable **ICS**.

**BRAT / manual install:** point BRAT at this repo (or copy the same three files from a release) into `.obsidian/plugins/ics-obsidian/`.

Use `npm run dev` for a watch build (`esbuild` in watch mode).

## Flatpak Obsidian

- Set **ics binary** in plugin settings to the **full path** of the `ics` executable (Flatpak sandboxes do not see your shell `PATH` the same way).
- Keep the vault under locations Flatpak can access (typically your home directory).

## ICS CLI compatibility (`ics log`)

The plugin runs `ics log` with **no extra arguments** by default. **ICS: Log (filtered)** runs `ics log`, buffers the full output, then **shows only lines that contain** the substring you set under **Log filter substring** in settings (e.g. a `paper_id` or `Research/papers/...`).

Maintainers: run `ics log --help` when `ics` is installed and record flags in **[`docs/ics-cli-log.md`](docs/ics-cli-log.md)**. The plugin does **not** yet forward extra argv to `ics log` until that contract is documented.

## Manual QA (P0)

- [ ] Settings: change **ics binary** and **Stratum base URL**, reload Obsidian — values persist.
- [ ] Command palette **ICS: Status** — output appears in the **ICS output** sidebar view.
- [ ] **ICS: Commit…** — preview shows `[actor][research][paper_id][phase] summary`; commit runs `ics commit -m "…"`.
- [ ] **ICS: Log** — full history prints in the panel.
- [ ] **ICS: Log (filtered)** — with **Log filter substring** set, only matching lines appear (or “no matching log lines”).
- [ ] **ICS: Diff (vault)** and **ICS: Diff (active file)** — run without throwing; output or empty diff is OK.
- [ ] Wrong **ics binary** path — a Notice appears and `[plugin error]` / spawn message shows in the panel.

## Commands

| Command | Action |
|--------|--------|
| Open ICS output (ribbon) | Focus or open the output sidebar |
| **ICS: Status** | `ics status` |
| **ICS: Log** | `ics log` |
| **ICS: Log (filtered)** | `ics log`, then line filter by settings substring |
| **ICS: Diff (vault)** | `ics diff` |
| **ICS: Diff (active file)** | `ics diff <vault-relative path>` |
| **ICS: Commit…** | Opens template modal → `ics commit -m "…"` |

When **Stratum base URL** is non-empty, the plugin sets `STRATUM_BASE_URL` in the environment for every `ics` spawn.

## Settings (research)

Under **ICS** settings:

- **Default actor / phase / paper id** — prefill the commit modal (`human`, `claude`, `cursor`, `ics-bot`).
- **Commit message pattern** — placeholders `{actor}`, `{paper_id}`, `{phase}`, `{summary}`.
- **Log filter substring** — used by **ICS: Log (filtered)**.
