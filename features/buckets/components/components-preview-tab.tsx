// Components preview tab — multiple component previews with live editing and code
"use client";

import { useState, useCallback, useRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CodeBlock } from "@/components/code-block";
import {
  Upload,
  FileUp,
  CheckCircle2,
  XCircle,
  Eye,
  Code2,
  Settings2,
  User,
  ImageIcon,
  X,
} from "lucide-react";
import type { Bucket } from "@/lib/types";

interface ComponentsPreviewTabProps {
  bucket: Bucket;
}

// ========== File Upload Preview ==========
function FileUploadPreview({
  maxFileSizeMB,
  showProgress,
  showDragDrop,
  acceptedTypes,
}: {
  maxFileSizeMB: number;
  showProgress: boolean;
  showDragDrop: boolean;
  acceptedTypes: string;
}) {
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [fileName, setFileName] = useState("");

  const simulateUpload = useCallback((name: string) => {
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
  }, []);

  const reset = () => {
    setStatus("idle");
    setProgress(0);
    setFileName("");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {showDragDrop ? (
        <div
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) simulateUpload(f.name); }}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          <Upload className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {status === "idle" ? "Drop files here or click to browse" : status === "uploading" ? `Uploading ${fileName}...` : status === "success" ? "Upload complete!" : "Upload failed"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Max {maxFileSizeMB} MB · {acceptedTypes || "All file types"}</p>
          {status === "idle" && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => simulateUpload("sample-file.pdf")}>
              <FileUp className="mr-1.5 size-3.5" /> Select File
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => (status === "idle" ? simulateUpload("sample-file.pdf") : reset())}>
            <FileUp className="mr-1.5 size-4" /> {status === "idle" ? "Upload File" : "Reset"}
          </Button>
          <span className="text-xs text-muted-foreground">Max {maxFileSizeMB} MB</span>
        </div>
      )}
      <AnimatePresence>
        {showProgress && status !== "idle" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{fileName}</span>
              <span className="text-muted-foreground">{Math.min(Math.round(progress), 100)}%</span>
            </div>
            <Progress value={Math.min(progress, 100)} className="h-2" />
            <div className="flex items-center gap-1.5 text-xs">
              {status === "success" && <><CheckCircle2 className="size-3.5 text-green-500" /><span className="text-green-600">Uploaded successfully</span></>}
              {status === "error" && <><XCircle className="size-3.5 text-destructive" /><span className="text-destructive">Upload failed</span></>}
              {status === "uploading" && <span className="text-muted-foreground">Uploading...</span>}
            </div>
            {status !== "uploading" && <Button variant="ghost" size="sm" onClick={reset}>Reset Demo</Button>}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ========== Avatar Upload Preview ==========
function AvatarUploadPreview({
  size,
  shape,
  showRemove,
}: {
  size: number;
  shape: "circle" | "rounded";
  showRemove: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4">
      <div
        className={`relative flex items-center justify-center border-2 border-dashed overflow-hidden transition-colors cursor-pointer ${
          dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        } ${shape === "circle" ? "rounded-full" : "rounded-xl"}`}
        style={{ width: size, height: size }}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Avatar preview" className="h-full w-full object-cover" />
        ) : (
          <User className="size-1/3 text-muted-foreground" />
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          {preview ? "Change Avatar" : "Upload Avatar"}
        </Button>
        {showRemove && preview && (
          <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
            <X className="mr-1 size-3.5" /> Remove
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Drop an image or click to upload · {shape === "circle" ? "Circular" : "Rounded"} · {size}×{size}px
      </p>
    </motion.div>
  );
}

// ========== Image Upload Preview ==========
function ImageUploadPreview({
  maxFileSizeMB,
  showDimensions,
  showThumbnail,
  allowMultiple,
}: {
  maxFileSizeMB: number;
  showDimensions: boolean;
  showThumbnail: boolean;
  allowMultiple: boolean;
}) {
  const [images, setImages] = useState<{ name: string; url: string; width: number; height: number }[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((fileList: FileList) => {
    const filesToProcess = allowMultiple ? Array.from(fileList).slice(0, 6) : [fileList[0]];
    filesToProcess.forEach((file) => {
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setImages((prev) => {
            const next = allowMultiple ? prev : [];
            return [...next, { name: file.name, url: e.target?.result as string, width: img.width, height: img.height }].slice(0, 6);
          });
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, [allowMultiple]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div
        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <ImageIcon className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm font-medium">Drop images here or click to browse</p>
        <p className="mt-1 text-xs text-muted-foreground">Max {maxFileSizeMB} MB · {allowMultiple ? "Multiple images" : "Single image"}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => inputRef.current?.click()}>
          <ImageIcon className="mr-1.5 size-3.5" /> Select Images
        </Button>
        <input ref={inputRef} type="file" accept="image/*" multiple={allowMultiple} className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
      </div>

      {/* Thumbnails grid */}
      {showThumbnail && images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((img, i) => (
            <div key={i} className="group relative overflow-hidden rounded-lg border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.name} className="h-28 w-full object-cover" />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2">
                <div className="text-xs text-white space-y-0.5">
                  <p className="font-medium truncate">{img.name}</p>
                  {showDimensions && <p className="text-white/70">{img.width}×{img.height}</p>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1 h-6 w-6 p-0 text-white/70 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-black/30"
                onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {images.length > 0 && (
        <Button variant="ghost" size="sm" onClick={() => setImages([])}>Clear All</Button>
      )}
    </motion.div>
  );
}

// ========== Code Generators ==========
function generateFileUploadCode(props: { maxFileSizeMB: number; acceptedTypes: string; apiEndpoint: string; showProgress: boolean }) {
  return `"use client";

import { useState, useCallback } from "react";

interface FileUploadProps {
  maxFileSizeMB?: number;
  acceptedTypes?: string;
  apiEndpoint?: string;
  showProgress?: boolean;
  onUploadComplete?: (cdnUrl: string) => void;
}

export function FileUpload({
  maxFileSizeMB = ${props.maxFileSizeMB},
  acceptedTypes = "${props.acceptedTypes}",
  apiEndpoint = "${props.apiEndpoint}",
  showProgress = ${props.showProgress},
  onUploadComplete,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback(async (file: File) => {
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      setError(\`File too large. Max: \${maxFileSizeMB} MB\`);
      return;
    }
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, fileSize: file.size }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const { uploadUrl, cdnUrl } = await res.json();

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => { setUploading(false); setProgress(100); onUploadComplete?.(cdnUrl); };
      xhr.onerror = () => { setError("Upload failed"); setUploading(false); };
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
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
      onDragOver={(e) => e.preventDefault()}
      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center hover:border-primary/50"
    >
      {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
      <input type="file" accept={acceptedTypes} onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} className="hidden" id="file-upload" />
      <label htmlFor="file-upload" className="cursor-pointer">{uploading ? "Uploading..." : "Drop a file or click to upload"}</label>
      {showProgress && uploading && (
        <div className="mt-3 w-full max-w-xs">
          <div className="h-2 rounded-full bg-gray-200"><div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: \`\${progress}%\` }} /></div>
          <p className="mt-1 text-xs text-gray-500">{progress}%</p>
        </div>
      )}
      <p className="mt-2 text-xs text-gray-400">Max: {maxFileSizeMB} MB · {acceptedTypes || "All types"}</p>
    </div>
  );
}`;
}

function generateAvatarUploadCode(props: { size: number; shape: string; showRemove: boolean }) {
  return `"use client";

import { useState, useRef } from "react";

interface AvatarUploadProps {
  size?: number;
  shape?: "circle" | "rounded";
  showRemove?: boolean;
  onAvatarChange?: (dataUrl: string | null) => void;
}

export function AvatarUpload({
  size = ${props.size},
  shape = "${props.shape}",
  showRemove = ${props.showRemove},
  onAvatarChange,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setPreview(url);
      onAvatarChange?.(url);
    };
    reader.readAsDataURL(file);
  };

  const remove = () => { setPreview(null); onAvatarChange?.(null); };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={\`relative flex items-center justify-center border-2 border-dashed overflow-hidden cursor-pointer hover:border-primary/50 \${shape === "circle" ? "rounded-full" : "rounded-xl"}\`}
        style={{ width: size, height: size }}
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onDragOver={(e) => e.preventDefault()}
      >
        {preview ? (
          <img src={preview} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="size-1/3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
      <div className="flex gap-2">
        <button onClick={() => inputRef.current?.click()} className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50">
          {preview ? "Change" : "Upload"}
        </button>
        {showRemove && preview && (
          <button onClick={remove} className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50">Remove</button>
        )}
      </div>
    </div>
  );
}`;
}

function generateImageUploadCode(props: { maxFileSizeMB: number; showDimensions: boolean; allowMultiple: boolean }) {
  return `"use client";

import { useState, useCallback, useRef } from "react";

interface ImageUploadProps {
  maxFileSizeMB?: number;
  showDimensions?: boolean;
  allowMultiple?: boolean;
  onImagesChange?: (images: { name: string; url: string; width: number; height: number }[]) => void;
}

export function ImageUpload({
  maxFileSizeMB = ${props.maxFileSizeMB},
  showDimensions = ${props.showDimensions},
  allowMultiple = ${props.allowMultiple},
  onImagesChange,
}: ImageUploadProps) {
  const [images, setImages] = useState<{ name: string; url: string; width: number; height: number }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((fileList: FileList) => {
    const files = ${props.allowMultiple} ? Array.from(fileList).slice(0, 6) : [fileList[0]];
    files.forEach((file) => {
      if (!file?.type.startsWith("image/")) return;
      if (file.size > maxFileSizeMB * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setImages((prev) => {
            const next = allowMultiple ? prev : [];
            const updated = [...next, { name: file.name, url: e.target?.result as string, width: img.width, height: img.height }].slice(0, 6);
            onImagesChange?.(updated);
            return updated;
          });
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, [maxFileSizeMB, allowMultiple, onImagesChange]);

  return (
    <div className="space-y-4">
      <div
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        onDragOver={(e) => e.preventDefault()}
        className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center hover:border-primary/50"
      >
        <input ref={inputRef} type="file" accept="image/*" multiple={allowMultiple} className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
        <p className="text-sm">Drop images here</p>
        <button onClick={() => inputRef.current?.click()} className="mt-2 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50">Browse</button>
      </div>
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((img, i) => (
            <div key={i} className="relative overflow-hidden rounded-lg border">
              <img src={img.url} alt={img.name} className="h-28 w-full object-cover" />
              {showDimensions && <p className="p-1 text-xs text-center text-gray-500">{img.width}×{img.height}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}`;
}

// ========== Main Component ==========
type ComponentType = "file-upload" | "avatar-upload" | "image-upload";

const COMPONENT_OPTIONS: { value: ComponentType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "file-upload", label: "File Upload", icon: <FileUp className="size-4" />, description: "Drag & drop file upload with progress bar" },
  { value: "avatar-upload", label: "Avatar Upload", icon: <User className="size-4" />, description: "Circular / rounded avatar uploader" },
  { value: "image-upload", label: "Image Upload", icon: <ImageIcon className="size-4" />, description: "Multi-image uploader with thumbnails" },
];

export function ComponentsPreviewTab({ bucket }: ComponentsPreviewTabProps) {
  const [selectedComponent, setSelectedComponent] = useState<ComponentType>("file-upload");

  // File Upload props
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(bucket.config?.maxFileSizeMB ?? 100);
  const [showProgress, setShowProgress] = useState(true);
  const [showDragDrop, setShowDragDrop] = useState(true);
  const [acceptedTypes, setAcceptedTypes] = useState("image/*,application/pdf");
  const [apiEndpoint, setApiEndpoint] = useState("/api/upload");

  // Avatar Upload props
  const [avatarSize, setAvatarSize] = useState(128);
  const [avatarShape, setAvatarShape] = useState<"circle" | "rounded">("circle");
  const [avatarShowRemove, setAvatarShowRemove] = useState(true);

  // Image Upload props
  const [imgMaxSize, setImgMaxSize] = useState(bucket.config?.maxFileSizeMB ?? 100);
  const [imgShowDimensions, setImgShowDimensions] = useState(true);
  const [imgShowThumbnail, setImgShowThumbnail] = useState(true);
  const [imgAllowMultiple, setImgAllowMultiple] = useState(true);

  const getCode = () => {
    switch (selectedComponent) {
      case "file-upload":
        return generateFileUploadCode({ maxFileSizeMB, acceptedTypes, apiEndpoint, showProgress });
      case "avatar-upload":
        return generateAvatarUploadCode({ size: avatarSize, shape: avatarShape, showRemove: avatarShowRemove });
      case "image-upload":
        return generateImageUploadCode({ maxFileSizeMB: imgMaxSize, showDimensions: imgShowDimensions, allowMultiple: imgAllowMultiple });
    }
  };

  const getTitle = () => {
    switch (selectedComponent) {
      case "file-upload": return "components/file-upload.tsx";
      case "avatar-upload": return "components/avatar-upload.tsx";
      case "image-upload": return "components/image-upload.tsx";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Eye className="size-5" />
          Component Preview
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Interactive preview of ready-to-use upload components configured for this bucket.
        </p>
      </div>

      {/* Component selector */}
      <div className="grid gap-3 sm:grid-cols-3">
        {COMPONENT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelectedComponent(opt.value)}
            className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
              selectedComponent === opt.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
            }`}
          >
            <div className={`mt-0.5 rounded-md p-1.5 ${selectedComponent === opt.value ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {opt.icon}
            </div>
            <div>
              <p className="text-sm font-medium">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </div>
          </button>
        ))}
      </div>

      <Tabs defaultValue="preview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="preview" className="gap-1.5"><Eye className="size-3.5" /> Preview</TabsTrigger>
          <TabsTrigger value="props" className="gap-1.5"><Settings2 className="size-3.5" /> Props Editor</TabsTrigger>
          <TabsTrigger value="code" className="gap-1.5"><Code2 className="size-3.5" /> Full Code</TabsTrigger>
        </TabsList>

        {/* ========== Preview Tab ========== */}
        <TabsContent value="preview">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                Live Preview
                <Badge variant="secondary" className="text-xs">Interactive</Badge>
              </CardTitle>
              <CardDescription>
                Try the component — drag a file or click to simulate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                <motion.div key={selectedComponent} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  {selectedComponent === "file-upload" && (
                    <FileUploadPreview
                      maxFileSizeMB={maxFileSizeMB}
                      showProgress={showProgress}
                      showDragDrop={showDragDrop}
                      acceptedTypes={acceptedTypes}
                    />
                  )}
                  {selectedComponent === "avatar-upload" && (
                    <AvatarUploadPreview
                      size={avatarSize}
                      shape={avatarShape}
                      showRemove={avatarShowRemove}
                    />
                  )}
                  {selectedComponent === "image-upload" && (
                    <ImageUploadPreview
                      maxFileSizeMB={imgMaxSize}
                      showDimensions={imgShowDimensions}
                      showThumbnail={imgShowThumbnail}
                      allowMultiple={imgAllowMultiple}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== Props Editor Tab ========== */}
        <TabsContent value="props">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Props Editor</CardTitle>
              <CardDescription>Adjust props to see the component update in the Preview tab</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <AnimatePresence mode="wait">
                <motion.div key={selectedComponent} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {/* File Upload Props */}
                  {selectedComponent === "file-upload" && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Max File Size (MB)</Label>
                          <Input type="number" min={1} max={5000} value={maxFileSizeMB} onChange={(e) => setMaxFileSizeMB(Number(e.target.value) || 1)} />
                          <p className="text-xs text-muted-foreground">Bucket default: {bucket.config?.maxFileSizeMB ?? 100} MB</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Accepted Types</Label>
                          <Input value={acceptedTypes} onChange={(e) => setAcceptedTypes(e.target.value)} placeholder="image/*,application/pdf" />
                        </div>
                        <div className="space-y-2">
                          <Label>API Endpoint</Label>
                          <Input value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)} placeholder="/api/upload" />
                        </div>
                      </div>
                      <Separator />
                      <div className="flex flex-wrap gap-6">
                        <div className="flex items-center gap-2"><Switch checked={showProgress} onCheckedChange={setShowProgress} /><Label>Show Progress Bar</Label></div>
                        <div className="flex items-center gap-2"><Switch checked={showDragDrop} onCheckedChange={setShowDragDrop} /><Label>Drag & Drop Zone</Label></div>
                      </div>
                    </>
                  )}

                  {/* Avatar Upload Props */}
                  {selectedComponent === "avatar-upload" && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Avatar Size (px)</Label>
                          <Input type="number" min={48} max={256} value={avatarSize} onChange={(e) => setAvatarSize(Number(e.target.value) || 128)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Shape</Label>
                          <Select value={avatarShape} onValueChange={(v: "circle" | "rounded") => setAvatarShape(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="circle">Circle</SelectItem>
                              <SelectItem value="rounded">Rounded Square</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-center gap-2"><Switch checked={avatarShowRemove} onCheckedChange={setAvatarShowRemove} /><Label>Show Remove Button</Label></div>
                    </>
                  )}

                  {/* Image Upload Props */}
                  {selectedComponent === "image-upload" && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Max File Size (MB)</Label>
                          <Input type="number" min={1} max={5000} value={imgMaxSize} onChange={(e) => setImgMaxSize(Number(e.target.value) || 1)} />
                        </div>
                      </div>
                      <Separator />
                      <div className="flex flex-wrap gap-6">
                        <div className="flex items-center gap-2"><Switch checked={imgShowDimensions} onCheckedChange={setImgShowDimensions} /><Label>Show Dimensions</Label></div>
                        <div className="flex items-center gap-2"><Switch checked={imgShowThumbnail} onCheckedChange={setImgShowThumbnail} /><Label>Show Thumbnails</Label></div>
                        <div className="flex items-center gap-2"><Switch checked={imgAllowMultiple} onCheckedChange={setImgAllowMultiple} /><Label>Allow Multiple</Label></div>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== Code Tab ========== */}
        <TabsContent value="code">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Full Component Code</CardTitle>
              <CardDescription>Copy-paste ready component pre-configured for {bucket.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock title={getTitle()} language="typescript" code={getCode()} collapsible />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
