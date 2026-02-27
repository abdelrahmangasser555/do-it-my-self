// API route for reading/writing onboarding system state
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const SYSTEM_FILE = path.join(DATA_DIR, "system.json");

export interface SystemState {
  environmentValidated: boolean;
  awsValidated: boolean;
  cdkBootstrapped: boolean;
  aiConfigured: boolean;
  onboardingComplete: boolean;
  tourCompleted: boolean;
}

const DEFAULT_STATE: SystemState = {
  environmentValidated: false,
  awsValidated: false,
  cdkBootstrapped: false,
  aiConfigured: false,
  onboardingComplete: false,
  tourCompleted: false,
};

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // exists
  }
}

async function readState(): Promise<SystemState> {
  try {
    const data = await fs.readFile(SYSTEM_FILE, "utf-8");
    return { ...DEFAULT_STATE, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function writeState(state: SystemState): Promise<void> {
  await ensureDir();
  await fs.writeFile(SYSTEM_FILE, JSON.stringify(state, null, 2));
}

// GET — read current system state
export async function GET() {
  const state = await readState();
  return NextResponse.json(state);
}

// POST — update system state (partial updates)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const current = await readState();
    const updated: SystemState = { ...current, ...body };

    // Auto-compute onboardingComplete
    updated.onboardingComplete =
      updated.environmentValidated &&
      updated.awsValidated &&
      updated.cdkBootstrapped;

    await writeState(updated);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update system state" },
      { status: 500 }
    );
  }
}
