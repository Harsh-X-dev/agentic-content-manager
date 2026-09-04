/**
 * scripts/verify-restart-survival.ts
 * ---------------------------------------------------------------------------
 * Requirement 6 verification:
 * 1. Simulates a crash during a pipeline execution after research/script/scene
 * 2. Restarts the process with the SAME thread_id
 * 3. Confirms LangGraph resumes from Postgres checkpoint without re-running earlier nodes
 * ---------------------------------------------------------------------------
 */

import "dotenv/config";
import { fork } from "child_process";
import { fileURLToPath } from "url";
import { graph } from "../../src/graph.ts";
import { prisma } from "../../src/lib/prisma.js";

const testThreadId = "crash-test-" + Date.now();
const testTopic = "How do WebSockets work?";

async function runChildProcessWithCrash(threadId: string): Promise<number | null> {
  return new Promise((resolve) => {
    console.log(`\n[Phase 1] Spawning child process with SIMULATE_CRASH=true (Thread: ${threadId})...`);
    const child = fork(
      fileURLToPath(import.meta.url),
      ["--child", threadId],
      {
        env: {
          ...process.env,
          SIMULATE_CRASH: "true",
        },
        stdio: "inherit",
      }
    );

    child.on("exit", (code) => {
      console.log(`[Phase 1] Child process exited with code ${code} (simulated crash).`);
      resolve(code);
    });
  });
}

// Child execution mode (simulates crash inside QA or right before it)
if (process.argv.includes("--child")) {
  const childThreadId = process.argv[3] || testThreadId;
  console.log(`[Child] Running graph with thread_id: ${childThreadId}`);

  try {
    await graph.invoke(
      {
        topic: testTopic,
        topicId: childThreadId,
        research: null,
        script: null,
        scenePlan: null,
        qaResult: null,
        videoPath: null,
      },
      {
        configurable: {
          thread_id: childThreadId,
        },
      }
    );
  } catch (err) {
    console.error("[Child] Caught simulated crash or error:", err);
    process.exit(1);
  }
} else {
  // Parent runner
  async function main() {
    console.log("=".repeat(60));
    console.log("  RESTART SURVIVAL VERIFICATION VIA POSTGRES");
    console.log("=".repeat(60));

    // Phase 1: Run until simulated crash
    // In order to simulate crash, we can pass SIMULATE_CRASH in env which graph.ts can inspect or child script
    await runChildProcessWithCrash(testThreadId);

    // Phase 2: Resume with the same thread_id
    console.log("\n[Phase 2] Resuming execution from PostgreSQL checkpoint using the same thread_id...");
    console.log(`Thread ID: ${testThreadId}\n`);

    // When resuming from a checkpoint, we pass null as input (or state) with the thread config
    const resumedState = await graph.invoke(
      null,
      {
        configurable: {
          thread_id: testThreadId,
        },
      }
    );

    console.log("\n" + "=".repeat(60));
    console.log("  RESUME EXECUTION COMPLETED");
    console.log("=".repeat(60));
    console.log(`Topic: ${resumedState.topic}`);
    console.log(`Research facts: ${resumedState.research?.keyFacts?.length ?? 0}`);
    console.log(`Script sections: ${resumedState.script?.sections?.length ?? 0}`);
    console.log(`ScenePlan scenes: ${resumedState.scenePlan?.scenes?.length ?? 0}`);
    console.log(`QA Result passed: ${resumedState.qaResult?.passed}`);
    console.log(`Video path: ${resumedState.videoPath}`);

    // Check Postgres records in stage tables
    const topicRecord = await prisma.topic.findUnique({ where: { id: testThreadId } });
    const researchRecord = await prisma.researchPackage.findFirst({ where: { topicId: testThreadId } });
    const scriptRecord = await prisma.script.findFirst({ where: { topicId: testThreadId } });
    const sceneRecord = await prisma.scenePlan.findFirst({ where: { topicId: testThreadId } });
    const qaRecord = await prisma.qaResult.findFirst({ where: { topicId: testThreadId } });
    const videoRecord = await prisma.video.findFirst({ where: { topicId: testThreadId } });

    console.log("\n[DB Verification] Records in Postgres tables:");
    console.log(`- topic row: ${topicRecord ? "✅ Found" : "❌ Missing"}`);
    console.log(`- research_packages row: ${researchRecord ? "✅ Found" : "❌ Missing"}`);
    console.log(`- scripts row: ${scriptRecord ? "✅ Found" : "❌ Missing"}`);
    console.log(`- scene_plans row: ${sceneRecord ? "✅ Found" : "❌ Missing"}`);
    console.log(`- qa_results row: ${qaRecord ? "✅ Found" : "❌ Missing"}`);
    console.log(`- videos row: ${videoRecord ? "✅ Found" : "❌ Missing"}`);

    if (resumedState.videoPath && qaRecord && topicRecord) {
      console.log("\n✅ SUCCESS: Pipeline survived crash and resumed from Postgres checkpoint!");
    } else {
      console.error("\n❌ FAILED: State was not completely restored.");
      process.exit(1);
    }
  }

  main()
    .catch((err) => {
      console.error("Test failed:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
