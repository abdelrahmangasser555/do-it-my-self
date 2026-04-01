// File extension → icon + color mapping for the file explorer
import Image from 'next/image';
import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  FileJson,
  File,
  type LucideIcon,
} from 'lucide-react';

interface FileIconInfo {
  icon: LucideIcon;
  color: string;
  bg: string;
  /** Optional custom image path — overrides the Lucide icon when present */
  imageIconSrc?: string;
}

const IMAGE_EXTS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'bmp',
  'ico',
  'avif',
  'tiff',
  'heic',
]);

const EXT_MAP: Record<string, FileIconInfo> = {
  // Images
  jpg: { icon: FileImage, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  jpeg: { icon: FileImage, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  png: { icon: FileImage, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  gif: { icon: FileImage, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  webp: { icon: FileImage, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  svg: { icon: FileCode, color: 'text-teal-500', bg: 'bg-teal-500/10' },
  ico: { icon: FileImage, color: 'text-gray-500', bg: 'bg-gray-500/10' },
  bmp: { icon: FileImage, color: 'text-orange-500', bg: 'bg-orange-500/10' },

  // Video
  mp4: { icon: FileVideo, color: 'text-red-500', bg: 'bg-red-500/10' },
  mov: { icon: FileVideo, color: 'text-red-500', bg: 'bg-red-500/10' },
  avi: { icon: FileVideo, color: 'text-red-500', bg: 'bg-red-500/10' },
  webm: { icon: FileVideo, color: 'text-red-400', bg: 'bg-red-400/10' },
  mkv: { icon: FileVideo, color: 'text-red-600', bg: 'bg-red-600/10' },

  // Audio
  mp3: { icon: FileAudio, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  wav: { icon: FileAudio, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ogg: { icon: FileAudio, color: 'text-purple-600', bg: 'bg-purple-600/10' },
  flac: { icon: FileAudio, color: 'text-purple-600', bg: 'bg-purple-600/10' },

  // Documents
  pdf: { icon: FileText, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  doc: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-600/10' },
  docx: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-600/10' },
  txt: { icon: FileText, color: 'text-slate-500', bg: 'bg-slate-500/10' },
  md: { icon: FileText, color: 'text-slate-500', bg: 'bg-slate-500/10' },
  rtf: { icon: FileText, color: 'text-slate-500', bg: 'bg-slate-500/10' },

  // Spreadsheets
  xls: { icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-600/10' },
  xlsx: { icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-600/10' },
  csv: { icon: FileSpreadsheet, color: 'text-green-500', bg: 'bg-green-500/10' },

  // Code
  js: { icon: FileCode, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  ts: { icon: FileCode, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  jsx: { icon: FileCode, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  tsx: { icon: FileCode, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  py: { icon: FileCode, color: 'text-yellow-600', bg: 'bg-yellow-600/10' },
  html: { icon: FileCode, color: 'text-orange-600', bg: 'bg-orange-600/10' },
  css: { icon: FileCode, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  json: { icon: FileJson, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  xml: { icon: FileCode, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  yaml: { icon: FileCode, color: 'text-red-400', bg: 'bg-red-400/10' },
  yml: { icon: FileCode, color: 'text-red-400', bg: 'bg-red-400/10' },

  // Archives
  zip: { icon: FileArchive, color: 'text-amber-600', bg: 'bg-amber-600/10' },
  rar: { icon: FileArchive, color: 'text-amber-600', bg: 'bg-amber-600/10' },
  gz: { icon: FileArchive, color: 'text-amber-600', bg: 'bg-amber-600/10' },
  tar: { icon: FileArchive, color: 'text-amber-600', bg: 'bg-amber-600/10' },
  '7z': { icon: FileArchive, color: 'text-amber-600', bg: 'bg-amber-600/10' },
};

const DEFAULT: FileIconInfo = { icon: File, color: 'text-muted-foreground', bg: 'bg-muted/30' };

export function getFileIconInfo(fileName: string): FileIconInfo {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return EXT_MAP[ext] ?? DEFAULT;
}

export function isImageFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTS.has(ext);
}

// ── FileIcon ────────────────────────────────────────────────────────────────
// Props:
//   cdnUrl        — if provided AND the file is an image, render an inline thumbnail
//   imageIconSrc  — override the icon with a custom image (e.g. logo path) via next/image

export function FileIcon({
  fileName,
  size = 'md',
  cdnUrl,
  imageIconSrc,
}: {
  fileName: string;
  size?: 'sm' | 'md' | 'lg';
  cdnUrl?: string;
  imageIconSrc?: string;
}) {
  const { icon: Icon, color, bg, imageIconSrc: mappedSrc } = getFileIconInfo(fileName);
  const sizeMap = { sm: 'size-8', md: 'size-12', lg: 'size-16' };
  const iconSize = { sm: 'size-4', md: 'size-6', lg: 'size-8' };
  const pxMap = { sm: 32, md: 48, lg: 64 };
  const px = pxMap[size];

  const customSrc = imageIconSrc ?? mappedSrc;

  // Priority 1: CDN URL for image files → show actual image thumbnail
  if (cdnUrl && isImageFile(fileName)) {
    return (
      <div
        className={`${sizeMap[size]} rounded-lg overflow-hidden flex items-center justify-center`}
        style={{ background: 'transparent' }}
      >
        <Image
          src={cdnUrl}
          alt={fileName}
          width={px}
          height={px}
          className="rounded-lg object-cover w-full h-full"
          unoptimized // CDN URLs are already optimized
          onError={(e) => {
            // fallback: hide and show nothing (parent stays sized)
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  // Priority 2: custom imageIconSrc (from EXT_MAP or explicit prop)
  if (customSrc) {
    return (
      <div
        className={`${sizeMap[size]} rounded-lg overflow-hidden flex items-center justify-center`}
        style={{ background: 'transparent' }}
      >
        <Image
          src={customSrc}
          alt={fileName}
          width={px}
          height={px}
          className="rounded-lg object-contain w-full h-full"
        />
      </div>
    );
  }

  // Default: Lucide icon
  return (
    <div className={`${sizeMap[size]} ${bg} rounded-lg flex items-center justify-center`}>
      <Icon className={`${iconSize[size]} ${color}`} />
    </div>
  );
}

export function FolderIcon({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'size-8', md: 'size-12', lg: 'size-16' };
  const innerSize = { sm: 'size-4', md: 'size-6', lg: 'size-8' };

  return (
    <div className={`${sizeMap[size]} bg-amber-500/10 rounded-lg flex items-center justify-center`}>
      <svg className={`${innerSize[size]} text-amber-500`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
      </svg>
    </div>
  );
}
