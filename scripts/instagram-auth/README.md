# scripts/instagram-auth

One-off tooling to fetch a **long-lived Instagram access token** and your **Instagram Business Account ID**.

## Prerequisites

- `META_APP_ID` and `META_APP_SECRET` already set in the root `.env`
- A redirect URI of `http://localhost:3000/oauth-callback` added in Meta for Developers → your app → Instagram API
- Your Instagram account added as a **Tester** in the app (or the app is Live)
- Your Instagram account is a **Business** or **Creator** account (not personal)

## Run

```bash
npx tsx scripts/instagram-auth/get-token.ts
```

## What happens

1. A local server starts on port 3000.
2. An authorize URL is printed — open it in your browser and approve.
3. Instagram redirects back; the script exchanges the code for a short-lived token, then immediately upgrades it to a **long-lived token (~60 days)**.
4. Your Business Account ID is fetched via `/me`.
5. Both values are printed to the terminal in copy-pasteable format:

```
META_ACCESS_TOKEN=<token>
INSTAGRAM_BUSINESS_ACCOUNT_ID=<id>
```

6. Copy those two values into your root `.env` — this script does **not** write to `.env` itself.
7. The server shuts down automatically.

## Error output

All Instagram API error bodies are printed verbatim so you can diagnose issues immediately.
