import { spawn } from "child_process";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join } from "path";

const maxCodeLength = 100_000;
const maxOutputLength = 200_000;
const defaultTimeoutMs = 5_000;
const maxTimeoutMs = 15_000;
const pythonExecutables =
  process.platform === "win32" ? ["python", "py"] : ["python3", "python"];

export type PythonExecutionRequest = {
  code: string;
  timeoutMs?: number;
  args?: string[];
};

export type PythonExecutionResponse = {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  timedOut: boolean;
};

function clipOutput(value: string): string {
  if (value.length <= maxOutputLength) return value;
  return `${value.slice(0, maxOutputLength)}\n[…output truncado…]`;
}

function getTimeout(timeoutMs?: number): number {
  if (!timeoutMs || !Number.isFinite(timeoutMs)) return defaultTimeoutMs;
  return Math.min(maxTimeoutMs, Math.max(250, Math.floor(timeoutMs)));
}

async function runWithExecutable(
  executable: string,
  scriptPath: string,
  args: string[],
  timeoutMs: number,
): Promise<PythonExecutionResponse> {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const child = spawn(executable, [scriptPath, ...args], {
      cwd: dirname(scriptPath),
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
      },
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout = clipOutput(`${stdout}${chunk.toString()}`);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = clipOutput(`${stderr}${chunk.toString()}`);
    });
    child.on("error", (error: Error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
    child.on("close", (code: number | null) => {
      clearTimeout(timeoutId);
      resolve({
        stdout,
        stderr: timedOut ? `${stderr}\nExecução interrompida por timeout.`.trim() : stderr,
        exitCode: timedOut ? 124 : code ?? 1,
        executionTime: Date.now() - startedAt,
        timedOut,
      });
    });
  });
}

export async function executePythonOnServer(
  request: PythonExecutionRequest,
): Promise<PythonExecutionResponse> {
  const code = request.code.trimEnd();
  if (!code.trim()) {
    throw new Error("Código vazio.");
  }
  if (code.length > maxCodeLength) {
    throw new Error("Código demasiado grande para execução.");
  }

  const directory = await mkdtemp(join(tmpdir(), "note-py-"));
  const scriptPath = join(directory, "script.py");
  await writeFile(scriptPath, code, "utf8");

  try {
    let lastError: unknown = null;

    for (const executable of pythonExecutables) {
      try {
        return await runWithExecutable(
          executable,
          scriptPath,
          request.args ?? [],
          getTimeout(request.timeoutMs),
        );
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Python não encontrado no servidor.");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
