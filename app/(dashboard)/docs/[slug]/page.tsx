// Server component — reads the markdown file and passes it to client renderers
import { notFound } from "next/navigation";
import { promises as fs } from "fs";
import path from "path";
import { getDoc, DOCS } from "@/lib/docs";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { TableOfContents } from "@/components/table-of-contents";
import { BookOpen, FileCode2, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ICONS = {
  BookOpen,
  FileCode2,
  Layers,
} as const;

// Generate static params for all docs
export function generateStaticParams() {
  return DOCS.map((doc) => ({ slug: doc.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();

  const filePath = path.join(process.cwd(), doc.filePath);
  let content: string;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch {
    notFound();
  }

  const Icon = ICONS[doc.icon as keyof typeof ICONS] ?? BookOpen;

  // Badge colours per doc type
  const badgeMap: Record<string, string> = {
    "user-guide": "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    "architecture-short": "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
    "architecture-full": "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  };

  return (
    <div className="flex gap-0">
      {/* Content */}
      <article className="flex-1 min-w-0 px-8 py-8 max-w-4xl">
        {/* Doc header */}
        <div className="mb-8 flex items-start gap-4 rounded-xl border bg-muted/30 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background shadow-sm">
            <Icon className="size-5 text-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-semibold text-foreground">{doc.title}</h1>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeMap[slug] ?? "bg-muted text-muted-foreground"}`}
              >
                {slug === "user-guide"
                  ? "Getting Started"
                  : slug === "architecture-short"
                  ? "Quick Ref"
                  : "In Depth"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{doc.description}</p>
          </div>
        </div>

        {/* Rendered markdown */}
        <MarkdownRenderer content={content} />
      </article>

      {/* Right — table of contents */}
      <aside className="w-56 shrink-0 px-4 py-8 sticky top-[57px] self-start h-[calc(100vh-57px)] overflow-y-auto hidden xl:block border-l">
        <TableOfContents content={content} />
      </aside>
    </div>
  );
}
