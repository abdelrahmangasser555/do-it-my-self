# User Guide

## Getting Started

### Prerequisites

Before using Storage Control Room, make sure you have:

- **Node.js 20+** installed
- **AWS CLI configured** (`aws configure`) with credentials that have S3, CloudFront, and IAM permissions
- **AWS CDK bootstrapped** in your target region (one-time setup):

```bash
# One-time per AWS account + region
cd infrastructure/cdk
npm install
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/YOUR_REGION
```

### Starting the Dashboard

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. That's it — no build step needed for local usage.

> The dashboard is local-only. Nothing is published to the internet.

---

## Step 1 — Create a Project

A **Project** is the top-level container. Think of it as one of your client apps or internal services.

**How to create:**
1. Click **Projects** in the sidebar
2. Click **New Project** (top-right)
3. Fill in:
   - **Project Name** — e.g. `my-saas-app` or `client-portal`
   - **Environment** — `dev` for staging/testing, `prod` for live
   - **Max File Size (MB)** — uploads above this limit will be rejected when generating pre-signed URLs
   - **Allowed File Types** — click the type badges to toggle which MIME types are permitted
4. Click **Create Project**

> A project does not create any AWS resources. It only stores your configuration locally.

---

## Step 2 — Create a Bucket

A **Bucket** maps to one S3 bucket + one CloudFront distribution. You can have multiple buckets per project (e.g. separate buckets for images vs documents).

**How to create:**
1. Click **Buckets** in the sidebar
2. Click **New Bucket**
3. Fill in:
   - **Project** — select which project this bucket belongs to
   - **Bucket Name** — a short slug, e.g. `user-avatars` or `invoices`. Must be lowercase with hyphens only.
   - **AWS Region** — where the S3 bucket will be created
4. Click **Create Bucket**

> At this point the bucket status will show **pending**. The AWS resources have NOT been created yet. You must deploy it in the next step.

---

## Step 3 — Deploy Infrastructure (CDK)

This is the step that actually provisions resources in AWS. It runs CDK on your machine using your local AWS credentials.

### Option A — Deploy from the Buckets page

1. Go to **Buckets**
2. Find your pending bucket, click the **⋮** menu on the right
3. Click **Deploy with CDK**
4. Wait for the deployment to complete (typically 2–5 minutes for CloudFront)
5. The bucket status will change to **active** and the CloudFront domain will appear

### Option B — Deploy from Infrastructure page

1. Click **Infrastructure** in the sidebar
2. Find your pending bucket, click **Deploy with CDK**
3. You can also click **CDK Synth** to preview the CloudFormation template without deploying

### What gets created in AWS:

```
S3 Bucket          →  scr-<your-bucket-name>-<timestamp>
CloudFront CDN     →  https://abc123xyz.cloudfront.net
IAM Policy         →  SCR-<stack-name>-UploadPolicy
```

### Manual CDK commands (if needed):

You can also run CDK commands directly:

```bash
cd infrastructure/cdk
npm install

# Preview what will be deployed
npx cdk synth

# Deploy (replace values)
SCR_BUCKET_NAME=scr-my-bucket-1234 SCR_REGION=us-east-1 npx cdk deploy --require-approval never
```

> You do **not** need to run manual commands for normal usage — the dashboard handles it. Manual commands are useful for debugging or CI environments.

---

## Step 4 — Generate Pre-signed Upload URLs

Once a bucket is **active**, your external Next.js apps can request pre-signed upload URLs from Storage Control Room.

**From your external app, call:**

```typescript
const res = await fetch("http://localhost:3000/api/files", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    projectId: "your-project-uuid",
    bucketName: "scr-your-bucket-name-1234",  // the s3BucketName field
    fileName: "profile.jpg",
    fileSize: 204800,          // bytes
    mimeType: "image/jpeg",
    linkedModel: "User",       // optional: what entity owns this file
    linkedModelId: "user-123", // optional
  }),
});

const { uploadUrl, cloudFrontUrl } = await res.json();

// Upload directly to S3 (no proxying through your server)
await fetch(uploadUrl, {
  method: "PUT",
  body: file,
  headers: { "Content-Type": "image/jpeg" },
});

// Use cloudFrontUrl to display the file
console.log(cloudFrontUrl); // https://abc.cloudfront.net/proj-id/uuid-profile.jpg
```

> Pre-signed URLs expire after **1 hour**. Generate them just before the upload.

---

## Step 5 — Get Integration Code Snippets

Instead of writing the integration code manually, use the built-in snippet generator.

1. Click **Code Snippets** in the sidebar
2. Select a bucket from the dropdown
3. Four tabs appear:
   - **Environment** — `.env.local` variables for your app
   - **Upload API** — server-side API route for generating pre-signed URLs
   - **Frontend** — client-side React component for uploading
   - **Delete** — delete file API route

Click the **copy icon** on any snippet to copy it to the clipboard.

The snippets page also includes a **Linked vs Orphan Files** section explaining how to properly associate uploads with your data models – and what happens when you don't.

---

## Browsing S3 Files

Each bucket detail page shows the **actual files in S3**, not just locally-tracked metadata.

### S3 Files Tab

1. Go to **Buckets** and click any active bucket
2. The default **S3 Files** tab shows every object in the S3 bucket
3. Each file displays:
   - **File name and full object key**
   - **MIME type** (inferred from extension)
   - **Size** (formatted in KB/MB/GB)
   - **Source badge**: "Uploaded from System" (tracked in metadata) or "External / Direct" (uploaded outside the dashboard)
   - **Last modified date**
