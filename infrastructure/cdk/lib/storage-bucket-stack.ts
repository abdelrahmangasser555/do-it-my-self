// CDK Stack - provisions S3 bucket with CloudFront distribution and IAM policy
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface StorageBucketStackProps extends cdk.StackProps {
  bucketName: string;
}

export class StorageBucketStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StorageBucketStackProps) {
    super(scope, id, props);

    // S3 Bucket with CORS for direct uploads
    const bucket = new s3.Bucket(this, "StorageBucket", {
      bucketName: props.bucketName,
      cors: [
        {
          allowedOrigins: ["*"],
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
          ],
          allowedHeaders: ["*"],
          maxAge: 3600,
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // CloudFront Origin Access Identity
    const oai = new cloudfront.OriginAccessIdentity(this, "OAI", {
      comment: `OAI for ${props.bucketName}`,
    });

    bucket.grantRead(oai);

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(bucket, {
          originAccessIdentity: oai,
        }),
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
    });

    // Minimal IAM policy for presigned URL generation
    const uploadPolicy = new iam.ManagedPolicy(this, "UploadPolicy", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
          resources: [`${bucket.bucketArn}/*`],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:ListBucket"],
          resources: [bucket.bucketArn],
        }),
      ],
    });

    // Outputs
    new cdk.CfnOutput(this, "BucketName", {
      value: bucket.bucketName,
    });

    new cdk.CfnOutput(this, "BucketArn", {
      value: bucket.bucketArn,
    });

    new cdk.CfnOutput(this, "CloudFrontDomain", {
      value: distribution.distributionDomainName,
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });

    new cdk.CfnOutput(this, "UploadPolicyArn", {
      value: uploadPolicy.managedPolicyArn,
    });
  }
}
