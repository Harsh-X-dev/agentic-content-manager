# Autonomous Agentic Content Manager

## Beginner-to-Production Build Guide

**Version:** 1.0  
**Date:** 19 August 2026  
**Primary stack:** TypeScript + Node.js + OpenAI SDK + LangGraph + PostgreSQL + Remotion + Meta Graph API  
**Goal:** Build an agent that can discover developer-content opportunities, choose individual topics or multi-day series, research them, create animated educational videos, learn from page performance, schedule content, and ask a human for approval only at important decision/publication points.

---

# 0. Read This First

This document is your project roadmap.

You should not try to build the entire autonomous system on day one.

The project is intentionally divided into phases. Every phase teaches a specific Agentic AI concept and produces something working.

The long-term system is:

```text
                 ┌─────────────────────┐
                 │   SOCIAL PAGE       │
                 └──────────┬──────────┘
                            │
                      performance data
                            │
                            ▼
                 ┌─────────────────────┐
                 │  ANALYTICS AGENT    │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ STRATEGY / MEMORY   │
                 └──────────┬──────────┘
                            │
                    topic / series
                            │
                            ▼
                 ┌─────────────────────┐
                 │    RESEARCH AGENT   │
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │     SCRIPT AGENT    │
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │      SCENE AGENT    │
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │     REMOTION        │
                 │   VIDEO RENDERER    │
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │      QA AGENT       │
                 └──────────┬──────────┘
                            ▼
                      HUMAN APPROVAL
                            │
                            ▼
                 ┌─────────────────────┐
                 │  INSTAGRAM PUBLISH  │
                 └──────────┬──────────┘
                            ▼
                       performance
                            │
                            └───────────────► next decisions
```

The important mental model is:

> **AI handles judgment. Code handles deterministic work. LangGraph handles the long-running workflow and state.**

Do not turn every function into an agent.

For example:

- Choosing a topic → AI judgment.
- Deciding whether a series needs 10 episodes → AI judgment.
- Researching a topic → AI + search tools.
- Writing a script → AI judgment.
- Choosing visual metaphors → AI judgment.
- Rendering an MP4 → ordinary code.
- Saving a row to PostgreSQL → ordinary code.
- Uploading/publishing an approved Reel → ordinary code.
- Calculating engagement rate → ordinary code.
- Scheduling tomorrow's job → ordinary code.

This distinction will save you from a huge amount of complexity.

---

# 1. What You Are Building

The final product is an **autonomous developer-content manager**.

A user should eventually be able to say:

> "Build a developer education page focused on AI agents and backend engineering."

The system should then be able to:

1. Monitor relevant trends and sources.
2. Identify candidate topics.
3. Score the opportunities.
4. Decide whether a topic is one video or part of a series.
5. Propose a series, such as a 10-day sequence.
6. Ask the human to approve the strategic direction.
7. Research each episode.
8. Write each script.
9. Design visual explanations.
10. Generate the animation specification.
11. Render the video.
12. Run factual/content/technical QA.
13. Ask for approval before publishing.
14. Publish/schedule through the platform API.
15. Collect page/video performance data.
16. Analyze what worked and what did not.
17. Update its content strategy.
18. Select the next content based on both current trends and historical performance.

The agent should **evolve its strategy**, not secretly retrain its foundation model.

---

# 2. The Exact Technology Choice

## 2.1 Use these as the primary tools

### TypeScript + Node.js

Use TypeScript for the backend and orchestration layer.

Why:

- You already understand JavaScript/TypeScript.
- The current OpenAI Agents SDK has a TypeScript implementation.
- LangGraph has a JavaScript/TypeScript implementation.
- Remotion is React/TypeScript based.
- Meta's APIs can be called from ordinary HTTP clients.

### OpenAI SDK / OpenAI models

Use OpenAI's API/SDK for the model calls.

For agent-specific experiments, OpenAI also provides an official Agents SDK for TypeScript with agents, tools, handoffs, guardrails, sessions, human-in-the-loop mechanisms, and tracing. It is useful and worth learning, but it is **not mandatory** for this project. [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/) 

### LangGraph

Use LangGraph as the workflow/state layer.

