export type CommitTemplateVars = {
  writer: string;
  paper_id: string;
  phase: string;
  summary: string;
};

const DEFAULT_PATTERN = "[{writer}][research][{paper_id}][{phase}] {summary}";

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
