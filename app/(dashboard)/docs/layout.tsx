// Docs layout — sticky two-column with context-driven in-page ToC on the left
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FileCode2, Layers, Terminal } from "lucide-react";
import { DOCS } from "@/lib/docs";
import { DocsProvider, useDocsContext } from "@/components/docs-context";
import { DocsChatbot } from "@/features/docs/components/docs-chatbot";
import { cn } from "@/lib/utils";

const ICONS = { BookOpen, FileCode2, Layers, Terminal } as const;

// ── Sidebar — doc list + contextual in-page section links ───────────────────
function DocsSidebar() {
  const pathname = usePathname();
  const { headings } = useDocsContext();
  // Show h1 and h2 only in section nav
  const sections = headings.filter((h) => h.level <= 2);

  return (
    <aside className="w-60 shrink-0 border-r flex flex-col overflow-y-auto">
      {/* Doc navigation */}
      <div className="px-4 pt-6 pb-4">
        <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Documents
        </p>
        <nav className="space-y-1">
          {DOCS.map((doc) => {
            const Icon = ICONS[doc.icon as keyof typeof ICONS] ?? BookOpen;
            const isActive = pathname === `/docs/${doc.slug}`;
            return (
              <Link
                key={doc.slug}
                href={`/docs/${doc.slug}`}
                className={cn(
                  "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Icon className="mt-0.5 size-4 shrink-0" />
                <div>
                  <div className="text-sm font-medium leading-tight text-foreground">
                    {doc.title}
                  </div>
                  <div className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    {doc.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t" />

      {/* In-page section links — driven by current doc's headings via context */}
      {sections.length > 0 && (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            On this page
          </p>
          <nav className="space-y-0.5">
            {sections.map((h) => (
              <a
                key={h.id}
                href={`#${h.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById(h.id)
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className={cn(
                  "block rounded py-1.5 text-sm leading-snug transition-colors hover:text-foreground",
                  h.level === 1
                    ? "px-2 font-medium text-foreground"
                    : "pl-4 text-muted-foreground"
                )}
              >
                {h.text}
              </a>
            ))}
          </nav>
        </div>
      )}

      {/* Decorative card */}
      <div className="mx-4 mb-6 mt-auto rounded-lg border bg-muted/30 p-4">
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
        </div>
        <p className="mt-3 text-xs leading-snug text-muted-foreground">
          Local-only · No hosting
        </p>
      </div>
    </aside>
  );
}

// ── Layout ───────────────────────────────────────────────────────────────────
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <DocsProvider>
      {/*
       * -m-6 cancels the p-6 applied by the parent dashboard <main>.
       * Fixed height = full viewport minus the 56px dashboard header.
       * Two columns each scroll independently — no page-level overflow.
       */}
      <div className="-m-6 flex " style={{ height: "calc(100vh - 56px)" }}>
        <DocsSidebar />
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden no-scrollbar">
          {children}
        </div>
        <DocsChatbot />
      </div>
    </DocsProvider>
  );
}
