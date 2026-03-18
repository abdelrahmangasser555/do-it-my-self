// API route to list all real S3 buckets from the AWS account
import { NextResponse } from "next/server";
import { listAllS3Buckets } from "@/lib/aws";

export async function GET() {
  try {
    const buckets = await listAllS3Buckets();
    return NextResponse.json(buckets);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to list AWS buckets",
      },
      { status: 500 }
    );
  }
}
