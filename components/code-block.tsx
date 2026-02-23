// Code block component with syntax highlighting using prism-react-renderer
"use client";

import { useState } from "react";
import { Highlight, themes } from "prism-react-renderer";
import { Check, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  maxHeight?: string;
}

// Map human-readable language labels to Prism language identifiers
const LANGUAGE_MAP: Record<string, string> = {
  typescript: "tsx",
  javascript: "javascript",
  python: "python",
  bash: "bash",
  shell: "bash",
  env: "bash",
  json: "json",
  java: "java",
  tsx: "tsx",
  jsx: "jsx",
  yaml: "yaml",
  csharp: "csharp",
};

export function CodeBlock({
  code,
  language = "typescript",
  title,
  className,
  collapsible = false,
  defaultCollapsed = false,
  maxHeight = "max-h-[28rem]",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const prismLang = LANGUAGE_MAP[language.toLowerCase()] || "tsx";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "group rounded-lg border bg-[#1e1e2e] overflow-hidden",
        className
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#181825] px-4 py-2">
        <div className="flex items-center gap-2">
          {/* Traffic-light dots */}
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-red-400/70" />
            <span className="size-2.5 rounded-full bg-yellow-400/70" />
            <span className="size-2.5 rounded-full bg-green-400/70" />
          </div>
          {title && (
            <span className="ml-2 text-sm font-medium text-white/60">
              {title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs text-white/40">{language}</span>
          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-white/50 hover:text-white hover:bg-white/10"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronUp className="size-3.5" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-white/50 hover:text-white hover:bg-white/10"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="size-3.5 text-green-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Code body */}
      {!collapsed && (
        <ScrollArea className={maxHeight}>
          <Highlight theme={themes.nightOwl} code={code.trim()} language={prismLang}>
            {({ className: hlClassName, style, tokens, getLineProps, getTokenProps }) => (
              <pre
                className={cn(hlClassName, "p-4 text-sm leading-relaxed")}
                style={{ ...style, background: "transparent", margin: 0 }}
              >
                {tokens.map((line, i) => {
                  const lineProps = getLineProps({ line, key: i });
                  return (
                    <div
                      key={i}
                      {...lineProps}
                      className={cn(lineProps.className, "table-row")}
                    >
                      <span className="table-cell select-none pr-4 text-right text-xs text-white/20">
                        {i + 1}
                      </span>
                      <span className="table-cell">
                        {line.map((token, j) => (
                          <span key={j} {...getTokenProps({ token, key: j })} />
                        ))}
                      </span>
                    </div>
                  );
                })}
              </pre>
            )}
          </Highlight>
        </ScrollArea>
      )}
    </div>
  );
}
