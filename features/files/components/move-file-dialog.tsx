// Dialog for moving a file to a different folder in the same S3 bucket
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
import { ArrowRight, Loader2, FolderInput } from "lucide-react";
import { toast } from "sonner";

interface MoveFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucketName: string;
  region?: string;
  sourceKey: string;
  existingFolders: string[];
  onMoved: () => void;
}

export function MoveFileDialog({
  open,
  onOpenChange,
  bucketName,
  region,
  sourceKey,
  existingFolders,
  onMoved,
}: MoveFileDialogProps) {
  const ROOT_SENTINEL = "__root__";
  const [targetFolder, setTargetFolder] = useState(ROOT_SENTINEL);
  const [customFolder, setCustomFolder] = useState("");
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [moving, setMoving] = useState(false);

  const fileName = sourceKey.split("/").pop() || sourceKey;

  const getDestinationKey = (): string => {
    const effectiveTarget = targetFolder === ROOT_SENTINEL ? "" : targetFolder;
    const folder =
      mode === "new" && customFolder.trim()
        ? customFolder.trim().replace(/^\/+|\/+$/g, "")
        : effectiveTarget;
    return folder ? `${folder}/${fileName}` : fileName;
  };

  const handleMove = async () => {
    const destinationKey = getDestinationKey();
    if (destinationKey === sourceKey) {
      toast.error("Source and destination are the same");
      return;
    }

    try {
      setMoving(true);
      const res = await fetch("/api/files/s3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move",
          bucketName,
          region,
          sourceKey,
          destinationKey,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to move file");
      }
      toast.success(`Moved to ${destinationKey}`);
      onOpenChange(false);
      onMoved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move file");
    } finally {
      setMoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="size-5" />
            Move File
          </DialogTitle>
          <DialogDescription>
            Move <span className="font-mono text-xs">{fileName}</span> to a different folder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-xs space-y-1">
            <p className="text-muted-foreground">Current location:</p>
            <p className="font-mono bg-muted rounded px-2 py-1">{sourceKey}</p>
          </div>

          <div className="space-y-2">
            <Label>Destination Folder</Label>
            <div className="flex items-center gap-2">
              <Button
                variant={mode === "existing" ? "secondary" : "ghost"}
                size="sm"
                className="h-7"
                onClick={() => setMode("existing")}
              >
                Existing
              </Button>
              <Button
                variant={mode === "new" ? "secondary" : "ghost"}
                size="sm"
                className="h-7"
                onClick={() => setMode("new")}
              >
                Custom Path
              </Button>
            </div>
            {mode === "existing" ? (
              <Select value={targetFolder} onValueChange={setTargetFolder}>
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
            ) : (
              <Input
                value={customFolder}
                onChange={(e) => setCustomFolder(e.target.value)}
                placeholder="e.g. images/avatars"
                className="h-8 text-xs font-mono"
              />
            )}
          </div>

          <div className="text-xs space-y-1">
            <p className="text-muted-foreground">Will move to:</p>
            <div className="flex items-center gap-2 font-mono bg-muted rounded px-2 py-1">
              <span className="text-muted-foreground line-through">{sourceKey}</span>
              <ArrowRight className="size-3 shrink-0" />
              <span className="text-primary">{getDestinationKey()}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleMove}
            disabled={moving || getDestinationKey() === sourceKey}
          >
            {moving ? (
              <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Moving...</>
            ) : (
              <><FolderInput className="mr-1.5 size-3.5" /> Move</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
