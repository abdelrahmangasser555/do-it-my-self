// API route for managing bootstrapped AWS environments
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  readJsonFile,
  appendToJsonFile,
  updateInJsonFile,
  deleteFromJsonFile,
} from "@/lib/filesystem";
import type { BootstrappedEnvironment } from "@/lib/types";

const FILE = "environments.json";

// GET — list all environments or filter by status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let environments = await readJsonFile<BootstrappedEnvironment>(FILE);
  if (status) {
    environments = environments.filter((e) => e.status === status);
  }
  return NextResponse.json(environments);
}

// POST — create a new environment (before bootstrapping)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { region, alias, accountId } = body;

    if (!region || !accountId) {
      return NextResponse.json(
        { error: "Region and accountId are required" },
        { status: 400 },
      );
    }

    // Check for duplicate region+account
    const existing = await readJsonFile<BootstrappedEnvironment>(FILE);
    const duplicate = existing.find(
      (e) =>
        e.region === region &&
        e.accountId === accountId &&
        e.status !== "failed",
    );
    if (duplicate) {
      return NextResponse.json(
        {
          error: `Environment already exists for ${region} in account ${accountId}`,
        },
        { status: 409 },
      );
    }

    const env: BootstrappedEnvironment = {
      id: uuidv4(),
      accountId,
      region,
      alias: alias || `${region}`,
      status: "bootstrapping",
      bootstrappedAt: "",
      createdAt: new Date().toISOString(),
    };

    await appendToJsonFile(FILE, env);
    return NextResponse.json(env, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create environment",
      },
      { status: 400 },
    );
  }
}

// PUT — update environment status (e.g., after bootstrap completes)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const updated = await updateInJsonFile<BootstrappedEnvironment>(
      FILE,
      id,
      updates,
    );
    if (!updated) {
      return NextResponse.json(
        { error: "Environment not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 400 },
    );
  }
}

// DELETE — remove an environment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const success = await deleteFromJsonFile<BootstrappedEnvironment>(FILE, id);
    if (!success) {
      return NextResponse.json(
        { error: "Environment not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 400 },
    );
  }
}
