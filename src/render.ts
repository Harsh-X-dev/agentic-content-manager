/**
 * src/render.ts
 * ---------------------------------------------------------------------------
 * Programmatic Remotion renderer — Step 4 of the agentic content pipeline.
 *
 * Takes a ScenePlan (from sceneAgent) and renders it to an .mp4 file using
 * Remotion's Node.js API (@remotion/bundler + @remotion/renderer).
 *
 * How it works:
 *   1. bundle()             — Webpack-bundles apps/renderer into memory so
 *                             Remotion can render it in a headless browser
 *   2. selectComposition()  — Resolves the "MainVideo" composition and
 *                             calculates its duration from the ScenePlan props
 *   3. renderMedia()        — Renders every frame and muxes to .mp4
 *
 * This avoids spawning a child process — everything runs in the same Node.js
 * process as the rest of the pipeline.
 * ---------------------------------------------------------------------------
 */

import path from "path";
import fs from "fs";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";

import type { ScenePlan, Scene, DiagramContent } from "./agents/scene.ts";
export type { ScenePlan, Scene, DiagramContent };

// ---------------------------------------------------------------------------
// renderVideo
// ---------------------------------------------------------------------------

/**
 * Bundles the Remotion project and renders the "MainVideo" composition to MP4.
 *
 * @param scenePlan  - The ScenePlan produced by sceneAgent.
 * @param outputPath - Where to write the .mp4 file (relative or absolute).
 */
export async function renderVideo(
  scenePlan: ScenePlan,
  outputPath: string
): Promise<void> {
  // Resolve outputPath to absolute so we can create parent dirs reliably
  const absoluteOutput = path.resolve(outputPath);
  const outputDir = path.dirname(absoluteOutput);

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${outputDir}`);
  }

  // ---------------------------------------------------------------------------
  // Step 1: Bundle the Remotion project
  //
  // bundle() runs Webpack on the renderer's entry point and returns a URL
  // to a local bundle that Remotion's headless browser can load.
  // ---------------------------------------------------------------------------

  // Entry point is apps/renderer/src/index.ts (calls registerRoot)
  const entryPoint = path.resolve(
    "apps/renderer/src/index.ts"
  );

  console.log("📦 Bundling Remotion project...");
  const bundleUrl = await bundle({
    entryPoint,
    // webpack override: tell Webpack where to find the project root
    // (the apps/renderer directory, where tailwind config etc. live)
    webpackOverride: (config) => config,
  });
  console.log("✅ Bundle ready.\n");

  // ---------------------------------------------------------------------------
  // Step 2: Select the composition
  //
  // selectComposition() loads the bundle in a headless browser, calls
  // calculateMetadata on our composition with the provided inputProps, and
  // returns the resolved composition (including durationInFrames).
  // ---------------------------------------------------------------------------

  console.log("🎬 Selecting composition 'MainVideo'...");
  const composition = await selectComposition({
    serveUrl: bundleUrl,
    id: "MainVideo",
    // inputProps becomes the props received by MainVideo component.
    // This is how the ScenePlan data flows into the renderer.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inputProps: scenePlan as unknown as Record<string, unknown>,
  });
  console.log(
    `✅ Composition selected — duration: ${composition.durationInFrames} frames (${(composition.durationInFrames / composition.fps).toFixed(1)}s at ${composition.fps}fps)\n`
  );

  // ---------------------------------------------------------------------------
  // Step 3: Render to MP4
  //
  // renderMedia() spins up a headless Chromium, renders each frame, and
  // muxes them into an MP4 using FFmpeg (bundled with @remotion/renderer).
  // ---------------------------------------------------------------------------

  console.log(`🎥 Rendering to ${absoluteOutput}...`);
  await renderMedia({
    composition,
    serveUrl: bundleUrl,
    codec: "h264",           // standard MP4 codec, widely compatible
    outputLocation: absoluteOutput,
    inputProps: scenePlan as unknown as Record<string, unknown>,

    // onProgress fires for each rendered frame — use it to log a percentage
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      // Overwrite the same line (carriage return without newline)
      process.stdout.write(`   Rendering... ${pct}%\r`);
    },
  });

  // Clear the progress line and print completion
  process.stdout.write("\n");
  console.log(`✅ Video saved to: ${absoluteOutput}\n`);
}
