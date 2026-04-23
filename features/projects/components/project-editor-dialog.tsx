'use client';

import { useEffect, useRef, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ImagePlus, Trash2 } from 'lucide-react';
import type { Project, ProjectUpdateData } from '@/lib/types';

interface ProjectEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  loading?: boolean;
  onSubmit: (projectId: string, updates: ProjectUpdateData) => Promise<boolean>;
}

export function ProjectEditorDialog({
  open,
  onOpenChange,
  project,
  loading,
  onSubmit,
}: ProjectEditorDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState<'dev' | 'prod'>('dev');
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(10);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);

  useEffect(() => {
    if (!project) {
      return;
    }

    setName(project.name);
    setEnvironment(project.environment);
    setMaxFileSizeMB(project.maxFileSizeMB);
    setImageDataUrl(project.imageDataUrl ?? null);
    setImageFileName(null);
  }, [project, open]);

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const nextImageDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });

    setImageDataUrl(nextImageDataUrl);
    setImageFileName(file.name);
    event.target.value = '';
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!project) {
      return;
    }

    const didSave = await onSubmit(project.id, {
      name: name.trim(),
      environment,
      maxFileSizeMB,
      imageDataUrl,
      imageFileName,
    });

    if (didSave) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update the project identity and save an avatar into the local codebase.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-4 rounded-xl border bg-muted/20 p-4">
            {imageDataUrl ? (
              <img
                src={imageDataUrl}
                alt={name || project?.name || 'Project avatar'}
                className="size-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold uppercase text-primary">
                {(name || project?.name || 'PR').slice(0, 2)}
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus data-icon="inline-start" />
                  Upload Icon
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setImageDataUrl(null);
                    setImageFileName(null);
                  }}
                  disabled={!imageDataUrl}
                >
                  <Trash2 data-icon="inline-start" />
                  Remove
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Icons are written to <span className="font-mono">public/project-icons</span>.
              </p>
              {imageFileName ? (
                <Badge variant="outline" className="w-fit">
                  {imageFileName}
                </Badge>
              ) : null}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-edit-name">Name</Label>
            <Input
              id="project-edit-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Project name"
              required
              minLength={2}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-edit-environment">Environment</Label>
            <Select
              value={environment}
              onValueChange={(value) => setEnvironment(value as 'dev' | 'prod')}
            >
              <SelectTrigger id="project-edit-environment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dev">dev</SelectItem>
                <SelectItem value="prod">prod</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-edit-max-size">Max File Size (MB)</Label>
            <Input
              id="project-edit-max-size"
              type="number"
              min={1}
              max={500}
              value={maxFileSizeMB}
              onChange={(event) => setMaxFileSizeMB(Number(event.target.value))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !project}>
              {loading ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
