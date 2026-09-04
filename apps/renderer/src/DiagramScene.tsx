/**
 * src/DiagramScene.tsx
 * ---------------------------------------------------------------------------
 * Renders a "diagram" scene — actual boxes connected by SVG arrows.
 *
 * Input: DiagramContent { nodes: string[], connections: {from, to}[] }
 *
 * Layout strategy:
 *   - Uses useVideoConfig() to dynamically read canvas dimensions (width & height),
 *     supporting both portrait (1080×1920 for Instagram Reels) and landscape.
 *   - Nodes are laid out in a horizontal row, evenly spaced across the canvas.
 *   - Box dimensions and gaps are calculated dynamically based on composition width
 *     and node count.
 *   - Connections are drawn as SVG lines with an arrowhead marker between
 *     the right-center of the source box and the left-center of the target.
 *
 * Animation: The whole diagram fades in over the first 15 frames (same
 * window as TextScene and CodeScene) for visual consistency.
 * ---------------------------------------------------------------------------
 */

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { DiagramContent } from "./types";

interface DiagramSceneProps {
  content: DiagramContent;
}

// Visual style constants
const BOX_RADIUS = 12;
const ARROW_COLOR = "#7c3aed"; // violet — distinct from box colors
const BOX_BG = "#1e293b";
const BOX_BORDER = "#7c3aed";
const TEXT_COLOR = "#f8fafc";
const BG_COLOR = "#0f172a";

export const DiagramScene: React.FC<DiagramSceneProps> = ({ content }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { nodes, connections } = content;

  // Fade in over 15 frames — same as TextScene / CodeScene
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // ---------------------------------------------------------------------------
  // Compute box positions dynamically from useVideoConfig() dimensions
  // ---------------------------------------------------------------------------
  const n = nodes.length;
  const isPortrait = height > width;
  const paddingX = isPortrait ? 60 : 100;
  const availableWidth = width - paddingX * 2;

  // Calculate box width to fit available width comfortably
  const boxW = Math.min(220, Math.max(120, Math.floor((availableWidth - (n - 1) * 16) / Math.max(n, 1))));
  const boxH = Math.round(boxW * 0.45);
  const gap = n > 1 ? Math.min(60, (availableWidth - n * boxW) / (n - 1)) : 0;
  const totalWidth = n * boxW + (n - 1) * gap;
  const startX = (width - totalWidth) / 2;
  const centerY = height / 2 - boxH / 2;

  // Map label → {x, y, cx, cy} (center of each box)
  const positions: Record<string, { x: number; y: number; cx: number; cy: number }> = {};
  nodes.forEach((label, i) => {
    const x = startX + i * (boxW + gap);
    const y = centerY;
    positions[label] = { x, y, cx: x + boxW / 2, cy: y + boxH / 2 };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BG_COLOR }}>
      {/* Wrapper with fade animation */}
      <div style={{ position: "relative", width, height, opacity }}>

        {/* ----------------------------------------------------------------
            SVG layer — drawn first so it's below the boxes in z-order,
            but the arrowheads connect at the box edges so they look correct
        ---------------------------------------------------------------- */}
        <svg
          style={{ position: "absolute", top: 0, left: 0, overflow: "visible", zIndex: 0 }}
          width={width}
          height={height}
        >
          <defs>
            {/* Arrowhead marker */}
            <marker
              id="arrow"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L8,3 z" fill={ARROW_COLOR} />
            </marker>
          </defs>

          {connections.map((conn, i) => {
            const src = positions[conn.from];
            const tgt = positions[conn.to];
            if (!src || !tgt) return null;

            // Arrow from right-center of source to left-center of target
            const x1 = src.x + boxW;
            const y1 = src.cy;
            const x2 = tgt.x - 6; // 6px back so arrowhead sits at box edge
            const y2 = tgt.cy;

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={ARROW_COLOR}
                strokeWidth={2.5}
                markerEnd="url(#arrow)"
              />
            );
          })}
        </svg>

        {/* ----------------------------------------------------------------
            Node boxes — rendered as absolute-positioned divs on top of SVG
        ---------------------------------------------------------------- */}
        {nodes.map((label) => {
          const pos = positions[label];
          if (!pos) return null;
          return (
            <div
              key={label}
              style={{
                position: "absolute",
                left: pos.x,
                top: pos.y,
                width: boxW,
                height: boxH,
                backgroundColor: BOX_BG,
                border: `2px solid ${BOX_BORDER}`,
                borderRadius: BOX_RADIUS,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1,
                // Subtle inner glow so boxes feel "lit"
                boxShadow: `0 0 12px rgba(124, 58, 237, 0.3)`,
              }}
            >
              <span
                style={{
                  color: TEXT_COLOR,
                  fontSize: Math.min(20, Math.max(12, Math.floor((boxW * 1.5) / label.length))),
                  fontFamily: "'Inter', 'Segoe UI', sans-serif",
                  fontWeight: 600,
                  textAlign: "center",
                  padding: "0 8px",
                  lineHeight: 1.2,
                }}
              >
                {label}
              </span>
            </div>
          );
        })}

        {/* ----------------------------------------------------------------
            Scene label in the top-left corner
        ---------------------------------------------------------------- */}
        <div
          style={{
            position: "absolute",
            top: isPortrait ? 60 : 28,
            left: isPortrait ? 60 : 36,
            fontSize: isPortrait ? 24 : 16,
            color: "#475569",
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            fontWeight: 500,
          }}
        >
          🔗 Diagram
        </div>
      </div>
    </AbsoluteFill>
  );
};
