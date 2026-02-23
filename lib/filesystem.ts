// Handles reading and writing JSON data files from the local filesystem

import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

export async function readJsonFile<T>(fileName: string): Promise<T[]> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, fileName);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T[];
  } catch {
    await fs.writeFile(filePath, "[]", "utf-8");
    return [];
  }
}

export async function writeJsonFile<T>(
  fileName: string,
  data: T[]
): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, fileName);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function appendToJsonFile<T extends { id: string }>(
  fileName: string,
  item: T
): Promise<T> {
  const items = await readJsonFile<T>(fileName);
  items.push(item);
  await writeJsonFile(fileName, items);
  return item;
}

export async function updateInJsonFile<T extends { id: string }>(
  fileName: string,
  id: string,
  updates: Partial<T>
): Promise<T | null> {
  const items = await readJsonFile<T>(fileName);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...updates };
  await writeJsonFile(fileName, items);
  return items[index];
}

export async function deleteFromJsonFile<T extends { id: string }>(
  fileName: string,
  id: string
): Promise<boolean> {
  const items = await readJsonFile<T>(fileName);
  const filtered = items.filter((item) => item.id !== id);
  if (filtered.length === items.length) return false;
  await writeJsonFile(fileName, filtered);
  return true;
}

export async function findInJsonFile<T extends { id: string }>(
  fileName: string,
  id: string
): Promise<T | null> {
  const items = await readJsonFile<T>(fileName);
  return items.find((item) => item.id === id) ?? null;
}

export async function filterJsonFile<T>(
  fileName: string,
  predicate: (item: T) => boolean
): Promise<T[]> {
  const items = await readJsonFile<T>(fileName);
  return items.filter(predicate);
}
