// API route for saving/loading custom commands
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const COMMANDS_FILE = path.join(DATA_DIR, "custom-commands.json");

export interface SavedCommand {
  id: string;
  label: string;
  description: string;
  command: string;
  category: string;
  createdAt: string;
}

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // exists
  }
}

async function readCommands(): Promise<SavedCommand[]> {
  try {
    const data = await fs.readFile(COMMANDS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeCommands(commands: SavedCommand[]) {
  await ensureDir();
  await fs.writeFile(COMMANDS_FILE, JSON.stringify(commands, null, 2));
}

// GET — list all saved commands
export async function GET() {
  const commands = await readCommands();
  return NextResponse.json(commands);
}

// POST — save a new command
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { label, description, command, category } = body;

    if (!label || !command) {
      return NextResponse.json(
        { error: "label and command are required" },
        { status: 400 }
      );
    }

    const newCmd: SavedCommand = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label,
      description: description || "",
      command,
      category: category || "Custom",
      createdAt: new Date().toISOString(),
    };

    const commands = await readCommands();
    commands.push(newCmd);
    await writeCommands(commands);

    return NextResponse.json(newCmd, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save command" },
      { status: 500 }
    );
  }
}

// DELETE — remove a saved command by id
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const commands = await readCommands();
    const filtered = commands.filter((c) => c.id !== id);

    if (filtered.length === commands.length) {
      return NextResponse.json({ error: "Command not found" }, { status: 404 });
    }

    await writeCommands(filtered);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete command" },
      { status: 500 }
    );
  }
}
