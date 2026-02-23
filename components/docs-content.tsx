// Client component — parses headings from markdown, registers them in context, renders content
"use client";

import { useEffect, useRef, useState } from "react";
import { useDocsContext, DocHeading } from "@/components/docs-context";
import { MarkdownRenderer } from "@/components/markdown-renderer";

function extractHeadings(markdown: string): DocHeading[] {
  const result: DocHeading[] = [];
  for (const line of markdown.split("\n")) {
    const match = line.match(/^(#{1,4})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      result.push({ id, text, level });
    }
  }
  return result;
}

export function DocsContent({ content }: { content: string }) {
  const { setHeadings } = useDocsContext();

  useEffect(() => {
    const headings = extractHeadings(content).filter((h) => h.level <= 3);
    setHeadings(headings);
    return () => setHeadings([]);
  }, [content, setHeadings]);

  return <MarkdownRenderer content={content} />;
}
