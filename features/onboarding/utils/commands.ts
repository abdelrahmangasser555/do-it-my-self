// Types and command definitions for onboarding validation

export interface DependencyCheck {
  name: string;
  command: string;
  versionParser: (output: string) => string | null;
  installSnippet: string;
  icon: "node" | "npm" | "aws" | "cdk";
}

export const DEPENDENCIES: DependencyCheck[] = [
  {
    name: "Node.js",
    command: "node -v",
    versionParser: (output: string) => {
      const match = output.match(/v?(\d+\.\d+\.\d+)/);
      return match ? match[0] : null;
    },
    installSnippet: "# Download from https://nodejs.org/\n# Or use nvm:\nnvm install --lts",
    icon: "node",
  },
  {
    name: "npm",
    command: "npm -v",
    versionParser: (output: string) => {
      const match = output.match(/(\d+\.\d+\.\d+)/);
      return match ? match[0] : null;
    },
    installSnippet: "# npm comes with Node.js\n# Update: npm install -g npm@latest",
    icon: "npm",
  },
  {
    name: "AWS CLI",
    command: "aws --version",
    versionParser: (output: string) => {
      const match = output.match(/aws-cli\/(\d+\.\d+\.\d+)/);
      return match ? `v${match[1]}` : null;
    },
    installSnippet:
      "# Download from https://aws.amazon.com/cli/\n# Or: msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi",
    icon: "aws",
  },
  {
    name: "AWS CDK",
    command: "npx cdk --version",
    versionParser: (output: string) => {
      const match = output.match(/(\d+\.\d+\.\d+)/);
      return match ? `v${match[1]}` : null;
    },
    installSnippet: "npm install -g aws-cdk",
    icon: "cdk",
  },
];

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  success: boolean;
}

/** Execute a command via the backend terminal endpoint and collect output. */
export async function executeCommand(command: string): Promise<CommandResult> {
  const res = await fetch("/api/terminal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command }),
  });

  if (!res.ok) {
    const err = await res.json();
    return {
      stdout: "",
      stderr: err.error || "Command failed",
      exitCode: 1,
      success: false,
    };
  }

  if (!res.body) {
    return { stdout: "", stderr: "No response stream", exitCode: 1, success: false };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let stdout = "";
  let stderr = "";
  let exitCode: number | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const raw of lines) {
      if (!raw.trim()) continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.type === "stdout") {
          stdout += (parsed.message || "") + "\n";
        } else if (parsed.type === "stderr") {
          stderr += (parsed.message || "") + "\n";
        } else if (parsed.type === "exit") {
          exitCode = parsed.exitCode ?? null;
        }
      } catch {
        stdout += raw + "\n";
      }
    }
  }

  return {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    exitCode,
    success: exitCode === 0,
  };
}

/** Execute a command and return streaming lines via a callback. */
export async function executeCommandStreaming(
  command: string,
  onLine: (line: { type: string; message: string; level: string }) => void
): Promise<CommandResult> {
  const res = await fetch("/api/terminal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command }),
  });

  if (!res.ok) {
    const err = await res.json();
    const msg = err.error || "Command failed";
    onLine({ type: "error", message: msg, level: "error" });
    return { stdout: "", stderr: msg, exitCode: 1, success: false };
  }

  if (!res.body) {
    onLine({ type: "error", message: "No response stream", level: "error" });
    return { stdout: "", stderr: "No response stream", exitCode: 1, success: false };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let stdout = "";
  let stderr = "";
  let exitCode: number | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const raw of lines) {
      if (!raw.trim()) continue;
      try {
        const parsed = JSON.parse(raw);
        onLine({
          type: parsed.type || "info",
          message: parsed.message || raw,
          level: parsed.level || "info",
        });
        if (parsed.type === "stdout") {
          stdout += (parsed.message || "") + "\n";
        } else if (parsed.type === "stderr") {
          stderr += (parsed.message || "") + "\n";
        } else if (parsed.type === "exit") {
          exitCode = parsed.exitCode ?? null;
        }
      } catch {
        onLine({ type: "stdout", message: raw, level: "info" });
        stdout += raw + "\n";
      }
    }
  }

  return {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    exitCode,
    success: exitCode === 0,
  };
}
