# ICS (Obsidian plugin)

Obsidian UI for the **ics** CLI (local history + Stratum ICS): run **status**, **commit**, **log**, and **diff** from the vault root.

## Prerequisites

- **`ics` installed** — e.g. `cargo install --path …/your/ics-cli/crate` or a release binary on your `PATH`.
- **Vault layout** — a normal folder-based vault with a filesystem path (desktop app). The vault root should be where you ran `ics init` (git-less folder managed by `ics`).

## Development

1. Clone this repo and run `npm install`.
2. Run `npm run build`.
3. Copy **`main.js`**, **`manifest.json`**, and **`styles.css`** into  
   `<YourVault>/.obsidian/plugins/ics-obsidian/`  
   (create the `ics-obsidian` folder if needed).
4. Reload Obsidian, open **Settings → Community plugins**, and enable **ICS**.

**BRAT / manual install:** point BRAT at this repo (or copy the same three files from a release) into `.obsidian/plugins/ics-obsidian/`.

Use `npm run dev` for a watch build (`esbuild` in watch mode).

## Flatpak Obsidian

- Set **ics binary** in plugin settings to the **full path** of the `ics` executable (Flatpak sandboxes do not see your shell `PATH` the same way).
- Keep the vault under locations Flatpak can access (typically your home directory).

## Manual QA (P0)

- [ ] Settings: change **ics binary** and **Stratum base URL**, reload Obsidian — values persist.
- [ ] Command palette **ICS: Status** — output appears in the **ICS output** sidebar view.
- [ ] **ICS: Commit…** — enter a message and commit; confirm with `ics log` in a terminal at vault root.
- [ ] **ICS: Log** — history prints in the panel.
- [ ] **ICS: Diff (vault)** and **ICS: Diff (active file)** — run without throwing; output or empty diff is OK.
- [ ] Wrong **ics binary** path — a Notice appears and `[plugin error]` / spawn message shows in the panel.

## Commands

| Command | Action |
|--------|--------|
| Open ICS output (ribbon) | Focus or open the output sidebar |
| **ICS: Status** | `ics status` |
| **ICS: Log** | `ics log` |
| **ICS: Diff (vault)** | `ics diff` |
| **ICS: Diff (active file)** | `ics diff <vault-relative path>` |
| **ICS: Commit…** | `ics commit -m "…"` |

When **Stratum base URL** is non-empty, the plugin sets `STRATUM_BASE_URL` in the environment for every `ics` spawn.
