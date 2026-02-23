// AWS SDK v3 client configuration and presigned URL generation

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "us-east-1";

export function getS3Client(region?: string): S3Client {
  return new S3Client({ region: region || REGION });
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

export function buildCloudFrontUrl(
  cloudFrontDomain: string,
  objectKey: string
): string {
  return `https://${cloudFrontDomain}/${objectKey}`;
}
