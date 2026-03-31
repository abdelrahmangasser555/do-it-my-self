// Presentational dialog for creating a new S3 bucket — default + advanced settings
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, ChevronDown, ChevronUp, Rocket, RefreshCw } from 'lucide-react';
import { bucketSchema, type BucketFormValues, AWS_REGIONS } from '@/lib/validations';
import type { Project, BootstrappedEnvironment } from '@/lib/types';
import { AnimatedDialog } from '@/components/animated-dialog';

interface CreateBucketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BucketFormValues, deploy?: boolean) => Promise<void>;
  projects: Project[];
  loading?: boolean;
  environments?: BootstrappedEnvironment[];
  defaultProjectId?: string;
}

function generateName() {
  const adjectives = ['fast', 'clean', 'bright', 'sharp', 'swift', 'solid'];
  const nouns = ['storage', 'assets', 'media', 'files', 'uploads', 'vault'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${adj}-${noun}-${num}`;
}

export function CreateBucketDialog({
  open,
  onOpenChange,
  onSubmit,
  projects,
  loading,
  environments,
  defaultProjectId,
}: CreateBucketDialogProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showPublicWarning, setShowPublicWarning] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<BucketFormValues>({
    resolver: zodResolver(bucketSchema) as any,
    defaultValues: {
      projectId: defaultProjectId || '',
      name: generateName(),
      region: 'us-east-1',
      access: 'private',
      maxFileSizeMB: 100,
      strictFileSizeLimit: false,
      allowedFileTypes: 'any',
      autoDelete: false,
      autoDeleteDays: undefined,
      signedUrlExpiration: 3600,
      corsOrigins: ['*'],
      corsMethods: ['GET', 'PUT', 'POST'],
      versioning: false,
      lifecycleTransitionDays: undefined,
      lifecycleDeleteIncompleteUploads: false,
      enableCDN: true,
      cacheControl: 'public, max-age=31536000',
      multipartThresholdMB: 100,
      maxConcurrency: 4,
      retryCount: 3,
      encryptionType: 'S3',
      kmsKeyId: undefined,
      enableAccessLogs: false,
      enableMetrics: false,
      encryption: 's3',
      backupEnabled: false,
    },
  });

  const access = watch('access');
  const autoDelete = watch('autoDelete');
  const versioning = watch('versioning');
  const enableCDN = watch('enableCDN');
  const encryptionType = watch('encryptionType');
  const strictFileSizeLimit = watch('strictFileSizeLimit');
  const allowedFileTypes = watch('allowedFileTypes');

  useEffect(() => {
    const activeEnvs = environments?.filter((e) => e.status === 'active') ?? [];
    if (activeEnvs.length > 0) {
      setValue('region', activeEnvs[0].region, { shouldValidate: false });
    }
  }, [environments, setValue]);

  useEffect(() => {
    setShowPublicWarning(access === 'public');
  }, [access]);

  const handleFormSubmit = async (data: BucketFormValues, deploy?: boolean) => {
    await onSubmit(data, deploy);
    reset({ ...data, name: generateName() });
    setAdvancedOpen(false);
    setShowPublicWarning(false);
  };

  const activeEnvs = environments?.filter((e) => e.status === 'active') ?? [];
  const regionOptions =
    activeEnvs.length > 0
      ? activeEnvs.map((e) => ({
          value: e.region,
          label: AWS_REGIONS.find((r) => r.value === e.region)?.label ?? e.region,
        }))
      : [...AWS_REGIONS];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AnimatedDialog open={open}>
        <DialogContent className="sm:max-w-140 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Bucket</DialogTitle>
            <DialogDescription>
              Set up an S3 bucket. Advanced settings are optional — safe defaults are pre-filled.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit((d) => handleFormSubmit(d))} className="space-y-5">
            {/* Project */}
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                defaultValue={defaultProjectId || ''}
                onValueChange={(v) => setValue('projectId', v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      <span className="ml-2 text-xs text-muted-foreground">({p.environment})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.projectId && (
                <p className="text-sm text-destructive">{errors.projectId.message}</p>
              )}
            </div>

            {/* Bucket name */}
            <div className="space-y-2">
              <Label htmlFor="bucketName">Bucket Name</Label>
              <div className="flex gap-2">
                <Input
                  id="bucketName"
                  placeholder="my-assets"
                  className="flex-1"
                  {...register('name')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setValue('name', generateName(), { shouldValidate: true })}
                  title="Generate random name"
                >
                  <RefreshCw className="size-4" />
                </Button>
              </div>
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              <p className="text-xs text-muted-foreground">
                A timestamp will be appended to ensure uniqueness.
              </p>
            </div>

            {/* Region */}
            <div className="space-y-2">
              <Label>Region</Label>
              <Select
                defaultValue={regionOptions[0]?.value ?? 'us-east-1'}
                onValueChange={(v) => setValue('region', v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {regionOptions.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeEnvs.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Showing bootstrapped regions only. Manage in Environments.
                </p>
              )}
            </div>

            {/* Access */}
            <div className="space-y-2">
              <Label>Access Level</Label>
              <Select
                defaultValue="private"
                onValueChange={(v) =>
                  setValue('access', v as 'private' | 'public', { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private — only accessible via signed URLs</SelectItem>
                  <SelectItem value="public">Public — anyone can read files directly</SelectItem>
                </SelectContent>
              </Select>
              {showPublicWarning && (
                <div className="flex items-start gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Public buckets allow anyone to read your files. Make sure this is intentional.
                  </span>
                </div>
              )}
            </div>

            {/* Max file size + strict toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="maxFileSizeMB">Max File Size (MB)</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="strictFileSizeLimit" className="text-xs text-muted-foreground">
                    Strict
                  </Label>
                  <Switch
                    id="strictFileSizeLimit"
                    checked={strictFileSizeLimit}
                    onCheckedChange={(v) => setValue('strictFileSizeLimit', v)}
                  />
                  <span className="text-xs text-muted-foreground">
                    {strictFileSizeLimit ? 'Bucket-level' : 'UI only'}
                  </span>
                </div>
              </div>
              <Input
                id="maxFileSizeMB"
                type="number"
                min={1}
                max={5000}
                {...register('maxFileSizeMB', { valueAsNumber: true })}
              />
            </div>

            {/* Allowed file types */}
            <div className="space-y-2">
              <Label>Allowed File Types</Label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: 'any', label: 'Any' },
                    { value: 'images', label: 'Images' },
                    { value: 'videos', label: 'Videos' },
                    { value: 'documents', label: 'Documents' },
                  ] as const
                ).map((opt) => (
                  <Badge
                    key={opt.value}
                    variant={allowedFileTypes === opt.value ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() =>
                      setValue('allowedFileTypes', opt.value, { shouldValidate: true })
                    }
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Auto-delete */}
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="autoDelete">Auto-delete files</Label>
                  <p className="text-xs text-muted-foreground">
                    Remove files automatically after N days
                  </p>
                </div>
                <Switch
                  id="autoDelete"
                  checked={autoDelete}
                  onCheckedChange={(v) => setValue('autoDelete', v)}
                />
              </div>
              {autoDelete && (
                <div className="flex items-center gap-3 pl-1">
                  <Label className="shrink-0 text-sm">Delete after</Label>
                  <Input
                    type="number"
                    min={1}
                    max={36500}
                    className="w-24"
                    placeholder="30"
                    {...register('autoDeleteDays', { valueAsNumber: true })}
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Advanced toggle */}
            <button
              type="button"
              onClick={() => setAdvancedOpen((p) => !p)}
              className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Advanced settings (optional)</span>
              {advancedOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>

            {advancedOpen && (
              <div className="space-y-5 rounded-lg border p-4 bg-muted/30">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Security
                </p>

                <div className="space-y-2">
                  <Label htmlFor="signedUrlExpiration">Signed URL Expiry (seconds)</Label>
                  <Input
                    id="signedUrlExpiration"
                    type="number"
                    min={60}
                    max={604800}
                    {...register('signedUrlExpiration', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">Default 3600 = 1 hour</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="corsOrigins">Allowed Origins (comma-separated)</Label>
                  <Input
                    id="corsOrigins"
                    placeholder="*, https://myapp.com"
                    defaultValue="*"
                    onChange={(e) =>
                      setValue(
                        'corsOrigins',
                        e.target.value.split(',').map((s) => s.trim()),
                      )
                    }
                  />
                </div>

                <Separator />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Storage
                </p>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label>Versioning</Label>
                    <p className="text-xs text-muted-foreground">
                      Keep previous versions of overwritten files
                    </p>
                  </div>
                  <Switch checked={versioning} onCheckedChange={(v) => setValue('versioning', v)} />
                </div>
                {versioning && (
                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-xs text-yellow-700 dark:text-yellow-400">
                    Versioning increases storage costs. Disabling later won&apos;t delete existing
                    versions.
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Move to cheaper storage after (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Leave empty to disable"
                    {...register('lifecycleTransitionDays', {
                      valueAsNumber: true,
                      setValueAs: (v) => (v === '' || isNaN(v) ? undefined : Number(v)),
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Moves to S3 Infrequent Access tier.
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label>Clean up incomplete uploads</Label>
                    <p className="text-xs text-muted-foreground">
                      Remove stuck multipart uploads after 7 days
                    </p>
                  </div>
                  <Switch
                    checked={watch('lifecycleDeleteIncompleteUploads')}
                    onCheckedChange={(v) => setValue('lifecycleDeleteIncompleteUploads', v)}
                  />
                </div>

                <Separator />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Performance
                </p>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label>Enable CDN (CloudFront)</Label>
                    <p className="text-xs text-muted-foreground">Serve files via a global CDN</p>
                  </div>
                  <Switch checked={enableCDN} onCheckedChange={(v) => setValue('enableCDN', v)} />
                </div>
                {enableCDN && (
                  <div className="space-y-2">
                    <Label htmlFor="cacheControl">Cache-Control header</Label>
                    <Input
                      id="cacheControl"
                      placeholder="public, max-age=31536000"
                      {...register('cacheControl')}
                    />
                  </div>
                )}

                <Separator />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Upload Behavior
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Multipart threshold (MB)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={5120}
                      {...register('multipartThresholdMB', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max concurrency</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      {...register('maxConcurrency', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Retries</Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      {...register('retryCount', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <Separator />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Encryption
                </p>

                <div className="space-y-2">
                  <Label>Encryption type</Label>
                  <Select
                    defaultValue="S3"
                    onValueChange={(v) =>
                      setValue('encryptionType', v as 'S3' | 'KMS' | 'none', {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="S3">S3-Managed (recommended)</SelectItem>
                      <SelectItem value="KMS">KMS — bring your own key</SelectItem>
                      <SelectItem value="none">No encryption</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {encryptionType === 'KMS' && (
                  <div className="space-y-2">
                    <Label htmlFor="kmsKeyId">KMS Key ARN (empty = create new key)</Label>
                    <Input
                      id="kmsKeyId"
                      placeholder="arn:aws:kms:us-east-1:..."
                      {...register('kmsKeyId')}
                    />
                  </div>
                )}
                {encryptionType === 'none' && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-700 dark:text-red-400">
                    Disabling encryption is not recommended. Data will be stored unencrypted.
                  </div>
                )}

                <Separator />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Monitoring
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label className="text-sm">Access logs</Label>
                      <p className="text-xs text-muted-foreground">Track S3 requests</p>
                    </div>
                    <Switch
                      checked={watch('enableAccessLogs')}
                      onCheckedChange={(v) => setValue('enableAccessLogs', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label className="text-sm">Metrics</Label>
                      <p className="text-xs text-muted-foreground">CloudWatch</p>
                    </div>
                    <Switch
                      checked={watch('enableMetrics')}
                      onCheckedChange={(v) => setValue('enableMetrics', v)}
                    />
                  </div>
                </div>

                <Separator />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cost control
                </p>

                <div className="space-y-2">
                  <Label htmlFor="monthlyBudgetAlertUSD">
                    Monthly budget alert (USD, optional)
                  </Label>
                  <Input
                    id="monthlyBudgetAlertUSD"
                    type="number"
                    min={0}
                    placeholder="e.g. 50"
                    {...register('monthlyBudgetAlertUSD', {
                      valueAsNumber: true,
                      setValueAs: (v) => (v === '' || isNaN(v) ? undefined : Number(v)),
                    })}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={handleSubmit((d) => handleFormSubmit(d, false))}
              >
                {loading ? 'Saving…' : 'Save as Draft'}
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={handleSubmit((d) => handleFormSubmit(d, true))}
              >
                {loading ? (
                  'Deploying…'
                ) : (
                  <>
                    <Rocket className="mr-1.5 size-3.5" />
                    Create & Deploy
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </AnimatedDialog>
    </Dialog>
  );
}
