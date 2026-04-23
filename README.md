# repomap — Ask Your Codebase

> Point at any public GitHub repository, ask a question in plain English, and watch an AI agent explore the code to find the answer in real time.

![Built with Next.js](https://img.shields.io/badge/built_with-Next.js_15-black?style=flat-square) ![Groq](https://img.shields.io/badge/LLM-Groq_LLaMA_3.3_70B-orange?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
By [Ozair Hassan](https://www.ozairhassan.com)

---

## What it does

Ask Your Codebase is a developer tool that turns any public GitHub repository into a conversational knowledge base. You give it a repo and a question; an autonomous agent explores the codebase — listing directories, reading files — and streams back a grounded answer.

No indexing. No setup per repo. It just explores.

---

## Demo

1. Enter a repo: `vercel/next.js`
2. Ask: _"What does this project do and how is it structured?"_
3. Watch the agent trace in real time — every directory listing and file read is shown as it happens
4. The answer streams in token-by-token once the agent is done thinking

---

## Tech stack

| Layer       | Choice                                       | Why                                          |
| ----------- | -------------------------------------------- | -------------------------------------------- |
| Framework   | Next.js 15 (App Router)                      | SSE streaming, API routes, server components |
| LLM         | Groq — LLaMA 3.3 70B                         | Fast inference, generous free tier           |
| GitHub data | GitHub Contents API + Git Trees API fallback | Handles both normal and large repos          |
| Streaming   | Server-Sent Events (SSE)                     | Simple, native, no WebSocket overhead        |
| Styling     | Inline CSS with CSS variables                | Zero dependencies, easy to theme             |

---

## How the agent works

The agent runs a **ReAct-style loop** (Reason → Act → Observe) entirely server-side:

```
User question
    │
    ▼
┌─────────────────────────────────────┐
│  System prompt + tool descriptions  │
│  + conversation history             │
└─────────────────────────────────────┘
    │
    ▼
  LLM decides which tool to call
    │
    ├── list_directory(path)  →  GitHub Contents API
    ├── read_file(path)        →  GitHub Contents API
    └── finish(answer)         →  streams answer to client
```

Each tool call is appended to the message history so the model always has full context of what it has already explored. The loop runs for up to 15 iterations before forcing a `finish`.

---

## Project structure

```
src/
├── app/
│   ├── api/ask/route.ts      # SSE streaming endpoint + rate limiter
│   ├── page.tsx              # Main UI
│   ├── layout.tsx            # App metadata + fonts
│   └── globals.css
├── hooks/
│   └── useAgent.ts           # SSE stream consumer, streaming state
└── lib/
    ├── agent/
    │   ├── loop.ts           # ReAct agent loop
    │   ├── tools.ts          # Tool definitions, parser, executor
    │   └── types.ts          # Shared TypeScript types
    └── github/
        └── client.ts         # GitHub API client (Contents + Trees fallback)
```

---

## Getting started

### Prerequisites

- Node.js 18+
- A [Groq API key](https://console.groq.com) (free)

### Install

```bash
git clone https://github.com/Ozair-Hassan/repomap
cd repomap
npm install
```

### Configure

```bash
cp .env.example .env.local
```

```env
# .env.local
GROQ_API_KEY=your_groq_api_key_here
```

Optionally, add a GitHub personal access token to increase the API rate limit from 60 to 5,000 requests/hour:

```env
GITHUB_TOKEN=your_github_token_here   # optional but recommended
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Configuration

### Agent settings

Edit `src/app/api/ask/route.ts` to change defaults:

```ts
maxIterations: body.maxIterations ?? 15 // max tool calls per run
```

### Rate limiting

The API route includes a simple in-memory sliding-window rate limiter:

```ts
const RATE_LIMIT_MAX = 10 // requests allowed
const RATE_LIMIT_WINDOW_MS = 60_000 // per minute, per IP
```

Adjust these constants in `route.ts`. For multi-instance deployments, swap the in-memory map for a Redis-backed solution (e.g. Upstash).

### Token streaming speed

The typewriter effect is controlled by the delay between word chunks in `route.ts`:

```ts
await new Promise((r) => setTimeout(r, 18)) // ms between words
```

Set to `0` for instant display.

---

## Limitations

- **Public repos only** — the GitHub client uses unauthenticated (or token-authenticated) requests; private repos are not supported
- **File size cap** — files over ~12,000 characters are truncated to avoid overflowing the LLM context window
- **Rate limits** — unauthenticated GitHub API calls are limited to 60/hour; add a `GITHUB_TOKEN` to raise this significantly
- **In-memory rate limiter** — resets on server restart; not suitable for horizontally-scaled deployments without a shared store

---

## Roadmap

- [ ] GitHub token passthrough from the UI
- [ ] Markdown rendering in the answer box
- [ ] Shareable links (encode repo + question in URL)
- [ ] Redis-backed rate limiter for production deployments
- [ ] Support for private repos via GitHub OAuth

---

## License

MIT License