LangGraph is designed for long-running, stateful workflows with durable execution, persistence, human-in-the-loop behavior, memory, streaming, and retry/error handling. Its JavaScript package can be installed with `@langchain/langgraph` and `@langchain/core`. [LangGraph overview](https://docs.langchain.com/oss/javascript/langgraph/overview)

This fits your project particularly well because a workflow may pause for human approval and resume hours or days later. LangGraph's `interrupt()` mechanism can pause execution indefinitely and resume after human input, using persisted checkpoints. [LangGraph human-in-the-loop](https://github.com/langchain-ai/langgraphjs/blob/main/docs/docs/agents/human-in-the-loop.md)

### PostgreSQL

Use PostgreSQL as the durable application database.

Store:

- pages
- topics
- trends
- series
- episodes
- scripts
- scenes
- videos
- approvals
- publish jobs
- platform posts
- metrics
- strategy versions
- experiments
- agent decisions

### Remotion

Use Remotion for the actual educational animation engine.

The video is not generated by an LLM. The LLM produces a structured description; Remotion renders the deterministic animation.

This avoids the biggest weakness of generative video for technical explainers: exact labels, diagrams, repeated visual vocabulary, and deterministic rendering.

### Meta Graph API

Use Meta's official API for Instagram publishing and analytics when your account/app setup supports the needed permissions and endpoints. Treat this as an integration milestone, not as a simple first-week feature.

### Optional services later

- TTS provider
- Object storage/media hosting
- Redis/BullMQ
- LangSmith or another tracing system
- Google Trends/web search services
- Reddit/GitHub data sources
- Generative image/video APIs

Do not add these until the previous phase needs them.

---

# 3. Why LangGraph + OpenAI Instead of “Just LangChain”

You are likely to hear these names together, so keep their roles separate.

```text
OpenAI SDK
    = model calls / responses / tools

LangChain
    = optional LLM/tool/retrieval abstractions

LangGraph
    = workflow + state + persistence + branching + retries + human approval
```

You can use LangChain components inside the project, but you do not need to build everything around LangChain abstractions.

Your core problem is not:

> “How do I call an LLM?”

Your core problem is:

> “How do I run a long-lived content-production workflow, persist its state, pause for approval, recover from errors, publish on schedule, and learn from outcomes?”

That is why LangGraph is the center of the architecture.

OpenAI's official Agents SDK is also a valid alternative for multi-agent applications and provides tools, handoffs, guardrails, sessions, and tracing. [OpenAI Agents SDK TypeScript](https://openai.github.io/openai-agents-js/) 

For this learning project, use **LangGraph first** because it forces you to understand state and workflow orchestration instead of hiding them.

---

# 4. What You Should NOT Build at the Beginning

Do not start with:

- 10 autonomous agents
- Instagram automation
- self-learning algorithms
- a full RAG system
- LangSmith dashboards
- generative video APIs
- a mobile app
- Kubernetes
- microservices
- Redis queues
- automatic posting
- multi-platform support
- reinforcement learning

Those are later milestones.

Your first objective is:

```text
Topic
  ↓
Research
  ↓
Script
  ↓
Scene plan
  ↓
Video
```

Once this works reliably, you add autonomy.

---

# 5. The Learning Order

You should learn in this order:

```text
Phase 0  → foundations
Phase 1  → OpenAI API + structured output
Phase 2  → tools
Phase 3  → LangGraph state/workflows
Phase 4  → persistence
Phase 5  → human approval
Phase 6  → research/trend tools
Phase 7  → video/Remotion
Phase 8  → agentic content pipeline
Phase 9  → series planning
Phase 10 → Instagram integration
Phase 11 → scheduling
Phase 12 → analytics
Phase 13 → memory + strategy evolution
Phase 14 → autonomous operation
Phase 15 → production hardening
```

Do not skip phases just because a later component sounds more exciting.

---

# 6. Phase 0 — Prepare Your Development Environment

## Goal

Create the project structure and understand the tools before AI enters the picture.

## Learn

- Node.js basics
- npm
- TypeScript
- environment variables
- REST APIs
- JSON
- PostgreSQL basics
- Git branches/commits

## Create the repository

Suggested name:

```text
agentic-content-manager
```

Suggested initial structure:

```text
agentic-content-manager/
│
├── apps/
│   ├── api/
│   ├── web/
│   └── renderer/
│
├── packages/
│   ├── schemas/
│   ├── agent-core/
│   ├── db/
│   ├── tools/
│   └── video-components/
│
├── docs/
├── scripts/
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

Do not create every folder immediately. The purpose of the structure is to show the eventual boundaries.

## Environment variables

Never commit actual keys.

Use:

```text
OPENAI_API_KEY=
DATABASE_URL=
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
META_USER_ID=
```

Add `.env` to `.gitignore`.

## Done when

You can:

- create/run a TypeScript backend
- connect to PostgreSQL
- load environment variables
- make a normal REST endpoint
- commit the project safely

---

# 7. Phase 1 — Your First AI Worker

## Goal

Learn to call a model from Node.js and get **structured data**, not a blob of text.

This is your first important lesson:

> Agents should communicate through validated data whenever possible.

## Build

Create a Topic Analyzer.

Input:

```json
{
  "topic": "Docker containers"
}
```

Output:

```json
{
  "topic": "Docker containers",
  "audience": "beginner developers",
  "difficulty": "beginner",
  "why_it_matters": [
    "portable application environments",
    "reproducible deployments"
  ],
  "possible_video_angles": [
    "Docker in 60 seconds",
    "Container vs virtual machine",
    "What actually happens when docker run executes?"
  ]
}
```

Validate this with Zod.

## Learn

- model messages
- system/developer instructions
- user input
- structured output
- JSON schema concepts
- validation
- API errors
- retries

## Done when

You can pass any topic and reliably receive a validated `TopicAnalysis` object.

---

# 8. Phase 2 — Give the Agent Tools

## Goal

Learn the difference between an LLM that **answers** and an agent that **takes actions**.

Create three simple tools.

### Tool 1 — calculator

```text
calculate(expression)
```

### Tool 2 — save topic

```text
saveTopic(topic)
```

### Tool 3 — get topic

```text
getTopic(id)
```

Then give the agent a task:

> Analyze this idea. If it is worth saving, calculate its score and save it.

Now you have:

```text
User
 ↓
LLM
 ↓
Decides tool
 ↓
Your TypeScript function
 ↓
Result
 ↓
LLM continues
```

## Learn

- function tools
- tool schemas
- tool input validation
- tool results
- agent loops
- deterministic tools vs AI decisions

## Important rule

A tool must be a normal, testable TypeScript function.

Do not put business logic inside prompts.

---

# 9. Phase 3 — Learn LangGraph

## Goal

Turn individual calls into an actual workflow.

Start with a tiny graph:

```text
START
  ↓
Analyze Topic
  ↓
Write Outline
  ↓
Create Script
  ↓
END
```

Do not build the complete system yet.

## Learn

- state
- nodes
- edges
- conditional routing
- graph execution
- streaming
- retry policies

LangGraph is explicitly designed around stateful orchestration, durable execution, human-in-the-loop, and memory. [LangGraph overview](https://docs.langchain.com/oss/javascript/langgraph/overview)

## State

Start with:

```ts
{
  topic: string,
  analysis?: TopicAnalysis,
  outline?: Outline,
  script?: Script
}
```

## Why state matters

The key LangGraph idea is:

> Nodes are functions that read state and return state updates.

Do not think of your agents as independent chatbots.

Think:

```text
shared workflow state
        ↓
 node A
        ↓
 updated state
        ↓
 node B
```

## Done when

You can pause after the outline and inspect the state before creating the script.

---

# 10. Phase 4 — Persist the Workflow

## Goal

Make the workflow survive process restarts.

Without persistence:

```text
workflow running
     ↓
server crashes
     ↓
state gone
```

With persistence:

```text
workflow
  ↓
checkpoint
  ↓
server restarts
  ↓
resume
```

LangGraph's persistence/checkpoint model saves graph state across steps and enables human approval, memory, fault-tolerant execution, and resumption. [LangGraph persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)

## Build

Use PostgreSQL for durable application data and LangGraph's supported checkpointer mechanism for graph state.

Create tables/models for:

```text
Project
Page
Topic
Series
Episode
WorkflowRun
Approval
Video
PublishJob
Metrics
StrategyVersion
AgentDecision
Experiment
```

You can use Prisma or Drizzle. Pick one and stay with it.

For you, Prisma is probably the easiest because you already have experience with it.

## Learn

- relational modeling
- foreign keys
- unique constraints
- indexes
- transactions
- workflow IDs
- idempotency

## Done when

You can stop your Node process, restart it, and continue the same workflow without losing important state.

---

# 11. Phase 5 — Human-in-the-Loop

## Goal

Teach the system when it must stop and ask you.

This is one of the most important Agentic AI concepts in this project.

Your policy should eventually be:

```text
AUTONOMOUS
──────────
trend collection
research
script generation
scene generation
rendering
quality checks
analytics
strategy analysis

HUMAN APPROVAL
──────────────
starting a new content strategy/series
publishing content
changing high-impact account settings
```

## Build first

Create a tiny workflow:

```text
Generate recommendation
        ↓
INTERRUPT
        ↓
Human: approve/reject/edit
        ↓
Resume
        ↓
Continue
```

LangGraph's `interrupt()` is specifically designed to pause a graph indefinitely and resume after human input, with persisted state. [Human-in-the-loop](https://github.com/langchain-ai/langgraphjs/blob/main/docs/docs/agents/human-in-the-loop.md)

## Your UI

Create a simple approval page:

```text
Recommendation
────────────────────────
Create a 10-day Docker series?

Reason:
...

Episodes:
1. ...
2. ...
...
10. ...

[Approve]
[Edit]
[Reject]
```

## Learn

- interrupts
- resume
- state editing
- approval gates
- irreversible actions
- audit trails

## Done when

You can start a workflow, close your browser, approve it later, and resume exactly where it stopped.

---

# 12. Phase 6 — Build the Trend Research System

## Goal

Teach the agent to gather external information instead of relying entirely on its pretrained knowledge.

Do not begin with “Instagram trends” as your only source.

There is not a single universal Instagram endpoint that should be treated as your entire trend engine.

Use multiple sources:

```text
Google Trends
     │
Web/news search
     │
Reddit
     │
GitHub
     │
Developer communities
     │
Optional platform-specific signals
     ↓
Trend Candidate Store
```

Google Trends' public Trending Now data is designed to surface recently trending searches and updates frequently, making it useful as one input to a broader trend engine. [Google Trends](https://support.google.com/trends/answer/3076011)

## Important distinction

A “trend” is not automatically a good video topic.

The agent needs to score:

```text
trend_score
relevance_score
audience_fit
competition
educational_value
recency
series_potential
```

Example:

```json
{
  "topic": "AI coding agents",
  "trendScore": 0.84,
  "audienceFit": 0.91,
  "seriesPotential": 0.88,
  "recommendation": "strong"
}
```

## Learn

- tool calling
- web search
- source extraction
- ranking
- evidence
- recency
- factuality

## Done when

You can run:

```text
Find 10 developer topics worth considering today.
```

and receive a ranked list with evidence and reasons.

---

# 13. Phase 7 — Research Agent

## Goal

Separate “finding a trend” from “understanding a topic.”

The Research Agent should build a factual research package.

Example:

```text
ResearchPackage
├── topic
├── target_audience
├── core_concepts
├── terminology
├── examples
├── common_misconceptions
├── sources
├── claims
└── confidence
```

Every important factual claim should have a source.

Do not let the Script Agent research and write at the same time during the early phases. Keeping research separate makes debugging much easier.

## Learn

- retrieval
- source ranking
- citations
- claim extraction
- evidence grounding
- hallucination reduction

## Done when

Your research package could be handed to a human technical writer and used to create the video without browsing again.

---

# 14. Phase 8 — Script Agent

## Goal

Transform research into a short educational explanation.

A good developer short should usually have a very clear teaching progression.

Start with:

```text
HOOK
 ↓
PROBLEM
 ↓
EXPLANATION
 ↓
VISUAL EXAMPLE
 ↓
TAKEAWAY
```

Example:

```text
Hook:
“Why does Docker start a container in seconds when a VM can take much longer?”

Problem:
“Both isolate applications, but they do it differently.”

Explanation:
“VMs virtualize a whole operating system...”

Visual:
show VM and container architecture

Takeaway:
“Containers share the host kernel while packaging the application and dependencies.”
```

## Script schema

```text
Script
├── title
├── hook
├── target_duration
├── audience
├── sections[]
│   ├── narration
│   ├── teaching_goal
│   ├── visual_goal
│   └── emphasis
├── takeaway
└── caption
```

## Learn

- content planning
- structured generation
- controlled style
- audience adaptation
- duration constraints

## Done when

You can generate three different scripts for the same topic and explain why one is better for your audience.

---

# 15. Phase 9 — Build the Visual Language

## Goal

Create a reusable visual vocabulary for technical videos.

This is where the project becomes a real product instead of a generic video generator.

Build reusable components such as:

```text
User
Server
Browser
Database
API
Queue
Dockerfile
DockerImage
Container
Cloud
Terminal
CodeBlock
Arrow
Label
LayerStack
Timeline
```

The visual system should have consistent rules.

Example:

```text
Database = cylinder
API = connection/arrow
Container = outlined process box
Image = layered immutable stack
Queue = horizontal cards
Server = machine block
```

Do not ask the model to redesign these shapes every episode.

## Learn

- component architecture
- design systems
- animation primitives
- reusable visual metaphors
- deterministic rendering

## Done when

You can build five different technical videos using the same visual components without copying animation code everywhere.

---

# 16. Phase 10 — Learn Remotion

## Goal

Create one high-quality animated video entirely by code.

Remotion is your rendering engine.

Your architecture should be:

```text
Scene JSON
   ↓
React components
   ↓
Animation timeline
   ↓
Remotion renderer
   ↓
MP4
```

The LLM does **not** directly generate the MP4.

## First video

Do this manually.

Topic:

```text
How Docker works
```

Build the first 30–60 second episode by hand.

Show:

```text
Dockerfile
    ↓
Image
    ↓
Container
    ↓
Application running
```

Then extract reusable animation primitives.

## Learn

- React components
- frames
- interpolation
- timing
- transitions
- composition
- rendering
- media/audio

## Done when

You can render a polished educational MP4 from your local machine without any AI involved.

---

# 17. Phase 11 — Scene JSON

## Goal

Connect the AI world to the rendering world safely.

The Script Agent should not output arbitrary Remotion code.

Instead:

```text
LLM
 ↓
validated Scene JSON
 ↓
Scene interpreter
 ↓
Remotion
```

Example conceptual scene schema:

```json
{
  "sceneId": "docker-image",
  "duration": 7,
  "narration": "The image is the blueprint...",
  "elements": [
    {
      "id": "layers",
      "type": "layer-stack",
      "x": 420,
      "y": 220,
      "label": "Docker Image"
    }
  ],
  "animations": [
    {
      "type": "fadeIn",
      "target": "layers",
      "start": 0,
      "duration": 0.5
    }
  ]
}
```

The exact schema is yours to design.

Start small.

## Learn

- domain-specific schemas
- compiler/interpreter thinking
- validation
- deterministic AI-to-code boundaries
- security

## Security rule

Do **not** allow the LLM to execute arbitrary JavaScript or shell commands as part of scene generation.

The agent should select from a controlled set of component types and animation commands.

## Done when

A model-generated scene plan can be validated and rendered without manually editing the scene code.

---

# 18. Phase 12 — TTS and Captions

## Goal

Turn the script into synchronized spoken content.

Architecture:

```text
Script
  ↓
TTS
  ↓
Audio
  ↓
word/segment timestamps
  ↓
Remotion captions + animations
```

Start with segment-level timing.

You do not need perfect word-level synchronization on day one.

## Learn

- audio assets
- duration matching
- timestamp synchronization
- subtitles
- media storage

## Paid-service strategy

Treat TTS as replaceable.

Create an interface:

```ts
interface TextToSpeechProvider {
  synthesize(input: TTSInput): Promise<TTSAudio>;
}
```

Then you can start with any affordable/free provider and switch later without redesigning the agent.

---

# 19. Phase 13 — Build the Complete Content Pipeline

Now connect everything.

```text
TOPIC
  ↓
RESEARCH
  ↓
SCRIPT
  ↓
SCENE PLAN
  ↓
TTS
  ↓
RENDER
  ↓
QA
```

Create a single LangGraph workflow.

Suggested state:

```text
ContentWorkflowState
├── projectId
├── topic
├── research
├── script
├── scenes
├── audio
├── video
├── qa
├── approval
└── errors
```

Every node should be testable independently.

## Done when

You can enter:

```text
“How Docker containers work”
```

and receive a completed video without manually editing the pipeline.

---

# 20. Phase 14 — Add the QA Agent

## Goal

The agent should be able to reject its own bad work.

This is a crucial Agentic AI concept.

Create multiple checks.

### Factual QA

```text
Are the technical claims supported by the research package?
```

### Script QA

```text
Is the explanation coherent?
Is the hook clear?
Is it too long?
```

### Visual QA

```text
Does each important idea have a corresponding visual?
Are labels readable?
```

### Technical QA

Deterministic checks:

```text
video exists
video duration within range
file is valid MP4
audio exists
required scenes rendered
```

Use ordinary code for these deterministic checks.

## Retry pattern

```text
Generate
  ↓
Validate
  ↓
FAILED
  ↓
Repair
  ↓
Validate
  ↓
PASSED
```

Do not retry forever.

Use a maximum retry count and escalate to human review.

---

# 21. Phase 15 — Series Planning

Now implement one of your most important product features.

The agent can decide:

```text
single video
OR
multi-day series
```

For a series:

```text
Series
├── goal
├── audience
├── episode_count
├── narrative_order
├── continuity_rules
└── episodes[]
```

Example:

```text
Series: Docker From Zero

Day 1  What problem does Docker solve?
Day 2  Image vs container
Day 3  Dockerfile
Day 4  Docker layers
Day 5  Volumes
Day 6  Networking
Day 7  Compose
Day 8  Containers vs VMs
Day 9  Production patterns
Day 10 Build a real project
```

## Important design rule

The system should generate the entire **series plan first**, then create episodes independently.

Do not make Episode 7 blindly guess what Episodes 1–6 were about.

Store the series plan in the database.

Each episode can retrieve:

- series objective
- previous episode summaries
- next episode purpose
- continuity rules

## Learn

- long-horizon planning
- hierarchical planning
- persistent state
- dependencies between tasks

---

# 22. Phase 16 — Trend Agent + Strategy Agent

Now your system starts becoming autonomous.

Separate these two responsibilities.

## Trend Agent

Answers:

> What is happening now?

## Strategy Agent

Answers:

> Given what is happening now and what has worked for our page, what should we do?

This distinction is extremely important.

A trending topic may be:

- irrelevant to your audience
- oversaturated
- difficult to explain visually
- risky
- outside your page identity

So:

```text
Trend Agent
     ↓
Candidate Topics
     ↓
Strategy Agent
     ↓
Prioritized Opportunities
```

## Strategy score

Start with a simple weighted score:

```text
opportunity_score =
    trend_score * 0.25
  + audience_fit * 0.20
  + educational_value * 0.20
  + series_potential * 0.15
  + historical_success * 0.10
  + freshness * 0.10
```

Later the agent can learn or tune these weights.

Do not begin with machine learning. Start with interpretable rules.

---

# 23. Phase 17 — Instagram Integration

Do this only after your local generation pipeline works.

## Goal

Publish an approved video programmatically.

Meta provides official Instagram APIs for professional accounts and supports content publishing workflows, but integration is gated by account configuration, Meta app setup, permissions, access tokens, media requirements, and endpoint-specific constraints.

Treat the integration as an external subsystem that can fail.

## Build a Publisher Service

Do not let the LLM directly call Instagram.

Instead:

```text
Agent decision
    ↓
PublishJob
    ↓
PublisherService
    ↓
Meta Graph API
```

The publisher should be responsible for:

- authentication
- token handling
- media URL validation
- publishing requests
- status polling when needed
- error classification
- idempotency
- recording platform IDs

## Human gate

Before publishing:

```text
video
caption
hashtags
publish time
platform

[Approve & Publish]
[Edit]
[Reject]
```

The agent must never bypass this gate during the learning phase.

## Common integration problems

Expect issues around:

- professional account requirements
- permissions
- access tokens expiring or being invalidated
- Meta app configuration
- account/page relationships
- media must be accessible to Meta when the API expects a hosted URL
- unsupported media properties
- rate limits
- failed processing
- duplicate publication attempts
- platform-specific API changes

Keep the publisher behind an interface so the rest of the system does not care about the exact Meta mechanics.

---

# 24. Phase 18 — Scheduling

Now the system should manage a calendar.

For a 10-day series:

```text
Series approved
     ↓
Episode 1 → Day 1
Episode 2 → Day 2
...
Episode 10 → Day 10
```

You need a deterministic scheduler.

The Strategy Agent decides **what** should happen.

The scheduler decides **when** it happens.

Do not let the LLM directly implement timing logic.

## Database states

Use explicit states such as:

```text
PLANNED
RESEARCHING
SCRIPTING
RENDERING
QA
AWAITING_APPROVAL
APPROVED
SCHEDULED
PUBLISHING
PUBLISHED
FAILED
CANCELLED
```

This makes your system observable and recoverable.

---

# 25. Phase 19 — Analytics

Now the page starts teaching the agent.

For every post, collect the metrics that your platform/account/API makes available.

Store raw observations first.

Example:

```text
Post
├── published_at
├── views
├── likes
├── comments
├── shares
├── saves
├── reach
├── watch_time
├── completion_rate
└── other available metrics
```

Do not only save a single “performance score.”

Keep raw metrics so you can change your analysis later.

---

# 26. Phase 20 — Build the Analytics Agent

The Analytics Agent asks:

> What happened?

Not:

> What should we do?

Keep those responsibilities separate at first.

Example analysis:

```text
Video type:
visual architecture explanation

Median duration:
42 sec

Observed:
high saves
high completion
moderate likes

Conclusion:
This format appears strong for educational intent.
```

The agent should compare against the page's history instead of making conclusions from one video.

---

# 27. Phase 21 — Build the Strategy Memory

Now create persistent strategic memory.

This is not just a vector database.

Start with normal Postgres tables.

Store:

```text
ContentPattern
├── pattern
├── evidence_count
├── supporting_posts
├── confidence
├── first_seen
├── last_updated
└── status
```

Example:

```text
Pattern:
“30–45 second visual explanations perform well.”

Evidence:
14 posts

Confidence:
0.81

Status:
ACTIVE
```

This is more useful than blindly embedding all old posts.

---

# 28. Phase 22 — Teach the Agent to Evolve

Now implement the closed loop.

```text
Observe
  ↓
Analyze
  ↓
Hypothesize
  ↓
Change strategy
  ↓
Experiment
  ↓
Observe
```

This is the heart of your “self-evolving page” concept.

## Example

The agent notices:

```text
Technical tutorial videos:
low completion

Visual architecture videos:
high completion
```

It forms a hypothesis:

> Beginner viewers respond better to visual mechanisms than command-heavy tutorials.

It then deliberately tests that hypothesis with several future videos.

Do not immediately declare the pattern true from two posts.

---

# 29. Exploration vs Exploitation

Eventually, your agent will face a classic optimization problem.

Should it:

**Exploit:** make more of what already works?

or

**Explore:** try new formats/topics that might outperform the current strategy?

If it only exploits, the page can become repetitive and miss new opportunities.

If it only explores, it may produce unstable content.

Start with a simple policy such as:

```text
70% proven formats
20% adjacent experiments
10% radical experiments
```

These percentages are starting policy values, not universal truths.

Later you can learn more sophisticated approaches such as contextual bandits or Bayesian experimentation.

Do not implement reinforcement learning first.

---

# 30. Phase 23 — Agent Decisions Must Be Explainable

Store every major strategic decision.

Example:

```text
Decision ID: 1024

Decision:
Create a 10-day AI Agents series.

Evidence:
- rising topic interest
- strong audience fit
- previous agent-content videos performed well
- high series potential

Expected result:
high saves and completion

Confidence:
0.78
```

Later:

```text
Actual result:
7 of 10 videos outperformed page median.
```

This lets you investigate why the agent made a mistake.

It also creates a valuable portfolio demonstration.

---

# 31. Phase 24 — Add Long-Term Memory Carefully

Use three layers of memory.

## Layer 1 — Working state

What is happening in the current workflow?

Example:

```text
Episode 4
currently rendering
```

## Layer 2 — Project memory

What has happened to this series/page?

Example:

```text
Series objective
previous episodes
content patterns
```

## Layer 3 — Knowledge retrieval

What external knowledge is relevant?

Example:

```text
Docker documentation
Instagram API docs
current AI news
```

Do not call all three “RAG.”

They solve different problems.

---

# 32. Phase 25 — Add Observability

When your system has this many moving pieces, logs are not enough.

You need to see:

```text
Workflow Run
   ↓
Node
   ↓
LLM call
   ↓
Tool call
   ↓
Result
   ↓
Decision
```

Track:

- latency
- token/cost usage
- retries
- tool errors
- state transitions
- human approvals
- final outcome

LangGraph integrates with LangSmith for tracing/debugging, while OpenAI's Agents SDK also provides tracing. Choose one primary tracing system initially instead of instrumenting everything twice.

---

# 33. Phase 26 — Reliability and Idempotency

This is one of the most important production phases.

Suppose your worker crashes after Instagram accepts the publish request but before your database records the success.

On retry you could publish the same video twice.

Your system therefore needs idempotent job handling.

Use an internal `publish_job_id`.

Before publishing:

```text
check job status
check whether platform post ID already exists
only send the platform request when safe
```

Apply similar thinking to:

- rendering
- TTS
- media uploads
- notifications
- scheduler jobs

---

# 34. Phase 27 — Failure Handling

Assume every external service can fail.

Build explicit error categories.

## Retryable

Examples:

- temporary API outage
- timeout
- rate limit
- transient network failure

Action:

```text
retry with backoff
```

## Repairable by agent

Examples:

- invalid scene schema
- script too long
- missing required field

Action:

```text
agent repair
→ validate again
```

## Requires human

Examples:

- policy uncertainty
- publishing permission issue
- repeated rendering failure
- high-risk content

Action:

```text
interrupt
→ human
```

## Fatal

Examples:

- corrupted database
- invalid project configuration

Action:

```text
stop
→ log
→ alert
```

---

# 35. Phase 28 — Cost Control

Your architecture should allow the project to work without expensive generative video.

## Free/low-cost core

Prefer:

- local Remotion rendering
- PostgreSQL free tier/local database
- free-tier web/trend sources where allowed
- low-cost or free model tiers for development where available
- local test data
- local development

## Paid when useful

Potential paid areas:

- higher-volume LLM usage
- premium TTS
- premium web/search API
- media storage/CDN beyond free quota
- advanced generative image/video
- hosted workflow infrastructure
- observability at scale

## Generative video

Do not make Veo/Sora/Kling/etc. part of the core technical pipeline.

Use them only for optional assets such as:

```text
cinematic intro
background B-roll
abstract transition
```

Your technical explanations should still be renderable with Remotion alone.

This means the project survives even if the generative video budget is zero.

---

# 36. Phase 29 — Security

Your system eventually controls:

- API credentials
- social accounts
- content
- external publishing
- potentially arbitrary research tools

Security therefore becomes part of the design.

Rules:

1. Never put secrets in prompts.
2. Never expose API keys to the browser.
3. Never let an LLM execute arbitrary shell commands without a controlled sandbox.
4. Validate every tool input.
5. Limit tool permissions.
6. Separate read tools from write/publish tools.
7. Require human approval for irreversible actions.
8. Log important tool calls.
9. Never trust generated URLs blindly.
10. Sanitize user-generated captions/content before downstream use.

The publishing tool should be much more restricted than a research tool.

---

# 37. Phase 30 — The Final Autonomous Loop

Once all previous components work, you can finally run the autonomous page manager.

```text
                 DAILY / PERIODIC JOB
                          │
                          ▼
                    Trend Agent
                          │
                          ▼
                   Strategy Agent
                          │
                ┌─────────┴─────────┐
                │                   │
          Continue series        New topic
                │                   │
                └─────────┬─────────┘
                          ▼
                    Research Agent
                          ▼
                     Script Agent
                          ▼
                      Scene Agent
                          ▼
                   Remotion Renderer
                          ▼
                       QA Agent
                          │
                    approved internally
                          ▼
                 ┌───────────────────┐
                 │ HUMAN APPROVAL    │
                 │ only when needed  │
                 └─────────┬─────────┘
                           ▼
                    Publish Scheduler
                           ▼
                     Meta Publisher
                           ▼
                    Social Media Page
                           ▼
                      Metrics Collector
                           ▼
                     Analytics Agent
                           ▼
                      Strategy Memory
                           ▼
                      Next decision
```

That is the final product.

---

# 38. Recommended Repository Structure

As the project matures, use something like:

```text
agentic-content-manager/
│
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   └── server.ts
│   │   │
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   └── package.json
│   │
│   └── renderer/
│       ├── src/
│       │   ├── compositions/
│       │   ├── components/
│       │   ├── scenes/
│       │   └── Root.tsx
│       └── package.json
│
├── packages/
│   ├── agent-core/
│   │   ├── graphs/
│   │   ├── nodes/
│   │   ├── state/
│   │   └── prompts/
│   │
│   ├── schemas/
│   │   ├── topic.ts
│   │   ├── research.ts
│   │   ├── script.ts
│   │   ├── scene.ts
│   │   └── qa.ts
│   │
│   ├── tools/
│   │   ├── trends/
│   │   ├── research/
│   │   ├── instagram/
│   │   ├── analytics/
│   │   └── storage/
│   │
│   ├── db/
│   │   └── prisma/
│   │
│   └── video-components/
│       ├── Box.tsx
│       ├── Arrow.tsx
│       ├── Server.tsx
│       ├── Database.tsx
│       └── Container.tsx
│
├── docs/
│   ├── architecture.md
│   ├── agent-design.md
│   ├── scene-schema.md
│   ├── publishing.md
│   └── decisions/
│
├── scripts/
├── .env.example
├── package.json
└── README.md
```

You do not have to create all of this on day one.

---

# 39. The Data Model You Will Eventually Need

A simplified relational model:

```text
Page
 │
 ├──── Trend
 │
 ├──── Topic
 │       │
 │       └──── Series
 │                 │
 │                 └──── Episode
 │                          │
 │                          ├──── Script
 │                          ├──── Scene
 │                          ├──── Video
 │                          ├──── Approval
 │                          ├──── PublishJob
 │                          └──── Metrics
 │
 ├──── StrategyVersion
 │
 ├──── Pattern
 │
 ├──── Experiment
 │
 └──── AgentDecision
```

Keep raw data and derived conclusions separate.

For example:

```text
metrics table
     ↓
raw observations

content_pattern table
     ↓
agent's interpretation of those observations
```

That lets you recompute strategy later.

---

# 40. The Agent Boundaries

Do not define agents based only on names.

Define them based on responsibilities.

## Trend Agent

Question:

> What is happening in the outside world right now?

Output:

```text
TrendCandidate[]
```

## Strategy Agent

Question:

> Given current trends, page identity, audience, history, and constraints, what should we make?

Output:

```text
ContentDecision
```

## Research Agent

Question:

> What must be true for us to explain this topic accurately?

Output:

```text
ResearchPackage
```

## Script Agent

Question:

> How should this be taught in a short video?

Output:

```text
Script
```

## Scene Agent

Question:

> How can each teaching point be represented visually?

Output:

```text
ScenePlan
```

## QA Agent

Question:

> Is this content acceptable and correct?

Output:

```text
QAResult
```

## Analytics Agent

Question:

> What happened after publication?

Output:

```text
PerformanceAnalysis
```

## Strategy Memory / Learning

Question:

> What should change in future decisions because of the evidence?

Output:

```text
StrategyUpdate
```

---

# 41. Where You Will Probably Get Stuck

Expect these problems.

## Problem 1 — “The agent keeps making bad decisions.”

Cause:

You gave it too much freedom and too little structure.

Fix:

- structured outputs
- explicit scoring
- constraints
- deterministic validators
- examples
- human approval for important decisions

---

## Problem 2 — “The agents are just talking to each other.”

Cause:

You created multi-agent chat instead of workflows.

Fix:

Make agents communicate through typed state/data.

```text
ResearchPackage
    ↓
Script
    ↓
ScenePlan
```

---

## Problem 3 — “The video looks random.”

Cause:

The model is inventing visuals from scratch.

Fix:

Use a reusable visual component library and a controlled scene schema.

---

## Problem 4 — “My scene generator produces invalid instructions.”

Fix:

Validate with Zod.

Then:

```text
invalid
 ↓
repair
 ↓
validate
 ↓
render
```

---

## Problem 5 — “The agent posted twice.”

Fix:

Idempotency + publish-job state + platform post IDs.

---

## Problem 6 — “The agent thinks one viral video proves a strategy.”

Fix:

Require multiple observations before changing the strategy.

Use confidence and evidence counts.

---

## Problem 7 — “The system is expensive.”

Fix:

- Remotion instead of generative video for core content
- smaller/cheaper models for classification
- batch research
- cache results
- avoid sending unnecessary context
- only use expensive models for high-value decisions

---

## Problem 8 — “Instagram integration works locally but not in production.”

Possible causes:

- OAuth configuration
- access token issues
- production redirect URLs
- permissions
- media hosting accessibility
- platform restrictions
- rate limits

Treat the publisher as a separately testable module.

---

## Problem 9 — “The agent can’t remember what happened yesterday.”

Cause:

You used conversation history as memory.

Fix:

Persist structured state and durable project data in PostgreSQL.

---

## Problem 10 — “The project became too big.”

This is the biggest risk.

Go back to this checkpoint:

```text
Topic → Research → Script → Scene → Video
```

Only add one new capability when you can explain the reason it exists.

---

# 42. Testing Strategy

Do not test only by looking at final videos.

Test every layer independently.

## Unit tests

Test:

- score calculations
- schema validators
- scene interpreters
- publishing state transitions
- scheduling rules

## Agent evaluation

Create a fixed dataset of examples.

For each example ask:

```text
Did it choose the right topic?
Did it follow the format?
Did it cite evidence?
Did it produce valid JSON?
```

## Workflow tests

Simulate:

```text
success
failure
retry
human approval
human rejection
server restart
duplicate publish request
```

## Video tests

Check:

- render succeeds
- duration correct
- scenes appear
- audio exists
- captions appear
- output file valid

---

# 43. How to Learn While Building

Do not study Agentic AI for months before touching the project.

Use this loop:

```text
Learn one concept
       ↓
Build tiny version
       ↓
Break it
       ↓
Debug it
       ↓
Integrate it into project
       ↓
Document what you learned
```

Example:

```text
Learn tool calling
       ↓
Build calculator agent
       ↓
Add research tool
       ↓
Add it to Trend Agent
```

Then:

```text
Learn state
       ↓
Build 3-node LangGraph
       ↓
Add Postgres checkpoint
       ↓
Use same idea in content pipeline
```

That is much better than watching a 20-hour framework course before building anything.

---

# 44. A Practical First 30 Milestones

Complete these in order.

- [ ] Create TypeScript Node project.
- [ ] Add environment-variable handling.
- [ ] Create OpenAI API client.
- [ ] Make one structured-output call.
- [ ] Create Zod schemas.
- [ ] Build Topic Analyzer.
- [ ] Build one function tool.
- [ ] Build an agent that uses the tool.
- [ ] Install LangGraph.
- [ ] Build three-node graph.
- [ ] Define typed workflow state.
- [ ] Add a conditional edge.
- [ ] Add a retryable node.
- [ ] Add PostgreSQL.
- [ ] Persist content records.
- [ ] Add LangGraph checkpointing/persistence.
- [ ] Build an interrupt/approval step.
- [ ] Build a simple approval UI.
- [ ] Build a trend-search tool.
- [ ] Build a Trend Agent.
- [ ] Build Research Agent.
- [ ] Build Script Agent.
- [ ] Create first Remotion animation manually.
- [ ] Create first reusable visual component.
- [ ] Define first Scene JSON schema.
- [ ] Generate Scene JSON using AI.
- [ ] Render AI-generated Scene JSON.
- [ ] Add QA validation.
- [ ] Run the entire local topic-to-video workflow.
- [ ] Only then start Instagram integration.

---

# 45. What Your MVP Should Be

Do not define MVP as:

> “The autonomous social-media company.”

Your MVP should be:

> **Given a developer topic, the system researches it, writes a short explanation, turns it into a structured visual plan, renders a deterministic educational video, and lets the human approve it.**

The MVP graph:

```text
Topic
 ↓
Research Agent
 ↓
Script Agent
 ↓
Scene Agent
 ↓
Remotion
 ↓
QA
 ↓
Human approval
```

This is enough to prove the central idea.

---

# 46. Version Roadmap

## V0 — AI fundamentals

```text
Prompt
→ structured output
```

## V1 — Tool-using agent

```text
Agent
→ tool
→ result
```

## V2 — Stateful workflow

```text
Research
→ Script
→ Scene
```

## V3 — Durable workflow

```text
State
→ checkpoint
→ resume
```

## V4 — Human-in-the-loop

```text
Agent
→ pause
→ human
→ resume
```

## V5 — Video pipeline

```text
Scene JSON
→ Remotion
→ MP4
```

## V6 — Content engine

```text
Trend
→ Research
→ Script
→ Scene
→ Video
```

## V7 — Series engine

```text
Topic
→ 10-day plan
→ episode generation
```

## V8 — Social publishing

```text
Approved video
→ Instagram
```

## V9 — Analytics

```text
Published
→ metrics
→ analysis
```

## V10 — Strategy evolution

```text
metrics
→ hypothesis
→ experiment
→ strategy update
```

## V11 — Autonomous page manager

```text
observe
→ decide
→ produce
→ approve
→ publish
→ learn
→ repeat
```

---

# 47. The Finished Architecture

At maturity, use this mental model:

```text
                 ┌───────────────────────┐
                 │       WEB UI          │
                 │ dashboard / approval  │
                 └───────────┬───────────┘
                             │
                             ▼
                 ┌───────────────────────┐
                 │       API SERVER      │
                 └───────────┬───────────┘
                             │
                             ▼
                 ┌───────────────────────┐
                 │      LANGGRAPH        │
                 │  workflow + state     │
                 └───────────┬───────────┘
                             │
             ┌───────────────┼────────────────┐
             │               │                │
             ▼               ▼                ▼
        OpenAI agents     Tool layer       Database
             │               │                │
             │               ├── trends      │
             │               ├── research    │
             │               ├── Meta API    │
             │               ├── analytics   │
             │               └── scheduler   │
             │                                │
             └───────────────┬────────────────┘
                             ▼
                     Content workflow
                             │
                             ▼
                      Scene JSON
                             │
                             ▼
                         Remotion
                             │
                             ▼
                           MP4
                             │
                             ▼
                        Human gate
                             │
                             ▼
                         Publisher
                             │
                             ▼
                       Social platform
                             │
                             ▼
                         Analytics
                             │
                             ▼
                      Strategy memory
                             │
                             └──────────→ next workflow
```

---

# 48. The Core Engineering Rules

Keep these rules visible while building.

## Rule 1

**Agents decide. Code executes.**

## Rule 2

**Use schemas between agents.**

Do not pass enormous free-form text when a structured object can represent the information.

## Rule 3

**Persist state.**

Never depend on the process staying alive.

## Rule 4

**Treat every external API as unreliable.**

Retry, classify errors, and record state.

## Rule 5

**Human approval belongs before irreversible actions.**

Especially publishing.

## Rule 6

**Do not let the agent write arbitrary executable code.**

Give it controlled tools and controlled scene primitives.

## Rule 7

**Do not call one observation “learning.”**

Require evidence.

## Rule 8

**Keep raw metrics.**

Never throw away the original data just because the current strategy only needs an aggregate.

## Rule 9

**Make providers replaceable.**

TTS, search, LLM, storage, and social connectors should have clear interfaces.

## Rule 10

**Build the smallest complete loop before expanding.**

A small end-to-end system teaches more than ten unfinished modules.

---

# 49. What You Should Learn Before Each Major Phase

| Phase | Main concepts you should understand |
|---|---|
| OpenAI API | prompts, messages, structured output |
| Tools | function calling, schemas, validation |
| LangGraph | state, nodes, edges, routing |
| Persistence | DB, checkpoints, durable state |
| Human approval | interrupts, resume, approvals |
| Trend engine | search, ranking, evidence |
| Research | retrieval, citations, grounding |
| Script agent | planning, audience, constraints |
| Remotion | React animation, timelines, rendering |
| Scene system | DSLs, schemas, interpreters |
| QA | validators, critics, retries |
| Series | hierarchical planning, dependencies |
| Instagram | OAuth, permissions, publishing APIs |
| Scheduling | jobs, states, idempotency |
| Analytics | metrics, cohorts, comparisons |
| Evolution | experiments, hypotheses, exploration/exploitation |
| Production | observability, security, reliability |

---

# 50. Your First Real Assignment

Do not start by building Trend Agent.

Start here:

## Assignment 1

Build this:

```text
User enters:
“How does Docker work?”

        ↓

Research Agent

        ↓

returns:
ResearchPackage
```

## Assignment 2

Pass that package to Script Agent.

Output:

```text
Script
```

## Assignment 3

Pass the script to Scene Agent.

Output:

```text
ScenePlan
```

## Assignment 4

Render the ScenePlan with Remotion.

Output:

```text
video.mp4
```

## Assignment 5

Add QA.

## Assignment 6

Add human approval.

When those six pieces work, you have the foundation of the whole project.

Only then add trends, series, Instagram, scheduling, analytics, and self-evolution.

---

# 51. Success Criteria for the Entire Project

You should consider the project mature only when it can do all of these:

- [ ] Discover relevant developer-content opportunities.
- [ ] Explain why a topic is worth considering.
- [ ] Decide between a single video and a series.
- [ ] Create a coherent multi-day series plan.
- [ ] Research topics using external evidence.
- [ ] Generate structured scripts.
- [ ] Generate structured visual scene plans.
- [ ] Render videos deterministically.
- [ ] Validate the videos.
- [ ] Ask a human for strategic approval when required.
- [ ] Ask a human before publishing.
- [ ] Schedule a series without daily manual work.
- [ ] Publish through the supported social API path.
- [ ] Store the platform post ID and publication state.
- [ ] Collect available performance metrics.
- [ ] Analyze results against historical performance.
- [ ] Maintain hypotheses about what works.
- [ ] Run controlled experiments.
- [ ] Update strategy from evidence.
- [ ] Avoid repeating the same mistakes.
- [ ] Recover from restart/failure.
- [ ] Explain why a major decision was made.

At that point you have something much more substantial than an “AI content generator.”

You have built a **stateful, tool-using, human-supervised, self-improving agentic workflow**.

---

# 52. Official Documentation to Keep Open While Building

Use the official docs for implementation details because SDK/API syntax changes over time.

- OpenAI Agents SDK for TypeScript: https://openai.github.io/openai-agents-js/
- OpenAI developer quickstart: https://platform.openai.com/docs/quickstart
- LangGraph JavaScript: https://docs.langchain.com/oss/javascript/langgraph/overview
- LangGraph persistence: https://docs.langchain.com/oss/javascript/langgraph/persistence
- LangGraph human-in-the-loop: https://github.com/langchain-ai/langgraphjs/blob/main/docs/docs/agents/human-in-the-loop.md
- LangGraph Functional API: https://docs.langchain.com/oss/javascript/langgraph/use-functional-api
- Google Trends help: https://support.google.com/trends/
- Meta for Developers: https://developers.facebook.com/docs/
- Instagram platform documentation: https://developers.facebook.com/docs/instagram-platform/
- Remotion: https://www.remotion.dev/

Always verify the current API documentation before implementing a platform-specific step.

---

# 53. Final Mindset

You are not building:

```text
10 agents + LLM + Instagram
```

You are building:

```text
             A SYSTEM
                │
                ├── observes
                ├── remembers
                ├── plans
                ├── acts
                ├── checks itself
                ├── asks humans when needed
                ├── measures outcomes
                └── changes future decisions
```

The LLM is only one component.

The real Agentic AI lessons are:

**state → tools → planning → workflow → memory → human control → feedback → adaptation**.

Build those concepts one at a time.

That is the track that will take you from beginner to being able to design and debug a real agentic system rather than just use an agent framework.
