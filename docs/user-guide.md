# User Guide

> **Always up to date** — every time you run `pnpm dev`, DropOut automatically pulls the latest changes from `origin/master`. No manual updating needed.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Onboarding Wizard](#onboarding-wizard)
3. [Dashboard Overview](#dashboard-overview)
4. [Projects](#projects)
5. [Environments](#environments)
6. [Buckets](#buckets)
7. [Deploying Infrastructure (CDK)](#deploying-infrastructure-cdk)
8. [File Explorer](#file-explorer)
9. [Bucket Detail Page](#bucket-detail-page)
10. [Distributions](#distributions)
11. [Code Snippets](#code-snippets)
12. [Commands & AI Tools](#commands--ai-tools)
13. [Settings](#settings)
14. [Pre-signed Upload Integration](#pre-signed-upload-integration)
15. [Common Questions](#common-questions)

---

## Getting Started

### Prerequisites

| Requirement | Version       |
| ----------- | ------------- |
| Node.js     | 20.x or newer |
| pnpm        | 8.x or newer  |
| AWS CLI     | 2.x           |
| AWS CDK     | 2.x           |

Install globally:

```bash
npm install -g pnpm aws-cdk
```

Configure AWS credentials:

```bash
aws configure
# Enter your Access Key ID, Secret Access Key, and default region
```

Verify everything:

```bash
aws sts get-caller-identity   # confirms credentials work
cdk --version                 # should print 2.x.x
node -v                       # should print v20.x.x
```

### Installation

```bash
git clone https://github.com/abdelrahmangasser555/do-it-my-self.git dropout
cd dropout
pnpm install
```

### Starting the Dashboard

```bash
pnpm dev
```

When you run this command, DropOut automatically:

1. Pulls the latest code from `origin/master`
2. Notifies you if `package.json` changed so you can reinstall
3. Starts the Next.js development server

Open [http://localhost:3000](http://localhost:3000) in your browser.

> The dashboard is **local-only**. Nothing is published to the internet.

<!-- SCREENSHOT: Landing page at localhost:3000 before onboarding -->

> 📸 _Screenshot placeholder: The DropOut landing page_

---

## Onboarding Wizard

The first time you open DropOut, you are guided through a **6-step wizard** that verifies your environment is ready.

<!-- SCREENSHOT: Onboarding wizard — Step 1 Environment Check -->

> 📸 _Screenshot placeholder: Onboarding wizard — environment validation step_

### Step 1 — Environment Check

DropOut validates that all required tools are installed and reachable:

- Node.js 20+
- AWS CLI 2.x
- AWS CDK 2.x
- Git

Each check shows a green ✓ or a red ✗ with a hint for fixing it.

### Step 2 — AWS Validation

Runs `aws sts get-caller-identity` to confirm your credentials are active. Displays your AWS account ID, ARN, and username.

<!-- SCREENSHOT: Onboarding — AWS validation step showing account info -->

> 📸 _Screenshot placeholder: AWS credential validation_

### Step 3 — Bootstrap Environments

CDK requires a one-time bootstrap per AWS account + region. This step lets you select one or more AWS regions to bootstrap. You can add more regions later from the **Environments** page.

<!-- SCREENSHOT: Onboarding — Bootstrap step with region selector and terminal output -->

> 📸 _Screenshot placeholder: CDK bootstrap step_

### Step 4 — AI Configuration (Optional)

Optionally enter your `OPENAI_API_KEY` to enable:

- AI command generation
- AI error diagnosis

You can skip this step and add the key later in **Settings**.

### Step 5 — Bucket Sync

If you already have CDK stacks deployed from a previous DropOut session, this step scans your AWS account and syncs any missing bucket records back into the local JSON files.

### Step 6 — Star the Repo

The final step invites you to star the GitHub repository. Click **Go to Dashboard** to complete onboarding.

> Once onboarding is complete, the wizard never shows again unless you reset `data/system.json`.

---

## Dashboard Overview

The main dashboard (`/`) provides a **global view of all your resources**.

<!-- SCREENSHOT: Main dashboard showing analytics cards, storage chart, cost chart -->

> 📸 _Screenshot placeholder: Main dashboard overview_

### Summary Cards

The top row shows:

- **Total Projects** — number of projects created
- **Total Buckets** — total S3 buckets across all projects
- **Total Files** — locally-tracked file records
- **Total Storage** — sum of all file sizes across all buckets
- **Estimated Monthly Cost** — calculated from S3 and CloudFront pricing

### Charts

| Chart                  | Description                                                         |
| ---------------------- | ------------------------------------------------------------------- |
| Storage Bar Chart      | Storage usage per bucket                                            |
| Storage Pie Chart      | Percentage breakdown by bucket                                      |
| Cost Bar Chart         | Estimated cost per bucket                                           |
| Requests Bar Chart     | Read/write request counts                                           |
| Per-Project Cost Table | Cost breakdown by project                                           |
| Cost by Service        | Split between S3 storage, S3 requests, S3 data transfer, CloudFront |

### Export

Click the **Download** button in the header to export the analytics data as:

- **CSV** — spreadsheet-friendly format
- **JSON** — machine-readable format

---

## Projects

Projects are the **top-level containers**. Each project maps to one of your apps or services.

<!-- SCREENSHOT: Projects page with project cards -->

> 📸 _Screenshot placeholder: Projects list page_

### Create a Project

1. Go to **Projects** in the sidebar
2. Click **New Project**
3. Fill in:
   - **Name** — e.g. `my-saas-app` or `client-portal`
   - **Environment** — `dev` (staging/testing) or `prod` (live)
   - **Max File Size (MB)** — uploads above this limit are rejected at pre-sign time
   - **Allowed MIME Types** — toggle which file types are permitted
4. Click **Create**

<!-- SCREENSHOT: Create project dialog -->

> 📸 _Screenshot placeholder: Create project dialog_

### Project Cards

Each project card displays:

- Project name and environment badge
- Number of buckets and total files
- AWS regions in use (country flags)
- Storage bar showing total usage
- File type distribution rod
- Quick **Add Bucket** button

### Delete a Project

A project **cannot** be deleted while it has buckets. Delete all its buckets first, then use the ⋮ menu on the card.

---

## Environments

The **Environments** page (`/environments`) manages which AWS regions have been CDK-bootstrapped and are available for bucket deployments.

<!-- SCREENSHOT: Environments page with region cards and world map -->

> 📸 _Screenshot placeholder: Environments page showing active regions on a world map_

### Bootstrap a New Region

1. Click **Add Environment**
2. Select an AWS region from the dropdown (grouped by geography)
3. Optionally set an alias (e.g. `EU Production`)
4. Click **Bootstrap** — a terminal panel streams the CDK bootstrap output in real time

### Environment States

| Status          | Meaning                                |
| --------------- | -------------------------------------- |
| `bootstrapping` | CDK bootstrap is currently running     |
| `active`        | Ready for bucket deployments           |
| `failed`        | Bootstrap failed — hover for the error |

### Remove an Environment

Click the trash icon on an environment card. This only removes the local record — CDK bootstrap assets remain in AWS.

---

## Buckets

A **Bucket** maps to one AWS S3 bucket + CloudFront distribution.

<!-- SCREENSHOT: Buckets list page with cards showing status badges -->

> 📸 _Screenshot placeholder: Buckets list page_

### Create a Bucket

1. Go to **Buckets** in the sidebar
2. Click **New Bucket**
3. Fill in:
   - **Project** — which project this bucket belongs to
   - **Bucket Name** — a short slug, e.g. `user-avatars`. Lowercase + hyphens only.
   - **AWS Region** — must be a bootstrapped environment

#### Basic Settings

| Setting                  | Description                                       |
| ------------------------ | ------------------------------------------------- |
| Access                   | `private` (OAI-protected, default) or `public`    |
| Max File Size (MB)       | Upload limit enforced at pre-sign time            |
| Allowed File Types       | `images`, `videos`, `documents`, or `any`         |
| Auto Delete              | Enable lifecycle expiry on objects                |
| Auto Delete After (days) | Objects older than this are automatically removed |

#### Advanced — Security

| Setting                   | Description                                        |
| ------------------------- | -------------------------------------------------- |
| Signed URL Expiration (s) | Pre-signed URL lifetime (default: 3600)            |
| CORS Origins              | Allowed origins for browser uploads (default: `*`) |
| CORS Methods              | Allowed HTTP methods                               |

#### Advanced — Storage

| Setting                     | Description                           |
| --------------------------- | ------------------------------------- |
| Versioning                  | Enable S3 object versioning           |
| Lifecycle Transition (days) | Days before moving to Glacier         |
| Delete Incomplete Uploads   | Clean up incomplete multipart uploads |

#### Advanced — Encryption

| Setting         | Description                               |
| --------------- | ----------------------------------------- |
| Encryption Type | `S3` (SSE-S3), `KMS` (SSE-KMS), or `none` |
| KMS Key ID      | Custom KMS key ARN (KMS type only)        |

4. Click **Create Bucket**

> Status shows **pending**. AWS resources are not created yet — see [Deploying Infrastructure](#deploying-infrastructure-cdk).

### Bucket Status Lifecycle

```
pending → deploying → active
                   ↘ failed
active → deleting  → (removed)
```

---

## Deploying Infrastructure (CDK)

This step provisions the actual AWS resources for a `pending` bucket.

<!-- SCREENSHOT: Infrastructure page with pending buckets and deploy button -->

> 📸 _Screenshot placeholder: Infrastructure page with CDK deploy panel_

### Deploy from the Buckets page

1. Find a `pending` bucket
2. Click the **⋮** menu → **Deploy with CDK**
3. The terminal panel opens and streams CDK output in real time
4. When done, the status changes to **active** and the CloudFront domain appears

<!-- SCREENSHOT: Terminal panel streaming CDK deploy output -->

> 📸 _Screenshot placeholder: CDK deploy streaming terminal output_

### What gets created in AWS

```
S3 Bucket            → scr-<bucket-name>-<timestamp>
CloudFront CDN       → https://abc123.cloudfront.net
OAI                  → Grants CloudFront read access to S3
IAM Managed Policy   → SCR-<stack-name>-UploadPolicy
```

### Delete a Bucket + its AWS Resources

1. Open the bucket's **⋮** menu → **Delete**
2. A step-by-step deletion dialog shows progress:
   - Empty the S3 bucket (deletes all objects)
   - Delete the CloudFront distribution
   - Destroy the CloudFormation stack
   - Remove the local record

> **Deletion is permanent.** Files in S3 cannot be recovered.

### Manual CDK commands (advanced)

```bash
cd infrastructure/cdk
npm install

# Preview the CloudFormation template
npx cdk synth

# Deploy manually
SCR_BUCKET_NAME=scr-my-bucket-1234 SCR_REGION=us-east-1 npx cdk deploy --require-approval never
```

---

## File Explorer

The **Files** page (`/files`) is a **Windows Explorer-style file browser** for all your S3 buckets.

<!-- SCREENSHOT: File explorer showing grid view with icons and breadcrumb -->

> 📸 _Screenshot placeholder: File Explorer grid view_

### Selecting a Bucket

Use the bucket dropdown at the top. The breadcrumb below shows the current folder path.

### Navigation

- Click a folder to enter it
- Click **↑** or any breadcrumb segment to navigate back up
- Click the **Home** icon to return to the bucket root

### Views

| Toggle         | Description                               |
| -------------- | ----------------------------------------- |
| Grid (default) | File/folder icons in a responsive grid    |
| List           | Compact table with name, size, type, date |

### File Actions (right-click context menu)

| Action             | Description                   |
| ------------------ | ----------------------------- |
| Open in CloudFront | Open the CDN URL in a new tab |
| Copy URL           | Copy the CloudFront URL       |
| Move               | Move to a different folder    |
| Delete             | Delete from S3 (permanent)    |

### Upload Files

Click **Upload** in the toolbar or **drag-and-drop** files onto the grid. Files are written directly to S3 via pre-signed PUT URLs.

<!-- SCREENSHOT: Upload dialog or drag-drop highlight -->

> 📸 _Screenshot placeholder: File upload flow_

### Create a Folder

Click **New Folder**. A zero-byte placeholder object is created to represent the folder path (S3 has no real folders).

### Search

Type in the **Search** box to filter the current view by name.

---

## Bucket Detail Page

Click any bucket name to open its detail page. It has six tabs:

<!-- SCREENSHOT: Bucket detail page showing all tabs -->

> 📸 _Screenshot placeholder: Bucket detail page_

### Tab 1 — S3 Files

Lists every object currently in the S3 bucket.

- Toggle between **table view** and **folder tree view**
- Each row: file name, object key, MIME type, size, source badge, last modified
- **Source badges**: `Uploaded from System` vs `External / Direct`

<!-- SCREENSHOT: S3 Files tab with folder tree toggle -->

> 📸 _Screenshot placeholder: S3 files tab — folder tree view_

### Tab 2 — Analytics

Two charts scoped to this bucket:

- **File Type Distribution** — pie chart of file extensions
- **File Size Range Distribution** — bar chart (< 1 KB → > 100 MB)

<!-- SCREENSHOT: Analytics tab with charts -->

> 📸 _Screenshot placeholder: Bucket analytics charts_

### Tab 3 — Cost

Estimated monthly cost breakdown:

- S3 storage, GET/PUT/DELETE/LIST requests, data transfer out
- CloudFront data transfer and request costs

### Tab 4 — Records

Locally-tracked file records from `files.json` for this bucket, including `linkedModel` / `linkedModelId` traceability and orphan highlighting.

### Tab 5 — Setup

Integration reference: pre-signed URL endpoint, CloudFront domain, IAM policy ARN, quick links to snippets.

### Tab 6 — Sync

Compares local JSON state with actual AWS CloudFormation stack. Detects drift and offers one-click sync.

<!-- SCREENSHOT: Sync status dialog -->

> 📸 _Screenshot placeholder: Bucket sync status dialog_

---

## Distributions

The **Distributions** page (`/distributions`) shows all CloudFront distributions in your AWS account.

<!-- SCREENSHOT: Distributions page with card grid -->

> 📸 _Screenshot placeholder: CloudFront distributions page_

### What you can see

- Summary cards: Total, Deployed, Disabled
- Per distribution: ID, domain, status, origin(s), linked DropOut bucket, last modified
- Country flag for the origin region

### Delete a Distribution

Only **Disabled** distributions can be deleted. To disable an active one, use the AWS Console first.

---

## Code Snippets

The **Snippets** page (`/snippets`) generates copy-paste integration code.

<!-- SCREENSHOT: Snippets page with bucket selector and four tabs -->

> 📸 _Screenshot placeholder: Code snippets page_

### Tabs

| Tab             | Contents                                                     |
| --------------- | ------------------------------------------------------------ |
| **Environment** | `.env.local` variables for your app                          |
| **Upload API**  | Next.js API route that calls DropOut to get a pre-signed URL |
| **Frontend**    | React component with drag-drop upload and progress           |
| **Delete**      | API route for deleting files from S3 and `files.json`        |

---

## Commands & AI Tools

The **Commands** page (`/commands`) is a terminal-powered control panel for AWS operations.

<!-- SCREENSHOT: Commands page with pre-built commands and AI panel -->

> 📸 _Screenshot placeholder: Commands page_

### Pre-built Commands (25+)

| Category       | Examples                                                  |
| -------------- | --------------------------------------------------------- |
| CDK            | `cdk list`, `cdk diff`, `cdk destroy --all`               |
| AWS S3         | `aws s3 ls`, `aws s3 sync`, `aws s3 rb --force`           |
| CloudFront     | `list-distributions`, `create-invalidation`               |
| CloudFormation | `list-stacks`, `describe-stack-events`                    |
| Cost & Billing | `aws ce get-cost-and-usage`                               |
| System         | `aws sts get-caller-identity`, `node -v`, `cdk --version` |

### AI Command Generator

1. Switch to the **Generate** tab
2. Describe what you want in plain English
3. AI returns the command with a safety warning if destructive
4. Click **Run**, **Save**, or **Edit First**

### AI Error Debugger

1. When a command fails, switch to the **Debug** tab (red dot = error waiting)
2. Click **Diagnose with AI**
3. AI returns: diagnosis, suggested fix commands, prevention tips

<!-- SCREENSHOT: AI debug panel -->

> 📸 _Screenshot placeholder: AI error debugger output_

---

## Settings

The **Settings** page (`/settings`) manages credentials, theme, and defaults.

<!-- SCREENSHOT: Settings page -->

> 📸 _Screenshot placeholder: Settings page_

| Section             | What you can do                             |
| ------------------- | ------------------------------------------- |
| AWS Credentials     | View CLI credentials, check IAM permissions |
| OpenAI API Key      | Enable AI features                          |
| Default Environment | Default AWS region for new buckets          |
| Theme               | Light / Dark / System                       |

---

## Pre-signed Upload Integration

### Request a pre-signed URL

```typescript
const res = await fetch('http://localhost:3000/api/files', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 'your-project-uuid',
    bucketName: 'scr-your-bucket-1234',
    fileName: 'profile.jpg',
    fileSize: 204800,
    mimeType: 'image/jpeg',
    linkedModel: 'User', // optional
    linkedModelId: 'user-123', // optional
  }),
});

const { uploadUrl, objectKey, cloudFrontUrl } = await res.json();
```

### Upload directly to S3

```typescript
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': 'image/jpeg' },
});

// Serve the file via CloudFront:
console.log(cloudFrontUrl); // https://abc123.cloudfront.net/user-123/uuid.jpg
```

> Pre-signed URLs expire after the bucket's **Signed URL Expiration** setting (default 3600 s).

### Validation rules enforced by DropOut

- File size ≤ `project.maxFileSizeMB`
- MIME type is in `project.allowedMimeTypes`
- Bucket status is `active`
- Project exists

Violations return `400 Bad Request` with a descriptive message.

---

## Common Questions

### How does the auto-update work?

`scripts/pull-latest.js` runs before every `pnpm dev`:

1. Fetches from `origin/master`
2. Stashes uncommitted local changes if any
3. Fast-forward merges new commits
4. Pops the stash
5. Warns if `package.json` / `pnpm-lock.yaml` changed (run `pnpm install`)

If git is unavailable, you're offline, or the merge is not fast-forward, it prints a warning and the dev server still starts normally.

### What if CDK deploy fails?

1. Check the terminal output on the **Infrastructure** page
2. Verify credentials: `aws sts get-caller-identity`
3. Verify bootstrap: `cd infrastructure/cdk && npx cdk bootstrap`
4. Retry from the bucket's ⋮ menu → **Deploy with CDK**

### Can I use multiple AWS accounts?

```bash
# macOS / Linux
AWS_PROFILE=my-other-account pnpm dev

# Windows PowerShell
$env:AWS_PROFILE = "my-other-account"; pnpm dev
```

### Where is my data stored?

All metadata is in `/data/*.json`. These files are **gitignored** by default. Actual files live in S3.

### How do I reset everything?

```bash
# Clear local records
echo "[]" > data/projects.json
echo "[]" > data/buckets.json
echo "[]" > data/files.json
echo "[]" > data/environments.json
echo "{}" > data/system.json

# Also destroy AWS resources (optional)
cd infrastructure/cdk && npx cdk destroy --all
```
