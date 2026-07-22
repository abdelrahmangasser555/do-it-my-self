// Docs chatbot API — streaming chat with Vercel AI SDK, grounded on local docs
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import fs from "fs/promises";
import path from "path";
import { DOCS } from "@/lib/docs";

// Load all documentation files once per cold start and cache
let docsCache: string | null = null;

async function loadAllDocs(): Promise<string> {
  if (docsCache) return docsCache;

  const sections: string[] = [];

  for (const doc of DOCS) {
    try {
      const filePath = path.join(process.cwd(), doc.filePath);
      const content = await fs.readFile(filePath, "utf-8");
      sections.push(
        `--- ${doc.title} (${doc.slug}) ---\n${content}\n`
      );
    } catch {
      sections.push(`--- ${doc.title} (${doc.slug}) ---\n[Document not found]\n`);
    }
  }

  docsCache = sections.join("\n");
  return docsCache;
}

function buildSystemPrompt(docsContent: string): string {
  return `You are a helpful documentation assistant embedded in the "Storage Control Room" dashboard.
Storage Control Room is a Next.js internal tool for managing AWS S3 buckets, CloudFront distributions, and infrastructure via AWS CDK.

Your role:
- Answer user questions about the tool based ONLY on the documentation provided below.
- Be concise, practical, and helpful.
- Format responses in Markdown. Use code blocks with language tags for commands/code.
- When referencing specific pages, mention the doc title (e.g., "See the Setup Guide for details").
- If the user asks something not covered in the docs, say so clearly rather than guessing.
- NEVER fabricate AWS commands, bucket names, or infrastructure details that aren't in the docs.
- NEVER provide advice that could lead to data loss without clear warnings.
- Keep answers focused on the documentation content. Do not answer general programming questions unrelated to this tool.

Documentation content:
${docsContent}`;
}

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const docsContent = await loadAllDocs();
    const system = buildSystemPrompt(docsContent);

    // Convert UIMessage[] (from @ai-sdk/react useChat) to CoreMessage[] (for streamText)
    // UIMessage uses { role, parts: [{ type: "text", text }] } format
    // streamText expects { role, content: string } format
    const coreMessages = messages.map((m: Record<string, unknown>) => ({
      role: m.role as "user" | "assistant" | "system",
      content: Array.isArray(m.parts)
        ? (m.parts as Array<{ type: string; text?: string }>)
            .filter((p) => p.type === "text")
            .map((p) => p.text ?? "")
            .join("")
        : typeof m.content === "string"
          ? m.content
          : "",
    }));

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system,
      messages: coreMessages,
      temperature: 0.3,
      maxOutputTokens: 1500,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat request failed";

    if (message.includes("API key") || message.includes("401") || message.includes("authentication")) {
      return new Response(
        JSON.stringify({
          error: "OpenAI API key not configured. Set OPENAI_API_KEY in .env.local",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
