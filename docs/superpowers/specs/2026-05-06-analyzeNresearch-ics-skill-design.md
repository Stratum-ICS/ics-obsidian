# Design: analyzeNresearch skill, ICS conventions, and ics-obsidian enhancements

**Date:** 2026-05-06  
**Status:** Approved  
**Repos:** Canonical prompts/templates in **https://github.com/Stratum-ICS/ics-agents** (local: `~/Documents/github/ics-agents`); Obsidian plugin in `ics-obsidian`.

---

## 1. Problem

Research teams need a **repeatable reading path** (ELI5, segment-level notes, structured gap analysis, peer review) captured as **Obsidian markdown** with **ICS history** that stays human-readable across many commits and actors. Newcomers should onboard from **hub + instructions** without spoiling the file tree or commit conventions.

---

## 2. Goals

- **Comprehension workflow:** Explain papers in plain language while tying claims to specific passages; record analyses in markdown.
- **Gap lenses (minimum):** Assumptions; untested claims; promised future work; fragility (“what would break this?”).
- **Peer subagents:** Dedicated passes that stress-test gaps and synthesis.
- **ICS discipline:** Commits are frequent, **scoped**, and **attributed** (`human`, `claude`, `cursor`, `ics-bot`, extensible).
- **Vault legibility:** `hub.md` + **`instruction.md`** (same folder) define rules so humans do not fragment the tree or degrade commit readability over time.
- **Tooling:** Paper text via **`pdftoagent-mcp`** on vault-local PDFs.
- **Cross-platform agents:** Cursor and Claude use the same canonical skill body (thin wrappers allowed).

---

## 3. Non-goals (this spec)

- Changing Stratum or ICS storage semantics beyond what `ics` CLI already supports.
- Mandating Obsidian Dataview or other community plugins.

---

## 4. Repository split

| Location | Role |
|----------|------|
| `~/Documents/github/ics-agents` | **Canonical** skill text, agent prompts, and **templates** (`templates/instruction.md`, future `hub.md.tpl`). Version here is source of truth for research rules. |
| `ics-obsidian` | Obsidian plugin: `ics` spawn, **commit template UI**, **log filter UI**; optional future “scaffold” only if templates stay synced (see §7). |
| Research vault (e.g. `~/Documents/obs-vault`) | Runtime notes: `hub.md`, `instruction.md`, inbox, paper subtree. |

---

## 5. Vault layout and files

### 5.1 Required frontmatter (every note)

- `paper_id` — stable id (e.g. `s41534-021-00368-4`).
- `pdf_rel_path` — vault-relative path to the PDF.
- `kind` / `phase` — e.g. `inbox`, `eli5`, `gaps`, `peer`, `synthesis`.
- Optional: `paper_root`, `actor` (note author; may mirror commit actor).

### 5.2 Paths

- **`Research/inbox/YYYY-MM-DD-<slug>.md`** — fast capture; same `paper_id` on every file.
- **`Research/papers/<paper_id>/hub.md`** — newcomer entry: links, phase checklist, PDF link.
- **`Research/papers/<paper_id>/instruction.md`** — **human-facing contract**: note shapes, commit template grammar, tree rules, examples (see `ics-agents/templates/instruction.md`).
- Optional deeper notes under `Research/papers/<paper_id>/` (e.g. `eli5/`, `gaps/`) or via `paper_root` in frontmatter.

### 5.3 `instruction.md` — source of truth strategy

| Approach | Verdict |
|----------|--------|
| **Only plugin generates `instruction.md`** | **Avoid.** Plugin release cycle lags rule changes; risks mismatch with agent skill text. |
| **Only skill generates on bootstrap** | **Default.** Skill copies or renders from `ics-agents/templates/instruction.md` when initializing a paper. |
| **Plugin “scaffold” command** | **Optional later** if the plugin bundles a **mirror** of `ics-agents` templates updated in lockstep (CI copy or manual bump per release). |

**Recommendation:** Canonical template lives in **`ics-agents`**. **analyzeNresearch** (or a small setup subcommand) **always** writes `instruction.md` beside `hub.md` on first run. Humans who create folders by hand should **copy** `templates/instruction.md` from `ics-agents` or run the skill once to materialize files.

---

## 6. ICS commit message convention

Single-line (preferred for tooling and notices):

```text
[<actor>][research][<paper_id>][<phase>] <summary>
```

- `actor ∈ {human, claude, cursor, ics-bot}` — extend only by team agreement; document in `instruction.md`.
- `phase` aligns with workflow (`inbox`, `eli5`, `gaps`, `peer`, `synthesis`, …).
- Automated commits **must** use the actor matching the runtime (`claude` vs `ics-bot` for non-interactive automation).

Example:

```text
[claude][research][s41534-021-00368-4][eli5] §2 methods — plain-language steps
```

---

## 7. ics-obsidian plugin enhancements

### 7.1 Commit template (settings + modal)

- Settings: default `actor`, optional default `paper_id`, template pattern with `{actor}`, `{paper_id}`, `{phase}`, `{summary}`.
- **Commit modal:** Prefill template; dropdowns or presets for `actor` and `phase`; user edits `summary`.
- Still invokes `ics commit -m "..."` (current spawn model unchanged).

### 7.2 Log filter

- **Preferred:** Pass path/prefix to `ics log` if the CLI supports it (verify with `ics log --help` before implementation).
- **Fallback:** Run `ics log`, filter panel output by vault path substring or regex; document limitations (format-dependent, large logs).

### 7.3 Optional scaffold (deferred)

- Only add if templates are **synced** from `ics-agents` into the plugin bundle; otherwise omit to avoid divergence from `instruction.md`.

---

## 8. Skill: analyzeNresearch (behavior summary)

1. **Initialize:** Ensure `Research/papers/<paper_id>/hub.md` and **`instruction.md`** (from `ics-agents` template), set `pdf_rel_path`.
2. **Ingest:** `pdftoagent-mcp` on vault PDF.
3. **ELI5:** Segment-by-segment notes with quotes and plain-language explanation.
4. **Gaps:** Four lenses + written answers in dedicated notes.
5. **Peers:** At least one subagent round challenging assumptions and synthesis.
6. **Synthesis:** Single note linked from hub.
7. **ICS:** Commit after each stable unit with correct `[actor]` prefix.

Subagents receive: vault root path, `paper_id`, paths to `hub.md` and `instruction.md`.

---

## 9. Testing

- **Vault:** `/home/hahuy/Documents/obs-vault`.
- **PDF:** `/home/hahuy/Documents/obs-vault/s41534-021-00368-4.pdf`.
- **Pass criteria:** (1) `hub.md` + `instruction.md` exist and link correctly; (2) newcomer subagent can follow hub alone and report lower friction than raw PDF; (3) sample commits match §6; (4) log filter / template behave under plugin (when implemented).

---

## 10. Open items before implementation

- Confirm `ics log` / `ics diff` CLI arguments for path scoping.
- Finalize `ics-agents` git remote and publishing; keep `instruction.md` in sync with this spec when rules change.

---

## 11. Approval

Stakeholder sign-off on scope (skill + vault conventions + plugin template + log filter + `instruction.md` strategy + `ics-agents` as canonical home) before **writing-plans** and implementation.
