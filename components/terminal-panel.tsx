// Integrated terminal panel — collapsible log viewer with command input
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
  Send,
  Loader2,
  Square,
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
  const { lines, isOpen, setIsOpen, clear, runCommand, killCommand, isRunning, commandHistory } = useTerminal();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<LogLevel | "all">("all");
  const [command, setCommand] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Auto-scroll to bottom on new log lines
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [lines]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const filteredLines =
    filter === "all" ? lines : lines.filter((l) => l.level === filter);

  const errorCount = lines.filter((l) => l.level === "error").length;
  const warnCount = lines.filter((l) => l.level === "warn").length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = command.trim();
    if (!trimmed || isRunning) return;
    setCommand("");
    setHistoryIndex(-1);
    runCommand(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || "");
      } else {
        setHistoryIndex(-1);
        setCommand("");
      }
    }
  };

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

      {/* Floating open button when no lines yet */}
      {!isOpen && lines.length === 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-[#181825] text-white border-white/10 hover:bg-[#1e1e2e] hover:text-white shadow-lg"
            onClick={() => setIsOpen(true)}
          >
            <Terminal className="size-4" />
            Terminal
          </Button>
        </div>
      )}

      {/* Terminal panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#1e1e2e] shadow-2xl flex flex-col",
              expanded ? "top-0" : "h-96"
            )}
          >
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-white/10 bg-[#181825] px-4 py-2 shrink-0">
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
                {isRunning && (
                  <>
                    <Badge className="bg-purple-500/20 text-purple-400 text-xs px-1.5 py-0 gap-1">
                      <Loader2 className="size-3 animate-spin" /> Running
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1"
                      onClick={killCommand}
                      title="Kill process (Ctrl+C)"
                    >
                      <Square className="size-3" /> Kill
                    </Button>
                  </>
                )}
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
            <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
              {filteredLines.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm text-white/30">
                  {lines.length === 0
                    ? "Type a command below, or deploy/run an action to see output here."
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

            {/* Command input */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-white/10 bg-[#181825] px-4 py-2 shrink-0"
            >
              <span className="text-sm font-mono text-green-400 select-none">$</span>
              <input
                ref={inputRef}
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isRunning ? "Waiting for command to finish..." : "Type a command and press Enter..."}
                disabled={isRunning}
                className="flex-1 bg-transparent text-sm font-mono text-white/90 placeholder:text-white/30 outline-none disabled:opacity-50"
                autoComplete="off"
                spellCheck={false}
              />
              <Button
                type={isRunning ? "button" : "submit"}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 w-7 p-0 hover:bg-white/10",
                  isRunning
                    ? "text-red-400 hover:text-red-300"
                    : "text-white/40 hover:text-white"
                )}
                disabled={!isRunning && !command.trim()}
                onClick={isRunning ? killCommand : undefined}
                title={isRunning ? "Kill process" : "Run command"}
              >
                {isRunning ? (
                  <Square className="size-3.5" />
                ) : (
                  <Send className="size-3.5" />
                )}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
