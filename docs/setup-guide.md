# Setup Guide

Everything you need to go from zero to a running DropOut dashboard — on Windows, macOS, or Linux.

---

## System Requirements

| Requirement | Minimum version               |
| ----------- | ----------------------------- |
| Node.js     | 20.x or newer                 |
| pnpm        | 8.x (recommended) or npm 10.x |
| Git         | 2.x                           |
| AWS CLI     | 2.x                           |
| AWS CDK     | 2.x                           |

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

## Step 2 — Install pnpm

DropOut uses **pnpm** as its package manager (faster installs, strict dependency isolation).

```bash
npm install -g pnpm
```

Verify:

```bash
pnpm -v   # 8.x.x or newer
```

> You can still use `npm` if you prefer — all pnpm commands have npm equivalents (`pnpm dev` = `npm run dev`).

---

## Step 3 — Install AWS CLI

### Windows

Use **winget**:

```powershell
winget install --id Amazon.AWSCLI
```

Or download the MSI from:

```
https://awscli.amazonaws.com/AWSCLIV2.msi
```

### macOS

```bash
brew install awscli
```

Or using the package:

```bash
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
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

## Step 4 — Configure AWS Credentials

You need an IAM user (or role) with permissions for S3, CloudFront, IAM, and CloudFormation (CDK creates and manages these).

### Create an IAM user

1. Sign in to the [AWS Console](https://console.aws.amazon.com/iam)
2. Go to **IAM → Users → Create user**
3. Name it (e.g. `dropout-dev`)
4. Attach **AdministratorAccess** (or a scoped policy — see below)
5. Go to **Security credentials → Create access key → Command Line Interface (CLI)**
6. Download the CSV — you need the **Access Key ID** and **Secret Access Key**

> **Scoped policy alternative:** Attach `AmazonS3FullAccess`, `CloudFrontFullAccess`, `IAMFullAccess`, `AWSCloudFormationFullAccess`.

### Run aws configure

```bash
aws configure
```

Enter your values:

```
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: us-east-1
Default output format [None]: json
```

Verify:

```bash
aws sts get-caller-identity
```

Expected output:

```json
{
  "UserId": "AIDIOSFODNN7EXAMPLE",
  "Account": "123456789012",
  "Arn": "arn:aws:iam::123456789012:user/dropout-dev"
}
```

---

## Step 5 — Install AWS CDK

```bash
npm install -g aws-cdk
cdk --version   # 2.x.x
```

### Windows execution policy note

If PowerShell blocks the `cdk` command:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

---

## Step 6 — CDK Bootstrap (one-time per region)

CDK requires a bootstrap stack to be deployed once per AWS account + region combination.

```bash
cdk bootstrap aws://ACCOUNT_ID/REGION

# Auto-fill values from current CLI config:
cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text)/$(aws configure get region)
```

Expected output ending with:

```
✅  Environment aws://123456789012/us-east-1 bootstrapped.
```

> You do **not** need to run this manually — the DropOut onboarding wizard handles it. This command is shown here for reference or automated CI pipelines.

---

## Step 7 — Clone and Install

```bash
git clone https://github.com/abdelrahmangasser555/do-it-my-self.git dropout
cd dropout
pnpm install
```

`npm install` works too. Both package managers install the app and `infrastructure/cdk` together.

---

## Step 8 — Run the Dashboard

```bash
pnpm dev
```

Every time you run this, DropOut automatically:

1. Pulls the latest code from `origin/master` via `scripts/pull-latest.js`
2. Refreshes dependencies only if `package.json`, `pnpm-lock.yaml`, or the CDK workspace manifest changed
3. Starts the Next.js server at [http://localhost:3000](http://localhost:3000)

The **auto-update** feature means you never have to manually pull updates. If the pull fails (offline, non-fast-forward), a warning is printed and the dev server still starts normally.

If you skip the install step on a fresh clone, `pnpm dev` or `npm run dev` will perform the initial workspace install once before starting Next.js.

---

## Step 9 — Complete the Onboarding Wizard

On first launch you will see the **Onboarding Wizard**. Walk through all 6 steps:

1. **Environment Check** — validates Node.js, AWS CLI, CDK, Git
2. **AWS Validation** — confirms credentials are active
3. **Bootstrap Environments** — select regions to CDK-bootstrap (the wizard runs `cdk bootstrap` for you)
4. **AI Configuration** — optional OpenAI API key
5. **Bucket Sync** — re-imports existing CDK stacks
6. **Star the Repo** — click "Go to Dashboard" to finish

---

## Step 10 — Verify Everything is Working

```
✅ Dashboard loads at localhost:3000
✅ aws sts get-caller-identity returns your account info
✅ cdk --version prints 2.x.x
✅ node -v prints v20.x.x
✅ Onboarding wizard completes all green checks
```

---

## Optional — Enable AI Features

The **Commands** page includes an AI command generator and error debugger powered by GPT-4o-mini.

1. Get a key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Open DropOut → **Settings** and paste the key into **OpenAI API Key**
   — OR —
   Add it to `.env.local`:

```bash
# .env.local
OPENAI_API_KEY=sk-proj-your-key-here
```

3. Restart the dev server

> AI features are optional. The dashboard works fully without them.

---

## Environment Variables Reference

Create a `.env.local` file in the project root to override defaults:

```bash
# .env.local (optional)

