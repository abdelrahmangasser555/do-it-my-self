// Dialog for connecting an existing S3 bucket to a new CloudFront CDN distribution
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Cloud, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Bucket } from '@/lib/types';

interface ConnectCdnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: Bucket | null;
  onComplete: () => void;
}

export function ConnectCdnDialog({
  open,
  onOpenChange,
  bucket,
  onComplete,
}: ConnectCdnDialogProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [domain, setDomain] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!bucket) return;
    setLoading(true);
    try {
      const res = await fetch('/api/buckets/connect-cdn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucketId: bucket.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect CDN');
      setDomain(data.domainName ?? null);
      setDone(true);
      toast.success(`CloudFront distribution created for "${bucket.name}"`);
      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect CDN');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDone(false);
    setDomain(null);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-105">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="size-5 text-primary" />
            Connect to CloudFront CDN
          </DialogTitle>
          <DialogDescription>
            {done
              ? `CloudFront distribution created successfully.`
              : `Create a new CloudFront distribution for bucket "${bucket?.name}". This may take a few minutes to propagate globally.`}
          </DialogDescription>
        </DialogHeader>

        {done && domain && (
          <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
            <CheckCircle2 className="size-5 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Distribution created
              </p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{domain}</p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!done ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleConnect} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Cloud className="mr-2 size-4" />
                    Connect CDN
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
