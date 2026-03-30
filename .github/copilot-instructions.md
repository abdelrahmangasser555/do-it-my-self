# Copilot Instructions — DropOut (Storage Control Room)

## Project Overview

**DropOut** is a local-only, internal Next.js dashboard for managing AWS S3 buckets and CloudFront distributions. It is NOT a SaaS product, NOT multi-tenant, and requires no hosting — it runs exclusively on the developer's machine via `pnpm dev`.

## Architecture

- **Framework:** Next.js 16 (App Router) with React 19
- **UI:** shadcn/ui (new-york style, neutral base), Tailwind CSS v4, framer-motion for animations
- **State:** Client-side hooks + local JSON files in `/data/` — no database
- **Infrastructure:** AWS CDK v2 (TypeScript) for S3 + CloudFront provisioning
- **AWS SDK:** @aws-sdk v3 for S3, CloudFront, CloudFormation, IAM, STS
- **Forms:** React Hook Form + Zod validation
- **AI:** Vercel AI SDK v6 + OpenAI (optional)
- **Package manager:** pnpm

## Key Design Patterns

### Feature-Based Architecture
All domain logic lives in `/features/<domain>/`:
- `components/` — Presentational React components
- `hooks/` — Business logic (data fetching, mutations, state management)
- `utils/` — Pure helper functions

### API Routes
All API routes are in `/app/api/` and use the filesystem module (`/lib/filesystem.ts`) to read/write JSON files from `/data/`.

### Data Layer
- No database. All persistence is JSON files in `/data/` (projects.json, buckets.json, files.json, environments.json, system.json, settings.json).
- Use `readJsonFile`, `appendToJsonFile`, `updateInJsonFile`, `deleteFromJsonFile` from `/lib/filesystem.ts`.
- Never import `fs` directly in client components — all file I/O happens server-side in API routes.

### CDK Infrastructure
- CDK code lives in `/infrastructure/cdk/`
- The app creates one CloudFormation stack per bucket: `SCR-<s3BucketName>`
- Each stack provisions: S3 bucket + CloudFront distribution + OAI + IAM policy
- CDK is invoked via `spawn()` from the infrastructure API route with streaming NDJSON output
- **Windows EPERM fix:** Always clean stale `synth.lock*` files from `cdk.out/` before running CDK commands

### Global Config
- App name, logo, GitHub repo, and tagline are in `/lib/config.ts` (`APP_CONFIG`)
- Always use `APP_CONFIG` instead of hardcoding the app name

### Onboarding
- `/features/onboarding/` handles the setup wizard (environment check, AWS validation, CDK bootstrap, AI config)
- System state is tracked in `/data/system.json`
- The `OnboardingGuard` redirects to `/onboarding` if `onboardingComplete` is false

## Conventions

- All page components are in `/app/(dashboard)/` (route group, no URL segment)
- Use `"use client"` directive for interactive components
- Use shadcn/ui components from `/components/ui/`
- Use `toast` from `sonner` for notifications
- Use `PageTransition` wrapper for route transitions
- Types are centralized in `/lib/types.ts`
- Zod schemas and form types are in `/lib/validations.ts`
- Terminal output uses the `TerminalProvider` context from `/lib/terminal-context.tsx`

## Common File Locations

| What | Where |
|---|---|
| App config (name, logo) | `lib/config.ts` |
| Types | `lib/types.ts` |
| Validations | `lib/validations.ts` |
| File I/O helpers | `lib/filesystem.ts` |
| AWS SDK wrappers | `lib/aws.ts` |
| Sidebar navigation | `components/app-sidebar.tsx` |
| Dashboard layout | `app/(dashboard)/layout.tsx` |
| CDK stack definition | `infrastructure/cdk/lib/storage-bucket-stack.ts` |
| CDK deploy API | `app/api/infrastructure/route.ts` |
| Settings API | `app/api/settings/route.ts` |
| System state API | `app/api/system/route.ts` |

## Important Notes

- This runs on **Windows** primarily. Be mindful of path separators and file locking issues.
- The CDK `cdk.out/synth.lock` files can cause EPERM errors on Windows — the infrastructure API route cleans these up automatically before each CDK run.
- Bucket names must be globally unique in AWS. The app appends a timestamp: `scr-<name>-<timestamp>`.
- Projects can't be deleted if they have buckets — enforce this in the UI.
