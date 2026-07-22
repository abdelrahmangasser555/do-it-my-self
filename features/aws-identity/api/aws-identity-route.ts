// API route to fetch the currently configured AWS caller identity (account ID, ARN, etc.)
import { NextResponse } from "next/server";
import { getCallerIdentity } from "@/lib/aws";

export async function GET() {
  try {
    const identity = await getCallerIdentity();
    return NextResponse.json(identity);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get AWS identity",
      },
      { status: 500 }
    );
  }
}
