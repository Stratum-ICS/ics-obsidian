# analyzeNresearch + ICS plugin enhancements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the analyzeNresearch workflow assets in `ics-agents` (templates, full skill, subagent prompts) and extend `ics-obsidian` with commit-message templating plus path-aware or client-filtered `ics log`, aligned with the design spec `docs/superpowers/specs/2026-05-06-analyzeNresearch-ics-skill-design.md`.

**Architecture:** Keep **canonical** research rules and templates in **`ics-agents`** (`https://github.com/Stratum-ICS/ics-agents`). The Obsidian plugin only improves **human** ICS ergonomics (prefilled commit line, log narrowing). Pure functions for template substitution live in a small **`src/commitTemplate.ts`** module covered by **Vitest**; **`runIcs`** gains an optional **buffer-then-filter** path for log output when the CLI cannot narrow by path.

**Tech stack:** TypeScript, Obsidian API 1.6+, esbuild, `ics` CLI (spawn), Vitest (new dev dependency for `ics-obsidian`), Markdown templates in `ics-agents`.

---

## File map (before you start)

| Repo | Create | Modify |
|------|--------|--------|
| `ics-agents` | `templates/hub.md.tpl`, `agents/gap-peer-pass.md`, `agents/parent-brief.md` | `README.md`, `skills/analyze-n-research/SKILL.md` |
| `ics-obsidian` | `src/commitTemplate.ts`, `tests/commitTemplate.test.ts`, `vitest.config.ts` | `package.json`, `src/settings.ts`, `src/main.ts`, `README.md` |

---

### Task 1: Record `ics log` CLI capabilities (blocking for log filter)

**Files:** None — document findings in a short subsection of this plan or in `README.md` under **ICS CLI compatibility** after you run the commands.

- [ ] **Step 1:** On a machine with `ics` installed, run:

```bash
ics log --help
ics --help
```

- [ ] **Step 2:** Record verbatim whether `log` accepts a **path**, **prefix**, or **revision range** argument. Classify:

| CLI supports path/prefix for `log`? | Plugin behavior |
|-------------------------------------|-----------------|
| Yes (document flag) | `runIcs(["log", ...args])` passes user’s vault-relative prefix from settings. |
| No | Collect full log output in memory for that run, then **line-filter** by substring match on the user’s **log filter** string (default empty = no filter). |

- [ ] **Step 3:** Commit doc update (if any) in `ics-obsidian` README in Task 7.

**Expected:** A one-paragraph “ICS log” note the implementer can paste into `README.md`.

---

### Task 2: `ics-agents` — `hub.md` template

**Files:**
- Create: `/home/hahuy/Documents/github/ics-agents/templates/hub.md.tpl`

- [ ] **Step 1:** Add template with placeholders `{{paper_id}}`, `{{pdf_rel_path}}`, `{{title_guess}}` (optional). Include: title line, link to PDF, link to `instruction.md`, phase checklist (inbox → eli5 → gaps → peer → synthesis), empty “Links” section for child notes.

Example body (trim or expand as needed):

```markdown
---
paper_id: {{paper_id}}
pdf_rel_path: {{pdf_rel_path}}
phase: hub
---

# Paper hub — {{paper_id}}

**PDF:** [[{{pdf_rel_path}}]]  
**Rules:** [[instruction.md]]

## Reading phases

- [ ] Inbox / first reactions (`Research/inbox/…`)
- [ ] ELI5 by section (`eli5/`)
- [ ] Gap pass (`gaps/`)
- [ ] Peer review (`peer/`)
- [ ] Synthesis (`synthesis.md`)

## Note index

(Add wikilinks as notes are created.)
```

- [ ] **Step 2:** Commit in `ics-agents`:

```bash
cd /home/hahuy/Documents/github/ics-agents
git add templates/hub.md.tpl
git commit -m "feat: add hub.md template for paper folders"
```

---

### Task 3: `ics-agents` — parent + gap peer agent prompts

**Files:**
- Create: `/home/hahuy/Documents/github/ics-agents/agents/parent-brief.md`
- Create: `/home/hahuy/Documents/github/ics-agents/agents/gap-peer-pass.md`

- [ ] **Step 1:** `parent-brief.md` — instructions for orchestrator to pass vault root, `paper_id`, absolute paths to `hub.md` and `instruction.md`, current phase, and require subagents to read `instruction.md` before writing.

- [ ] **Step 2:** `gap-peer-pass.md` — single peer pass that explicitly challenges: assumptions, untested claims, authors’ future work, and fragility; output goes to `phase: peer` notes with links back to ELI5/gap notes.

- [ ] **Step 3:** Commit:

```bash
git add agents/parent-brief.md agents/gap-peer-pass.md
git commit -m "feat: add parent brief and gap peer agent prompts"
```

---

### Task 4: `ics-agents` — expand `SKILL.md`

**Files:**
- Modify: `/home/hahuy/Documents/github/ics-agents/skills/analyze-n-research/SKILL.md`

