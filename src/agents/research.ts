/**
 * src/agents/research.ts
 * ---------------------------------------------------------------------------
 * Step 2 of the agentic content pipeline.
 *
 * Responsibility: Given a topic string, produce a structured ResearchPackage
 * that downstream agents (script writer, scene generator, etc.) can consume
 * directly — no ambiguous free-text, no manual JSON.parse.
 *
 * Stack:
 *   - @langchain/google-genai  → ChatGoogleGenerativeAI (Gemini)
 *   - zod                      → schema definition + TS type inference
 *   - withStructuredOutput()   → automatic parse + validation against schema
 * ---------------------------------------------------------------------------
 */

import "dotenv/config"; // Load GOOGLE_API_KEY (and others) from .env
import { fileURLToPath } from "url"; // needed for the isMain guard below
import { getModel } from "../lib/model.ts";
import { z } from "zod";

// ---------------------------------------------------------------------------
// 1. Schema — defines exactly what the model must return
// ---------------------------------------------------------------------------

/**
 * The validated research package returned by this agent.
 *
 * Every field is designed so that downstream steps can use it directly:
 *   - keyFacts   → one fact per animated scene in the video
 *   - sources    → cited in the video description / credits
 *   - suggestedAngle → the hook used in the script's opening line
 */
export const ResearchPackageSchema = z.object({
  /** The original topic passed in — carried through for traceability. */
  topic: z.string().describe("The research topic exactly as provided."),

  /**
   * 4-6 concise, technically accurate facts about the topic.
   * Each fact must be specific enough to become one ~10-second scene
   * in a 60-90 second animated explainer video.
   */
  keyFacts: z
    .array(z.string())
    .min(4)
    .max(6)
    .describe(
      "4 to 6 concise, technically accurate facts. Each should be self-contained and specific enough to fill one short animated scene."
    ),

  /**
   * Types of authoritative sources that back the key facts.
   * Keep these general (e.g. "official documentation", "RFC spec") —
   * do NOT invent fake URLs.
   */
  sources: z
    .array(z.string())
    .min(1)
    .describe(
      "Types of authoritative sources consulted (e.g. 'official docs', 'CNCF white paper'). No invented URLs."
    ),

  /**
   * A single sentence: the best analogy or hook for explaining this
   * topic to a beginner-to-intermediate developer for the first time.
   */
  suggestedAngle: z
    .string()
    .describe(
      "One sentence: the best analogy or hook for introducing this topic to a beginner-to-intermediate developer."
    ),
});

/** TypeScript type inferred from the schema — import this in other files. */
export type ResearchPackage = z.infer<typeof ResearchPackageSchema>;

// ---------------------------------------------------------------------------
// 2. Model — Gemini via @langchain/google-genai
// ---------------------------------------------------------------------------

/**
 * getModel() returns the configured base chat model (provider set by
 * MODEL_PROVIDER in .env). We call .withStructuredOutput() here with this
 * agent's specific schema — that part stays per-agent because each agent
 * has a different schema.
 */
const model = getModel().withStructuredOutput(ResearchPackageSchema);

// ---------------------------------------------------------------------------
// 3. Agent function
// ---------------------------------------------------------------------------

/**
 * Researches a developer topic and returns a typed ResearchPackage.
 *
 * @param topic - The technology / concept to research.
 *                e.g. "How does Docker work?"
 * @returns A validated ResearchPackage ready for the script-writing step.
 */
export async function researchAgent(topic: string): Promise<ResearchPackage> {
  const prompt = `
You are a research assistant for a developer-education short-video channel.

Your audience: beginner-to-intermediate developers learning modern tech.
Your output will be used to produce a 60-90 second animated explainer video.

Research the following topic thoroughly and return a structured research package:

Topic: ${topic}

Guidelines:
- keyFacts: provide exactly 4-6 facts. Each fact must be:
    * Technically accurate and specific (no vague generalisations)
    * Self-contained (readable independently)
    * Concise enough to fit in a ~10-second animated scene
- sources: list the *types* of authoritative sources that back your facts
    (e.g. "Docker official documentation", "OCI specification", "CNCF white paper").
    Do NOT invent URLs or fake citations.
- suggestedAngle: write ONE sentence that gives the best analogy or hook
    for explaining this topic to someone encountering it for the first time.
    Good analogies make abstract tech tangible (e.g. "Docker is like shipping
    containers for software — same box, any ship.").

Return only the structured data — no preamble, no markdown fences.
`.trim();

  // The model already has withStructuredOutput applied, so invoking it
  // returns a typed ResearchPackage directly.
  const result = await model.invoke(prompt);

  return result;
}

// ---------------------------------------------------------------------------
// 4. Quick smoke test — runs ONLY when this file is executed directly
//    Usage: npx tsx src/agents/research.ts
// ---------------------------------------------------------------------------

// tsx sets process.argv[1] to the raw OS path; import.meta.url is a
// file:// URL (with %20 for spaces). fileURLToPath normalises both to
// a plain OS path so the comparison is reliable on every platform.
const __filename = fileURLToPath(import.meta.url);
const isMain =
  process.argv[1] !== undefined &&
  __filename === process.argv[1];

if (isMain) {
  console.log("🔍 Running research agent smoke test...\n");

  const result = await researchAgent("How does Docker work?");

  console.log("ResearchPackage:\n");
  console.log(JSON.stringify(result, null, 2));
}
