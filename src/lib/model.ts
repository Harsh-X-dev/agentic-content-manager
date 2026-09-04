/**
 * src/lib/model.ts
 * ---------------------------------------------------------------------------
 * Centralized model factory — the single place to change AI provider or model.
 *
 * Usage in any agent:
 *   import { getModel } from "../lib/model.ts";
 *   const model = getModel().withStructuredOutput(MySchema);
 *
 * Switching providers: set MODEL_PROVIDER in .env — no agent code changes needed.
 *
 * Adding a new provider later:
 *   1. Install the package (e.g. npm install @langchain/openai)
 *   2. Add an else-if branch below for the new provider string
 *   3. Update .env: MODEL_PROVIDER=openai
 *   That's it — every agent picks it up automatically.
 * ---------------------------------------------------------------------------
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenRouter } from "@langchain/openrouter";
// When you're ready to add OpenAI directly, uncomment and run:
// npm install @langchain/openai
// import { ChatOpenAI } from "@langchain/openai";

// ---------------------------------------------------------------------------
// Provider config — read from environment
// ---------------------------------------------------------------------------

const MODEL_PROVIDER = process.env["MODEL_PROVIDER"] ?? "gemini";

// Model names per provider — the only line to change when upgrading a model.
// Agent files never reference these constants; they only call getModel().
const GEMINI_MODEL = "gemini-1.5-flash"; // 1,500 req/day free tier
const OPENROUTER_MODEL = process.env["OPENROUTER_MODEL"] ?? ""; // e.g. "anthropic/claude-sonnet-4-5"
// const OPENAI_MODEL = "gpt-4o-mini"; // ready for when OpenAI is added directly

// ---------------------------------------------------------------------------
// getModel()
//
// Returns a base chat model instance. The return type is the provider-specific
// class, but every caller only uses the shared .withStructuredOutput() API,
// so agent files stay provider-agnostic.
//
// Each agent calls .withStructuredOutput(itsOwnSchema) on the result.
// That binding stays per-agent because every agent has a different schema —
// only the base model construction lives here.
// ---------------------------------------------------------------------------

export function getModel() {
  if (MODEL_PROVIDER === "gemini") {
    return new ChatGoogleGenerativeAI({
      model: GEMINI_MODEL,
      // GOOGLE_API_KEY is read from process.env automatically (loaded via dotenv)
    });
  }

  if (MODEL_PROVIDER === "openrouter") {
    if (!OPENROUTER_MODEL) {
      throw new Error(
        "OPENROUTER_MODEL is not set in .env. " +
        "Set it to a model string like \"anthropic/claude-sonnet-4-5\"."
      );
    }
    return new ChatOpenRouter({
      model: OPENROUTER_MODEL,
      // OPENROUTER_API_KEY is read from process.env automatically
    });
  }

  // Placeholder for OpenAI direct — adding it is a 2-line change:
  //   1. Uncomment the import above
  //   2. Uncomment the block below
  // if (MODEL_PROVIDER === "openai") {
  //   return new ChatOpenAI({ model: OPENAI_MODEL });
  // }

  // Unknown provider — fail fast with a clear message instead of a
  // confusing runtime error deep inside an agent.
  throw new Error(
    `Unknown MODEL_PROVIDER="${MODEL_PROVIDER}". ` +
    `Supported values: "gemini", "openrouter". ` +
    `Check your .env file.`
  );
}
