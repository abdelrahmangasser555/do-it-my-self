import fs from 'fs/promises';
import path from 'path';

const PROJECT_ICON_DIR = path.join(process.cwd(), 'public', 'project-icons');
const PROJECT_ICON_URL_PREFIX = '/project-icons/';

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/svg+xml': '.svg',
  'image/webp': '.webp',
};

function parseImageDataUrl(imageDataUrl: string) {
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);

  if (!match) {
    throw new Error('Invalid project image payload');
  }

  const [, mimeType, base64Data] = match;
  const extension = MIME_TO_EXTENSION[mimeType] ?? '.png';

  return {
    buffer: Buffer.from(base64Data, 'base64'),
    extension,
  };
}

export async function persistProjectAvatar(
  projectId: string,
  imageDataUrl: string,
): Promise<string> {
  const { buffer, extension } = parseImageDataUrl(imageDataUrl);

  await fs.mkdir(PROJECT_ICON_DIR, { recursive: true });

  const fileName = `${projectId}-${Date.now()}${extension}`;
  await fs.writeFile(path.join(PROJECT_ICON_DIR, fileName), buffer);

  return `${PROJECT_ICON_URL_PREFIX}${fileName}`;
}

export async function removeProjectAvatar(imagePath?: string | null) {
  if (!imagePath?.startsWith(PROJECT_ICON_URL_PREFIX)) {
    return;
  }

  const fileName = imagePath.slice(PROJECT_ICON_URL_PREFIX.length);
  if (!fileName || fileName.includes('..')) {
    return;
  }

  await fs.unlink(path.join(PROJECT_ICON_DIR, fileName)).catch(() => {});
}
