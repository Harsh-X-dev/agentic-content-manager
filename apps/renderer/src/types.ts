/**
 * apps/renderer/src/types.ts
 * ---------------------------------------------------------------------------
 * Core type definitions for the Remotion video renderer.
 * Matches the schema emitted by src/agents/scene.ts.
 * ---------------------------------------------------------------------------
 */

export type DiagramContent = {
  nodes: string[];
  connections: { from: string; to: string }[];
};

export type Scene =
  | { type: "text";      content: string;         durationSec: number }
  | { type: "codeBlock"; content: string;         durationSec: number }
  | { type: "diagram";   content: DiagramContent; durationSec: number };

export interface ScenePlan {
  scenes: Scene[];
}
