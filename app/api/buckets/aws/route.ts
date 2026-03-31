// API route to list all real S3 buckets from the AWS account, with optional CDN detection
import { NextResponse } from 'next/server';
import { listAllS3Buckets, listCloudFrontDistributions } from '@/lib/aws';

export async function GET() {
  try {
    const [buckets, distributions] = await Promise.allSettled([
      listAllS3Buckets(),
      listCloudFrontDistributions(),
    ]);

    const bucketList = buckets.status === 'fulfilled' ? buckets.value : [];
    const distList = distributions.status === 'fulfilled' ? distributions.value : [];

    // Match each bucket to a CloudFront distribution by checking origins
    const bucketsWithCDN = bucketList.map((bucket) => {
      const match = distList.find((dist) =>
        dist.origins.some((origin) => origin.includes(bucket.name) && origin.includes('s3')),
      );
      return {
        ...bucket,
        cloudFrontDomain: match?.domainName ?? null,
        cloudFrontDistributionId: match?.id ?? null,
      };
    });

    return NextResponse.json(bucketsWithCDN);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to list AWS buckets',
      },
      { status: 500 },
    );
  }
}
