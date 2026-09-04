/**
 * src/index.ts
 * ---------------------------------------------------------------------------
 * Single entry point for the MARK-1 pipeline.
 *
 * Run with:
 *   npm run dev
 *
 * What happens in order:
 *   1. Express server starts and confirms it is listening on PORT
 *   2. LangGraph pipeline kicks off: research → script → scene → qa → render → publish
 *   3. Final summary is printed with video path, QA result, and Instagram media ID
 *
 * Prerequisites before running:
 *   - In a separate terminal: npm run tunnel
 *     (sets PUBLIC_BASE_URL in .env so Instagram can fetch the video)
 *   - DATABASE_URL, OPENROUTER_API_KEY, OPENROUTER_MODEL, META_ACCESS_TOKEN,
 *     and INSTAGRAM_BUSINESS_ACCOUNT_ID must all be set in .env
 * ---------------------------------------------------------------------------
 */

import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import { prisma } from "./lib/prisma.js";
import { graph } from "./graph.ts";

// ---------------------------------------------------------------------------
// ✏️  CHANGE THIS STRING to run a different topic.
// ---------------------------------------------------------------------------
const TOPIC = "How does Docker work?";

// ---------------------------------------------------------------------------
// Express server setup
// Serves rendered videos at /videos/<filename> so Instagram can fetch them.
// Instagram cannot reach "localhost" — run `npm run tunnel` first to get a
// public HTTPS URL written to PUBLIC_BASE_URL in .env.
// ---------------------------------------------------------------------------

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use("/videos", express.static("output"));

app.get("/health", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok", postgres: "connected" });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "error",
      message: error instanceof Error ? error.message : "Database query failed",
    });
  }
});

// ---------------------------------------------------------------------------
// Pipeline runner
// Invokes the full graph and prints a clean summary when it completes.
// ---------------------------------------------------------------------------

async function runFullPipeline(): Promise<void> {
  const threadId = crypto.randomUUID();

  console.log("\n" + "=".repeat(60));
  console.log("  MARK-1 — Full Pipeline (research → publish)");
  console.log("=".repeat(60));
  console.log(`  Topic   : "${TOPIC}"`);
  console.log(`  Thread  : ${threadId}`);
  console.log("=".repeat(60) + "\n");

  const config = {
    configurable: {
      thread_id: threadId,
    },
  };

  let finalState: any;
  try {
    finalState = await graph.invoke(
      {
        topic: TOPIC,
        topicId: threadId,
        research: null,
        script: null,
        scenePlan: null,
        qaResult: null,
        videoPath: null,
        instagramMediaId: null,
      },
      config
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("\n❌ Pipeline failed:", msg);
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
    return;
  }

  // ---------------------------------------------------------------------------
  // Final summary
  // ---------------------------------------------------------------------------
  console.log("\n" + "=".repeat(60));
  console.log("  🎉 Pipeline complete — Summary");
  console.log("=".repeat(60));
  console.log(`  Topic              : ${TOPIC}`);
  console.log(`  Thread ID          : ${threadId}`);
  console.log(`  Video path         : ${finalState.videoPath ?? "—"}`);
  console.log(`  QA passed          : ${finalState.qaResult?.passed ?? "—"}`);
  console.log(`  QA issues          : ${finalState.qaResult?.issues?.length ?? 0}`);
  if (finalState.qaResult?.issues?.length > 0) {
    finalState.qaResult.issues.forEach((issue: string, i: number) => {
      console.log(`    ${i + 1}. ${issue}`);
    });
  }
  if (finalState.instagramMediaId) {
    console.log(`  Instagram Media ID : ${finalState.instagramMediaId}`);
    console.log(`  Instagram permalink: https://www.instagram.com/p/${finalState.instagramMediaId}/`);
    console.log("\n  ✅ Post is live on Instagram!");
  } else {
    console.log("  Instagram Media ID : (not published — check publish logs above)");
  }
  console.log("=".repeat(60) + "\n");
}

// ---------------------------------------------------------------------------
// Startup sequence: server FIRST, pipeline SECOND.
// ---------------------------------------------------------------------------

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Videos served at: http://localhost:${PORT}/videos/`);

  // Pipeline starts only after the server is confirmed listening.
  runFullPipeline().catch((err) => {
    console.error("Unhandled error in pipeline:", err);
  });
});

export { app, server };
export default app;
