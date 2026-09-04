/**
 * testAi.ts — quick OpenAI-compatible API tester.
 *
 * Use this BEFORE integrating any AI provider into the app.
 * It makes a single chat completion call and prints the reply.
 *
 * RUN:
 *   cd backend
 *   node testAi.ts                          # default model + prompt
 *   node testAi.ts "your prompt here"       # custom prompt
 *
 * CONFIG (env vars, loaded from backend/.env):
 *   AI_BASE_URL    optional — default https://opencode.ai/zen/v1
 *   AI_MODEL       optional — default mimo-v2.5-free
 *   API key        OPENCODE_API_KEY, else OPENROUTER_API_KEY (in .env)
 *
 * EXAMPLE — test another provider before integrating:
 *   AI_BASE_URL="https://integrate.api.nvidia.com/v1" \
 *   AI_MODEL="deepseek-ai/deepseek-v4-pro-0813" \
 *   OPENCODE_API_KEY="nvapi-..." node testAi.ts "Say hello"
 *
 * The `openai` SDK is already installed (via @livekit/agents-plugin-openai),
 * so no install needed. This script touches nothing else in the app.
 */

import "dotenv/config";
import OpenAI from "openai";

const apiKey =
  process.env.OPENCODE_API_KEY ||
  process.env.OPENROUTER_API_KEY ||
  process.env.AI_API_KEY ||
  "";
const baseURL = process.env.AI_BASE_URL || "https://opencode.ai/zen/v1";
const model = process.env.AI_MODEL || "mimo-v2.5-free";

if (!apiKey) {
  console.error(
    "❌ No API key found.\n" +
      "   Set OPENCODE_API_KEY (or OPENROUTER_API_KEY) in backend/.env, or pass it inline:\n" +
      '   OPENCODE_API_KEY=opencode-... node testAi.ts'
  );
  process.exit(1);
}

const client = new OpenAI({ apiKey, baseURL });

const prompt =
  process.argv[2] ?? "write a short story";

console.log(`\n[${model}] via ${baseURL}`);
console.log(`> ${prompt}\n`);

try {
  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 1,
    top_p: 0.95,
    max_tokens: 2048,
    seed: 42,
    stream: false,
  });

  console.log("--------------------------------------------------");
  console.log(completion.choices[0]?.message?.content ?? "(empty response)");
  console.log("--------------------------------------------------");
  console.log(`✅ OK — ${completion.usage?.total_tokens ?? "?"} tokens used`);
} catch (err: any) {
  console.error("❌ Request failed:", err?.message || err);
  console.error(
    "   Check the key, model slug, base URL, and your network."
  );
  process.exit(1);
}