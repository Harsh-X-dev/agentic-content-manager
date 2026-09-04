/**
 * src/agents/scene.ts
 * ---------------------------------------------------------------------------
 * Step 3 of the agentic content pipeline: Research → Script → Scene
 *
 * Responsibility: Convert a Script into a visual ScenePlan where:
 *   - "text" and "codeBlock" scenes carry content as a plain string
 *   - "diagram" scenes carry structured { nodes, connections } data
 *     that DiagramScene.tsx renders as real boxes and arrows
 *
 * ⚠️  Gemini API limitation: the response_schema doesn't support the JSON
 * Schema "const" keyword, which Zod emits for z.literal() and
 * z.discriminatedUnion(). So we use a FLAT schema (GeminiSceneSchema) for
 * the API call, then transform the result into our proper discriminated-union
 * type (Scene) before returning. The rest of the pipeline only ever sees the
 * clean discriminated type.
 * ---------------------------------------------------------------------------
 */

import "dotenv/config";
import { fileURLToPath } from "url";
import { getModel } from "../lib/model.ts";
import { z } from "zod";

import { researchAgent } from "./research.ts";
import { type Script, scriptAgent } from "./script.ts";

// ---------------------------------------------------------------------------
// 1a. Exported types — the discriminated union the rest of the pipeline uses
// ---------------------------------------------------------------------------

export type DiagramContent = {
  nodes: string[];
  connections: { from: string; to: string }[];
};

export type Scene =
  | { type: "text";      content: string;         durationSec: number }
  | { type: "codeBlock"; content: string;         durationSec: number }
  | { type: "diagram";   content: DiagramContent; durationSec: number };

export type ScenePlan = { scenes: Scene[] };

// ---------------------------------------------------------------------------
// 1b. Gemini-compatible flat schema — no z.literal(), no z.discriminatedUnion()
//
// We keep content as a plain string field (for text/codeBlock scenes) and add
// two optional fields for diagram data. Gemini can handle optional object fields
// without using "const", so this compiles to a schema the API accepts.
// ---------------------------------------------------------------------------

const GeminiSceneSchema = z.object({
  /**
   * Scene type — determines which React component renders it.
   * ⚠️  Must be z.string(), NOT z.enum() — Gemini's schema converter
   * turns z.enum into oneOf/const which the API rejects.
   * Valid values: "text", "diagram", "codeBlock"
   */
  type: z
    .string()
    .describe(
      "Scene type. Write exactly one of: text, diagram, codeBlock"
    ),

  /**
   * For "text" scenes: the short phrase shown on screen.
   * For "codeBlock" scenes: the exact code/command.
   * For "diagram" scenes: write exactly "diagram" (the real content goes in diagramNodes/diagramConnections).
   */
  content: z
    .string()
    .describe(
      "For 'text': short punchy phrase to show on screen. " +
      "For 'codeBlock': the exact code or command. " +
      "For 'diagram': write the string 'diagram' — real content goes in diagramNodes and diagramConnections."
    ),

  /**
   * Diagram-only: short labels for each box (2-4 words each, unique).
   * Leave empty for text/codeBlock scenes.
   */
  diagramNodes: z
    .array(z.string())
    .optional()
    .describe(
      "DIAGRAM SCENES ONLY. Short labels for each node box (2-4 words, unique). " +
      "Example: [\"Docker CLI\", \"Docker Daemon\", \"containerd\", \"runc\", \"Container\"]"
    ),

  /**
   * Diagram-only: arrows between nodes. Each from/to must exactly match a diagramNodes label.
   * Leave empty for text/codeBlock scenes.
   */
  diagramConnections: z
    .array(
      z.object({
        from: z.string().describe("Source node label — must match a value in diagramNodes."),
        to: z.string().describe("Target node label — must match a value in diagramNodes."),
      })
    )
    .optional()
    .describe(
      "DIAGRAM SCENES ONLY. Directed arrows between nodes. " +
      "Each from/to must exactly match a label in diagramNodes."
    ),

  /** Copy durationSec exactly from the corresponding script section. */
  durationSec: z
    .number()
    .describe("Duration in seconds — copy exactly from the script section."),
});

const GeminiScenePlanSchema = z.object({
  scenes: z
    .array(GeminiSceneSchema)
    .min(1)
    .describe("One scene per narration section, in the same order as the script."),
});

// ---------------------------------------------------------------------------
// 1c. Transform: flat Gemini output → clean discriminated-union ScenePlan
// ---------------------------------------------------------------------------

type GeminiScene = z.infer<typeof GeminiSceneSchema>;

