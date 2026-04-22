// API route for user settings (AWS credentials, OpenAI key, preferences)
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

export interface UserSettings {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsDefaultRegion: string;
  openaiApiKey: string;
  defaultEnvironment: string;
  theme: 'dark' | 'light' | 'system';
}

const DEFAULT_SETTINGS: UserSettings = {
  awsAccessKeyId: '',
  awsSecretAccessKey: '',
  awsDefaultRegion: 'us-east-1',
  openaiApiKey: '',
  defaultEnvironment: '',
  theme: 'dark',
};

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // exists
  }
}

async function readSettings(): Promise<UserSettings> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

async function writeSettings(settings: UserSettings): Promise<void> {
  await ensureDir();
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// GET — read settings (returns masked + raw for pre-fill)
export async function GET(request: NextRequest) {
  const settings = await readSettings();

  // If ?raw=true, return unmasked values for pre-filling form fields
  const url = new URL(request.url);
  const raw = url.searchParams.get('raw') === 'true';

  if (raw) {
    return NextResponse.json({
      ...settings,
      hasAwsCredentials: !!(settings.awsAccessKeyId && settings.awsSecretAccessKey),
      hasOpenaiKey: !!settings.openaiApiKey,
    });
  }

  return NextResponse.json({
    ...settings,
    awsAccessKeyId: settings.awsAccessKeyId ? `****${settings.awsAccessKeyId.slice(-4)}` : '',
    awsSecretAccessKey: settings.awsSecretAccessKey ? '••••••••' : '',
    openaiApiKey: settings.openaiApiKey ? `sk-****${settings.openaiApiKey.slice(-4)}` : '',
    hasAwsCredentials: !!(settings.awsAccessKeyId && settings.awsSecretAccessKey),
    hasOpenaiKey: !!settings.openaiApiKey,
  });
}

// POST — update settings (partial updates)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const current = await readSettings();

    // Only overwrite secrets if new non-empty values are provided
    const updated: UserSettings = {
      ...current,
      ...(body.awsAccessKeyId && body.awsAccessKeyId !== current.awsAccessKeyId
        ? { awsAccessKeyId: body.awsAccessKeyId }
        : {}),
      ...(body.awsSecretAccessKey && body.awsSecretAccessKey !== '••••••••'
        ? { awsSecretAccessKey: body.awsSecretAccessKey }
        : {}),
      ...(body.openaiApiKey && body.openaiApiKey !== `sk-****${current.openaiApiKey.slice(-4)}`
        ? { openaiApiKey: body.openaiApiKey }
        : {}),
      ...(body.awsDefaultRegion !== undefined ? { awsDefaultRegion: body.awsDefaultRegion } : {}),
      ...(body.defaultEnvironment !== undefined
        ? { defaultEnvironment: body.defaultEnvironment }
        : {}),
      ...(body.theme !== undefined ? { theme: body.theme } : {}),
    };

    await writeSettings(updated);

    return NextResponse.json({
      ...updated,
      awsAccessKeyId: updated.awsAccessKeyId ? `****${updated.awsAccessKeyId.slice(-4)}` : '',
      awsSecretAccessKey: updated.awsSecretAccessKey ? '••••••••' : '',
      openaiApiKey: updated.openaiApiKey ? `sk-****${updated.openaiApiKey.slice(-4)}` : '',
      hasAwsCredentials: !!(updated.awsAccessKeyId && updated.awsSecretAccessKey),
      hasOpenaiKey: !!updated.openaiApiKey,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update settings',
      },
      { status: 500 },
    );
  }
}
