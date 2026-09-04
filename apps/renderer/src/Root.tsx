/**
 * src/Root.tsx
 * ---------------------------------------------------------------------------
 * Registers all Remotion compositions. This file is the entry point that
 * Remotion Studio and the CLI look for.
 *
 * The <Composition> component pairs a React component with video metadata:
 *   id:                 the name used with `npx remotion render <id>`
 *   component:          the React component to render
 *   fps:                frames per second (30 is standard)
 *   width / height:     canvas size in pixels — 1080×1920 = 9:16 portrait
 *                       Instagram Reels requires portrait (9:16) orientation.
 *   defaultProps:       the props used in Studio preview
 *   calculateMetadata:  called to compute durationInFrames from the props,
 *                       so the video length auto-adjusts to the scene data
 * ---------------------------------------------------------------------------
 */

import "./index.css";
import { Composition } from "remotion";
import { MainVideo, defaultProps, calculateMetadata } from "./MainVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MainVideo"
        // Remotion's <Composition> expects Record<string, unknown> for its generic.
        // We cast through unknown to preserve our typed component while satisfying it.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={MainVideo as React.FC<any>}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        calculateMetadata={calculateMetadata as any}
      />
    </>
  );
};
