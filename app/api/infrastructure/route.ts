// Next.js API route for CDK infrastructure deployment with streaming output
import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { updateInJsonFile, readJsonFile } from "@/lib/filesystem";
import {
  describeStack,
  deleteStack,
  checkBucketExists,
} from "@/lib/aws";
import type { Bucket, Project, BucketSyncStatus } from "@/lib/types";

const CDK_DIR = path.join(process.cwd(), "infrastructure", "cdk");

// --- Known CDK Error Patterns & Suggested Fixes ---
interface ErrorPattern {
  pattern: RegExp;
  title: string;
  suggestion: string;
  command?: string;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  {
    pattern: /Is account \d+ bootstrapped|Has the environment been bootstrapped|No bucket named 'cdk-hnb659fds-assets/i,
    title: "CDK Bootstrap Required",
    suggestion:
      "Your AWS account/region has not been bootstrapped for CDK. The CDK needs a bootstrap stack to store assets. Run the bootstrap command with your account ID and region.",
    command: "npx cdk bootstrap aws://ACCOUNT_ID/REGION",
  },
  {
    pattern: /Bootstrap stack.*outdated|requires a newer version of the bootstrap/i,
    title: "Bootstrap Stack Outdated",
    suggestion:
      "Your CDK bootstrap stack is outdated and needs to be updated. Re-run the bootstrap command to upgrade it.",
    command: "npx cdk bootstrap aws://ACCOUNT_ID/REGION",
  },
  {
    pattern: /Unable to resolve AWS account/i,
    title: "AWS Credentials Missing",
    suggestion:
      "No valid AWS credentials found. Configure credentials via environment variables or AWS CLI.",
    command: "aws configure",
  },
  {
    pattern: /ExpiredTokenException|ExpiredToken/i,
    title: "Expired AWS Token",
    suggestion:
      "Your AWS session token has expired. Refresh your credentials.",
    command: "aws sts get-caller-identity",
  },
  {
    pattern: /AccessDenied|is not authorized/i,
    title: "Permission Denied",
    suggestion:
      "The IAM identity does not have permission for this operation. Check your IAM policies.",
  },
  {
    pattern: /BucketAlreadyExists|BucketAlreadyOwnedByYou/i,
    title: "S3 Bucket Name Conflict",
    suggestion:
      "This bucket name is already taken globally. Choose a different bucket name.",
  },
  {
    pattern: /CREATE_FAILED|UPDATE_FAILED|ROLLBACK/i,
    title: "CloudFormation Stack Failure",
    suggestion:
      "The stack deployment failed. Check the CloudFormation console for details, or run with verbose flag.",
    command: "npx cdk deploy --verbose --require-approval never",
  },
  {
    pattern: /ENOENT|Cannot find module|Module not found/i,
    title: "Missing Dependencies",
    suggestion:
      "CDK dependencies are missing. Install them in the infrastructure directory.",
    command: "cd infrastructure/cdk; npm install",
  },
  {
    pattern: /SyntaxError|TypeError|ReferenceError/i,
    title: "Code Error in CDK Stack",
    suggestion:
      "There is a code error in your CDK stack. Run synth to check for issues.",
    command: "npx cdk synth",
  },
  {
    pattern: /rate exceeded|Throttling/i,
    title: "AWS Rate Limit",
    suggestion: "AWS API rate limit hit. Wait a moment and try again.",
  },
];

function matchErrorPatterns(
  text: string
): { title: string; suggestion: string; command?: string } | null {
  for (const { pattern, title, suggestion, command } of ERROR_PATTERNS) {
    if (pattern.test(text)) {
      let resolvedCommand = command;
      // Auto-substitute account ID and region if we can parse them from the error
      if (resolvedCommand) {
        const accountMatch = text.match(/account\s+(\d{12})/i) ||
          text.match(/aws:\/\/(\d{12})/);
        const regionMatch = text.match(/(eu|us|ap|sa|ca|me|af)-\w+-\d+/);
        if (accountMatch) {
          resolvedCommand = resolvedCommand.replace("ACCOUNT_ID", accountMatch[1]);
        }
        if (regionMatch) {
          resolvedCommand = resolvedCommand.replace("REGION", regionMatch[0]);
        }
      }
      return { title, suggestion, command: resolvedCommand };
    }
  }
  return null;
}

