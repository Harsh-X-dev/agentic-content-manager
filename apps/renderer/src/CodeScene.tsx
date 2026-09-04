/**
 * src/CodeScene.tsx
 * ---------------------------------------------------------------------------
 * Renders a scene of type "codeBlock" — displays the content string as a
 * monospace code block with a terminal/editor aesthetic.
 *
 * Visually distinct from both TextScene and DiagramScene:
 *   - Near-black background (VS Code dark theme feel)
 *   - Bright green monospace text
 *   - Top "traffic light" dots (red/yellow/green) for a terminal frame
 *   - A ">" prompt character on the first line to signal code
 *   - Lines appear one-by-one (each line fades in 3 frames after the previous)
 * ---------------------------------------------------------------------------
 */

import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

interface CodeSceneProps {
  content: string;
}

export const CodeScene: React.FC<CodeSceneProps> = ({ content }) => {
  const frame = useCurrentFrame();

  // Split content into individual lines for the line-by-line reveal
  const lines = content.split("\n");

  // Fade in the whole terminal window over the first 10 frames
  const windowOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#020617", // near-black outer bg
        justifyContent: "center",
        alignItems: "center",
        padding: "60px",
      }}
    >
      {/* Terminal window frame */}
      <div
        style={{
          backgroundColor: "#0d1117", // GitHub dark bg
          borderRadius: 12,
          width: "100%",
          maxWidth: 1000,
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          overflow: "hidden",
          opacity: windowOpacity,
        }}
      >
        {/* Title bar with traffic-light dots */}
        <div
          style={{
            backgroundColor: "#161b22",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ width: 13, height: 13, borderRadius: "50%", backgroundColor: "#ff5f57" }} />
          <div style={{ width: 13, height: 13, borderRadius: "50%", backgroundColor: "#febc2e" }} />
          <div style={{ width: 13, height: 13, borderRadius: "50%", backgroundColor: "#28c840" }} />
          <span
            style={{
              color: "#8b949e",
              fontSize: 14,
              fontFamily: "'Fira Code', 'Consolas', monospace",
              marginLeft: 12,
            }}
          >
            terminal
          </span>
        </div>

        {/* Code content */}
        <div style={{ padding: "32px 40px" }}>
          {lines.map((line, i) => {
            // Each line fades in starting 4 frames after the previous one
            const lineStartFrame = 12 + i * 4;
            const lineOpacity = interpolate(
              frame,
              [lineStartFrame, lineStartFrame + 6],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );

            const isComment = line.trim().startsWith("#");
            const isEmpty = line.trim() === "";

            return (
              <div
                key={i}
                style={{
                  opacity: lineOpacity,
                  minHeight: isEmpty ? 16 : "auto",
                  marginBottom: 4,
                }}
              >
                {!isEmpty && (
                  <span
                    style={{
                      fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace",
                      fontSize: 26,
                      // Comments are dimmed gray; normal lines are bright green
                      color: isComment ? "#8b949e" : "#7ee787",
                      whiteSpace: "pre",
                      display: "block",
                      lineHeight: 1.7,
                    }}
                  >
                    {line}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
