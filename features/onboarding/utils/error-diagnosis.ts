// Utility for diagnosing CDK bootstrap errors and providing setup guidance

export interface ErrorDiagnosis {
  title: string;
  description: string;
  fixSteps: string[];
  docsUrl?: string;
}

export function diagnoseBootstrapError(errorOutput: string): ErrorDiagnosis {
  const lower = errorOutput.toLowerCase();

  if (
    lower.includes("is not authorized") ||
    lower.includes("accessdenied") ||
    lower.includes("access denied")
  ) {
    return {
      title: "Insufficient IAM Permissions",
      description:
        "Your AWS IAM user does not have the required permissions to run CDK bootstrap.",
      fixSteps: [
        "Go to AWS Console → IAM → Users → Select your user",
        "Click 'Add permissions' → 'Attach policies directly'",
        "Search for and attach 'AdministratorAccess' policy",
        "Wait a few minutes for the policy to propagate, then retry",
      ],
      docsUrl:
        "https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage-attach-detach.html",
    };
  }

  if (
    lower.includes("expiredtoken") ||
    lower.includes("token has expired") ||
    lower.includes("security token") ||
    (lower.includes("expired") && lower.includes("token"))
  ) {
    return {
      title: "AWS Session Expired",
      description: "Your AWS credentials or session token has expired.",
      fixSteps: [
        "Run 'aws configure' to update your access keys",
        "If using SSO, run 'aws sso login --profile your-profile'",
        "If using temporary credentials, obtain new ones from your identity provider",
        "Retry the bootstrap after refreshing credentials",
      ],
    };
  }

  if (
    lower.includes("unable to resolve aws account") ||
    lower.includes("need to perform aws") ||
    lower.includes("no credential") ||
    lower.includes("could not load credentials")
  ) {
    return {
      title: "AWS Credentials Not Configured",
      description: "AWS CLI cannot find valid credentials on this machine.",
      fixSteps: [
        "Run 'aws configure' in your terminal",
        "Enter your AWS Access Key ID and Secret Access Key",
        "Set your default region (e.g., us-east-1)",
        "Verify with 'aws sts get-caller-identity'",
      ],
      docsUrl:
        "https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html",
    };
  }

  if (
    lower.includes("region") &&
    (lower.includes("not enabled") || lower.includes("opt-in"))
  ) {
    return {
      title: "Region Not Enabled",
      description:
        "The selected AWS region is not enabled in your account. Some regions require opt-in.",
      fixSteps: [
        "Go to AWS Console → Account Settings → AWS Regions",
        "Find the region you want and click 'Enable'",
        "Wait for the region to be fully enabled (can take a few minutes)",
        "Retry the bootstrap",
      ],
      docsUrl:
        "https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-regions.html",
    };
  }

  if (
    lower.includes("unexpected token") ||
    lower.includes("not a valid statement separator") ||
    lower.includes("parsing")
  ) {
    return {
      title: "Shell Compatibility Error",
      description:
        "The bootstrap command encountered a shell syntax issue. Please update the application.",
      fixSteps: [
        "This is typically caused by a bash/PowerShell incompatibility",
        "Try updating the application to the latest version",
        "As a workaround, manually run in your terminal:",
        "  cd infrastructure/cdk && npx cdk bootstrap aws://ACCOUNT/REGION",
      ],
    };
  }

  if (lower.includes("npm err") || lower.includes("npm error")) {
    return {
      title: "npm Install Failed",
      description:
        "CDK dependencies failed to install. This is usually a network or permission issue.",
      fixSteps: [
        "Check your internet connection",
        "Try running 'npm cache clean --force' then retry",
        "If behind a corporate proxy, configure npm proxy settings",
        "Try running 'cd infrastructure/cdk && npm install' manually",
      ],
    };
  }

  if (
    lower.includes("rollback") ||
    lower.includes("create_failed") ||
    lower.includes("already exists") ||
    lower.includes("can not be updated")
  ) {
    return {
      title: "CloudFormation Stack in Bad State",
      description:
        "The CDKToolkit stack is in a failed state. The system will attempt automatic recovery — deleting the broken stack and re-bootstrapping. If this keeps failing, you can manually delete it.",
      fixSteps: [
        "Click 'Bootstrap' again — the app will auto-detect and repair the broken stack",
        "If auto-repair fails: Go to AWS Console → CloudFormation → select the region",
        "Find 'CDKToolkit' stack → Delete it (use 'Force delete' if normal delete fails)",
        "Wait for deletion to complete, then retry bootstrap here",
      ],
      docsUrl: "https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html",
    };
  }

  if (lower.includes("sso")) {
    return {
      title: "AWS SSO Token Expired",
      description: "Your AWS SSO session has expired.",
      fixSteps: [
        "Run 'aws sso login' to refresh your SSO session",
        "If using a specific profile: 'aws sso login --profile your-profile'",
        "Retry the bootstrap after logging in",
      ],
    };
  }

  return {
    title: "Bootstrap Failed",
    description:
      "CDK bootstrap encountered an error. Review the output below for details.",
    fixSteps: [
      "Review the error output below for specific error messages",
      "Ensure your AWS credentials are valid: run 'aws sts get-caller-identity'",
      "Ensure your IAM user has sufficient permissions (AdministratorAccess recommended)",
      "Try running manually: cd infrastructure/cdk && npx cdk bootstrap aws://ACCOUNT/REGION",
    ],
    docsUrl: "https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html",
  };
}

export const SETUP_RESOURCES = {
  awsCli: {
    label: "Install & Configure AWS CLI",
    docs: "https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html",
    videoSearch:
      "https://www.youtube.com/results?search_query=how+to+install+and+configure+aws+cli+tutorial",
  },
  iamUser: {
    label: "Create an IAM User with Access Keys",
    docs: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html",
    videoSearch:
      "https://www.youtube.com/results?search_query=create+iam+user+aws+access+key+programmatic+access+tutorial",
  },
  awsConfigure: {
    label: "Configure AWS CLI Credentials",
    docs: "https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html",
    videoSearch:
      "https://www.youtube.com/results?search_query=aws+configure+cli+setup+access+key+secret+key+tutorial",
  },
  cdkBootstrap: {
    label: "AWS CDK Bootstrap Guide",
    docs: "https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html",
    videoSearch:
      "https://www.youtube.com/results?search_query=aws+cdk+bootstrap+tutorial+getting+started",
  },
  nodejs: {
    label: "Install Node.js",
    docs: "https://nodejs.org/en/download",
    videoSearch:
      "https://www.youtube.com/results?search_query=install+nodejs+nvm+tutorial",
  },
};

export const IAM_SETUP_STEPS = [
  "Go to the AWS Console → IAM → Users → Create User",
  "Enter a username (e.g., 'storage-control-room')",
  "Select 'Attach policies directly'",
  "Search and attach 'AdministratorAccess' (recommended for development)",
  "Click 'Next' → 'Create User'",
  "Go to the user → 'Security credentials' tab",
  "Click 'Create access key' → Select 'Command Line Interface (CLI)'",
  "Copy the Access Key ID and Secret Access Key",
  "Run 'aws configure' in your terminal and paste your keys when prompted",
];

export const MINIMUM_IAM_PERMISSIONS = [
  "CloudFormation (Full Access) — for stack management",
  "S3 (Full Access) — for CDK staging bucket and your data buckets",
  "IAM (Full Access) — for CDK execution roles",
  "ECR (Full Access) — for CDK Docker asset repository",
  "SSM (Full Access) — for CDK bootstrap version tracking",
  "STS (GetCallerIdentity) — for account verification",
  "CloudFront (Full Access) — for CDN distribution management",
];
