// API route to generate presigned download URLs for private S3 files
import { NextRequest, NextResponse } from 'next/server';
import { generatePresignedDownloadUrl } from '@/lib/aws';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bucketName = searchParams.get('bucketName');
  const objectKey = searchParams.get('objectKey');
  const region = searchParams.get('region');

  if (!bucketName || !objectKey) {
    return NextResponse.json({ error: 'bucketName and objectKey are required' }, { status: 400 });
  }

  try {
    const url = await generatePresignedDownloadUrl(bucketName, objectKey, region || undefined);
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate download URL' },
      { status: 500 },
    );
  }
}
