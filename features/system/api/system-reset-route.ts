// API route to reset all local data for testing — wipes data/ JSON files and system state
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

const DEFAULT_SYSTEM = {
  environmentValidated: false,
  awsValidated: false,
  cdkBootstrapped: false,
  aiConfigured: false,
  onboardingComplete: false,
  tourCompleted: false,
};

export async function POST() {
  try {
    // Reset all JSON data files to empty arrays
    const jsonFiles = ["buckets.json", "files.json", "projects.json", "environments.json"];
    for (const file of jsonFiles) {
      const filePath = path.join(DATA_DIR, file);
      await fs.writeFile(filePath, "[]", "utf-8");
    }

    // Reset system state to defaults
    const systemPath = path.join(DATA_DIR, "system.json");
    await fs.writeFile(systemPath, JSON.stringify(DEFAULT_SYSTEM, null, 2), "utf-8");

    return NextResponse.json({ success: true, message: "All local data has been reset" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reset data" },
      { status: 500 }
    );
  }
}
