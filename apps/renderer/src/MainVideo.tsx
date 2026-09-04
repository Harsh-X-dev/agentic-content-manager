/**
 * src/MainVideo.tsx
 * ---------------------------------------------------------------------------
 * Root composition component for the agentic content pipeline's video output.
 *
 * How it works:
 *   1. Accepts a ScenePlan as props (passed in via defaultProps or --props at
 *      render time).
 *   2. Calculates the total video duration dynamically from the scenes'
 *      durationSec values — no hardcoded frame counts.
 *   3. Maps over scenes and renders the matching component (TextScene,
 *      DiagramScene, or CodeScene) inside a <Sequence>, using:
 *         from:             the accumulated frame offset (where this scene starts)
 *         durationInFrames: durationSec * fps (converted to frames)
 *
 * The <Sequence> component re-offsets useCurrentFrame() inside each child —
 * so each scene's frame counter always starts from 0, making per-scene
 * animations simple and self-contained.
 * ---------------------------------------------------------------------------
 */

import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { TextScene } from "./TextScene";
import { DiagramScene } from "./DiagramScene";
import { CodeScene } from "./CodeScene";

import type { DiagramContent, Scene, ScenePlan } from "./types";
export type { DiagramContent, Scene, ScenePlan };

// ---------------------------------------------------------------------------
// MainVideo component
// ---------------------------------------------------------------------------

export const MainVideo: React.FC<ScenePlan> = ({ scenes }) => {
  // useVideoConfig() gives us fps (and width/height/durationInFrames).
  // We need fps to convert durationSec → durationInFrames for each Sequence.
  const { fps } = useVideoConfig();

  // Build a list of {scene, fromFrame} pairs by accumulating the frame offset
  // as we walk through the scenes in order.
  let cursor = 0;
  const positioned = scenes.map((scene) => {
    const fromFrame = cursor;
    const durationInFrames = Math.round(scene.durationSec * fps);
    cursor += durationInFrames;
    return { scene, fromFrame, durationInFrames };
  });

  return (
    <AbsoluteFill>
      {positioned.map(({ scene, fromFrame, durationInFrames }, i) => (
        // <Sequence> controls WHEN this scene plays in the timeline:
        //   from:             first frame this scene is visible
        //   durationInFrames: how many frames it lasts
        // Inside the Sequence, useCurrentFrame() resets to 0 for the child.
        <Sequence
          key={i}
          from={fromFrame}
          durationInFrames={durationInFrames}
          name={`Scene ${i + 1}: ${scene.type}`} // shown in Remotion Studio timeline
        >
          {scene.type === "text" && <TextScene content={scene.content} />}
          {scene.type === "diagram" && <DiagramScene content={scene.content} />}
          {scene.type === "codeBlock" && <CodeScene content={scene.content} />}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// defaultProps — used when previewing in Remotion Studio or when --props
// is not passed to `npx remotion render`. Points at the sample JSON.
// ---------------------------------------------------------------------------

// Import the sample file statically so the Studio preview works without flags.
// At render time you'll override this with --props='./sample-scene-plan.json'
import sampleScenePlan from "../sample-scene-plan.json";

export const defaultProps: ScenePlan = sampleScenePlan as ScenePlan;

// ---------------------------------------------------------------------------
// calculateMetadata — called by Remotion to determine durationInFrames
// dynamically from the props, so the video length matches the scene data.
// ---------------------------------------------------------------------------

export const calculateMetadata = ({
  props,
}: {
  props: ScenePlan;
}): { durationInFrames: number } => {
  // We need an fps value here. We use 30 as the default; Remotion will use
  // the fps set on the <Composition> when actually rendering.
  const fps = 30;
  const totalFrames = props.scenes.reduce(
    (sum, scene) => sum + Math.round(scene.durationSec * fps),
    0
  );
  return { durationInFrames: totalFrames };
};
