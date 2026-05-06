import { describe, it, expect } from "vitest";
import {
  applyCommitTemplate,
  defaultCommitPattern,
} from "../src/commitTemplate";

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
