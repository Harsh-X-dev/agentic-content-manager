/**
 * src/agents/qa.ts
 * ---------------------------------------------------------------------------
 * Step 3.5 of the agentic content pipeline: Research → Script → Scene → QA → Render
 *
 * Responsibility: Review the generated Script and ScenePlan for:
 *   - Factual inconsistencies between script narration and visual scene content
 *   - Unclear or contradictory explanations across sections
 *   - Mismatched terminology between sections/scenes
 *
 * Returns a structured QAResult with:
 *   - passed: boolean
 *   - issues: string[] (specific issues naming the exact section/scene)
 * ---------------------------------------------------------------------------
 */

import "dotenv/config";
import { fileURLToPath } from "url";
import { getModel } from "../lib/model.ts";
import { z } from "zod";
import type { Script } from "./script.ts";
import type { ScenePlan } from "./scene.ts";

// ---------------------------------------------------------------------------
// 1. Schema — defines structured QA review output
// ---------------------------------------------------------------------------

export const QAResultSchema = z.object({
  /** True if no critical contradictions, terminology mismatches, or inconsistencies exist. */
  passed: z
    .boolean()
    .describe(
      "True if the script and scene plan are consistent, accurate, and free of contradictions; false otherwise."
    ),

  /**
   * List of concrete issues found. Each item must name the section/scene number.
   * If passed is true, issues should be empty [].
   */
  issues: z
    .array(z.string())
    .describe(
      "Specific issues found. Each issue must explicitly reference which section/scene it concerns (e.g. 'Section 2 / Scene 2: ...'). Empty if passed is true."
    ),
});

/** TypeScript type inferred from the schema — import this in other files. */
export type QAResult = z.infer<typeof QAResultSchema>;

// ---------------------------------------------------------------------------
// 2. Model — with structured output
// ---------------------------------------------------------------------------

const model = getModel().withStructuredOutput(QAResultSchema);

// ---------------------------------------------------------------------------
// 3. Agent function
// ---------------------------------------------------------------------------

/**
 * Runs a QA check on the generated script and scene plan.
 *
 * @param script - The video script with hook and narration sections.
 * @param scenePlan - The visual scenes corresponding to the script sections.
 * @returns A QAResult object with passed status and any specific issues identified.
 */
export async function qaAgent(
  script: Script,
  scenePlan: ScenePlan
): Promise<QAResult> {
  const sectionsFormatted = script.sections
    .map((s, i) => `Section ${i + 1} (${s.durationSec}s narration):\n  "${s.narration}"`)
    .join("\n\n");

  const scenesFormatted = scenePlan.scenes
    .map((scene, i) => {
      let contentStr = "";
      if (scene.type === "diagram") {
        contentStr = `Nodes: [${scene.content.nodes.join(", ")}], Connections: ${JSON.stringify(scene.content.connections)}`;
      } else {
        contentStr = scene.content;
      }
      return `Scene ${i + 1} (type: ${scene.type}, ${scene.durationSec}s):\n  ${contentStr}`;
    })
    .join("\n\n");

  const prompt = `
You are a meticulous QA reviewer for a developer-education short-video pipeline.

Your task is to critically inspect both the video script and the corresponding visual scene plan for quality, consistency, and correctness before video rendering.

Review Checklist:
1. Script vs Scene consistency:
   - Does each visual scene accurately match what the narration describes in that section?
   - Are there factual contradictions between the spoken narration and visual text/diagrams/code?
2. Logical clarity and coherence:
   - Are explanations contradictory or confusing across sections?
   - Is terminology used consistently (e.g., not calling a component "daemon" in one section and conflictingly describing it in another)?
3. Alignment:
   - Does the number of scenes match the sections, and are scene types suitable for the described content?

Rules for \`issues\`:
- Be specific. Every issue MUST explicitly name which section and/or scene it concerns (e.g. "Section 2 / Scene 2: The narration explains namespaces, but the scene diagram only references cgroups.").
- If no significant issues are found, set \`passed: true\` and \`issues: []\`.
- If any factual contradictions, mismatched terminology, or misleading visual elements exist, set \`passed: false\` and list each issue.

=== SCRIPT ===
Hook: "${script.hook}"

Sections:
${sectionsFormatted}

=== SCENE PLAN ===
${scenesFormatted}

Return only the structured QA result — no preamble, no markdown fences.
`.trim();

  const result = await model.invoke(prompt);
  return result;
}

// ---------------------------------------------------------------------------
// 4. Standalone smoke test
//    Usage: npx tsx src/agents/qa.ts
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const isMain =
  process.argv[1] !== undefined && __filename === process.argv[1];

if (isMain) {
  console.log("🔍 Running QA agent smoke test on sample data...\n");

  const sampleScript: Script = {
    hook: "Containers changed software delivery forever.",
    sections: [
      {
        narration: "Docker packages an application with all its dependencies into an isolated container.",
        durationSec: 10,
      },
      {
        narration: "Unlike virtual machines, containers share the host operating system kernel.",
        durationSec: 12,
      },
    ],
  };

  const sampleScenePlan: ScenePlan = {
    scenes: [
      {
        type: "text",
        content: "Docker packages apps & dependencies into isolated containers",
        durationSec: 10,
      },
      {
        type: "diagram",
        content: {
          nodes: ["App", "Docker Engine", "Host OS Kernel"],
          connections: [
            { from: "App", to: "Docker Engine" },
            { from: "Docker Engine", to: "Host OS Kernel" },
          ],
        },
        durationSec: 12,
      },
    ],
  };

  const result = await qaAgent(sampleScript, sampleScenePlan);
  console.log("QAResult:", JSON.stringify(result, null, 2));
}
