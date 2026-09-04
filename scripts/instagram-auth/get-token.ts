/**
 * scripts/instagram-auth/get-token.ts
 *
 * One-off helper to obtain a long-lived Instagram access token
 * and your Instagram Business Account ID.
 *
 * Run with:
 *   npx tsx scripts/instagram-auth/get-token.ts
 *
 * Reads META_APP_ID and META_APP_SECRET from the root .env file.
 * Does NOT write anything back to .env — copy the printed values manually.
 */

import http from "node:http";
import { URL, URLSearchParams } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

// ---------------------------------------------------------------------------
// 1.  Load .env from project root (no external dotenv dependency needed —
//     parsed manually so this script is self-contained)
// ---------------------------------------------------------------------------
function loadEnv(): Record<string, string> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.resolve(__dirname, "../../.env");
  try {
    const raw = readFileSync(envPath, "utf-8");
    const vars: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
      vars[key] = val;
    }
    return vars;
  } catch {
    console.error("Could not read .env file at", envPath);
    process.exit(1);
  }
}

const env = loadEnv();
const APP_ID = env["META_APP_ID"] ?? "";
const APP_SECRET = env["META_APP_SECRET"] ?? "";

if (!APP_ID || !APP_SECRET) {
  console.error(
    "ERROR: META_APP_ID and/or META_APP_SECRET are missing from .env"
  );
  process.exit(1);
}

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/oauth-callback`;

// ---------------------------------------------------------------------------
// 2.  Build and print the authorization URL
// ---------------------------------------------------------------------------
const authUrl =
  `https://api.instagram.com/oauth/authorize` +
  `?client_id=${APP_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&scope=instagram_business_basic,instagram_business_content_publish` +
  `&response_type=code`;

// ---------------------------------------------------------------------------
// 3.  Start a local HTTP server and wait for the OAuth callback
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  if (!req.url) return;

  const parsed = new URL(req.url, `http://localhost:${PORT}`);

  if (parsed.pathname !== "/oauth-callback") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  // ---- 3a. Read the `code` query parameter ----
  const code = parsed.searchParams.get("code");
  const errorParam = parsed.searchParams.get("error");

  if (errorParam) {
    const desc = parsed.searchParams.get("error_description") ?? "";
    console.error(`\nInstagram returned an OAuth error: ${errorParam}`);
    console.error(`Description: ${decodeURIComponent(desc)}`);
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end(`OAuth error: ${errorParam}\n${desc}`);
    shutdownAfter(500);
    return;
  }

  if (!code) {
    console.error("\nNo 'code' parameter in callback URL:", req.url);
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Missing code parameter.");
    shutdownAfter(500);
    return;
  }

  console.log("\n✓ Received authorization code.");

  try {
    // ---- 3b. Exchange code for a short-lived token ----
    console.log("→ Exchanging code for short-lived token...");

    const tokenBody = new URLSearchParams({
      client_id: APP_ID,
      client_secret: APP_SECRET,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
      code,
    });

    const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
    });

    const shortJson = await shortRes.json() as Record<string, unknown>;

    if (!shortRes.ok || shortJson["error_type"] || shortJson["error"]) {
      console.error(
        "\n✗ Failed to get short-lived token. Full error response:"
      );
      console.error(JSON.stringify(shortJson, null, 2));
      console.error(
        "\nCommon causes:\n" +
          "  • redirect_uri mismatch (must match exactly what is registered)\n" +
          "  • Instagram account not added as a Tester in the Meta app\n" +
          "  • Account not switched to Business or Creator type"
      );
      respondAndShutdown(res, "Failed at short-lived token exchange. Check terminal.", 500);
      return;
    }

    const shortToken = shortJson["access_token"] as string;
    console.log("✓ Short-lived token obtained.");

    // ---- 3c. Exchange for a long-lived token (~60 days) ----
    console.log("→ Exchanging for long-lived token...");

    const longUrl =
      `https://graph.instagram.com/access_token` +
      `?grant_type=ig_exchange_token` +
      `&client_secret=${encodeURIComponent(APP_SECRET)}` +
      `&access_token=${encodeURIComponent(shortToken)}`;

    const longRes = await fetch(longUrl);
    const longJson = await longRes.json() as Record<string, unknown>;

    if (!longRes.ok || longJson["error"]) {
      console.error(
        "\n✗ Failed to get long-lived token. Full error response:"
      );
      console.error(JSON.stringify(longJson, null, 2));
      respondAndShutdown(res, "Failed at long-lived token exchange. Check terminal.", 500);
      return;
    }

    const longToken = longJson["access_token"] as string;
    const expiresIn = longJson["expires_in"];
    console.log(`✓ Long-lived token obtained (expires in ${expiresIn} seconds, roughly 60 days).`);

    // ---- 3d. Fetch the Instagram Business Account ID ----
    console.log("→ Fetching your Instagram account info...");

    const meUrl =
      `https://graph.instagram.com/me` +
      `?fields=id,username` +
      `&access_token=${encodeURIComponent(longToken)}`;

    const meRes = await fetch(meUrl);
    const meJson = await meRes.json() as Record<string, unknown>;

    if (!meRes.ok || meJson["error"]) {
      console.error(
        "\n✗ Failed to fetch account info. Full error response:"
      );
      console.error(JSON.stringify(meJson, null, 2));
      respondAndShutdown(res, "Failed fetching account info. Check terminal.", 500);
      return;
    }

    const accountId = meJson["id"] as string;
    const username = meJson["username"] as string;

    // ---- 3e. Print the final values clearly ----
    console.log("\n" + "=".repeat(60));
    console.log("✓ SUCCESS! Copy the following into your .env file:");
    console.log("=".repeat(60));
    console.log(`\nMETA_ACCESS_TOKEN=${longToken}`);
    console.log(`INSTAGRAM_BUSINESS_ACCOUNT_ID=${accountId}`);
    console.log(`\n(Username confirmed: @${username})`);
    console.log("=".repeat(60) + "\n");

    // ---- 3f. Respond to the browser ----
    respondAndShutdown(res, "Done! Check your terminal.", 200);
  } catch (err) {
    console.error("\n✗ Unexpected error during token exchange:", err);
    respondAndShutdown(res, "Unexpected error. Check terminal.", 500);
  }
});

function respondAndShutdown(
  res: http.ServerResponse,
  message: string,
  status: number
): void {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(message);
  shutdownAfter(300);
}

function shutdownAfter(ms: number): void {
  setTimeout(() => {
    server.close(() => {
      process.exit(0);
    });
  }, ms);
}

server.listen(PORT, () => {
  console.log(`\n${"=".repeat(60)}`);
  console.log("Instagram OAuth — one-time token fetcher");
  console.log("=".repeat(60));
  console.log(`\nLocal callback server running on port ${PORT}.`);
  console.log("\nOpen this URL in your browser, log in, and approve:\n");
  console.log(`  ${authUrl}\n`);
  console.log("Waiting for the OAuth callback... (do not close this terminal)");
});
