# ICS CLI — `log` discovery notes

Use this file to record what your installed **`ics`** binary supports so the Obsidian plugin can be extended (e.g. path-scoped `ics log`) without guesswork.

## Commands to run (local machine with `ics` on `PATH`)

```bash
which ics
ics --help
ics log --help
```

## Findings (fill in)

| Date | `ics` version / source | `log` accepts path or prefix args? | Notes |
|------|------------------------|-------------------------------------|--------|
| _pending_ | _e.g. cargo install …_ | _yes/no + exact flags_ | Maintainer env as of 2026-05-06 had **no** `ics` on `PATH`; run the commands above when available. |

## Plugin behavior today (`ics-obsidian`)

- **ICS: Log** — `ics log`, stream full output to the panel.
- **ICS: Log (filtered)** — `ics log`, buffer full output, then show lines containing the **Log filter substring** from settings (client-side filter). Does **not** pass extra argv to `ics log` until this table documents stable CLI flags.

## Follow-up

- If `ics log` supports a path or revision filter, add a setting + pass-through argv in the plugin and update **README**.
