// Components preview tab — live component preview with props editor and code
"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CodeBlock } from "@/components/code-block";
import {
  Upload,
  FileUp,
  CheckCircle2,
  XCircle,
  Eye,
  Code2,
  Settings2,
} from "lucide-react";
import type { Bucket } from "@/lib/types";

interface ComponentsPreviewTabProps {
  bucket: Bucket;
}

// --- Live Upload Component Preview ---
function UploadPreview({
  maxFileSizeMB,
  showProgress,
  showDragDrop,
  acceptedTypes,
  apiEndpoint,
}: {
  maxFileSizeMB: number;
  showProgress: boolean;
  showDragDrop: boolean;
  acceptedTypes: string;
  apiEndpoint: string;
}) {
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [fileName, setFileName] = useState("");

  const simulateUpload = useCallback(
    (name: string) => {
      setFileName(name);
      setStatus("uploading");
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setStatus("success");
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 200);
    },
    []
  );

  const reset = () => {
    setStatus("idle");
    setProgress(0);
    setFileName("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Upload zone */}
      {showDragDrop ? (
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) simulateUpload(file.name);
          }}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          <Upload className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {status === "idle"
              ? "Drop files here or click to browse"
              : status === "uploading"
              ? `Uploading ${fileName}...`
              : status === "success"
              ? "Upload complete!"
              : "Upload failed"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Max {maxFileSizeMB} MB · {acceptedTypes || "All file types"}
          </p>
          {status === "idle" && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => simulateUpload("sample-image.png")}
            >
              <FileUp className="mr-1.5 size-3.5" />
              Select File
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() =>
              status === "idle"
                ? simulateUpload("sample-image.png")
                : reset()
            }
          >
            <FileUp className="mr-1.5 size-4" />
            {status === "idle" ? "Upload File" : "Reset"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Max {maxFileSizeMB} MB
          </span>
        </div>
      )}

      {/* Progress bar */}
      <AnimatePresence>
        {showProgress && status !== "idle" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{fileName}</span>
              <span className="text-muted-foreground">
                {Math.min(Math.round(progress), 100)}%
              </span>
            </div>
            <Progress value={Math.min(progress, 100)} className="h-2" />
            <div className="flex items-center gap-1.5 text-xs">
              {status === "success" && (
                <>
                  <CheckCircle2 className="size-3.5 text-green-500" />
                  <span className="text-green-600">Uploaded successfully</span>
                </>
              )}
              {status === "error" && (
                <>
                  <XCircle className="size-3.5 text-destructive" />
                  <span className="text-destructive">Upload failed</span>
                </>
              )}
              {status === "uploading" && (
                <span className="text-muted-foreground">
                  Uploading to {apiEndpoint}...
                </span>
              )}
            </div>
            {status !== "uploading" && (
              <Button variant="ghost" size="sm" onClick={reset}>
                Reset Demo
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Main Component ---
export function ComponentsPreviewTab({ bucket }: ComponentsPreviewTabProps) {
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(
    bucket.config?.maxFileSizeMB ?? 100
  );
  const [showProgress, setShowProgress] = useState(true);
  const [showDragDrop, setShowDragDrop] = useState(true);
  const [acceptedTypes, setAcceptedTypes] = useState("image/*,application/pdf");
  const [apiEndpoint, setApiEndpoint] = useState("/api/upload");

  const componentCode = `"use client";

import { useState, useCallback } from "react";

interface FileUploadProps {
  maxFileSizeMB?: number;
  acceptedTypes?: string;
  apiEndpoint?: string;
  showProgress?: boolean;
  onUploadComplete?: (cdnUrl: string) => void;
}

export function FileUpload({
  maxFileSizeMB = ${maxFileSizeMB},
  acceptedTypes = "${acceptedTypes}",
  apiEndpoint = "${apiEndpoint}",
  showProgress = ${showProgress},
  onUploadComplete,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback(async (file: File) => {
    // Validate file size
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      setError(\`File too large. Max: \${maxFileSizeMB} MB\`);
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      // Get presigned URL
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to get upload URL");
      }

      const { uploadUrl, cdnUrl } = await res.json();

      // Upload with progress
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        setUploading(false);
        setProgress(100);
        onUploadComplete?.(cdnUrl);
      };
      xhr.onerror = () => {
        setError("Upload failed");
        setUploading(false);
      };
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  }, [maxFileSizeMB, apiEndpoint, onUploadComplete]);

  return (
    <div
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
      }}
      onDragOver={(e) => e.preventDefault()}
      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50"
    >
      {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
      <input
        type="file"
        accept={acceptedTypes}
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        {uploading ? "Uploading..." : "Drop a file or click to upload"}
      </label>
      {showProgress && uploading && (
        <div className="mt-3 w-full max-w-xs">
          <div className="h-2 rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all"
              style={{ width: \`\${progress}%\` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">{progress}%</p>
        </div>
      )}
      <p className="mt-2 text-xs text-gray-400">
        Max: {maxFileSizeMB} MB · {acceptedTypes || "All types"}
      </p>
    </div>
  );
}`;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Eye className="size-5" />
          Component Preview
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Interactive preview of ready-to-use upload components configured for
          this bucket.
        </p>
      </div>

      <Tabs defaultValue="preview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="preview" className="gap-1.5">
            <Eye className="size-3.5" /> Preview
          </TabsTrigger>
          <TabsTrigger value="props" className="gap-1.5">
            <Settings2 className="size-3.5" /> Props Editor
          </TabsTrigger>
          <TabsTrigger value="code" className="gap-1.5">
            <Code2 className="size-3.5" /> Full Code
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                Live Preview
                <Badge variant="secondary" className="text-xs">
                  Interactive
                </Badge>
              </CardTitle>
              <CardDescription>
                Try the upload component — drag a file or click to simulate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadPreview
                maxFileSizeMB={maxFileSizeMB}
                showProgress={showProgress}
                showDragDrop={showDragDrop}
                acceptedTypes={acceptedTypes}
                apiEndpoint={apiEndpoint}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="props">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Props Editor</CardTitle>
              <CardDescription>
                Adjust props to see the component update in the Preview tab
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxSize">
                    Max File Size (MB)
                  </Label>
                  <Input
                    id="maxSize"
                    type="number"
                    min={1}
                    max={5000}
                    value={maxFileSizeMB}
                    onChange={(e) =>
                      setMaxFileSizeMB(Number(e.target.value) || 1)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Bucket default: {bucket.config?.maxFileSizeMB ?? 100} MB
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accepted">Accepted Types</Label>
                  <Input
                    id="accepted"
                    value={acceptedTypes}
                    onChange={(e) => setAcceptedTypes(e.target.value)}
                    placeholder="image/*,application/pdf"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endpoint">API Endpoint</Label>
                  <Input
                    id="endpoint"
                    value={apiEndpoint}
                    onChange={(e) => setApiEndpoint(e.target.value)}
                    placeholder="/api/upload"
                  />
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="progress"
                    checked={showProgress}
                    onCheckedChange={setShowProgress}
                  />
                  <Label htmlFor="progress">Show Progress Bar</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="dragdrop"
                    checked={showDragDrop}
                    onCheckedChange={setShowDragDrop}
                  />
                  <Label htmlFor="dragdrop">Drag & Drop Zone</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="code">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Full Component Code</CardTitle>
              <CardDescription>
                Copy-paste ready component pre-configured for {bucket.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                title="components/file-upload.tsx"
                language="typescript"
                code={componentCode}
                collapsible
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