- [ ] **Step 1:** Expand with: exact bootstrap steps (copy `templates/instruction.md` + render `hub.md.tpl`); ELI5 note structure; four gap files naming convention (`gaps/assumptions.md`, etc.); ICS commit grammar; pointer to `newcomer-path-validator.md` and `gap-peer-pass.md`; Cursor vs Claude install note (symlink or copy skill folder).

- [ ] **Step 2:** Commit:

```bash
git add skills/analyze-n-research/SKILL.md
git commit -m "docs: expand analyze-n-research skill workflow"
```

---

### Task 5: `ics-agents` — README and remote

**Files:**
- Modify: `/home/hahuy/Documents/github/ics-agents/README.md`

- [ ] **Step 1:** Replace placeholder GitHub link with `https://github.com/Stratum-ICS/ics-agents`. List `templates/hub.md.tpl` in the layout table.

- [ ] **Step 2:** Ensure remote exists (already added by user):

```bash
git remote -v
# expect: origin https://github.com/Stratum-ICS/ics-agents.git
```

- [ ] **Step 3:** Push:

```bash
git push -u origin master
```

**Expected:** `origin/master` on GitHub contains all `ics-agents` commits; if push fails (auth), fix credentials and rerun.

---

### Task 6: `ics-obsidian` — commit template helper + Vitest

**Files:**
- Create: `/home/hahuy/Documents/github/ics-obsidian/src/commitTemplate.ts`
- Create: `/home/hahuy/Documents/github/ics-obsidian/tests/commitTemplate.test.ts`
- Create: `/home/hahuy/Documents/github/ics-obsidian/vitest.config.ts`
- Modify: `/home/hahuy/Documents/github/ics-obsidian/package.json`

- [ ] **Step 1:** Add devDependencies and script (exact `package.json` diff — merge versions with `npm install`):

```json
{
  "scripts": {
    "build": "node esbuild.config.mjs",
    "dev": "node esbuild.config.mjs --watch",
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

Run:

```bash
cd /home/hahuy/Documents/github/ics-obsidian
npm install
```

- [ ] **Step 2:** Add `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 3:** Implement `src/commitTemplate.ts`:

```typescript
export type CommitTemplateVars = {
  writer: string;
  paper_id: string;
  phase: string;
  summary: string;
};

const DEFAULT_PATTERN =
  "[{writer}][research][{paper_id}][{phase}] {summary}";

/** Replace `{key}` placeholders; unknown keys left unchanged. */
export function applyCommitTemplate(
  pattern: string,
  vars: CommitTemplateVars
): string {
  return pattern.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key as keyof CommitTemplateVars];
    return v !== undefined && v !== null ? String(v) : `{${key}}`;
  });
}

export function defaultCommitPattern(): string {
  return DEFAULT_PATTERN;
}
```

- [ ] **Step 4:** Write failing test first in `tests/commitTemplate.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { applyCommitTemplate, defaultCommitPattern } from "../src/commitTemplate";

describe("applyCommitTemplate", () => {
  it("fills all slots", () => {
    const line = applyCommitTemplate(defaultCommitPattern(), {
      writer: "human",
      paper_id: "s41534-021-00368-4",
      phase: "eli5",
      summary: "§1 intro",
    });
    expect(line).toBe(
      "[human][research][s41534-021-00368-4][eli5] §1 intro"
    );
  });

  it("preserves unknown placeholders", () => {
    const line = applyCommitTemplate("[{writer}] {unknown}", {
      writer: "claude",
      paper_id: "p",
      phase: "gaps",
      summary: "x",
    });
    expect(line).toBe("[claude] {unknown}");
  });
});
```

- [ ] **Step 5:** Run `npm test` — expect **PASS**.

- [ ] **Step 6:** Commit:

```bash
git add package.json package-lock.json vitest.config.ts src/commitTemplate.ts tests/commitTemplate.test.ts
git commit -m "feat: add commit message template helper with tests"
```

---

### Task 7: `ics-obsidian` — settings for template + log filter

**Files:**
- Modify: `/home/hahuy/Documents/github/ics-obsidian/src/settings.ts`

- [ ] **Step 1:** Extend interface and defaults:

```typescript
export interface IcsSettings {
  icsBinaryPath: string;
  stratumBaseUrl: string;
  /** Default writer: human | claude | cursor | ics-bot */
  commitDefaultWriter: string;
  commitDefaultPaperId: string;
  commitDefaultPhase: string;
  /** Pattern with {writer}, {paper_id}, {phase}, {summary} */
  commitMessagePattern: string;
  /** When non-empty: pass to CLI if supported (Task 1), else filter log lines containing this substring */
  logFilterPathSubstring: string;
}

export const DEFAULT_SETTINGS: IcsSettings = {
  icsBinaryPath: "ics",
  stratumBaseUrl: "",
  commitDefaultWriter: "human",
  commitDefaultPaperId: "",
  commitDefaultPhase: "inbox",
  commitMessagePattern: "[{writer}][research][{paper_id}][{phase}] {summary}",
  logFilterPathSubstring: "",
};
```

- [ ] **Step 2:** Commit:

```bash
git add src/settings.ts
git commit -m "feat: add settings for commit template and log filter"
```

