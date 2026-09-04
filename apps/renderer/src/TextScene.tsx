/**
 * src/TextScene.tsx
 * ---------------------------------------------------------------------------
 * Renders a scene of type "text" — displays the content string as a centered
 * headline with a simple fade-in + slide-up animation on the first 15 frames.
 *
 * Animation breakdown:
 *   - opacity:    0 → 1  over frames 0-15 (using interpolate)
 *   - translateY: 20px → 0  over frames 0-15
 *   - After frame 15 everything is static — easy to read and follow
 * ---------------------------------------------------------------------------
 */

import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

interface TextSceneProps {
  content: string;
}

export const TextScene: React.FC<TextSceneProps> = ({ content }) => {
  // useCurrentFrame() returns the frame number RELATIVE to the start of
  // this scene's <Sequence> — so frame 0 is always the first frame of this
  // scene, regardless of where it sits in the overall video timeline.
  const frame = useCurrentFrame();

  // Fade in over the first 15 frames (0.5s at 30fps)
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp", // stays at 1 after frame 15
  });

  // Slide up from 20px below over the same window
  const translateY = interpolate(frame, [0, 15], [20, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f172a", // dark navy background
        justifyContent: "center",
        alignItems: "center",
        padding: "80px",
      }}
    >
      <p
        style={{
          color: "#f8fafc",
          fontSize: 52,
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          fontWeight: 600,
          textAlign: "center",
          lineHeight: 1.4,
          maxWidth: 900,
          opacity,
          transform: `translateY(${translateY}px)`,
          margin: 0,
        }}
      >
        {content}
      </p>
    </AbsoluteFill>
  );
};
