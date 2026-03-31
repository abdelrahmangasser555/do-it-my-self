// Global context for background bucket deletion — allows deletion to continue after dialog closes
'use client';

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { Bucket, DeletionStep } from '@/lib/types';

const STEPS = [
  { id: 'files', label: 'Deleting files from S3' },
  { id: 'cloudfront', label: 'Removing CloudFront distribution' },
  { id: 'bucket', label: 'Deleting S3 bucket' },
  { id: 'metadata', label: 'Cleaning up metadata' },
];

export interface ActiveDeletion {
  bucketId: string;
  bucketName: string;
  steps: Record<string, DeletionStep>;
  complete: boolean;
  error: string | null;
  /** Fake progress for CloudFront step (0-99) until real "done" arrives */
  cloudfrontFakeProgress: number;
}

interface DeletionContextValue {
  activeDeletions: Record<string, ActiveDeletion>;
  startDeletion: (bucket: Bucket, onComplete?: () => void) => void;
  clearDeletion: (bucketId: string) => void;
}

const DeletionContext = createContext<DeletionContextValue | null>(null);

export function DeletionProvider({ children }: { children: ReactNode }) {
  const [activeDeletions, setActiveDeletions] = useState<Record<string, ActiveDeletion>>({});
  // Track cloudfront fake progress timers
  const cfTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const updateDeletion = useCallback((bucketId: string, update: Partial<ActiveDeletion>) => {
    setActiveDeletions((prev) => ({
      ...prev,
      [bucketId]: { ...prev[bucketId], ...update },
    }));
  }, []);

  const startDeletion = useCallback(
    async (bucket: Bucket, onComplete?: () => void) => {
      const id = bucket.id;

      // Initialize
      const initialSteps: Record<string, DeletionStep> = {};
      for (const s of STEPS) {
        initialSteps[s.id] = { id: s.id, label: s.label, status: 'pending' };
      }

      setActiveDeletions((prev) => ({
        ...prev,
        [id]: {
          bucketId: id,
          bucketName: bucket.name,
          steps: initialSteps,
          complete: false,
          error: null,
          cloudfrontFakeProgress: 0,
        },
      }));

      toast.loading(`Deleting "${bucket.name}"…`, { id: `delete-${id}` });

      try {
        const res = await fetch(`/api/buckets?id=${id}&full=true`, {
          method: 'DELETE',
        });

        if (!res.body) throw new Error('No response stream');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const msg = JSON.parse(line);

              if (msg.step === 'complete') {
                if (msg.status === 'done') {
                  updateDeletion(id, { complete: true });
                  // Clear CF fake progress timer
                  if (cfTimers.current[id]) {
                    clearInterval(cfTimers.current[id]);
                    delete cfTimers.current[id];
                  }
                  toast.success(`"${bucket.name}" deleted`, {
                    id: `delete-${id}`,
                  });
                  onComplete?.();
                } else {
                  const errMsg = msg.error || 'Deletion failed';
                  updateDeletion(id, { error: errMsg });
                  if (cfTimers.current[id]) {
                    clearInterval(cfTimers.current[id]);
                    delete cfTimers.current[id];
                  }
                  toast.error(`Failed to delete "${bucket.name}": ${errMsg}`, {
                    id: `delete-${id}`,
                  });
                }
              } else {
                setActiveDeletions((prev) => {
                  const prev2 = prev[id];
                  if (!prev2) return prev;
                  const updatedSteps = {
                    ...prev2.steps,
                    [msg.step]: {
                      id: msg.step,
                      label: prev2.steps[msg.step]?.label ?? msg.step,
                      status: msg.status,
                      error: msg.error,
                    },
                  };
                  return { ...prev, [id]: { ...prev2, steps: updatedSteps } };
                });

                // Show per-step toasts for background deletions
                if (msg.step === 'files' && msg.status === 'running') {
                  toast.loading(`Removing files from "${bucket.name}"…`, {
                    id: `delete-${id}`,
                  });
                }
                if (msg.step === 'cloudfront' && msg.status === 'running') {
                  toast.loading(
                    `Disabling CloudFront for "${bucket.name}" (this takes a few minutes)…`,
                    { id: `delete-${id}` },
                  );
                  // Start fake progress for CloudFront step
                  cfTimers.current[id] = setInterval(() => {
                    setActiveDeletions((prev) => {
                      const d = prev[id];
                      if (!d) return prev;
                      if (d.complete || d.steps['cloudfront']?.status === 'done') return prev;
                      const newProgress = Math.min(d.cloudfrontFakeProgress + 2, 95);
                      return {
                        ...prev,
                        [id]: { ...d, cloudfrontFakeProgress: newProgress },
                      };
                    });
                  }, 3000);
                }
                if (msg.step === 'cloudfront' && msg.status === 'done') {
                  if (cfTimers.current[id]) {
                    clearInterval(cfTimers.current[id]);
                    delete cfTimers.current[id];
                  }
                  updateDeletion(id, { cloudfrontFakeProgress: 100 });
                }
                if (msg.step === 'bucket' && msg.status === 'running') {
                  toast.loading(`Deleting S3 bucket "${bucket.name}"…`, {
                    id: `delete-${id}`,
                  });
                }
                if (msg.step === 'metadata' && msg.status === 'running') {
                  toast.loading(`Cleaning up metadata for "${bucket.name}"…`, {
                    id: `delete-${id}`,
                  });
                }
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Deletion failed';
        updateDeletion(id, { error: msg });
        if (cfTimers.current[id]) {
          clearInterval(cfTimers.current[id]);
          delete cfTimers.current[id];
        }
        toast.error(`Failed to delete "${bucket.name}": ${msg}`, {
          id: `delete-${id}`,
        });
      }
    },
    [updateDeletion],
  );

  const clearDeletion = useCallback((bucketId: string) => {
    setActiveDeletions((prev) => {
      const next = { ...prev };
      delete next[bucketId];
      return next;
    });
  }, []);

  return (
    <DeletionContext.Provider value={{ activeDeletions, startDeletion, clearDeletion }}>
      {children}
    </DeletionContext.Provider>
  );
}

export function useDeletion() {
  const ctx = useContext(DeletionContext);
  if (!ctx) throw new Error('useDeletion must be used within DeletionProvider');
  return ctx;
}
