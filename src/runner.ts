import { spawn, type ChildProcessWithoutNullStreams } from "child_process";

export type StreamHandler = (chunk: string, stream: "stdout" | "stderr") => void;

export interface RunOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  onChunk: StreamHandler;
  onStart?: () => void;
}

/**
 * Serialize runs so two palette actions never interleave output.
 */
export class IcsRunner {
  private queue: Promise<void> = Promise.resolve();

  run(
    binary: string,
    args: string[],
    opts: RunOptions
  ): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
    const task = async () => {
      opts.onStart?.();
      return await this.spawnOnce(binary, args, opts);
    };
    const next = this.queue.then(task);
    this.queue = next.then(() => undefined);
    return next;
  }

  private spawnOnce(
    binary: string,
    args: string[],
    opts: RunOptions
  ): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
    return new Promise((resolve, reject) => {
      let child: ChildProcessWithoutNullStreams;
      try {
        child = spawn(binary, args, {
          cwd: opts.cwd,
          env: opts.env,
          shell: false,
        });
      } catch (e) {
        reject(e);
        return;
      }

      const pump = (stream: "stdout" | "stderr", data: Buffer) => {
        opts.onChunk(data.toString("utf8"), stream);
      };

      child.stdout.on("data", (d: Buffer) => pump("stdout", d));
      child.stderr.on("data", (d: Buffer) => pump("stderr", d));

      child.on("error", (err) => reject(err));
      child.on("close", (code, signal) => {
        resolve({ code, signal });
      });
    });
  }
}
