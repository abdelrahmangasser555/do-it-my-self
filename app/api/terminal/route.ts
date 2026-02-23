// API route for executing shell commands with streaming output
import { NextRequest } from "next/server";
import { spawn } from "child_process";

export async function POST(request: NextRequest) {
  try {
    const { command, cwd } = await request.json();

    if (!command || typeof command !== "string") {
      return new Response(
        JSON.stringify({ error: "Command is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Blocked commands for safety
    const BLOCKED = [
      /rm\s+-rf\s+\//,
      /format\s+/i,
      /del\s+\/s\s+\/q\s+c:/i,
      /mkfs/,
      /dd\s+if=/,
    ];
    if (BLOCKED.some((p) => p.test(command))) {
      return new Response(
        JSON.stringify({ error: "Command blocked for safety" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const write = (data: Record<string, unknown>) => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
          } catch {
            // Stream closed
          }
        };

        write({
          type: "command",
          message: `$ ${command}`,
          level: "command",
        });

        const isWin = process.platform === "win32";
        const shell = isWin ? "powershell.exe" : "/bin/bash";
        const shellArgs = isWin ? ["-NoProfile", "-Command", command] : ["-c", command];

        const workingDir = cwd || process.cwd();

        const child = spawn(shell, shellArgs, {
          cwd: workingDir,
          env: { ...process.env },
          timeout: 120000,
        });

        child.stdout?.on("data", (chunk: Buffer) => {
          const text = chunk.toString();
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.trim()) {
              write({ type: "stdout", message: line, level: "info" });
            }
          }
        });

        child.stderr?.on("data", (chunk: Buffer) => {
          const text = chunk.toString();
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.trim()) {
              write({ type: "stderr", message: line, level: "warn" });
            }
          }
        });

        await new Promise<void>((resolve) => {
          child.on("close", (code) => {
            if (code === 0) {
              write({
                type: "exit",
                message: `Process exited with code 0`,
                level: "success",
                exitCode: 0,
              });
            } else {
              write({
                type: "exit",
                message: `Process exited with code ${code}`,
                level: "error",
                exitCode: code,
              });
            }
            controller.close();
            resolve();
          });

          child.on("error", (err) => {
            write({
              type: "error",
              message: err.message,
              level: "error",
            });
            controller.close();
            resolve();
          });
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to execute command",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
