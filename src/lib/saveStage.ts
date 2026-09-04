/**
 * src/lib/saveStage.ts
 * ---------------------------------------------------------------------------
 * Helper function to persist each pipeline stage's output to Postgres.
 *
 * This operates separately from the LangGraph checkpointer and saves
 * queryable, structured records into dedicated tables:
 *   - topics
 *   - research_packages
 *   - scripts
 *   - scene_plans
 *   - qa_results
 *   - videos
 *   - approvals
 * ---------------------------------------------------------------------------
 */

import { prisma } from "./prisma.js";

/**
 * Inserts a record for a specific stage into the database.
 *
 * @param table - The target table name (e.g. "research_packages", "scripts", "scene_plans", "qa_results", "videos", "topics")
 * @param topicId - The ID of the associated topic
 * @param data - The stage payload to persist
 */
export async function saveStage(
  table: string,
  topicId: string,
  data: any
): Promise<void> {
  try {
    // Normalise table name
    const normalized = table.toLowerCase().replace(/-/g, "_");

    // Ensure topic exists if not inserting topic table
    if (normalized !== "topics") {
      const existing = await prisma.topic.findUnique({
        where: { id: topicId },
      });
      if (!existing) {
        await prisma.topic.create({
          data: {
            id: topicId,
            topic: (data && data.topic) ? String(data.topic) : topicId,
          },
        });
      }
    }

    switch (normalized) {
      case "topics": {
        await prisma.topic.upsert({
          where: { id: topicId },
          update: { topic: data.topic ?? topicId },
          create: { id: topicId, topic: data.topic ?? topicId },
        });
        break;
      }

      case "research_packages":
      case "research": {
        await prisma.researchPackage.create({
          data: {
            topicId,
            data: data as any,
          },
        });
        break;
      }

      case "scripts":
      case "script": {
        await prisma.script.create({
          data: {
            topicId,
            data: data as any,
          },
        });
        break;
      }

      case "scene_plans":
      case "scenes":
      case "scene": {
        await prisma.scenePlan.create({
          data: {
            topicId,
            data: data as any,
          },
        });
        break;
      }

      case "qa_results":
      case "qa": {
        await prisma.qaResult.create({
          data: {
            topicId,
            passed: Boolean(data.passed),
            issues: (data.issues ?? []) as any,
          },
        });
        break;
      }

      case "videos":
      case "video":
      case "render": {
        const filePath = typeof data === "string" ? data : (data.path ?? data.videoPath ?? "");
        const instagramMediaId: string | undefined =
          typeof data === "object" && data !== null ? (data.instagram_media_id ?? data.instagramMediaId ?? undefined) : undefined;
        await prisma.video.create({
          data: {
            topicId,
            path: filePath,
            ...(instagramMediaId ? { instagramMediaId } : {}),
          },
        });
        break;
      }

      case "approvals":
      case "approval": {
        const approvedAt: Date | undefined =
          data.approved_at ? new Date(data.approved_at) : data.approvedAt ? new Date(data.approvedAt) : undefined;
        await prisma.approval.create({
          data: {
            topicId,
            approved: Boolean(data.approved),
            ...(approvedAt ? { approvedAt } : {}),
          },
        });
        break;
      }

      default:
        console.warn(`[saveStage] Unknown table: "${table}". Skipping DB insert.`);
    }

    console.log(`[saveStage] 💾 Saved stage output to table "${normalized}" for topicId: ${topicId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[saveStage] ⚠️ Failed to save stage to "${table}":`, msg);
    // Do not fail the graph run if secondary analytics logging fails
  }
}
