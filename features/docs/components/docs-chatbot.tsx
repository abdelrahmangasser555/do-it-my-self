// AI-powered documentation chatbot with session memory (AI SDK v6)
"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { cn } from "@/lib/utils";

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function DocsChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    sendMessage,
    setMessages,
    status,
    error,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/docs-chat",
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Toggle button */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setOpen(true)}
              size="lg"
              className="h-12 w-12 rounded-full shadow-lg"
            >
              <MessageCircle className="size-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.35 }}
            className="fixed bottom-6 right-6 z-50 flex flex-col w-100 h-140 rounded-xl border bg-background shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <span className="font-semibold text-sm">Docs Assistant</span>
                <Badge variant="outline" className="text-[10px] h-5">
                  AI
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={clearChat}
                    title="Clear chat"
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-4"
            >
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                  <Bot className="size-10 text-muted-foreground/50" />
                  <div>
                    <p className="text-sm font-medium">
                      Ask anything about the docs
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      I can help with setup, usage, architecture, and more.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                    {[
                      "How do I set up AWS credentials?",
                      "How to create a new bucket?",
                      "What's the architecture?",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          sendMessage({ text: suggestion });
                        }}
                        className="text-[11px] px-2.5 py-1.5 rounded-full border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => {
                const text = getTextContent(message);
                if (!text) return null;
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2.5",
                      message.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="mt-0.5 shrink-0 flex items-start">
                        <div className="rounded-full bg-primary/10 p-1.5">
                          <Bot className="size-3.5 text-primary" />
                        </div>
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm max-w-[85%]",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0 prose-pre:my-1 max-w-none [&_pre]:text-xs">
                          <MarkdownRenderer content={text} />
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{text}</p>
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="mt-0.5 shrink-0 flex items-start">
                        <div className="rounded-full bg-muted p-1.5">
                          <User className="size-3.5" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {status === "submitted" && (
                <div className="flex gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    <div className="rounded-full bg-primary/10 p-1.5">
                      <Bot className="size-3.5 text-primary" />
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                  {error.message || "Something went wrong. Please try again."}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t px-3 py-2.5 flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about the docs..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground min-h-9 max-h-25 py-2"
                style={{ fieldSizing: "content" } as React.CSSProperties}
              />
              <Button
                type="button"
                size="sm"
                disabled={!input.trim() || isLoading}
                onClick={handleSend}
                className="h-8 w-8 shrink-0 p-0"
              >
                {isLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
