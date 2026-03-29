// API route to check IAM permissions for the current user
import { NextResponse } from "next/server";
import {
  IAMClient,
  ListAttachedUserPoliciesCommand,
  ListUserPoliciesCommand,
  ListGroupsForUserCommand,
  ListAttachedGroupPoliciesCommand,
  SimulatePrincipalPolicyCommand,
} from "@aws-sdk/client-iam";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

const REGION = process.env.AWS_REGION || "us-east-1";

// Actions required for CDK bootstrap and S3/CloudFront management
const REQUIRED_ACTIONS = [
  { action: "sts:GetCallerIdentity", service: "STS" },
  { action: "cloudformation:CreateStack", service: "CloudFormation" },
  { action: "cloudformation:DescribeStacks", service: "CloudFormation" },
  { action: "cloudformation:DeleteStack", service: "CloudFormation" },
  { action: "s3:CreateBucket", service: "S3" },
  { action: "s3:PutObject", service: "S3" },
  { action: "s3:GetObject", service: "S3" },
  { action: "s3:DeleteBucket", service: "S3" },
  { action: "s3:ListBucket", service: "S3" },
  { action: "iam:CreateRole", service: "IAM" },
  { action: "iam:AttachRolePolicy", service: "IAM" },
  { action: "iam:PutRolePolicy", service: "IAM" },
  { action: "ssm:PutParameter", service: "SSM" },
  { action: "ecr:CreateRepository", service: "ECR" },
  { action: "cloudfront:CreateDistribution", service: "CloudFront" },
  { action: "cloudfront:GetDistribution", service: "CloudFront" },
];

export async function GET() {
  try {
    const stsClient = new STSClient({ region: REGION });
    const identity = await stsClient.send(new GetCallerIdentityCommand({}));
    const arn = identity.Arn || "";
    const account = identity.Account || "";

    // Extract username from ARN (arn:aws:iam::123456789012:user/username)
    const arnParts = arn.split("/");
    const username = arnParts.length > 1 ? arnParts[arnParts.length - 1] : "";
    const isRoot = arn.includes(":root");
    const isAssumedRole = arn.includes(":assumed-role/");

    const iamClient = new IAMClient({ region: REGION });

    // Get attached policies
    const policies: Array<{
      name: string;
      arn: string;
      source: string;
    }> = [];

    if (!isRoot && !isAssumedRole && username) {
      try {
        // Direct user policies
        const attachedRes = await iamClient.send(
          new ListAttachedUserPoliciesCommand({ UserName: username }),
        );
        for (const p of attachedRes.AttachedPolicies || []) {
          policies.push({
            name: p.PolicyName || "",
            arn: p.PolicyArn || "",
            source: "user",
          });
        }

        // Inline user policies
        const inlineRes = await iamClient.send(
          new ListUserPoliciesCommand({ UserName: username }),
        );
        for (const name of inlineRes.PolicyNames || []) {
          policies.push({ name, arn: "", source: "user-inline" });
        }

        // Group policies
        try {
          const groupsRes = await iamClient.send(
            new ListGroupsForUserCommand({ UserName: username }),
          );
          for (const group of groupsRes.Groups || []) {
            const groupPolicies = await iamClient.send(
              new ListAttachedGroupPoliciesCommand({
                GroupName: group.GroupName,
              }),
            );
            for (const p of groupPolicies.AttachedPolicies || []) {
              policies.push({
                name: p.PolicyName || "",
                arn: p.PolicyArn || "",
                source: `group:${group.GroupName}`,
              });
            }
          }
        } catch {
          // Group listing may fail if user doesn't have iam:ListGroupsForUser
        }
      } catch {
        // If we can't list policies, we'll still try simulation
      }
    }

    // Check for admin access
    const hasAdminPolicy = policies.some(
      (p) =>
        p.arn === "arn:aws:iam::aws:policy/AdministratorAccess" ||
        p.name === "AdministratorAccess",
    );

    // Simulate permissions
    const permissionResults: Array<{
      action: string;
      service: string;
      allowed: boolean;
    }> = [];

    try {
      const simRes = await iamClient.send(
        new SimulatePrincipalPolicyCommand({
          PolicySourceArn: arn,
          ActionNames: REQUIRED_ACTIONS.map((a) => a.action),
          ResourceArns: ["*"],
        }),
      );

      for (const result of simRes.EvaluationResults || []) {
        const actionInfo = REQUIRED_ACTIONS.find(
          (a) => a.action === result.EvalActionName,
        );
        permissionResults.push({
          action: result.EvalActionName || "",
          service: actionInfo?.service || "",
          allowed: result.EvalDecision === "allowed",
        });
      }
    } catch {
      // SimulatePrincipalPolicy requires iam:SimulatePrincipalPolicy permission
      // If we can't simulate, return what we have from policy listing
    }

    const allPermissionsGranted =
      isRoot ||
      hasAdminPolicy ||
      (permissionResults.length > 0 &&
        permissionResults.every((p) => p.allowed));

    return NextResponse.json({
      identity: {
        account,
        arn,
        userId: identity.UserId || "",
        username,
        isRoot,
        isAssumedRole,
      },
      policies,
      hasAdminPolicy: isRoot || hasAdminPolicy,
      permissionResults,
      allPermissionsGranted,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to check IAM permissions",
      },
      { status: 500 },
    );
  }
}
