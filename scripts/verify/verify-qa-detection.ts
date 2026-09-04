/**
 * scripts/verify-qa-detection.ts
 * ---------------------------------------------------------------------------
 * Requirement 7 verification:
 * Prove that qaAgent catches deliberate inconsistencies (mismatched facts,
 * contradictory details) and returns passed: false with concrete issues.
 * ---------------------------------------------------------------------------
 */

import "dotenv/config";
import { qaAgent } from "../../src/agents/qa.ts";
import type { Script } from "../../src/agents/script.ts";
import type { ScenePlan } from "../../src/agents/scene.ts";

async function verify() {
  console.log("=".repeat(60));
  console.log("  QA INCONSISTENCY DETECTION TEST");
  console.log("=".repeat(60));

  // Inconsistent Script vs ScenePlan
  // Script claims Redis is an in-memory key-value database.
  // ScenePlan diagram claims Redis is a relational SQL table stored on disk.
  const inconsistentScript: Script = {
    hook: "Redis stores all your data purely in RAM for microsecond speeds.",
    sections: [
      {
        narration: "Redis is an open-source, in-memory data store used as a database and cache.",
        durationSec: 10,
      },
      {
        narration: "Because everything is in RAM, operations avoid disk I/O bottlenecks entirely.",
        durationSec: 12,
      },
    ],
  };

  const inconsistentScenePlan: ScenePlan = {
    scenes: [
      {
        type: "text",
        content: "PostgreSQL Relational Tables on Hard Disk Drive",
        durationSec: 10,
      },
      {
        type: "diagram",
        content: {
          nodes: ["Client", "Disk Controller", "HDD Magnetic Platter"],
          connections: [
            { from: "Client", to: "Disk Controller" },
            { from: "Disk Controller", to: "HDD Magnetic Platter" },
          ],
        },
        durationSec: 12,
      },
    ],
  };

  console.log("\n▶ Running QA agent against deliberately inconsistent data...");
  const result = await qaAgent(inconsistentScript, inconsistentScenePlan);

  console.log("\nQA Detection Result:");
  console.log(JSON.stringify(result, null, 2));

  if (result.passed === false && result.issues.length > 0) {
    console.log("\n✅ SUCCESS: QA agent correctly flagged inconsistencies (passed: false)!");
  } else {
    console.error("\n❌ FAILED: QA agent did not flag the contradictions.");
    process.exit(1);
  }
}

verify();
