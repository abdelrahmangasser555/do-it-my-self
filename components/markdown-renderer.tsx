// Beautiful markdown renderer using react-markdown with custom shadcn-styled components
"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { Check, Copy, Info, Lightbulb, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Code block with copy button ──────────────────────────────────────────────
function CodeBlock({
  children,
  language,
}: {
  children: string;
  language: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDiagram = !language || language === "text" || language === "diagram";

  return (
    <div className="my-4 overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between border-b bg-muted/80 px-4 py-2">
        <span className="font-mono text-xs font-medium text-muted-foreground">
          {language || "plaintext"}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        </Button>
      </div>
      <pre
        className={cn(
          "overflow-x-auto p-4 text-sm leading-relaxed",
          isDiagram
            ? "bg-muted/30 font-mono text-xs leading-5 tracking-tight"
            : "bg-background"
        )}
      >
        <code className="font-mono">{children}</code>
      </pre>
    </div>
  );
}

// ── Callout (blockquote override) ────────────────────────────────────────────
function Callout({ children }: { children?: React.ReactNode }) {
  const text = String(children);
  const isWarning = text.toLowerCase().includes("warning") || text.toLowerCase().includes("note:");
  const isTip = text.toLowerCase().includes("tip") || text.toLowerCase().includes("important");

  return (
    <div
      className={cn(
        "my-4 flex gap-3 rounded-lg border p-4",
        isWarning
          ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-950/20"
          : isTip
          ? "border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20"
          : "border-border bg-muted/40"
      )}
    >
      <div className="mt-0.5 shrink-0">
        {isWarning ? (
          <AlertTriangle className="size-4 text-yellow-600 dark:text-yellow-400" />
        ) : isTip ? (
          <Lightbulb className="size-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <Info className="size-4 text-muted-foreground" />
        )}
      </div>
      <div className="text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

// ── Table styling ─────────────────────────────────────────────────────────────
function StyledTable({ children }: { children?: React.ReactNode }) {
  return (
    <div className="my-4 overflow-hidden rounded-lg border">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

function THead({ children }: { children?: React.ReactNode }) {
  return <thead className="bg-muted/60">{children}</thead>;
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="border-b px-4 py-2.5 text-left font-semibold text-foreground">
      {children}
    </th>
  );
}

function Td({ children }: { children?: React.ReactNode }) {
  return (
    <td className="border-b px-4 py-2.5 text-muted-foreground last:border-0">
      {children}
    </td>
  );
}

function Tr({ children }: { children?: React.ReactNode }) {
  return (
    <tr className="transition-colors hover:bg-muted/30">{children}</tr>
  );
}

// ── Horizontal Rule ───────────────────────────────────────────────────────────
function HR() {
  return <hr className="my-8 border-border" />;
}

// ── Headings with anchor IDs ──────────────────────────────────────────────────
function toId(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function H1({ children }: { children?: React.ReactNode }) {
  const id = toId(String(children));
  return (
    <h1 id={id} className="mb-6 mt-2 text-3xl font-bold tracking-tight text-foreground">
      {children}
    </h1>
  );
}

function H2({ children }: { children?: React.ReactNode }) {
  const id = toId(String(children));
  return (
    <h2
      id={id}
      className="mb-4 mt-10 flex items-center gap-2 text-xl font-semibold text-foreground first:mt-0 scroll-mt-6"
    >
      <span className="inline-block h-5 w-1 rounded-full bg-primary" />
      {children}
    </h2>
  );
}

function H3({ children }: { children?: React.ReactNode }) {
  const id = toId(String(children));
  return (
    <h3
      id={id}
      className="mb-3 mt-6 text-base font-semibold text-foreground scroll-mt-6"
    >
      {children}
    </h3>
  );
}

function H4({ children }: { children?: React.ReactNode }) {
  return (
    <h4 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h4>
  );
}

// ── Paragraph, List ──────────────────────────────────────────────────────────
function P({ children }: { children?: React.ReactNode }) {
  return <p className="mb-4 leading-7 text-muted-foreground">{children}</p>;
}

function UL({ children }: { children?: React.ReactNode }) {
  return (
    <ul className="mb-4 ml-6 list-disc space-y-1 text-muted-foreground [&_li]:leading-7">
      {children}
    </ul>
  );
}

function OL({ children }: { children?: React.ReactNode }) {
  return (
    <ol className="mb-4 ml-6 list-decimal space-y-1 text-muted-foreground [&_li]:leading-7">
      {children}
    </ol>
  );
}

function Strong({ children }: { children?: React.ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

// ── Main Component ────────────────────────────────────────────────────────────
interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // pre just passes through to the code handler below
        pre: ({ children }) => <>{children}</>,
        code: ({ className, children }) => {
          const language = /language-(\w+)/.exec(className ?? "")?.[1] ?? "";
          const text = String(children).replace(/\n$/, "");
          // Block code: has a language class OR contains newlines
          if (language || text.includes("\n")) {
            return <CodeBlock language={language}>{text}</CodeBlock>;
          }
          // Inline code
          return (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
              {children}
            </code>
          );
        },
        blockquote: ({ children }) => <Callout>{children}</Callout>,
        table: ({ children }) => <StyledTable>{children}</StyledTable>,
        thead: ({ children }) => <THead>{children}</THead>,
        th: ({ children }) => <Th>{children}</Th>,
        td: ({ children }) => <Td>{children}</Td>,
        tr: ({ children }) => <Tr>{children}</Tr>,
        hr: () => <HR />,
        h1: ({ children }) => <H1>{children}</H1>,
        h2: ({ children }) => <H2>{children}</H2>,
        h3: ({ children }) => <H3>{children}</H3>,
        h4: ({ children }) => <H4>{children}</H4>,
        p: ({ children }) => <P>{children}</P>,
        ul: ({ children }) => <UL>{children}</UL>,
        ol: ({ children }) => <OL>{children}</OL>,
        strong: ({ children }) => <Strong>{children}</Strong>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