// --- Pre-Deployment Checks ---
async function runPreChecks(
  write: (data: Record<string, unknown>) => void
): Promise<boolean> {
  write({
    type: "check",
    label: "Checking CDK directory...",
    level: "info",
  });

  try {
    const fs = await import("fs/promises");
    await fs.access(CDK_DIR);
  } catch {
    write({
      type: "check",
      label: "CDK directory not found at infrastructure/cdk",
      level: "error",
      suggestion: "Create the CDK project: mkdir -p infrastructure/cdk; cd infrastructure/cdk; npx cdk init app --language typescript",
    });
    return false;
  }

  // Check if node_modules exist in CDK dir
  try {
    const fs = await import("fs/promises");
    await fs.access(path.join(CDK_DIR, "node_modules"));
    write({
      type: "check",
      label: "CDK dependencies found",
      level: "success",
    });
  } catch {
    write({
      type: "check",
      label: "CDK dependencies not installed",
      level: "warn",
      suggestion: "Run: cd infrastructure/cdk; npm install",
    });
  }

  write({
    type: "check",
    label: "Pre-checks complete",
    level: "success",
  });

  return true;
}

export async function POST(request: NextRequest) {
  try {
    const { action, bucketId, s3BucketName, region } = await request.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Action is required (synth | deploy)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Set up streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const write = (data: Record<string, unknown>) => {
          try {
            controller.enqueue(
              encoder.encode(JSON.stringify(data) + "\n")
            );
          } catch {
            // Stream closed
          }
        };

        // Pre-checks
        const checksOk = await runPreChecks(write);
        if (!checksOk) {
          write({
            type: "result",
            status: "error",
            message: "Pre-deployment checks failed",
          });
          controller.close();
          return;
        }

        // Update bucket status
        if (action === "deploy" && bucketId) {
          await updateInJsonFile<Bucket>("buckets.json", bucketId, {
            status: "deploying",
          } as Partial<Bucket>);
          write({
            type: "status",
            label: `Bucket status set to "deploying"`,
            level: "info",
          });
        }

        // Build command
        const env = {
          ...process.env,
          SCR_BUCKET_NAME: s3BucketName || "",
          SCR_REGION: region || "us-east-1",
        };

        let command: string;
        let args: string[];
        switch (action) {
          case "synth":
            command = "npx";
            args = ["cdk", "synth"];
            break;
          case "deploy":
            command = "npx";
            args = [
              "cdk",
              "deploy",
              "--require-approval",
              "never",
              "--outputs-file",
              "cdk-outputs.json",
            ];
            break;
          default:
            write({
              type: "result",
              status: "error",
              message: "Invalid action. Use synth or deploy.",
            });
            controller.close();
            return;
        }

        write({
          type: "command",
          label: `Running: ${command} ${args.join(" ")}`,
          level: "command",
        });

        // Spawn process with streaming
        const child = spawn(command, args, {
          cwd: CDK_DIR,
          env,
          shell: true,
          timeout: 300000,
        });

        let stdoutBuffer = "";
        let stderrBuffer = "";

        child.stdout?.on("data", (chunk: Buffer) => {
          const text = chunk.toString();
          stdoutBuffer += text;
          // Stream each line
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.trim()) {
              write({ type: "stdout", message: line, level: "info" });
            }
          }
        });

        child.stderr?.on("data", (chunk: Buffer) => {
          const text = chunk.toString();
          stderrBuffer += text;
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.trim()) {
              // CDK often writes progress to stderr
              const isProgress =
                /\d+\/\d+|⏳|✅|✨|★|⚡/.test(line) ||
                line.includes("CDK") ||
                line.includes("Outputs:");
              write({
                type: "stderr",
                message: line,
                level: isProgress ? "info" : "warn",
              });
            }
          }
        });

        await new Promise<void>((resolve) => {
          child.on("close", async (code) => {
            // On Windows, CDK can exit with code === null even on success.
            // Use multiple heuristics to determine actual success:
            //   1. code === 0
            //   2. CDK outputs file exists with valid stack outputs
            //   3. stdout/stderr contains the ✅ success marker
            let actuallySucceeded = code === 0;

            if (!actuallySucceeded && action === "deploy" && bucketId) {
              try {
                const fs = await import("fs/promises");
                const outputsPath = path.join(CDK_DIR, "cdk-outputs.json");
                const outputsRaw = await fs.readFile(outputsPath, "utf-8");
                const outputs = JSON.parse(outputsRaw);
                const stackName = Object.keys(outputs).find((k) =>
                  k.includes(s3BucketName || "")
                );
                if (stackName && outputs[stackName]) {
                  actuallySucceeded = true;
                }
              } catch {
                // outputs file doesn't exist or is invalid
              }
            }

            if (
              !actuallySucceeded &&
              (stdoutBuffer.includes("✅") || stderrBuffer.includes("✅"))
            ) {
              actuallySucceeded = true;
            }

            if (actuallySucceeded) {
              write({
                type: "result",
                status: "success",
                message:
                  code === 0
                    ? `${action} completed successfully`
                    : `${action} completed successfully (exit code ${code} — verified via outputs)`,
                level: "success",
              });

              // Parse CDK outputs on successful deploy
              if (action === "deploy" && bucketId) {
                try {
                  const fs = await import("fs/promises");
                  const outputsPath = path.join(CDK_DIR, "cdk-outputs.json");
                  const outputsRaw = await fs.readFile(outputsPath, "utf-8");
                  const outputs = JSON.parse(outputsRaw);
                  const stackOutputs = Object.values(outputs)[0] as
                    | Record<string, string>
                    | undefined;
                  if (stackOutputs) {
                    await updateInJsonFile<Bucket>(
                      "buckets.json",
                      bucketId,
                      {
                        status: "active",
                        s3BucketArn: stackOutputs["BucketArn"] || "",
                        cloudFrontDomain: stackOutputs["CloudFrontDomain"] || "",
                        cloudFrontDistributionId:
                          stackOutputs["DistributionId"] || "",
                      } as Partial<Bucket>
                    );
                    write({
                      type: "outputs",
                      data: stackOutputs,
                      level: "success",
                      message: "Stack outputs captured",
                    });
                  }
                } catch {
                  await updateInJsonFile<Bucket>(
                    "buckets.json",
                    bucketId,
                    { status: "active" } as Partial<Bucket>
                  );
                }
              }
            } else {
              // Check error patterns
              const combined = stdoutBuffer + stderrBuffer;
              const errorHint = matchErrorPatterns(combined);

              write({
                type: "result",
                status: "error",
                message: `${action} failed with exit code ${code}`,
                level: "error",
              });

              if (errorHint) {
                write({
                  type: "error-intelligence",
                  title: errorHint.title,
                  suggestion: errorHint.suggestion,
                  command: errorHint.command || null,
                  level: "warn",
                });
              }

              // Update bucket status
              if (action === "deploy" && bucketId) {
                await updateInJsonFile<Bucket>(
                  "buckets.json",
                  bucketId,
                  { status: "failed" } as Partial<Bucket>
                );
              }
            }

            controller.close();
            resolve();
          });

          child.on("error", (err) => {
            const errorHint = matchErrorPatterns(err.message);
            write({
              type: "result",
              status: "error",
              message: err.message,
              level: "error",
            });
            if (errorHint) {
              write({
                type: "error-intelligence",
                title: errorHint.title,
                suggestion: errorHint.suggestion,
                command: errorHint.command || null,
                level: "warn",
              });
            }
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
    const message =
      error instanceof Error ? error.message : "CDK command failed";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ── GET: Check / sync bucket status with AWS ─────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const bucketId = searchParams.get("bucketId");

  if (action === "check-status") {
    // Check a single bucket's AWS status
    if (!bucketId) {
      return Response.json({ error: "bucketId is required" }, { status: 400 });
    }

    const { findInJsonFile } = await import("@/lib/filesystem");
    const bucket = await findInJsonFile<Bucket>("buckets.json", bucketId);
    if (!bucket) {
      return Response.json({ error: "Bucket not found" }, { status: 404 });
    }

    try {
      const [stackStatus, bucketExists] = await Promise.all([
        describeStack(bucket.s3BucketName, bucket.region),
        checkBucketExists(bucket.s3BucketName, bucket.region),
      ]);

      let recommendedAction: BucketSyncStatus["recommendedAction"];
      let needsSync = false;

      if (stackStatus) {
        const isComplete =
          stackStatus.stackStatus === "CREATE_COMPLETE" ||
          stackStatus.stackStatus === "UPDATE_COMPLETE";
        const isFailed =
          stackStatus.stackStatus.includes("FAILED") ||
          stackStatus.stackStatus.includes("ROLLBACK");
        const isInProgress =
          stackStatus.stackStatus.includes("IN_PROGRESS");

        if (isComplete && bucket.status !== "active") {
          needsSync = true;
          recommendedAction = "update-to-active";
        } else if (isFailed && bucket.status !== "failed") {
          needsSync = true;
          recommendedAction = "update-to-failed";
        } else if (isInProgress && bucket.status !== "deploying") {
          needsSync = true;
        }
      } else {
        // No stack found
        if (bucket.status === "active" || bucket.status === "deploying") {
          needsSync = true;
          recommendedAction = bucketExists ? "update-to-active" : "update-to-pending";
        }
      }

      const result: BucketSyncStatus = {
        bucketId: bucket.id,
        bucketName: bucket.name,
        s3BucketName: bucket.s3BucketName,
        localStatus: bucket.status,
        stackExists: !!stackStatus,
        stackStatus: stackStatus?.stackStatus,
        stackStatusReason: stackStatus?.stackStatusReason,
        s3BucketExists: bucketExists,
        cloudFrontDomain: stackStatus?.outputs["CloudFrontDomain"],
        cloudFrontDistributionId: stackStatus?.outputs["DistributionId"],
        resources: stackStatus?.resources ?? [],
        needsSync,
        recommendedAction,
      };

      return Response.json(result);
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : "Failed to check status" },
        { status: 500 }
      );
    }
  }

  if (action === "sync-all") {
    // Sync all buckets with AWS state
    const buckets = await readJsonFile<Bucket>("buckets.json");
    const results: BucketSyncStatus[] = [];

    for (const bucket of buckets) {
      try {
        const [stackStatus, bucketExists] = await Promise.all([
          describeStack(bucket.s3BucketName, bucket.region),
          checkBucketExists(bucket.s3BucketName, bucket.region),
        ]);

        let recommendedAction: BucketSyncStatus["recommendedAction"];
        let needsSync = false;

        if (stackStatus) {
          const isComplete =
            stackStatus.stackStatus === "CREATE_COMPLETE" ||
            stackStatus.stackStatus === "UPDATE_COMPLETE";
          const isFailed =
            stackStatus.stackStatus.includes("FAILED") ||
            stackStatus.stackStatus.includes("ROLLBACK");

          if (isComplete && bucket.status !== "active") {
            needsSync = true;
            recommendedAction = "update-to-active";
            // Auto-sync: update bucket to active with outputs
            await updateInJsonFile<Bucket>("buckets.json", bucket.id, {
              status: "active",
              s3BucketArn: stackStatus.outputs["BucketArn"] || bucket.s3BucketArn,
              cloudFrontDomain:
                stackStatus.outputs["CloudFrontDomain"] || bucket.cloudFrontDomain,
              cloudFrontDistributionId:
                stackStatus.outputs["DistributionId"] ||
                bucket.cloudFrontDistributionId,
              updatedAt: new Date().toISOString(),
            } as Partial<Bucket>);
          } else if (isFailed && bucket.status !== "failed") {
            needsSync = true;
            recommendedAction = "update-to-failed";
            await updateInJsonFile<Bucket>("buckets.json", bucket.id, {
              status: "failed",
              updatedAt: new Date().toISOString(),
            } as Partial<Bucket>);
          }
        } else {
          if (bucket.status === "active" || bucket.status === "deploying") {
            needsSync = true;
            if (bucketExists) {
              recommendedAction = "update-to-active";
            } else {
              recommendedAction = "update-to-pending";
              await updateInJsonFile<Bucket>("buckets.json", bucket.id, {
                status: "pending",
                updatedAt: new Date().toISOString(),
              } as Partial<Bucket>);
            }
          }
        }

        results.push({
          bucketId: bucket.id,
          bucketName: bucket.name,
          s3BucketName: bucket.s3BucketName,
          localStatus: bucket.status,
          stackExists: !!stackStatus,
          stackStatus: stackStatus?.stackStatus,
          stackStatusReason: stackStatus?.stackStatusReason,
          s3BucketExists: bucketExists,
          cloudFrontDomain: stackStatus?.outputs["CloudFrontDomain"],
          cloudFrontDistributionId: stackStatus?.outputs["DistributionId"],
          resources: stackStatus?.resources ?? [],
          needsSync,
          recommendedAction,
        });
      } catch {
        results.push({
          bucketId: bucket.id,
          bucketName: bucket.name,
          s3BucketName: bucket.s3BucketName,
          localStatus: bucket.status,
          stackExists: false,
          s3BucketExists: false,
          resources: [],
          needsSync: false,
        });
      }
    }

    return Response.json({ results });
  }

  if (action === "apply-sync") {
    // Apply a recommended sync action
    if (!bucketId) {
      return Response.json({ error: "bucketId is required" }, { status: 400 });
    }
    const syncAction = searchParams.get("syncAction");
    const { findInJsonFile } = await import("@/lib/filesystem");
    const bucket = await findInJsonFile<Bucket>("buckets.json", bucketId);
    if (!bucket) {
      return Response.json({ error: "Bucket not found" }, { status: 404 });
    }

    try {
      if (syncAction === "update-to-active") {
        const stackStatus = await describeStack(bucket.s3BucketName, bucket.region);
        await updateInJsonFile<Bucket>("buckets.json", bucketId, {
          status: "active",
          s3BucketArn: stackStatus?.outputs["BucketArn"] || bucket.s3BucketArn,
          cloudFrontDomain:
            stackStatus?.outputs["CloudFrontDomain"] || bucket.cloudFrontDomain,
          cloudFrontDistributionId:
            stackStatus?.outputs["DistributionId"] ||
            bucket.cloudFrontDistributionId,
          updatedAt: new Date().toISOString(),
        } as Partial<Bucket>);
      } else if (syncAction === "update-to-failed") {
        await updateInJsonFile<Bucket>("buckets.json", bucketId, {
          status: "failed",
          updatedAt: new Date().toISOString(),
        } as Partial<Bucket>);
      } else if (syncAction === "update-to-pending") {
        await updateInJsonFile<Bucket>("buckets.json", bucketId, {
          status: "pending",
          s3BucketArn: "",
          cloudFrontDomain: "",
          cloudFrontDistributionId: "",
          updatedAt: new Date().toISOString(),
        } as Partial<Bucket>);
      } else if (syncAction === "rollback") {
        await deleteStack(bucket.s3BucketName, bucket.region);
        await updateInJsonFile<Bucket>("buckets.json", bucketId, {
          status: "pending",
          s3BucketArn: "",
          cloudFrontDomain: "",
          cloudFrontDistributionId: "",
          updatedAt: new Date().toISOString(),
        } as Partial<Bucket>);
      }

      return Response.json({ success: true });
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : "Sync failed" },
        { status: 500 }
      );
    }
  }

  return Response.json({ error: "Invalid action. Use check-status, sync-all, or apply-sync." }, { status: 400 });
}
