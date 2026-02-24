// Server component — reads the markdown file and passes content to the client DocsContent component
import { notFound } from "next/navigation";
import { promises as fs } from "fs";
import path from "path";
import { getDoc, DOCS } from "@/lib/docs";
import { DocsContent } from "@/components/docs-content";
import { BookOpen, FileCode2, Layers, Terminal } from "lucide-react";

const ICONS = { BookOpen, FileCode2, Layers, Terminal } as const;

const BADGE: Record<string, { label: string; className: string }> = {
  "setup-guide":        { label: "Setup",         className: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300" },
  "user-guide":         { label: "Getting Started", className: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
  "architecture-short": { label: "Quick Ref",     className: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300" },
  "architecture-full":  { label: "In Depth",      className: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" },
};

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
  const badge = BADGE[slug] ?? { label: "Docs", className: "bg-muted text-muted-foreground" };

  return (
    <article className="mx-auto max-w-3xl px-8 py-8 no-scrollbar">
      {/* Doc header card */}
      <div className="mb-8 flex items-start gap-4 rounded-xl border bg-muted/30 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background shadow-sm">
          <Icon className="size-5 text-foreground" />
        </div>
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-lg font-semibold text-foreground">{doc.title}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{doc.description}</p>
        </div>
      </div>

      {/* Client component: registers headings in context + renders markdown */}
      <DocsContent content={content} />
    </article>
  );
}

