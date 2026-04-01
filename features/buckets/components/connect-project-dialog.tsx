'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Bucket, Project } from '@/lib/types';

interface ConnectProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: Bucket | null;
  projects: Project[];
  loading?: boolean;
  onConfirm: (projectId: string) => Promise<void>;
}

export function ConnectProjectDialog({
  open,
  onOpenChange,
  bucket,
  projects,
  loading,
  onConfirm,
}: ConnectProjectDialogProps) {
  const [selectedProjectId, setSelectedProjectId] = useState('');

  useEffect(() => {
    setSelectedProjectId(bucket?.projectId ?? '');
  }, [bucket]);

  const handleConfirm = async () => {
    if (!selectedProjectId) return;
    await onConfirm(selectedProjectId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Connect Bucket To Project</DialogTitle>
          <DialogDescription>
            Link {bucket?.name ?? 'this bucket'} to a project so uploads and file workflows use the
            right limits and metadata.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Projects</SelectLabel>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!selectedProjectId || loading} onClick={handleConfirm}>
            {loading ? 'Connecting…' : 'Connect Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
