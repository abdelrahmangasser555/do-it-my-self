// API route for executing shell commands with streaming output + kill support
import { NextRequest } from "next/server";
import { spawn, type ChildProcess } from "child_process";

// Track running processes by session ID for kill support
const runningProcesses = new Map<string, ChildProcess>();

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

    // Generate a session ID to track this process
    const sessionId = `term-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

        // Send session ID so client can use it for kill requests
        write({
          type: "session",
          sessionId,
          level: "info",
        });

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
          timeout: 300000, // 5 min timeout
        });

        // Track the process
        runningProcesses.set(sessionId, child);

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
          child.on("close", (code, signal) => {
            runningProcesses.delete(sessionId);

            if (signal === "SIGTERM" || signal === "SIGKILL") {
              write({
                type: "exit",
                message: `Process killed (signal: ${signal})`,
                level: "warn",
                exitCode: null,
                killed: true,
              });
            } else if (code === 0) {
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
            runningProcesses.delete(sessionId);
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

// Kill a running process by session ID
export async function DELETE(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "sessionId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const child = runningProcesses.get(sessionId);
    if (!child) {
      return new Response(
        JSON.stringify({ error: "No running process found", sessionId }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Kill the process tree on Windows
    if (process.platform === "win32" && child.pid) {
      spawn("taskkill", ["/pid", child.pid.toString(), "/T", "/F"]);
    } else {
      child.kill("SIGTERM");
      // Force kill after 3 seconds if still running
      setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {
          // Already dead
        }
      }, 3000);
    }

    runningProcesses.delete(sessionId);

    return new Response(
      JSON.stringify({ success: true, sessionId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to kill process",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