# Override the AWS region for API calls
AWS_REGION=us-east-1

# Override the data directory path
DATA_DIR=./data

# Enable AI features (command generator + error debugger)
OPENAI_API_KEY=sk-proj-your-key-here
```

All AWS credentials come from the standard AWS credential chain — never hardcode them in `.env.local`.

---

## Keeping DropOut Up To Date

DropOut keeps itself updated automatically every time you run `pnpm dev`. If you want to manually trigger an update without starting the dev server:

```bash
pnpm update
# equivalent to: node scripts/pull-latest.js
```

To check if your local code is on the latest commit:

```bash
git log --oneline -5
git fetch origin master && git log HEAD..origin/master --oneline
```

---

## Debugging Common Issues

### `pnpm install` fails — "ERR_PNPM_OUTDATED_LOCKFILE"

```bash
pnpm install --frozen-lockfile=false
```

Or delete the lockfile and reinstall:

```bash
Remove-Item pnpm-lock.yaml   # Windows PowerShell
pnpm install
```

### `npm run dev` appears stuck during install

Older versions of the repo recursively called `pnpm install` from `postinstall`, which caused install output to repeat forever. The current setup avoids that recursion.

If you still suspect an interrupted install, run one of these from the repo root:

```bash
npm run setup
# or
pnpm install
```

---

### `aws configure` — "command not found" / "not recognized"

- **Windows:** Re-run the MSI installer and restart the terminal. Or add `C:\Program Files\Amazon\AWSCLIV2` to your system PATH.
- **macOS/Linux:** Run `which aws`. If nothing is returned, re-run the installer steps.

---

### `aws sts get-caller-identity` — "InvalidClientTokenId" or "AuthFailure"

1. Re-check the credentials in the IAM console
2. Run `aws configure` again (no leading/trailing spaces)
3. If using SSO: `aws sso login --profile YOUR_PROFILE`

---

### `cdk bootstrap` — "ExpiredTokenException"

Your session token expired:

```bash
aws sso login --profile YOUR_PROFILE
# or re-run: aws configure
```

---

### CDK synth/deploy fails with "EPERM" on Windows

Stale `synth.lock` files in `cdk.out/` cause this. The infrastructure API route cleans these automatically, but if running CDK manually:

```powershell
Remove-Item infrastructure\cdk\cdk.out\synth.lock* -ErrorAction SilentlyContinue
cd infrastructure\cdk
npx cdk deploy --require-approval never
```

---

### `npm run dev` — port 3000 already in use

```bash
# macOS / Linux
lsof -ti:3000 | xargs kill -9

# Windows PowerShell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Or use a different port:

```bash
pnpm dev -- -p 3001
```

---

### Auto-update shows "Already up to date" but changes are missing

Your local branch may point to a different commit than you expect:

```bash
git log --oneline -5
git diff HEAD origin/master --stat
```

If you are on a different branch than `master`:

```bash
git checkout master
git pull origin master
```

---

### CDK dependencies not found

```bash
cd infrastructure/cdk
npm install
npx tsc --noEmit
cd ../..
```

---

### Dashboard shows blank page / 404

Make sure you are running `pnpm dev`, not `pnpm start` (which requires a production build). Also confirm there is no `app/page.tsx` file — it conflicts with `app/(dashboard)/page.tsx`.

```bash
# Windows PowerShell
Test-Path app\page.tsx   # Should return False
```

---

### AWS region mismatch

```bash
aws configure get region

# Override for the current session:
# macOS / Linux
export AWS_DEFAULT_REGION=eu-west-1

# Windows PowerShell
$env:AWS_DEFAULT_REGION = "eu-west-1"
```

---

## Next Steps

Once setup is complete, open the [User Guide](user-guide.md) to create your first project and deploy a bucket.
