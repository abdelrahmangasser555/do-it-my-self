// API route: check and fix bucket upload compatibility (CORS + IAM)
import { NextRequest, NextResponse } from 'next/server';
import { checkBucketCors, putCompatibleCors, testUploadPermission } from '@/lib/aws';

export interface CompatibilityResult {
  compatible: boolean;
  issues: string[];
  corsOk: boolean;
  iamOk: boolean;
}

/** GET /api/buckets/compatibility?bucketName=…&region=… — check if uploads will work */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const bucketName = searchParams.get('bucketName');
  const region = searchParams.get('region') ?? undefined;

  if (!bucketName) {
    return NextResponse.json({ error: 'bucketName is required' }, { status: 400 });
  }

  try {
    const [corsResult, iamError] = await Promise.all([
      checkBucketCors(bucketName, region),
      testUploadPermission(bucketName, region),
    ]);

    const issues: string[] = [...corsResult.issues];
    if (iamError) issues.push(iamError);

    const iamOk = !iamError;
    const corsOk = corsResult.allowsPut && corsResult.allowsGet;
    const compatible = corsOk && iamOk;

    return NextResponse.json({ compatible, issues, corsOk, iamOk } satisfies CompatibilityResult);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    // If we can't even connect: surface the real error
    return NextResponse.json(
      {
        compatible: false,
        corsOk: false,
        iamOk: false,
        issues: [`Failed to connect to bucket: ${msg}`],
      } satisfies CompatibilityResult,
      { status: 200 }, // still 200 so callers can read the issues
    );
  }
}

/**
 * POST /api/buckets/compatibility — apply a compatible CORS policy to the bucket.
 * Body: { bucketName: string; region?: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { bucketName, region } = await request.json();
    if (!bucketName) {
      return NextResponse.json({ error: 'bucketName is required' }, { status: 400 });
    }
    await putCompatibleCors(bucketName, region);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
