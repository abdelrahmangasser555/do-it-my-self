// Docs manifest - metadata for all documentation files
export interface DocSection {
  id: string;
  title: string;
}

export interface DocEntry {
  slug: string;
  title: string;
  description: string;
  icon: string;
  filePath: string;
}

export const DOCS: DocEntry[] = [
  {
    slug: "setup-guide",
    title: "Setup Guide",
    description: "Install & configure everything from scratch",
    icon: "Terminal",
    filePath: "docs/setup-guide.md",
  },
  {
    slug: "user-guide",
    title: "User Guide",
    description: "How to use the dashboard day-to-day",
    icon: "BookOpen",
    filePath: "docs/user-guide.md",
  },
  {
    slug: "architecture-short",
    title: "Architecture Overview",
    description: "Quick reference for the system design",
    icon: "Layers",
    filePath: "docs/architecture-short.md",
  },
  {
    slug: "architecture-full",
    title: "Full Architecture",
    description: "Detailed technical documentation",
    icon: "FileCode2",
    filePath: "docs/architecture-full.md",
  },
];

export function getDoc(slug: string): DocEntry | undefined {
  return DOCS.find((d) => d.slug === slug);
}
