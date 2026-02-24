// Dialog for creating a new folder in an S3 bucket
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucketName: string;
  region?: string;
  existingFolders: string[];
  onCreated: () => void;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  bucketName,
  region,
  existingFolders,
  onCreated,
}: CreateFolderDialogProps) {
  const ROOT_SENTINEL = "__root__";
  const [name, setName] = useState("");
  const [parent, setParent] = useState(ROOT_SENTINEL);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const trimmed = name.trim().replace(/^\/+|\/+$/g, "");
    if (!trimmed) {
      toast.error("Folder name is required");
      return;
    }

    const effectiveParent = parent === ROOT_SENTINEL ? "" : parent;
    const folderPath = effectiveParent ? `${effectiveParent}/${trimmed}` : trimmed;

    try {
      setCreating(true);
      const res = await fetch("/api/files/s3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-folder",
          bucketName,
          region,
          folderPath,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create folder");
      }
      toast.success(`Folder "${folderPath}/" created`);
      setName("");
      setParent(ROOT_SENTINEL);
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="size-5" />
            Create Folder
          </DialogTitle>
          <DialogDescription>
            Create a new folder in <span className="font-mono text-xs">{bucketName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Parent Folder</Label>
            <Select value={parent} onValueChange={setParent}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Root" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROOT_SENTINEL}>Root (/)</SelectItem>
                {existingFolders.filter(Boolean).map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}/
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Folder Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. images"
              className="text-sm font-mono"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !creating) handleCreate();
              }}
            />
            {name.trim() && (
              <p className="text-xs text-muted-foreground font-mono">
                → {parent && parent !== ROOT_SENTINEL ? `${parent}/` : ""}{name.trim()}/
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={creating || !name.trim()}>
            {creating ? (
              <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Creating...</>
            ) : (
              <><FolderPlus className="mr-1.5 size-3.5" /> Create</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
