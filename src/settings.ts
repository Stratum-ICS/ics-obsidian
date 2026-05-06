export interface IcsSettings {
  /** Executable or bare name resolved via PATH */
  icsBinaryPath: string;
  /** When non-empty, passed as STRATUM_BASE_URL to the child process */
  stratumBaseUrl: string;
  /** Default writer: human | claude | cursor | ics-bot */
  commitDefaultWriter: string;
  commitDefaultPaperId: string;
  commitDefaultPhase: string;
  /** Pattern with {writer}, {paper_id}, {phase}, {summary} */
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
  commitDefaultWriter: "human",
  commitDefaultPaperId: "",
  commitDefaultPhase: "inbox",
  commitMessagePattern: "[{writer}][research][{paper_id}][{phase}] {summary}",
  logFilterPathSubstring: "",
};
