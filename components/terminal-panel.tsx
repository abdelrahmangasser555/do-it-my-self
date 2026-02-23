// Integrated terminal panel — collapsible log viewer with colored output
"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Terminal,
  X,
  Trash2,
  ChevronUp,
  Filter,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useTerminal, type LogLevel, type TerminalLine } from "@/lib/terminal-context";
import { cn } from "@/lib/utils";

const LEVEL_STYLES: Record<LogLevel, { color: string; label: string }> = {
  info: { color: "text-blue-400", label: "INFO" },
  warn: { color: "text-yellow-400", label: "WARN" },
  error: { color: "text-red-400", label: "ERR " },
  success: { color: "text-green-400", label: " OK " },
  command: { color: "text-purple-400", label: "CMD " },
};

function TerminalLineRow({ line }: { line: TerminalLine }) {
  const style = LEVEL_STYLES[line.level];
  const time = new Date(line.timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex gap-2 px-4 py-0.5 font-mono text-xs leading-5 hover:bg-white/5">
      <span className="select-none text-white/30">{time}</span>
      <span className={cn("w-10 select-none font-bold", style.color)}>
        [{style.label}]
      </span>
      {line.source && (
        <span className="select-none text-white/40">[{line.source}]</span>
      )}
      <span
        className={cn(
          "whitespace-pre-wrap break-all",
          line.level === "error" && "text-red-300",
          line.level === "success" && "text-green-300",
          line.level === "warn" && "text-yellow-300",
          line.level === "command" && "text-purple-300",
          line.level === "info" && "text-white/80"
        )}
      >
        {line.message}
      </span>
    </div>
  );
}

export function TerminalPanel() {
  const { lines, isOpen, setIsOpen, clear } = useTerminal();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<LogLevel | "all">("all");

  // Auto-scroll to bottom on new log lines
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [lines]);

  const filteredLines =
    filter === "all" ? lines : lines.filter((l) => l.level === filter);

  const errorCount = lines.filter((l) => l.level === "error").length;
  const warnCount = lines.filter((l) => l.level === "warn").length;

  return (
    <>
      {/* Toggle button when closed */}
      <AnimatePresence>
        {!isOpen && lines.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-[#181825] text-white border-white/10 hover:bg-[#1e1e2e] hover:text-white shadow-lg"
              onClick={() => setIsOpen(true)}
            >
              <Terminal className="size-4" />
              Terminal
              {errorCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0">
                  {errorCount}
                </Badge>
              )}
              {warnCount > 0 && errorCount === 0 && (
                <Badge className="bg-yellow-500/20 text-yellow-400 text-xs px-1.5 py-0">
                  {warnCount}
                </Badge>
              )}
              <ChevronUp className="size-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terminal panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#1e1e2e] shadow-2xl",
              expanded ? "top-0" : "h-80"
            )}
          >
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-white/10 bg-[#181825] px-4 py-2">
              <div className="flex items-center gap-3">
                <Terminal className="size-4 text-white/60" />
                <span className="text-sm font-medium text-white/80">
                  Terminal
                </span>
                <Badge
                  variant="outline"
                  className="text-xs text-white/40 border-white/10"
                >
                  {lines.length} lines
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                    {errorCount} errors
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* Filter dropdown */}
                <div className="flex items-center gap-0.5 mr-2">
                  <Filter className="size-3 text-white/40 mr-1" />
                  {(["all", "info", "warn", "error", "success", "command"] as const).map(
                    (level) => (
                      <Button
                        key={level}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-6 px-2 text-xs text-white/40 hover:text-white hover:bg-white/10",
                          filter === level && "bg-white/10 text-white"
                        )}
                        onClick={() => setFilter(level)}
                      >
                        {level === "all" ? "All" : level.charAt(0).toUpperCase() + level.slice(1)}
                      </Button>
                    )
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-white/40 hover:text-white hover:bg-white/10"
                  onClick={clear}
                  title="Clear"
                >
                  <Trash2 className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-white/40 hover:text-white hover:bg-white/10"
                  onClick={() => setExpanded(!expanded)}
                  title={expanded ? "Minimize" : "Maximize"}
                >
                  {expanded ? (
                    <Minimize2 className="size-3.5" />
                  ) : (
                    <Maximize2 className="size-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-white/40 hover:text-white hover:bg-white/10"
                  onClick={() => setIsOpen(false)}
                  title="Close"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Log lines */}
            <ScrollArea className="h-[calc(100%-2.5rem)]" ref={scrollRef}>
              {filteredLines.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm text-white/30">
                  {lines.length === 0
                    ? "No logs yet. Deploy or run a command to see output here."
                    : `No ${filter} logs.`}
                </div>
              ) : (
                <div className="py-2">
                  {filteredLines.map((line) => (
                    <TerminalLineRow key={line.id} line={line} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
