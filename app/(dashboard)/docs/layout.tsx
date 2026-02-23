// Docs layout — doc list on the left, ToC on the right, content in center
import Link from "next/link";
import { BookOpen, FileCode2, Layers } from "lucide-react";
import { DOCS } from "@/lib/docs";
import { cn } from "@/lib/utils";

const ICONS = {
  BookOpen,
  FileCode2,
  Layers,
} as const;

interface DocsLayoutProps {
  children: React.ReactNode;
}

export default function DocsLayout({ children }: DocsLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <div className="border-b bg-background/95 backdrop-blur px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Documentation</span>
        </div>
      </div>

      <div className="flex flex-1 gap-0">
        {/* Left sidebar — doc list */}
        <aside className="w-60 shrink-0 border-r px-4 py-6 sticky top-[57px] self-start h-[calc(100vh-57px)] overflow-y-auto">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">
            Documents
          </p>
          <nav className="space-y-1">
            {DOCS.map((doc) => {
              const Icon = ICONS[doc.icon as keyof typeof ICONS] ?? BookOpen;
              return (
                <Link
                  key={doc.slug}
                  href={`/docs/${doc.slug}`}
                  className={cn(
                    "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
                    "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium leading-tight text-foreground">
                      {doc.title}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground leading-snug">
                      {doc.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Decorative illustration */}
          <div className="mt-8 rounded-lg border bg-muted/30 p-4">
            <div className="mb-2 flex gap-1.5">
              <div className="h-2 w-2 rounded-full bg-red-400" />
              <div className="h-2 w-2 rounded-full bg-yellow-400" />
              <div className="h-2 w-2 rounded-full bg-green-400" />
            </div>
            <div className="space-y-1.5">
              <div className="h-1.5 w-20 rounded-full bg-muted-foreground/20" />
              <div className="h-1.5 w-16 rounded-full bg-primary/40" />
              <div className="h-1.5 w-24 rounded-full bg-muted-foreground/20" />
              <div className="h-1.5 w-12 rounded-full bg-muted-foreground/10" />
              <div className="h-1.5 w-20 rounded-full bg-muted-foreground/20" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground leading-snug">
              Internal reference — last updated with each deploy.
            </p>
          </div>
        </aside>

        {/* Main content area — children supply both content and right ToC via slot pattern */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
