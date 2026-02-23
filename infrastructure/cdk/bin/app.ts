// CDK app entry point - creates S3 + CloudFront stack
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { StorageBucketStack } from "../lib/storage-bucket-stack";

const app = new cdk.App();

const bucketName = process.env.SCR_BUCKET_NAME || "scr-default-bucket";
const region = process.env.SCR_REGION || "us-east-1";

new StorageBucketStack(app, `SCR-${bucketName}`, {
  env: { region },
  bucketName,
});
