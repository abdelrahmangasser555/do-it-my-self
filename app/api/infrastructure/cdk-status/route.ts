// API route to check CDK bootstrap version status for a given environment
import { NextRequest, NextResponse } from 'next/server';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import path from 'path';
import fs from 'fs/promises';

const CDK_DIR = path.join(process.cwd(), 'infrastructure', 'cdk');

/** Get the locally installed CDK version from package.json */
async function getLocalCdkVersion(): Promise<string | null> {
  try {
    const pkgPath = path.join(CDK_DIR, 'package.json');
    const raw = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw);
    return (
      pkg.dependencies?.['aws-cdk-lib']?.replace(/[^0-9.]/g, '') ||
      pkg.devDependencies?.['aws-cdk']?.replace(/[^0-9.]/g, '') ||
      pkg.dependencies?.['aws-cdk']?.replace(/[^0-9.]/g, '') ||
      null
    );
  } catch {
    return null;
  }
}

/** Get the deployed CDK bootstrap version from the CDKToolkit CloudFormation stack */
async function getBootstrapVersion(region: string): Promise<number | null> {
  try {
    const client = new CloudFormationClient({ region });
    const res = await client.send(new DescribeStacksCommand({ StackName: 'CDKToolkit' }));
    const stack = res.Stacks?.[0];
    if (!stack) return null;
    // The bootstrap version is stored as a stack output or parameter
    const bootstrapVersionOutput = stack.Outputs?.find((o) => o.OutputKey === 'BootstrapVersion');
    if (bootstrapVersionOutput?.OutputValue) {
      return parseInt(bootstrapVersionOutput.OutputValue, 10);
    }
    // Fallback: check Parameters
    const bootstrapVersionParam = stack.Parameters?.find(
      (p) => p.ParameterKey === 'TrustedAccounts' || p.ParameterKey === 'BootstrapVersion',
    );
    // If stack exists and no version output, it's a very old version
    return bootstrapVersionParam ? null : 1;
  } catch {
    return null;
  }
}

const MINIMUM_BOOTSTRAP_VERSION = 6;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region');

  if (!region) {
    return NextResponse.json({ error: 'region is required' }, { status: 400 });
  }

  const [localCdkVersion, deployedBootstrapVersion] = await Promise.all([
    getLocalCdkVersion(),
    getBootstrapVersion(region),
  ]);

  const needsUpdate =
    deployedBootstrapVersion !== null && deployedBootstrapVersion < MINIMUM_BOOTSTRAP_VERSION;

  return NextResponse.json({
    localCdkVersion,
    deployedBootstrapVersion,
    minimumRequired: MINIMUM_BOOTSTRAP_VERSION,
    needsUpdate,
    status: deployedBootstrapVersion === null ? 'unknown' : needsUpdate ? 'outdated' : 'up-to-date',
  });
}
