// API route to read and update AWS CLI credentials
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function parseIni(content: string): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  let currentSection = '';
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;
    const sectionMatch = trimmed.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      result[currentSection] = {};
      continue;
    }
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0 && currentSection) {
      result[currentSection][trimmed.substring(0, eqIndex).trim()] = trimmed
        .substring(eqIndex + 1)
        .trim();
    }
  }
  return result;
}

async function syncToSettings(patch: {
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
}) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(SETTINGS_FILE, 'utf-8').catch(() => '{}');
    const settings = JSON.parse(raw);
    const updated = {
      ...settings,
      ...(patch.accessKeyId !== undefined ? { awsAccessKeyId: patch.accessKeyId } : {}),
      ...(patch.secretAccessKey !== undefined ? { awsSecretAccessKey: patch.secretAccessKey } : {}),
      ...(patch.region !== undefined ? { awsDefaultRegion: patch.region } : {}),
    };
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(updated, null, 2));
  } catch {
    // Ignore sync errors — settings.json is best-effort
  }
}

// GET — read current AWS CLI default profile credentials
export async function GET() {
  const homeDir = os.homedir();
  const credFile = path.join(homeDir, '.aws', 'credentials');
  const cfgFile = path.join(homeDir, '.aws', 'config');

  let accessKeyId = '';
  let secretAccessKey = '';
  let region = 'us-east-1';

  try {
    const ini = parseIni(await fs.readFile(credFile, 'utf-8'));
    const def = ini['default'] ?? {};
    accessKeyId = def['aws_access_key_id'] ?? '';
    secretAccessKey = def['aws_secret_access_key'] ?? '';
  } catch {
    /* no credentials file */
  }

  try {
    const ini = parseIni(await fs.readFile(cfgFile, 'utf-8'));
    const def = ini['default'] ?? {};
    region = def['region'] ?? 'us-east-1';
  } catch {
    /* no config file */
  }

  // Keep settings.json in sync with the authoritative AWS CLI config
  await syncToSettings({ accessKeyId, secretAccessKey, region });

  return NextResponse.json({
    accessKeyId,
    secretAccessKey,
    region,
    hasCredentials: !!(accessKeyId && secretAccessKey),
  });
}

export async function POST(request: NextRequest) {
  try {
    const { accessKeyId, secretAccessKey, region } = await request.json();

    if (!accessKeyId || !secretAccessKey || !region) {
      return NextResponse.json(
        { error: 'Access Key ID, Secret Access Key, and Region are required' },
        { status: 400 },
      );
    }

    // Validate key format
    if (!/^AK[A-Z0-9]{18,}$/i.test(accessKeyId)) {
      return NextResponse.json(
        { error: "Invalid Access Key ID format. It should start with 'AK'." },
        { status: 400 },
      );
    }

    if (secretAccessKey.length < 30) {
      return NextResponse.json(
        {
          error: 'Invalid Secret Access Key format. It should be at least 30 characters.',
        },
        { status: 400 },
      );
    }

    // Use aws configure set commands to update credentials
    const { spawn } = await import('child_process');
    const isWin = process.platform === 'win32';
    const shell = isWin ? 'powershell.exe' : '/bin/bash';

    const commands = [
      `aws configure set aws_access_key_id ${accessKeyId}`,
      `aws configure set aws_secret_access_key ${secretAccessKey}`,
      `aws configure set region ${region}`,
    ];

    for (const cmd of commands) {
      await new Promise<void>((resolve, reject) => {
        const args = isWin ? ['-NoProfile', '-Command', cmd] : ['-c', cmd];
        const child = spawn(shell, args, {
          timeout: 15000,
          env: { ...process.env },
        });

        let stderr = '';
        child.stderr?.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(stderr || `aws configure exited with code ${code}`));
        });

        child.on('error', reject);
      });
    }

    // Verify the new credentials work
    const verifyResult = await new Promise<{
      success: boolean;
      account?: string;
      arn?: string;
      error?: string;
    }>((resolve) => {
      const args = isWin
        ? ['-NoProfile', '-Command', 'aws sts get-caller-identity']
        : ['-c', 'aws sts get-caller-identity'];
      const child = spawn(shell, args, {
        timeout: 15000,
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const parsed = JSON.parse(stdout);
            resolve({
              success: true,
              account: parsed.Account,
              arn: parsed.Arn,
            });
          } catch {
            resolve({ success: false, error: 'Failed to parse identity' });
          }
        } else {
          resolve({ success: false, error: stderr || 'Verification failed' });
        }
      });

      child.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });

    if (!verifyResult.success) {
      return NextResponse.json(
        {
          error: `Credentials saved but verification failed: ${verifyResult.error}`,
        },
        { status: 400 },
      );
    }

    // Sync the verified credentials to settings.json
    await syncToSettings({ accessKeyId, secretAccessKey, region });

    return NextResponse.json({
      success: true,
      identity: {
        account: verifyResult.account,
        arn: verifyResult.arn,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update credentials',
      },
      { status: 500 },
    );
  }
}
