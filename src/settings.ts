export interface IcsSettings {
  /** Executable or bare name resolved via PATH */
  icsBinaryPath: string;
  /** When non-empty, passed as STRATUM_BASE_URL to the child process */
  stratumBaseUrl: string;
  /** Default actor: human | claude | cursor | ics-bot */
  commitDefaultActor: string;
  commitDefaultPaperId: string;
  commitDefaultPhase: string;
  /** Pattern with {actor}, {paper_id}, {phase}, {summary} */
  commitMessagePattern: string;
  /**
   * Substring for **ICS: Log (filtered)** — lines containing this substring are kept.
   * Does not invoke `ics` with path args unless you extend the CLI; see README (ICS CLI compatibility).
   */
  logFilterPathSubstring: string;
}

export const DEFAULT_SETTINGS: IcsSettings = {
  icsBinaryPath: "ics",
  stratumBaseUrl: "",
  commitDefaultActor: "human",
  commitDefaultPaperId: "",
  commitDefaultPhase: "inbox",
  commitMessagePattern: "[{actor}][research][{paper_id}][{phase}] {summary}",
  logFilterPathSubstring: "",
};
