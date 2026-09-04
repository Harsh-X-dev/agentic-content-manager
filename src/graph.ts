/**
 * src/graph.ts
 * ---------------------------------------------------------------------------
 * Wraps the content pipeline into a LangGraph StateGraph with PostgreSQL
 * persistence and QA verification.
 *
 * Graph topology (no interrupts — fully automated end-to-end):
 *   START → research → script → scene → qa → render → publish → END
 *
 * Checkpointer: PostgresSaver (backed by PostgreSQL via @langchain/langgraph-checkpoint-postgres).
 * Stage Persistence: saveStage() records queryable data into Postgres tables:
 *   topics, research_packages, scripts, scene_plans, qa_results, videos, approvals
 * ---------------------------------------------------------------------------
 */

import "dotenv/config";
import {
  Annotation,
  StateGraph,
  START,
  END,
} from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

import {
  researchAgent,
  type ResearchPackage,
} from "./agents/research.ts";
import { scriptAgent, type Script } from "./agents/script.ts";
import { sceneAgent, type ScenePlan } from "./agents/scene.ts";
import { qaAgent, type QAResult } from "./agents/qa.ts";
import { renderVideo } from "./render.ts";
import { saveStage } from "./lib/saveStage.ts";
import { publishToInstagram } from "./publisher.ts";

// ---------------------------------------------------------------------------
// 1. Graph state schema
//    Each field is nullable so the graph can be invoked with only { topic }.
// ---------------------------------------------------------------------------

const GraphState = Annotation.Root({
  /** The developer topic passed in at invocation time. */
  topic: Annotation<string>,

  /** Unique ID for topic tracking across database tables. */
  topicId: Annotation<string | null>,

  /** Produced by the "research" node; null until that node completes. */
  research: Annotation<ResearchPackage | null>,

  /** Produced by the "script" node; null until that node completes. */
  script: Annotation<Script | null>,

  /** Produced by the "scene" node; null until that node completes. */
  scenePlan: Annotation<ScenePlan | null>,

  /** Produced by the "qa" node; null until that node completes. */
  qaResult: Annotation<QAResult | null>,

  /** Absolute path of the rendered .mp4; null until "render" completes. */
  videoPath: Annotation<string | null>,

  /** Instagram media ID returned after publishing. */
  instagramMediaId: Annotation<string | null>,
});

/** Convenience alias — use this type in node function signatures. */
export type GraphStateType = typeof GraphState.State;

// ---------------------------------------------------------------------------
// 2. Node functions — thin wrappers with per-node error handling and DB save.
// ---------------------------------------------------------------------------

/**
 * "research" node
 * Calls researchAgent with state.topic and stores the result.
 */
async function researchNode(
  state: GraphStateType,
  config?: any
): Promise<Partial<GraphStateType>> {
  console.log(`\n[research] ▶ Researching: "${state.topic}"`);
  const topicId = state.topicId ?? config?.configurable?.thread_id ?? crypto.randomUUID();
  try {
    const research = await researchAgent(state.topic);
    if (!research) {
      throw new Error(
        `researchAgent returned undefined. ` +
        `The model "${process.env["OPENROUTER_MODEL"]}" likely doesn't support ` +
        `tool/function calling (required for structured output).`
      );
    }
    console.log(`[research] ✅ Done — ${research.keyFacts.length} facts.`);
    await saveStage("topics", topicId, { topic: state.topic });
    await saveStage("research_packages", topicId, research);
    return { research, topicId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[research] ❌ Failed: ${msg}`);
    throw new Error(`research node failed: ${msg}`);
  }
}

/**
 * "script" node
 * Converts the ResearchPackage into a timed script.
 */
async function scriptNode(
  state: GraphStateType,
  config?: any
): Promise<Partial<GraphStateType>> {
  console.log("[script] ▶ Generating script...");
  if (!state.research) {
    throw new Error("script node: state.research is null — research node must run first.");
  }
  const topicId = state.topicId ?? config?.configurable?.thread_id ?? state.topic;
  try {
    const script = await scriptAgent(state.research);
    if (!script) {
      throw new Error(
        `scriptAgent returned undefined. ` +
        `The model "${process.env["OPENROUTER_MODEL"]}" likely doesn't support tool calling.`
      );
    }
    const totalSec = script.sections.reduce((s, sec) => s + sec.durationSec, 0);
    console.log(`[script] ✅ Done — ${script.sections.length} sections, ${totalSec}s total.`);
    await saveStage("scripts", topicId, script);
    return { script };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[script] ❌ Failed: ${msg}`);
    throw new Error(`script node failed: ${msg}`);
  }
}

/**
 * "scene" node
 * Converts the Script into a visual ScenePlan.
 */
async function sceneNode(
  state: GraphStateType,
  config?: any
): Promise<Partial<GraphStateType>> {
  console.log("[scene] ▶ Planning scenes...");
  if (!state.script) {
    throw new Error("scene node: state.script is null — script node must run first.");
  }
  const topicId = state.topicId ?? config?.configurable?.thread_id ?? state.topic;
  try {
    const scenePlan = await sceneAgent(state.script);
    if (!scenePlan) {
      throw new Error(
        `sceneAgent returned undefined. ` +
        `The model "${process.env["OPENROUTER_MODEL"]}" likely doesn't support tool calling.`
      );
    }
    console.log(`[scene] ✅ Done — ${scenePlan.scenes.length} scenes.`);
    await saveStage("scene_plans", topicId, scenePlan);
    return { scenePlan };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[scene] ❌ Failed: ${msg}`);
    throw new Error(`scene node failed: ${msg}`);
  }
}

/**
 * "qa" node
 * Reviews Script & ScenePlan for consistency and issues.
 */
async function qaNode(
  state: GraphStateType,
  config?: any
): Promise<Partial<GraphStateType>> {
  console.log("[qa] ▶ Running QA review...");
  if (!state.script) {
    throw new Error("qa node: state.script is null — script node must run first.");
  }
  if (!state.scenePlan) {
    throw new Error("qa node: state.scenePlan is null — scene node must run first.");
  }
  const topicId = state.topicId ?? config?.configurable?.thread_id ?? state.topic;
  try {
    const qaResult = await qaAgent(state.script, state.scenePlan);
    if (!qaResult) {
      throw new Error(
        `qaAgent returned undefined. ` +
        `The model "${process.env["OPENROUTER_MODEL"]}" likely doesn't support tool calling.`
      );
    }
    console.log(`[qa] ✅ QA complete — Passed: ${qaResult.passed}, Issues: ${qaResult.issues.length}`);
    if (qaResult.issues.length > 0) {
      console.log(`[qa] ⚠️  Issues identified (pipeline continues regardless):`);
      qaResult.issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
    }
    await saveStage("qa_results", topicId, qaResult);
    return { qaResult };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[qa] ❌ Failed: ${msg}`);
    throw new Error(`qa node failed: ${msg}`);
  }
}

/**
 * "render" node
 * Renders the ScenePlan to an .mp4 file via Remotion.
 */
const VIDEO_OUTPUT_PATH = "./output/video.mp4";

async function renderNode(
  state: GraphStateType,
  config?: any
): Promise<Partial<GraphStateType>> {
  console.log(`[render] ▶ Rendering to ${VIDEO_OUTPUT_PATH}...`);
  if (!state.scenePlan) {
    throw new Error("render node: state.scenePlan is null — scene node must run first.");
  }
  const topicId = state.topicId ?? config?.configurable?.thread_id ?? state.topic;
  try {
    await renderVideo(state.scenePlan, VIDEO_OUTPUT_PATH);
    console.log(`[render] ✅ Video saved to: ${VIDEO_OUTPUT_PATH}`);
    await saveStage("videos", topicId, { path: VIDEO_OUTPUT_PATH });
    return { videoPath: VIDEO_OUTPUT_PATH };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[render] ❌ Failed: ${msg}`);
    throw new Error(`render node failed: ${msg}`);
  }
}

