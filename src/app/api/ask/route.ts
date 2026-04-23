import { NextRequest } from 'next/server'
import { runAgent } from '@/lib/agent/loop'
import type { AgentStep } from '@/lib/agent/types'

export const runtime = 'nodejs'
export const maxDuration = 120

function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  // Accept "owner/repo" or full GitHub URLs
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

export async function POST(req: NextRequest) {
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
