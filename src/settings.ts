export interface IcsSettings {
  /** Executable or bare name resolved via PATH */
  icsBinaryPath: string;
  /** When non-empty, passed as STRATUM_BASE_URL to the child process */
  stratumBaseUrl: string;
}

export const DEFAULT_SETTINGS: IcsSettings = {
  icsBinaryPath: "ics",
  stratumBaseUrl: "",
};