function toScene(raw: GeminiScene): Scene {
  // Normalise in case the model adds extra whitespace or wrong casing
  const type = raw.type.trim().toLowerCase();

  if (type === "diagram") {
    return {
      type: "diagram",
      content: {
        nodes: raw.diagramNodes ?? [],
        connections: raw.diagramConnections ?? [],
      },
      durationSec: raw.durationSec,
    };
  }

  if (type === "codeblock" || type === "codeBlock") {
    return { type: "codeBlock", content: raw.content, durationSec: raw.durationSec };
  }

  // Default to "text" for anything unrecognised
  return { type: "text", content: raw.content, durationSec: raw.durationSec };
}

// ---------------------------------------------------------------------------
// 2. Model — Gemini with structured output (flat schema)
// ---------------------------------------------------------------------------

/**
 * getModel() returns the configured base chat model (provider set by
 * MODEL_PROVIDER in .env). We call .withStructuredOutput() here with this
 * agent's specific schema — that part stays per-agent because each agent
 * has a different schema.
 */
const model = getModel().withStructuredOutput(GeminiScenePlanSchema);

// ---------------------------------------------------------------------------
// 3. Agent function — returns the clean discriminated-union ScenePlan
// ---------------------------------------------------------------------------

export async function sceneAgent(script: Script): Promise<ScenePlan> {
  const sectionsText = script.sections
    .map((s, i) => `Section ${i + 1} (${s.durationSec}s):\n  "${s.narration}"`)
    .join("\n\n");

  const prompt = `
You are a visual director for a developer-education short-video channel.

Convert each narration section below into ONE visual scene. Scenes are rendered
as animated slides in a React/Remotion video.

Choose the scene type that best fits each section:
  - "diagram"   → comparisons, architecture, how things connect or relate
  - "codeBlock" → actual syntax, a CLI command, a Dockerfile, config snippet
  - "text"      → concepts, definitions, or facts best shown as a headline

=== CONTENT RULES ===

"text" scenes:
  content → a short, punchy key phrase (NOT the full narration sentence).
  diagramNodes, diagramConnections → leave empty / omit.
  Example: content = "Containers share the host OS kernel"

"codeBlock" scenes:
  content → the exact code or command. Keep it concise.
  diagramNodes, diagramConnections → leave empty / omit.
  Example: content = "docker build -t my-app .\ndocker run -p 3000:3000 my-app"

"diagram" scenes:
  content → write the literal string "diagram" (the real data goes in the fields below).
  diagramNodes → array of SHORT labels (2-4 words each, unique). These become boxes.
    Example: ["Docker CLI", "Docker Daemon", "containerd", "runc", "Container"]
  diagramConnections → array of { "from": "...", "to": "..." } pairs.
    Each from/to MUST exactly match one of the diagramNodes labels.
    Example: [
      { "from": "Docker CLI",    "to": "Docker Daemon" },
      { "from": "Docker Daemon", "to": "containerd" },
      { "from": "containerd",    "to": "runc" },
      { "from": "runc",          "to": "Container" }
    ]
  Rules:
    • Every from/to must exactly match a diagramNodes label.
    • Labels go inside boxes — keep them short.
    • For linear flows (A→B→C), list connections in order.

durationSec: copy the exact value from the corresponding script section.

Script hook (shown before sections — no scene needed for it):
  "${script.hook}"

Script sections (create ONE scene per section, in order):
${sectionsText}

Return only the structured scene plan — no preamble, no markdown fences.
`.trim();

  // Gemini returns the flat shape; we transform it to our discriminated type.
  const raw = await model.invoke(prompt);
  return { scenes: raw.scenes.map(toScene) };
}

// ---------------------------------------------------------------------------
// 4. Self-test — only runs when executed directly
//    Usage: npx tsx src/agents/scene.ts
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const isMain =
  process.argv[1] !== undefined && __filename === process.argv[1];

if (isMain) {
  console.log("🎬 Running full pipeline test: Research → Script → Scene\n");

  console.log("Step 1/3 — Researching: 'How does Docker work?'");
  const research = await researchAgent("How does Docker work?");
  console.log("✅ Research done.\n");

  console.log("Step 2/3 — Generating script...");
  const script = await scriptAgent(research);
  const totalScriptSec = script.sections.reduce((sum, s) => sum + s.durationSec, 0);
  console.log(`✅ Script done (${totalScriptSec}s total).\n`);

  console.log("Step 3/3 — Planning scenes...");
  const scenePlan = await sceneAgent(script);

  console.log("\n✅ ScenePlan output:\n");
  console.log(JSON.stringify(scenePlan, null, 2));

  console.log("\n📋 Scene summary:");
  scenePlan.scenes.forEach((scene, i) => {
    const preview =
      scene.type === "diagram"
        ? `nodes: [${scene.content.nodes.join(", ")}]`
        : String(scene.content).slice(0, 60).replace(/\n/g, " ");
    console.log(
      `  Scene ${i + 1}: [${scene.type.padEnd(9)}] ${scene.durationSec}s — ${preview}`
    );
  });
}
