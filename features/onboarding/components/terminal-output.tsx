// Styled terminal output viewer for onboarding command results
"use client";

import { useRef, useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface TerminalLine {
  type: string;
  message: string;
  level: string;
}

interface TerminalOutputProps {
  lines: TerminalLine[];
  maxHeight?: string;
  collapsible?: boolean;
}

function getLineColor(level: string, type: string): string {
  if (type === "command") return "text-primary";
  switch (level) {
    case "error":
      return "text-red-400";
    case "warn":
      return "text-yellow-400";
    case "success":
      return "text-green-400";
    case "command":
      return "text-primary";
    default:
      return "text-muted-foreground";
  }
}

export function TerminalOutput({
  lines,
  maxHeight = "200px",
  collapsible = true,
}: TerminalOutputProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(!collapsible);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  if (lines.length === 0) return null;

  const visibleLines = expanded ? lines : lines.slice(-5);

  return (
    <div className="space-y-1">
      {collapsible && lines.length > 5 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="mr-1 size-3" /> Collapse output
            </>
          ) : (
            <>
              <ChevronDown className="mr-1 size-3" /> Show all {lines.length} lines
            </>
          )}
        </Button>
      )}
      <ScrollArea
        className="rounded-md bg-muted p-4"
        style={{ maxHeight }}
      >
        <div ref={scrollRef} className="space-y-0.5 font-mono text-xs">
          {visibleLines.map((line, i) => (
            <div key={i} className={getLineColor(line.level, line.type)}>
              {line.message}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
