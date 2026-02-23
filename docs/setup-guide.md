# Setup Guide

Everything you need to go from zero to a running Storage Control Room — on Windows, macOS, or Linux.

---

## System Requirements

| Requirement | Minimum version |
|---|---|
| Node.js | 20.x or newer |
| npm | 10.x (ships with Node 20) |
| Git | 2.x |
| AWS CLI | 2.x |
| AWS CDK | 2.x |

---

## Step 1 — Install Node.js

### Windows

Download the LTS installer from [nodejs.org](https://nodejs.org) and run it.  
After installation, open a new **PowerShell** or **Command Prompt** window and verify:

```powershell
node -v   # v20.x.x
npm -v    # 10.x.x
```

### macOS

Install via [Homebrew](https://brew.sh):

```bash
brew install node@20
```

Or download the `.pkg` installer from [nodejs.org](https://nodejs.org).

### Linux (Debian / Ubuntu)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Linux (Fedora / RHEL / CentOS)

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
```

---

## Step 2 — Install AWS CLI

The AWS CLI lets you authenticate with your AWS account from the terminal.

### Windows

Download and run the MSI installer:

```
https://awscli.amazonaws.com/AWSCLIV2.msi
```

Or use **winget**:

```powershell
winget install --id Amazon.AWSCLI
```

### macOS

```bash
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

Or via Homebrew:

```bash
brew install awscli
```

### Linux

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

Verify on all platforms:

```bash
aws --version   # aws-cli/2.x.x
```

---

## Step 3 — Configure AWS Credentials

You need an IAM user or role with permissions for **S3**, **CloudFront**, and **IAM** (CDK creates and manages these resources).

### Create an IAM user

1. Sign in to the [AWS Console](https://console.aws.amazon.com/iam)
2. Go to **IAM → Users → Create user**
3. Give the user a name (e.g. `storage-control-room-dev`)
4. Attach the **AdministratorAccess** policy (or a scoped policy — see note below)
5. Go to **Security credentials → Create access key → Command Line Interface (CLI)**
6. Download the CSV — you will need **Access Key ID** and **Secret Access Key**

> **Note:** For a scoped policy instead of AdminAccess, attach: `AmazonS3FullAccess`, `CloudFrontFullAccess`, `IAMFullAccess`, `AWSCloudFormationFullAccess`.

### Run aws configure

```bash
aws configure
```

You will be prompted for:

```
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: us-east-1
Default output format [None]: json
```

Replace the values with your own. The region must match the region you want to deploy buckets to.

Verify the credentials work:

```bash
aws sts get-caller-identity
```

Expected output:

```json
{
  "UserId": "AIDIOSFODNN7EXAMPLE",
  "Account": "123456789012",
  "Arn": "arn:aws:iam::123456789012:user/storage-control-room-dev"
}
```

---

## Step 4 — Install AWS CDK

CDK is used by this project to deploy S3 buckets and CloudFront distributions per project.

```bash
npm install -g aws-cdk
```

Verify:

```bash
cdk --version   # 2.x.x
```

### Windows note

If you get a script execution policy error on Windows PowerShell:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Then re-run the npm install command.

---

## Step 5 — Bootstrap CDK in your AWS account

CDK bootstrap creates the S3 bucket and IAM roles CDK needs to deploy.  
This is a **one-time** step per AWS account + region combination.

```bash
cdk bootstrap aws://ACCOUNT_ID/REGION
```

Replace `ACCOUNT_ID` and `REGION` with your values, for example:

```bash
cdk bootstrap aws://123456789012/us-east-1
```

> **Tip:** To get your account ID without checking the console: `aws sts get-caller-identity --query Account --output text`

Expected output ends with:

```
✅  Environment aws://123456789012/us-east-1 bootstrapped.
```

---

## Step 6 — Clone and Install the Project

```bash
git clone https://github.com/your-org/storage-control-room.git
cd storage-control-room
npm install
```

### Install CDK infrastructure dependencies

```bash
cd infrastructure/cdk
npm install
cd ../..
```

---

## Step 7 — Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You should see the **Storage Control Room** dashboard with the sidebar on the left.

---

## Step 8 — Verify Everything is Working

Run through this quick checklist:

```
✅ Dashboard loads at localhost:3000
✅ "aws sts get-caller-identity" returns your account info
✅ "cdk --version" prints a 2.x version
✅ "node -v" prints v20 or higher
```

To confirm CDK is connected to your account, run from the project root:

```bash
cd infrastructure/cdk && cdk list
```

This should print the CDK stack name (`StorageBucketStack`) without errors. If it does, you are ready to deploy buckets from the Infrastructure page in the dashboard.

---

## Debugging Common Issues

### `aws configure` — "command not found" / "not recognized"

The AWS CLI binary is not on your PATH.

- **Windows:** Re-run the MSI installer and restart your terminal. Or add `C:\Program Files\Amazon\AWSCLIV2` manually to your system PATH.
- **macOS / Linux:** Run `which aws`. If nothing is returned, the install did not complete. Re-run the installer steps in Step 2.

---

### `aws sts get-caller-identity` — "InvalidClientTokenId" or "AuthFailure"

Your credentials are wrong or expired.

1. Re-check the Access Key ID and Secret in the IAM console.
2. Run `aws configure` again and re-enter the values carefully — no leading/trailing spaces.
3. If using an IAM role instead of a user, make sure you have the correct `~/.aws/credentials` profile active.

---

### `cdk bootstrap` — "ExpiredTokenException"

Your AWS session token has expired (common with SSO or temporary credentials).

```bash
aws sso login --profile YOUR_PROFILE
```

Or re-run `aws configure` with fresh long-term credentials.

---

### `cdk bootstrap` — "This stack uses assets, so the toolkit stack must be deployed to the environment"

Run the full bootstrap command with your account ID:

```bash
cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text)/$(aws configure get region)
```

This auto-fills both values from current CLI config.

---

### `npm install` — EACCES permission errors (macOS / Linux)

Do **not** use `sudo npm install -g`. Instead, fix npm's global prefix:

```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install -g aws-cdk
```

---

### `npm run dev` — port 3000 already in use

```bash
# macOS / Linux — find and kill the process on port 3000:
lsof -ti:3000 | xargs kill -9

# Windows PowerShell:
netstat -ano | findstr :3000
# Look for the PID in the last column, then:
taskkill /PID <PID> /F
```

Or run on a different port:

```bash
npm run dev -- -p 3001
```

---

### `cdk list` — "Cannot find module" or TypeScript errors

CDK dependencies in the infrastructure folder may not be installed:

```bash
cd infrastructure/cdk
npm install
npx tsc --noEmit
cd ../..
```

---

### Dashboard shows blank page / 404 on all routes

Make sure you are running `npm run dev` (not `npm start` — that requires a production build).  
Also confirm there is no `app/page.tsx` file — it conflicts with the `app/(dashboard)/page.tsx` route.

```bash
# Check:
ls app/page.tsx    # Should not exist
```

---

### AWS region mismatch — buckets deploy to wrong region

Every resource (bucket, CloudFront, IAM) is deployed to the region you set in `aws configure`. To check:

```bash
aws configure get region
```

To change it, either re-run `aws configure` or set the env variable:

```bash
export AWS_DEFAULT_REGION=eu-west-1   # macOS / Linux
$env:AWS_DEFAULT_REGION="eu-west-1"   # Windows PowerShell
```

---

## Environment Reference

The project reads these environment variables at runtime. You can create a `.env.local` file in the project root to override them:

```bash
# .env.local (optional overrides)
AWS_REGION=us-east-1
DATA_DIR=./data
```

All AWS credentials come from the standard AWS credential chain (CLI config, env vars, IAM role) — no AWS keys are stored in `.env.local`.

---

## Next Steps

Once the setup is complete, open the [User Guide](/docs/user-guide) to learn how to create your first project and deploy a bucket.
