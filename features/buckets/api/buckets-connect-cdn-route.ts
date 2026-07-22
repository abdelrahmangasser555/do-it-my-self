// API route to connect an existing bucket to a new CloudFront distribution
import { NextRequest, NextResponse } from 'next/server';
import {
  CloudFrontClient,
  CreateDistributionCommand,
  type Origins,
  type DefaultCacheBehavior,
} from '@aws-sdk/client-cloudfront';
import { updateInJsonFile, findInJsonFile } from '@/lib/filesystem';
import type { Bucket } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { bucketId } = await request.json();

    if (!bucketId) {
      return NextResponse.json({ error: 'bucketId is required' }, { status: 400 });
    }

    const bucket = await findInJsonFile<Bucket>('buckets.json', bucketId);
    if (!bucket) {
      return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });
    }

    if (bucket.cloudFrontDistributionId) {
      return NextResponse.json(
        { error: 'Bucket already has a CloudFront distribution' },
        { status: 409 },
      );
    }

    if (!bucket.s3BucketName) {
      return NextResponse.json({ error: 'Bucket has no S3 bucket name' }, { status: 400 });
    }

    // The S3 bucket domain for CloudFront (regional endpoint)
    const s3Region = bucket.region || 'us-east-1';
    const s3DomainName = `${bucket.s3BucketName}.s3.${s3Region}.amazonaws.com`;

    const client = new CloudFrontClient({ region: 'us-east-1' });

    const origins: Origins = {
      Quantity: 1,
      Items: [
        {
          Id: `S3-${bucket.s3BucketName}`,
          DomainName: s3DomainName,
          S3OriginConfig: {
            OriginAccessIdentity: '',
          },
        },
      ],
    };

    const defaultBehavior: DefaultCacheBehavior = {
      TargetOriginId: `S3-${bucket.s3BucketName}`,
      ViewerProtocolPolicy: 'redirect-to-https',
      AllowedMethods: {
        Quantity: 2,
        Items: ['GET', 'HEAD'],
        CachedMethods: {
          Quantity: 2,
          Items: ['GET', 'HEAD'],
        },
      },
      CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6', // AWS Managed CachingOptimized
      Compress: true,
    };

    const callerRef = `scr-connect-${bucket.s3BucketName}-${Date.now()}`;

    const result = await client.send(
      new CreateDistributionCommand({
        DistributionConfig: {
          CallerReference: callerRef,
          Comment: `CDN for ${bucket.name} (connected via DropOut)`,
          Enabled: true,
          Origins: origins,
          DefaultCacheBehavior: defaultBehavior,
          PriceClass: 'PriceClass_All',
        },
      }),
    );

    const dist = result.Distribution;
    if (!dist) {
      throw new Error('CloudFront distribution creation returned no result');
    }

    // Update bucket metadata
    const updated = await updateInJsonFile<Bucket>('buckets.json', bucketId, {
      cloudFrontDomain: dist.DomainName ?? '',
      cloudFrontDistributionId: dist.Id ?? '',
      updatedAt: new Date().toISOString(),
    } as Partial<Bucket>);

    return NextResponse.json({
      success: true,
      distributionId: dist.Id,
      domainName: dist.DomainName,
      bucket: updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create CloudFront distribution',
      },
      { status: 500 },
    );
  }
}
