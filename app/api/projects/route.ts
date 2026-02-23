// Next.js API route handler for projects - proxies to feature logic
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  readJsonFile,
  appendToJsonFile,
  updateInJsonFile,
  deleteFromJsonFile,
} from "@/lib/filesystem";
import { projectSchema } from "@/lib/validations";
import type { Project } from "@/lib/types";

const FILE = "projects.json";

export async function GET() {
  const projects = await readJsonFile<Project>(FILE);
  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = projectSchema.parse(body);
    const project: Project = {
      id: uuidv4(),
      ...parsed,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await appendToJsonFile(FILE, project);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Validation failed" },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }
    const updated = await updateInJsonFile<Project>(FILE, id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    if (!updated) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }
  const deleted = await deleteFromJsonFile<Project>(FILE, id);
  if (!deleted) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
