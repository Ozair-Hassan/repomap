import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { runAgent } from '@/lib/agent/loop'
import type { AgentStep } from '@/lib/agent/types'

export const runtime = 'nodejs'
export const maxDuration = 120

// ---------------------------------------------------------------------------
// Allowed origins — add your production domain here
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS =
  process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS ?? '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:3001']

// ---------------------------------------------------------------------------
// CSRF token helpers
// Sign a short-lived token with CSRF_SECRET (add to .env.local / Vercel env vars).
// ---------------------------------------------------------------------------
const CSRF_SECRET = process.env.CSRF_SECRET ?? 'dev-secret-change-me'
const TOKEN_TTL_MS = 5 * 60 * 1000 // 5 minutes

function makeToken(): string {
  const expires = Date.now() + TOKEN_TTL_MS
  const payload = String(expires)
  const sig = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(payload)
    .digest('hex')
  return `${expires}.${sig}`
}

function verifyToken(token: string): boolean {
  const dot = token.indexOf('.')
  if (dot === -1) return false
  const expStr = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!expStr || !sig) return false
  if (Date.now() > Number(expStr)) return false
  const expected = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(expStr)
    .digest('hex')
  try {
    return crypto.timingSafeEqual(
      Buffer.from(sig, 'hex'),
      Buffer.from(expected, 'hex'),
    )
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Rate limiter — 5 requests per minute per IP
// ---------------------------------------------------------------------------
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60_000

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

function forbidden(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ---------------------------------------------------------------------------
// GET /api/ask — issue a CSRF token as an HttpOnly cookie
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin') ?? ''
  if (ALLOWED_ORIGINS.length > 0 && !ALLOWED_ORIGINS.includes(origin)) {
    return forbidden('Forbidden')
  }

  const token = makeToken()
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `csrf=${token}; HttpOnly; SameSite=Strict; Path=/api/ask; Max-Age=300`,
    },
  })
}

// ---------------------------------------------------------------------------
// POST /api/ask — main agent endpoint
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // 1. Origin check
  const origin = req.headers.get('origin') ?? ''
  if (ALLOWED_ORIGINS.length > 0 && !ALLOWED_ORIGINS.includes(origin)) {
    return forbidden('Forbidden')
  }

  // 2. CSRF token check
  const csrfCookie = req.cookies.get('csrf')?.value ?? ''
  if (!verifyToken(csrfCookie)) {
    return forbidden('Invalid or expired CSRF token')
  }

  // 3. Rate-limit check
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

  // 4. Parse & validate body
  const body = await req.json().catch(() => null)
  if (!body || !body.goal || !body.repo) {
    return new Response(JSON.stringify({ error: 'Missing "goal" or "repo"' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 5. Input length caps — prevent prompt injection / oversized payloads
  if (typeof body.goal !== 'string' || body.goal.length > 500) {
    return new Response(
      JSON.stringify({
        error: '"goal" must be a string under 500 characters.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }
  if (typeof body.repo !== 'string' || body.repo.length > 200) {
    return new Response(
      JSON.stringify({
        error: '"repo" must be a string under 200 characters.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
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