/**
 * "publish" node
 * Publishes the rendered video to Instagram as a Reel.
 * Requires PUBLIC_BASE_URL to be set (written automatically by `npm run tunnel`).
 */
async function publishNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[publish] ▶ Publishing to Instagram...");

  const publicBaseUrl = process.env.PUBLIC_BASE_URL;
  if (!publicBaseUrl) {
    throw new Error(
      "[publish] ❌ PUBLIC_BASE_URL is not set.\n" +
      "  Instagram needs a public HTTPS URL to fetch your video.\n" +
      "  Fix: open a second terminal and run `npm run tunnel`, then re-run `npm run dev`."
    );
  }

  // videoPath looks like "./output/video.mp4" — extract just the filename
  const filename = state.videoPath ? state.videoPath.split("/").pop() : "video.mp4";
  const publicVideoUrl = `${publicBaseUrl}/videos/${filename}`;

  const caption = state.script?.hook || "Check out this explainer video!";

  console.log(`[publish] 🌐 Video URL: ${publicVideoUrl}`);

  const result = await publishToInstagram(publicVideoUrl, caption);

  const now = new Date().toISOString();

  // Persist the Instagram media ID to the videos table (updates the render row)
  await saveStage("videos", state.topicId ?? "", {
    instagram_media_id: result.mediaId,
    video_path: state.videoPath,
  });

  // Record approval in the approvals table
  await saveStage("approvals", state.topicId ?? "", {
    approved: true,
    approved_at: now,
  });

  console.log(`[publish] ✅ Published! Instagram Media ID: ${result.mediaId}`);

  return { instagramMediaId: result.mediaId };
}

// ---------------------------------------------------------------------------
// 3. Build the graph
//    Straight-line — no interrupts, no branching:
//    START → researchStep → scriptStep → sceneStep → qaStep → renderStep → publish → END
// ---------------------------------------------------------------------------

const workflow = new StateGraph(GraphState)
  .addNode("researchStep", researchNode)
  .addNode("scriptStep", scriptNode)
  .addNode("sceneStep", sceneNode)
  .addNode("qaStep", qaNode)
  .addNode("renderStep", renderNode)
  .addNode("publish", publishNode)
  .addEdge(START, "researchStep")
  .addEdge("researchStep", "scriptStep")
  .addEdge("scriptStep", "sceneStep")
  .addEdge("sceneStep", "qaStep")
  .addEdge("qaStep", "renderStep")
  .addEdge("renderStep", "publish")
  .addEdge("publish", END);

// ---------------------------------------------------------------------------
// 4. Compile with PostgresSaver checkpointer
// ---------------------------------------------------------------------------

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set in environment.");
}

export const checkpointer = PostgresSaver.fromConnString(databaseUrl);

console.log("[PostgresSaver] ⚙️  Setting up checkpoint tables (runs once on startup, safe to call repeatedly)...");
await checkpointer.setup();
console.log("[PostgresSaver] ✅ Checkpoint tables ready.");

/**
 * The compiled, ready-to-invoke LangGraph application with Postgres persistence.
 */
export const graph = workflow.compile({ checkpointer });
