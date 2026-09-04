/**
 * src/agents/script.ts
 * ---------------------------------------------------------------------------
 * Step 2 of the agentic content pipeline: Research → Script → Scene
 *
 * Responsibility: Turn a structured ResearchPackage (from research.ts) into
 * a timed video script — a punchy hook + a sequence of narration sections,
 * each with an estimated duration. The total should be 60-90 seconds.
 *
 * Stack:
 *   - @langchain/google-genai  → ChatGoogleGenerativeAI (Gemini)
 *   - zod                      → schema definition + TS type inference
 *   - withStructuredOutput()   → automatic parse + validation against schema
 * ---------------------------------------------------------------------------
 */

import "dotenv/config"; // Load GOOGLE_API_KEY from .env
import { fileURLToPath } from "url"; // needed for the isMain guard
import { getModel } from "../lib/model.ts";
import { z } from "zod";

// Import the output type from the previous pipeline stage.
// We consume a ResearchPackage and produce a Script.
import {
  type ResearchPackage,
  researchAgent,
} from "./research.ts";

// ---------------------------------------------------------------------------
// 1. Schema — defines exactly what the model must return
// ---------------------------------------------------------------------------

/**
 * A single narration section — roughly one keyFact from the research.
 * Each section maps 1:1 to a scene in the next pipeline stage.
 */
const SectionSchema = z.object({
  /** The words spoken in this section. Plain conversational language —
   *  no jargon left undefined. Should make sense read aloud. */
  narration: z
    .string()
    .describe(
      "What is spoken in this section. Plain, conversational language. No undefined jargon."
    ),

  /** Estimated seconds this narration takes at a natural speaking pace
   *  (~130 words/min). Used to align scene timing in the next stage. */
  durationSec: z
    .number()
    .describe(
      "Estimated seconds this narration takes at a natural speaking pace (~130 words/min)."
    ),
});

export const ScriptSchema = z.object({
  /** Punchy 1-2 sentence opening. Must grab attention in the first 3 seconds.
   *  Uses the research's suggestedAngle as the primary hook. */
  hook: z
    .string()
    .describe(
      "A punchy 1-2 sentence opener that grabs attention in the first 3 seconds. Drawn from the research's suggestedAngle."
    ),

  /** One section per keyFact, in a logical explaining order.
   *  Sections should sum to roughly 60-90 seconds total. */
  sections: z
    .array(SectionSchema)
    .min(3)
    .describe(
      "Narration sections — roughly one per keyFact, in logical order. Total durationSec should be 60-90 seconds."
    ),
});

/** TypeScript type inferred from the schema — import this in other files. */
export type Script = z.infer<typeof ScriptSchema>;

// ---------------------------------------------------------------------------
// 2. Model — Gemini 2.0 Flash with structured output
// ---------------------------------------------------------------------------

/**
 * getModel() returns the configured base chat model (provider set by
 * MODEL_PROVIDER in .env). We call .withStructuredOutput() here with this
 * agent's specific schema — that part stays per-agent because each agent
 * has a different schema.
 */
const model = getModel().withStructuredOutput(ScriptSchema);

// ---------------------------------------------------------------------------
// 3. Agent function
// ---------------------------------------------------------------------------

/**
 * Converts a ResearchPackage into a timed video script.
 *
 * @param research - The validated ResearchPackage from the previous stage.
 * @returns A Script with a hook and narration sections totalling 60-90 seconds.
 */
export async function scriptAgent(research: ResearchPackage): Promise<Script> {
  const prompt = `
You are a scriptwriter for a developer-education short-video channel.

Your audience: beginner-to-intermediate developers.
Your goal: write a script for a 60-90 second animated explainer video.

Use the research package below to write:
1. A hook — a punchy 1-2 sentence opener that grabs attention instantly.
   Base it on the suggestedAngle. Make it conversational and concrete.
2. A sequence of narration sections — roughly one per keyFact, in a logical
   explaining order (build up from basics, then go deeper).

Rules:
- Use plain conversational language. Write it as it would be spoken aloud.
  If you must use a technical term, immediately explain it in simple words.
- Each section's narration should take ~8-15 seconds to say at a natural pace.
- Total durationSec across ALL sections must be between 60 and 90 seconds.
- durationSec should be realistic — estimate ~130 words per minute.
- Do NOT include the hook's duration in the sections; the hook is separate.

Research package:
  Topic: ${research.topic}
  Suggested angle / hook idea: ${research.suggestedAngle}
  Key facts (turn each into a section):
${research.keyFacts.map((f, i) => `    ${i + 1}. ${f}`).join("\n")}

Return only the structured script — no preamble, no markdown fences.
`.trim();

  // withStructuredOutput handles parsing and validation — returns a typed Script.
  const result = await model.invoke(prompt);
  return result;
}

// ---------------------------------------------------------------------------
// 4. Self-test — only runs when executed directly
//    Usage: npx tsx src/agents/script.ts
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const isMain =
  process.argv[1] !== undefined && __filename === process.argv[1];

if (isMain) {
  console.log("🔬 Running script agent pipeline test...\n");

  // Step 1: Run the research agent first
  console.log("Step 1/2 — Researching: 'How does Docker work?'");
  const research = await researchAgent("How does Docker work?");
  console.log("✅ Research done.\n");

  // Step 2: Feed the research into this script agent
  console.log("Step 2/2 — Generating script...");
  const script = await scriptAgent(research);

  console.log("\n✅ Script output:\n");
  console.log(JSON.stringify(script, null, 2));

  // Print a quick timing summary
  const totalSec = script.sections.reduce((sum, s) => sum + s.durationSec, 0);
  console.log(`\n⏱  Total script duration: ${totalSec}s (target: 60-90s)`);
}
