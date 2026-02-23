// Next.js API route for CDK infrastructure deployment commands
import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { updateInJsonFile } from "@/lib/filesystem";
import type { Bucket } from "@/lib/types";

const execAsync = promisify(exec);
const CDK_DIR = path.join(process.cwd(), "infrastructure", "cdk");

export async function POST(request: NextRequest) {
  try {
    const { action, bucketId, s3BucketName, region } = await request.json();

    if (!action) {
      return NextResponse.json(
        { error: "Action is required (synth | deploy)" },
        { status: 400 }
      );
    }

    if (action === "deploy" && bucketId) {
      // Update bucket status to deploying
      await updateInJsonFile<Bucket>("buckets.json", bucketId, {
        status: "deploying",
      } as Partial<Bucket>);
    }

    const env = {
      ...process.env,
      SCR_BUCKET_NAME: s3BucketName || "",
      SCR_REGION: region || "us-east-1",
    };

    let command: string;
    switch (action) {
      case "synth":
        command = "npx cdk synth";
        break;
      case "deploy":
        command = "npx cdk deploy --require-approval never --outputs-file cdk-outputs.json";
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action. Use synth or deploy." },
          { status: 400 }
        );
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd: CDK_DIR,
      env,
      timeout: 300000, // 5 minutes
    });

    // If deploy succeeded and we have a bucketId, try to parse outputs
    if (action === "deploy" && bucketId) {
      try {
        const fs = await import("fs/promises");
        const outputsPath = path.join(CDK_DIR, "cdk-outputs.json");
        const outputsRaw = await fs.readFile(outputsPath, "utf-8");
        const outputs = JSON.parse(outputsRaw);

        // Extract relevant values from CDK outputs
        const stackOutputs = Object.values(outputs)[0] as Record<string, string> | undefined;
        if (stackOutputs) {
          await updateInJsonFile<Bucket>("buckets.json", bucketId, {
            status: "active",
            s3BucketArn: stackOutputs["BucketArn"] || "",
            cloudFrontDomain: stackOutputs["CloudFrontDomain"] || "",
            cloudFrontDistributionId: stackOutputs["DistributionId"] || "",
          } as Partial<Bucket>);
        }
      } catch {
        // Outputs parsing failed, but deploy may have succeeded
        await updateInJsonFile<Bucket>("buckets.json", bucketId, {
          status: "active",
        } as Partial<Bucket>);
      }
    }

    return NextResponse.json({
      success: true,
      stdout,
      stderr,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CDK command failed";

    // Try to update bucket status to failed
    try {
      const body = await request.clone().json();
      if (body.bucketId) {
        await updateInJsonFile<Bucket>("buckets.json", body.bucketId, {
          status: "failed",
        } as Partial<Bucket>);
      }
    } catch {
      // Ignore
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