4. Use the **toggle buttons** in the top-right to switch between table view and folder tree view

### Folder Structure View

Click the **folder icon** toggle to see files organized in an expandable tree:
- Folders show aggregate file count and total size
- Click a folder to expand/collapse its contents
- Nested paths (e.g. `project-id/subfolder/file.jpg`) render as proper hierarchical directories

### Total Size

The bucket overview card grid shows the **total size** of all objects in S3, formatted as KB, MB, or GB depending on scale.

---

## File Analytics

The **Analytics** tab on each bucket page shows two charts:

### File Type Distribution
A pie chart showing the breakdown of file types (by extension) in your bucket. Useful for understanding what kind of content is stored.

### File Size Range Distribution
A bar chart grouping files into size ranges (< 1KB, 1-10KB, 10-100KB, 100KB-1MB, 1-10MB, 10-100MB, > 100MB). Helps identify unusually large files or storage patterns.

---

## Managing CloudFront Distributions

The **Distributions** page (`/distributions`) shows all CloudFront distributions in your AWS account.

### What you can see:
- **Summary cards**: Total distributions, active count, disabled count
- **Distribution table**: ID, domain name, status, origins, linked bucket (if managed by SCR), last modified date
- **External links**: Click any domain to open it in a new tab

### Deleting a distribution:
Only **disabled** distributions can be deleted. If a distribution is active:
1. Disable it first via the AWS Console
2. Wait for the status to change to "Disabled"
3. Then delete it from the Distributions page

> Distributions created by CDK are automatically linked to their corresponding bucket in the dashboard.

---

## Commands & AI Tools

The **Commands** page provides quick access to pre-built AWS/CDK commands and AI-powered utilities.

### Pre-built Commands
25+ commands organized by category: CDK, AWS S3, CloudFront, CloudFormation, Cost & Billing, System, and Bucket-specific. Click **Run** to execute any command directly from the dashboard.

### Custom Commands
Type any command in the custom input box and run it. Toggle **Save** to store it for later use.

### Saved Commands
Saved custom commands appear in a grid with their label and description. Click to run, or delete them when no longer needed.

### AI Command Generator
1. Switch to the **Generate Command** tab in the AI Tools card
2. Describe what you want in plain English (e.g. "list all S3 buckets sorted by size")
3. AI generates the command with label, description, and a safety warning if destructive
4. Click **Run** to execute, **Save** to store, or **Edit First** to modify before running

### AI Error Debugger
1. When a command fails, the error output is captured automatically
2. Switch to the **Debug Error** tab (a red dot indicates an error is available)
3. Click **Diagnose with AI** — it provides:
   - A diagnosis explaining what went wrong
   - Suggested fix commands you can run directly
   - Prevention tips for the future

> AI features require an `OPENAI_API_KEY` in `.env.local`. See the [Setup Guide](/docs/setup-guide) for details.

---

## Viewing Analytics

### Global Dashboard (`/`)
Shows totals across all projects:
- Total projects, buckets, files
- Total storage used
- Per-bucket breakdown with orphaned file count

### Project Detail (`/projects/<id>`)
Click any project name to see:
- Analytics scoped to that project
- Tabs for its buckets and files

---

## Managing Files

Go to **Files** in the sidebar to see all uploaded file records.

Each record shows:
- The S3 object key
- MIME type + size
- What model/entity it's linked to (or "Orphan" if unlinked)
- A link to open the file via CloudFront

**Orphaned files** are files with no `linkedModel` — your app didn't associate them with anything. Review these periodically to clean up unused storage.

**Deleting a file record** removes it from the local `files.json` only — it does **not** delete the file from S3. To fully delete, you would also need to remove the object from S3 directly.

---

## Common Questions

### Do I need to run any commands to use the dashboard?

No. Just `npm run dev`. CDK is only needed when deploying a new bucket — and the dashboard triggers those commands for you automatically.

### Does the dashboard need internet access?

Only for AWS API calls (deploying CDK, generating pre-signed URLs). The UI itself runs fully locally.

### What if CDK deploy fails?

1. Check the **Infrastructure** page for the error output
2. Ensure your AWS credentials are valid: `aws sts get-caller-identity`
3. Ensure CDK is bootstrapped in your region: `cd infrastructure/cdk && npx cdk bootstrap`
4. Retry the deploy from the bucket's ⋮ menu

### Can I use this with multiple AWS accounts?

Yes — configure your desired profile in `~/.aws/config` and set `AWS_PROFILE` in your shell before starting the dashboard.

```bash
AWS_PROFILE=my-other-account npm run dev
```

### Where is my data stored?

All metadata is in `/data/projects.json`, `/data/buckets.json`, and `/data/files.json`. These are plain JSON files in the repo. You can back them up, commit them (for team sharing), or delete them to start fresh.

> Actual files are in AWS S3. Deleting the JSON files does not remove them from S3.

### How do I reset everything?

```bash
echo "[]" > data/projects.json
echo "[]" > data/buckets.json
echo "[]" > data/files.json
```

This clears all local records. AWS resources created via CDK will still exist and must be manually destroyed:

```bash
cd infrastructure/cdk
npx cdk destroy --all
```
