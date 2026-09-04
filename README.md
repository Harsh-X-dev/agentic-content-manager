# MARK-1: Autonomous Agentic Content Pipeline

An autonomous agentic content engine built with **TypeScript**, **Node.js**, **LangGraph**, **PostgreSQL**, and **Remotion**. It takes a technical topic, conducts research, scripts an educational video, plans animated scenes, verifies quality, renders a 9:16 portrait video, and publishes it automatically to Instagram as a Reel.

---

## Pipeline Architecture

The pipeline executes as a straight-line, persistent LangGraph `StateGraph` backed by PostgreSQL checkpointers (`PostgresSaver`) and queryable stage tables:

```text
[ START ]
    │
    ▼
[ researchStep ]  ──► Discovers 4-6 key facts, authoritative sources & hook angle
    │
    ▼
[ scriptStep ]    ──► Writes hook + timed narration sections (60-90s target)
    │
    ▼
[ sceneStep ]     ──► Converts sections into visual scenes (text, diagram, codeBlock)
    │
    ▼
[ qaStep ]        ──► Reviews script & scene consistency for contradictions or issues
    │
    ▼
[ renderStep ]    ──► Headless Remotion render (1080×1920 portrait MP4)
    │
    ▼
[ publish ]       ──► Uploads and publishes Reel via Instagram Graph API
    │
    ▼
 [ END ]
```

---

## Project Structure

```text
MARK_1/
├── src/
│   ├── index.ts                  # Main entry point (Express video host + pipeline trigger)
│   ├── graph.ts                  # LangGraph StateGraph topology & checkpointing
│   ├── publisher.ts              # Instagram Graph API Reels publisher
│   ├── render.ts                 # Programmatic Remotion renderer wrapper
│   ├── agents/                   # Specialized AI agents
│   │   ├── research.ts           # Research agent (structured facts & sources)
│   │   ├── script.ts             # Scriptwriting agent (narration & timing)
│   │   ├── scene.ts              # Visual director agent (ScenePlan schema & types)
│   │   └── qa.ts                 # QA reviewer agent (contradiction detection)
│   └── lib/                      # Core utilities
│       ├── model.ts              # Model provider factory (Gemini / OpenRouter)
│       ├── prisma.ts             # Prisma client singleton
│       └── saveStage.ts          # Structured stage persistence helper
├── apps/
│   └── renderer/                 # Remotion React video composition project
│       ├── remotion.config.ts    # Remotion CLI configuration
│       ├── package.json          # Renderer package dependencies (React 19, Remotion, Tailwind)
│       └── src/
│           ├── Root.tsx          # Composition registry (1080×1920 @ 30fps)
│           ├── MainVideo.tsx     # Dynamic sequence sequencing & duration calculator
│           ├── TextScene.tsx     # Kinetic typography headline scene
│           ├── DiagramScene.tsx  # Responsive SVG box & arrow architecture scene
│           ├── CodeScene.tsx     # Terminal syntax block scene with line-by-line reveal
│           └── types.ts          # Renderer ScenePlan and Scene type definitions
├── prisma/
│   ├── schema.prisma             # Database models (Topic, ResearchPackage, Script, Video, etc.)
│   └── migrations/               # PostgreSQL schema migrations
├── scripts/
│   ├── start-tunnel.ts           # ngrok HTTPS tunnel (syncs PUBLIC_BASE_URL to .env)
│   ├── instagram-auth/           # One-time OAuth token exchange tooling
│   │   └── get-token.ts          # Local server to obtain long-lived Meta access token
│   └── verify/                   # Test & verification suites
│       ├── test-postgres-saver.ts
│       ├── verify-qa-detection.ts
│       └── verify-restart-survival.ts
├── .env.example                  # Environment template
├── package.json                  # Root npm scripts and dependencies
└── tsconfig.json                 # Root TypeScript configuration
```

---

## Getting Started

### 1. Prerequisites
- **Node.js**: >= 18.0.0
- **PostgreSQL Database** (e.g. Neon, Supabase, or local Postgres)
- **AI Provider**: OpenRouter API key (`OPENROUTER_API_KEY`) or Google Gemini API key (`GOOGLE_API_KEY`)
- **ngrok Account**: Required to serve rendered videos over a public HTTPS URL so Instagram can fetch them
- **Meta Developer App**: Configured for Instagram Graph API with an Instagram Business or Creator account

### 2. Environment Configuration
Copy the sample environment file and configure your keys:
```bash
cp .env.example .env
```

Key environment variables:
- `PORT`: Local server port (default: `4000`)
- `DATABASE_URL`: PostgreSQL connection string
- `MODEL_PROVIDER`: Set to `openrouter` or `gemini`
- `OPENROUTER_API_KEY` & `OPENROUTER_MODEL`: e.g. `anthropic/claude-sonnet-4-5` or `google/gemini-2.5-flash`
- `NGROK_AUTHTOKEN`: For running the public tunnel
- `META_ACCESS_TOKEN` & `INSTAGRAM_BUSINESS_ACCOUNT_ID`: Instagram publishing credentials

### 3. Install Dependencies & Setup Database
```bash
npm install
npx prisma migrate deploy
```

### 4. Running the Pipeline

Running the pipeline requires two terminals:

#### Terminal 1 — Start the Public Tunnel
Instagram requires a public HTTPS URL to download the rendered video:
```bash
npm run tunnel
```
*This starts an ngrok tunnel on port 4000 and automatically writes `PUBLIC_BASE_URL` to your `.env`.*

#### Terminal 2 — Run the Pipeline
```bash
npm run dev
```
*Starts the Express video server on port 4000 and triggers the end-to-end pipeline (`research → script → scene → qa → render → publish`).*

---

## Verification Scripts

Pre-configured test runners are available via `npm run`:

- `npm run verify:qa`: Tests that the QA agent accurately detects factual contradictions between scripts and visual scenes.
- `npm run verify:restart`: Simulates a pipeline crash and verifies resumption from a PostgreSQL checkpoint.
- `npm run verify:postgres`: Confirms database connectivity and initializes LangGraph checkpoint tables.