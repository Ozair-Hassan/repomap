import { NextRequest } from 'next/server'
import { runAgent } from '@/lib/agent/loop'
import type { AgentStep } from '@/lib/agent/types'

export const runtime = 'nodejs'
export const maxDuration = 120

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter
// Allows RATE_LIMIT_MAX requests per RATE_LIMIT_WINDOW_MS per IP.
// Good enough for a single-instance deployment; swap for Redis in production.
// ---------------------------------------------------------------------------
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute

const ipWindows = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = (ipWindows.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  )
  if (timestamps.length >= RATE_LIMIT_MAX) return true
  timestamps.push(now)
  ipWindows.set(ip, timestamps)
  return false
}

// Periodically prune stale entries so the map doesn't grow unboundedly.
setInterval(() => {
  const now = Date.now()
  for (const [ip, timestamps] of ipWindows) {
    const fresh = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
    if (fresh.length === 0) ipWindows.delete(ip)
    else ipWindows.set(ip, fresh)
  }
}, RATE_LIMIT_WINDOW_MS)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  const shortMatch = input
    .trim()
    .match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/)
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] }

  try {
    const url = new URL(input.trim())
    if (url.hostname === 'github.com') {
      const parts = url.pathname.replace(/^\//, '').split('/')
      if (parts.length >= 2)
        return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') }
    }
  } catch {}

  return null
}

function encode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // Rate-limit check
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({
        error: `Rate limit exceeded. Maximum ${RATE_LIMIT_MAX} requests per minute.`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
      },
    )
  }

  const body = await req.json().catch(() => null)
  if (!body || !body.goal || !body.repo) {
    return new Response(JSON.stringify({ error: 'Missing "goal" or "repo"' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const parsed = parseGitHubUrl(body.repo)
  if (!parsed) {
    return new Response(
      JSON.stringify({
        error: 'Invalid repo format. Use "owner/repo" or a GitHub URL.',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  const { owner, repo } = parsed

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(new TextEncoder().encode(encode(event, data)))

      try {
        send('start', { owner, repo })

        const result = await runAgent(body.goal, owner, repo, {
          maxIterations: body.maxIterations ?? 15,
          onStep: (step: AgentStep) => {
            send('step', {
              tool: step.toolCall.name,
              args: step.toolCall.args,
              output: step.toolResult.output,
              error: step.toolResult.error ?? false,
            })
          },
        })

        // Stream the answer token-by-token (word chunks for a natural feel)
        const words = result.answer.split(/(\s+)/)
        for (const chunk of words) {
          send('token', { chunk })
          // Small delay between chunks gives the typewriter effect without
          // introducing a full async loop. Adjust as desired (0 = instant).
          await new Promise((r) => setTimeout(r, 18))
        }

        send('done', {
          answer: result.answer,
          iterations: result.iterations,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        send('error', { message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
