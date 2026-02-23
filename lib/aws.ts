// AWS SDK v3 client configuration, presigned URLs, and resource deletion

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  DeleteBucketCommand,
} from "@aws-sdk/client-s3";
import {
  CloudFrontClient,
  GetDistributionCommand,
  UpdateDistributionCommand,
  DeleteDistributionCommand,
  GetDistributionConfigCommand,
} from "@aws-sdk/client-cloudfront";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "us-east-1";

export function getS3Client(region?: string): S3Client {
  return new S3Client({ region: region || REGION });
}

export function getCloudFrontClient(): CloudFrontClient {
  return new CloudFrontClient({ region: "us-east-1" }); // CloudFront is global, but API is in us-east-1
}

export async function generatePresignedUploadUrl(
  bucketName: string,
  objectKey: string,
  contentType: string,
  region?: string
): Promise<string> {
  const client = getS3Client(region);
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: 3600 });
}

export async function deleteS3Object(
  bucketName: string,
  objectKey: string,
  region?: string
): Promise<void> {
  const client = getS3Client(region);
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
  });
  await client.send(command);
}

/** Empty a bucket by listing and deleting all objects (incl. versions if any). */
export async function emptyBucket(
  bucketName: string,
  region?: string
): Promise<number> {
  const client = getS3Client(region);
  let totalDeleted = 0;
  let continuationToken: string | undefined;

  do {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      })
    );

    const objects = list.Contents;
    if (objects && objects.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: objects.map((o) => ({ Key: o.Key! })),
            Quiet: true,
          },
        })
      );
      totalDeleted += objects.length;
    }

    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);

  return totalDeleted;
}

/** Delete an S3 bucket (must be emptied first). */
export async function deleteS3Bucket(
  bucketName: string,
  region?: string
): Promise<void> {
  const client = getS3Client(region);
  await client.send(new DeleteBucketCommand({ Bucket: bucketName }));
}

/**
 * Disable and delete a CloudFront distribution.
 * CloudFront requires the distribution to be disabled before it can be deleted.
 * We disable it and then poll until it reaches Deployed state, then delete.
 */
export async function deleteCloudFrontDistribution(
  distributionId: string
): Promise<void> {
  const client = getCloudFrontClient();

  // 1. Get current config
  const configRes = await client.send(
    new GetDistributionConfigCommand({ Id: distributionId })
  );
  const config = configRes.DistributionConfig!;
  const etag = configRes.ETag!;

  // 2. If already disabled, skip to delete
  if (config.Enabled) {
    config.Enabled = false;
    await client.send(
      new UpdateDistributionCommand({
        Id: distributionId,
        DistributionConfig: config,
        IfMatch: etag,
      })
    );
  }

  // 3. Poll until the distribution is Deployed (not InProgress)
  let deployed = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const dist = await client.send(
      new GetDistributionCommand({ Id: distributionId })
    );
    if (dist.Distribution?.Status === "Deployed") {
      deployed = true;
      // 4. Delete with latest ETag
      const latestConfig = await client.send(
        new GetDistributionConfigCommand({ Id: distributionId })
      );
      await client.send(
        new DeleteDistributionCommand({
          Id: distributionId,
          IfMatch: latestConfig.ETag!,
        })
      );
      break;
    }
    // Wait 10 seconds between polls
    await new Promise((r) => setTimeout(r, 10000));
  }

  if (!deployed) {
    throw new Error(
      `CloudFront distribution ${distributionId} did not reach Deployed state after 10 minutes`
    );
  }
}

export function buildCloudFrontUrl(
  cloudFrontDomain: string,
  objectKey: string
): string {
  return `https://${cloudFrontDomain}/${objectKey}`;
}

// ── Cost estimation helpers ──────────────────────────────────────────────────
const S3_STORAGE_PER_GB_MONTH = 0.023; // Standard tier
const S3_PUT_PER_1K = 0.005;
const S3_GET_PER_1K = 0.0004;
const CF_PER_GB_TRANSFER = 0.085; // first 10 TB

/**
 * Very rough monthly cost estimate based on storage bytes and request counts.
 */
export function estimateMonthlyCost(
  storageByes: number,
  writeRequests: number,
  readRequests: number
): number {
  const storageGB = storageByes / (1024 ** 3);
  const storage = storageGB * S3_STORAGE_PER_GB_MONTH;
  const puts = (writeRequests / 1000) * S3_PUT_PER_1K;
  const gets = (readRequests / 1000) * S3_GET_PER_1K;
  const cfTransfer = storageGB * 0.1 * CF_PER_GB_TRANSFER; // assume 10% egress
  return Math.round((storage + puts + gets + cfTransfer) * 100) / 100;
}
