// AI API route — command generation & error debugging using Vercel AI SDK + OpenAI
import { NextRequest } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

// Use OPENAI_API_KEY from .env.local or system env
const getModel = () => openai("gpt-4o-mini");

const SYSTEM_PROMPT = `You are an expert DevOps / cloud engineer assistant embedded in the "Storage Control Room" dashboard.
This is a Next.js internal tool that manages AWS S3 buckets + CloudFront distributions via AWS CDK.

The user's environment:
- Windows with PowerShell 5.1 (NEVER use && to chain commands, use ; instead)
- AWS CLI v2 installed
- AWS CDK v2 (TypeScript)
- Node.js installed
- CDK project is at ./infrastructure/cdk relative to the project root

When generating commands:
- Always use PowerShell-compatible syntax (use ; not && for chaining)
- Prefer aws CLI and npx cdk commands
- Keep commands practical and safe
- If a command is destructive, warn the user in your description

When debugging errors:
- Analyze the error output carefully
- Suggest specific fixes
- Include runnable commands when applicable
- Be concise but thorough`;

export async function POST(request: NextRequest) {
  try {
    const { action, prompt, errorOutput, command: failedCommand } = await request.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: "action is required (generate | debug)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let userPrompt = "";

    if (action === "generate") {
      if (!prompt) {
        return new Response(
          JSON.stringify({ error: "prompt is required for generate action" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      userPrompt = `Generate a shell command for the following task. Respond with a JSON object with these fields:
- "command": the exact command to run (PowerShell 5.1 compatible)
- "label": a short human label (3-6 words)
- "description": a one-sentence description of what it does
- "dangerous": true if the command is destructive/irreversible, false otherwise

Task: ${prompt}

Respond ONLY with the JSON object, no markdown, no code blocks.`;
    } else if (action === "debug") {
      if (!errorOutput) {
        return new Response(
          JSON.stringify({ error: "errorOutput is required for debug action" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      userPrompt = `Debug the following terminal error. Respond with a JSON object with these fields:
- "diagnosis": a clear explanation of what went wrong (1-3 sentences)
- "fixCommands": array of objects with "command" (the fix command) and "description" (what it does)
- "tips": array of preventive tips (strings, max 3)

${failedCommand ? `Command that failed: ${failedCommand}` : ""}

Error output:
${errorOutput}

Respond ONLY with the JSON object, no markdown, no code blocks.`;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use 'generate' or 'debug'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await generateText({
      model: getModel(),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.3,
      maxOutputTokens: 1000,
    });

    // Parse the AI response as JSON
    let parsed;
    try {
      // Strip any markdown code fences just in case
      const cleaned = result.text
        .replace(/^```json?\n?/m, "")
        .replace(/\n?```$/m, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If JSON parsing fails, return the raw text
      parsed = { raw: result.text };
    }

    return new Response(
      JSON.stringify({ action, result: parsed }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed";
    // Check for common API key issues
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