---

### Task 8: `ics-obsidian` — settings UI + enhanced Commit modal

**Files:**
- Modify: `/home/hahuy/Documents/github/ics-obsidian/src/main.ts`

- [ ] **Step 1:** Import `applyCommitTemplate`, `defaultCommitPattern` from `./commitTemplate`.

- [ ] **Step 2:** Replace `CommitModal` with fields:
  - `Dropdown` or `<select>` for **writer** (`human`, `claude`, `cursor`, `ics-bot`)
  - Text inputs or dropdown for **phase** (`inbox`, `eli5`, `gaps`, `peer`, `synthesis`) — free text allowed if user edits pattern
  - Text inputs for **paper_id** (prefill from `plugin.settings.commitDefaultPaperId`)
  - Textarea for **summary**
  - Read-only or second textarea showing **preview** of final message (updated on change) using `applyCommitTemplate(plugin.settings.commitMessagePattern || defaultCommitPattern(), …)`
  - **Commit** submits the **preview** string to `ics commit -m preview`

- [ ] **Step 3:** `promptCommit()` opens modal with prefilled values from settings; on success run `runIcs(["commit", "-m", message])`.

- [ ] **Step 4:** In `IcsSettingTab.display()`, add settings rows for each new `IcsSettings` field (pattern, defaults, log filter substring). Use `Setting.setDesc` to document the `[writer][research][paper][phase]` convention.

- [ ] **Step 5:** Run `npm run build` — expect exit **0**.

- [ ] **Step 6:** Commit:

```bash
git add src/main.ts
git commit -m "feat: commit modal with template preview and research settings"
```

---

### Task 9: `ics-obsidian` — log command with CLI passthrough or filtered buffer

**Files:**
- Modify: `/home/hahuy/Documents/github/ics-obsidian/src/main.ts`

- [ ] **Step 1:** Add private flag or method `runIcsBufferedForFilter` used only when `logFilterPathSubstring` is non-empty **and** Task 1 concluded CLI does **not** support path — implement by accumulating chunks in local variables inside `runIcs`’s `append` closure, then on process close replace view content with lines where `line.includes(substring)`.

**Sketch** (integrate with existing `runIcs`; adjust types as needed):

```typescript
// inside runIcs, before spawn:
let acc = "";
const useLineFilter = mode === "log-filter";
const append = (chunk: string, stream: "stdout" | "stderr") => {
  if (useLineFilter) {
    acc += chunk;
    return;
  }
  // existing append to view
};
// on code === 0 && useLineFilter:
const sub = this.settings.logFilterPathSubstring.trim();
const filtered = acc
  .split("\n")
  .filter((ln) => ln.includes(sub))
  .join("\n");
view.clear();
view.append(filtered || "(no matching log lines)\n");
```

- [ ] **Step 2:** If Task 1 says CLI **supports** path, add command **ICS: Log (filtered)** that passes the extra args (document exact argv in README from CLI help).

- [ ] **Step 3:** Register palette command **ICS: Log** unchanged for full log; **ICS: Log (filtered)** when substring setting non-empty OR always offer both (filtered uses setting).

- [ ] **Step 4:** `npm run build` — exit **0**.

- [ ] **Step 5:** Commit:

```bash
git add src/main.ts README.md
git commit -m "feat: optional filtered ics log output"
```

---

### Task 10: `ics-obsidian` — README and design spec link

**Files:**
- Modify: `/home/hahuy/Documents/github/ics-obsidian/README.md`
- Modify: `/home/hahuy/Documents/github/ics-obsidian/docs/superpowers/specs/2026-05-06-analyzeNresearch-ics-skill-design.md` (set **Status:** Approved; fix `ics-agents` URL to `https://github.com/Stratum-ICS/ics-agents`)

- [ ] **Step 1:** Document new settings, commands (`Log (filtered)` if added), `npm test`, and link to `ics-agents` + design spec.

- [ ] **Step 2:** Commit:

```bash
git add README.md docs/superpowers/specs/2026-05-06-analyzeNresearch-ics-skill-design.md
git commit -m "docs: analyzeNresearch plugin usage and spec status"
```

---

## Self-review (plan vs spec)

| Spec section | Task coverage |
|--------------|---------------|
| §5 `instruction.md` / hub | Task 2–4 (`hub.md.tpl`, SKILL) + existing `templates/instruction.md` |
| §6 commit grammar | Task 6–8 (template + modal + settings) |
| §7.1 commit template | Task 6–8 |
| §7.2 log filter | Task 1, 9 |
| §8 skill workflow | Task 4 |
| §9 testing | Manual: build + Obsidian smoke; optional vault exercise; `npm test` for template |
| §10 open items | Task 1 (CLI), Task 5 (push) |

**Placeholder scan:** No TBD/TODO left in tasks above; CLI branch documented via Task 1 matrix.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-06-analyzeNresearch-implementation.md`.

**1. Subagent-driven (recommended)** — fresh subagent per task, review between tasks.  
**2. Inline execution** — run tasks in this session with checkpoints.

Which approach do you want for implementation?
