/**
 * scripts/start-tunnel.ts
 *
 * Starts an ngrok HTTPS tunnel on port 4000 (or process.env.PORT) using the @ngrok/ngrok Node.js SDK
 * (no separate ngrok binary required — avoids Windows Defender false positives).
 *
 * What it does:
 *   1. Opens an ngrok HTTPS tunnel pointed at localhost:4000 (or process.env.PORT)
 *   2. Writes the public HTTPS URL into PUBLIC_BASE_URL in the root .env file
 *   3. Keeps running so the tunnel stays alive
 *
 * Requirements:
 *   - NGROK_AUTHTOKEN must be set in .env  (get yours at https://dashboard.ngrok.com)
 *
 * Usage:
 *   npm run tunnel
 */

import "dotenv/config";
import ngrok from "@ngrok/ngrok";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.resolve(__dirname, "../.env");

// ---------------------------------------------------------------------------
// Authtoken
// ---------------------------------------------------------------------------

const authtoken = process.env.NGROK_AUTHTOKEN;
if (!authtoken) {
  console.error(
    "\n[tunnel] ERROR: NGROK_AUTHTOKEN is not set in .env\n" +
    "  1. Get your token at https://dashboard.ngrok.com/get-started/your-authtoken\n" +
    "  2. Add to .env:  NGROK_AUTHTOKEN=<your-token>\n"
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Update PUBLIC_BASE_URL in .env
// ---------------------------------------------------------------------------

function updateEnv(publicUrl: string): void {
  let contents: string;
  try {
    contents = readFileSync(ENV_PATH, "utf-8");
  } catch {
    console.error(`[tunnel] Could not read .env at ${ENV_PATH}`);
    process.exit(1);
  }

  const key = "PUBLIC_BASE_URL";
  const newLine = `${key}=${publicUrl}`;

  if (new RegExp(`^${key}=`, "m").test(contents)) {
    contents = contents.replace(new RegExp(`^${key}=.*$`, "m"), newLine);
  } else {
    contents = contents.trimEnd() + `\n${newLine}\n`;
  }

  writeFileSync(ENV_PATH, contents, "utf-8");
}

// ---------------------------------------------------------------------------
// Start tunnel
// ---------------------------------------------------------------------------

const TUNNEL_PORT = parseInt(process.env.PORT || "4000");
console.log(`[tunnel] Starting ngrok tunnel on port ${TUNNEL_PORT}...`);

try {
  const listener = await ngrok.forward({
    addr: TUNNEL_PORT,
    authtoken,
  });

  const publicUrl = listener.url();

  if (!publicUrl) {
    console.error("[tunnel] ERROR: ngrok returned an empty URL. Check your authtoken.");
    process.exit(1);
  }

  updateEnv(publicUrl);

  console.log("\n" + "=".repeat(56));
  console.log("[tunnel] Tunnel is up!");
  console.log(`[tunnel] PUBLIC_BASE_URL=${publicUrl}`);
  console.log("[tunnel] .env updated. Keep this terminal open.");
  console.log("=".repeat(56) + "\n");

  // Keep the process alive so the tunnel stays open.
  const keepAlive = setInterval(() => {}, 1000 * 60 * 60);

  const cleanup = async () => {
    clearInterval(keepAlive);
    console.log("\n[tunnel] Shutting down tunnel...");
    try {
      await ngrok.disconnect();
    } catch {}
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`\n[tunnel] ERROR: Failed to start tunnel: ${msg}\n`);
  process.exit(1);
}
