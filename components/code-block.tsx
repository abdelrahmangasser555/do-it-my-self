// Code block component for displaying copy-paste code snippets
"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  className?: string;
}

export function CodeBlock({ code, language = "typescript", title, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("rounded-lg border bg-muted/50 overflow-hidden", className)}>
      {title && (
        <div className="flex items-center justify-between border-b px-4 py-2 bg-muted">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{language}</span>
            <Button variant="ghost" size="icon-xs" onClick={handleCopy}>
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            </Button>
          </div>
        </div>
      )}
      {!title && (
        <div className="flex justify-end px-2 py-1">
          <Button variant="ghost" size="icon-xs" onClick={handleCopy}>
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          </Button>
        </div>
      )}
      <ScrollArea className="max-h-96">
        <pre className="p-4 text-sm leading-relaxed">
          <code className="font-mono">{code}</code>
        </pre>
      </ScrollArea>
    </div>
  );
}
