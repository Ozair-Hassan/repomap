'use client'

import { useState, useCallback, useRef } from 'react'

export interface StepEvent {
  tool: string
  args: Record<string, string>
  output: string
  error: boolean
}

export type AgentStatus = 'idle' | 'running' | 'done' | 'error'

export interface UseAgentReturn {
  status: AgentStatus
  steps: StepEvent[]
  answer: string | null
  errorMessage: string | null
  iterations: number
  ask: (goal: string, repo: string) => void
  reset: () => void
}

export function useAgent(): UseAgentReturn {
  const [status, setStatus] = useState<AgentStatus>('idle')
  const [steps, setSteps] = useState<StepEvent[]>([])
  const [answer, setAnswer] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [iterations, setIterations] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setStatus('idle')
    setSteps([])
    setAnswer(null)
    setErrorMessage(null)
    setIterations(0)
  }, [])

  const ask = useCallback((goal: string, repo: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStatus('running')
    setSteps([])
    setAnswer(null)
    setErrorMessage(null)
    setIterations(0)
    ;(async () => {
      try {
        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goal, repo }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? `HTTP ${res.status}`)
        }

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''

          for (const part of parts) {
            const eventMatch = part.match(/^event: (\w+)/)
            const dataMatch = part.match(/^data: (.+)$/m)
            if (!eventMatch || !dataMatch) continue

            const event = eventMatch[1]
            const payload = JSON.parse(dataMatch[1])

            if (event === 'step') {
              setSteps((prev) => [...prev, payload as StepEvent])
            } else if (event === 'done') {
              setAnswer(payload.answer)
              setIterations(payload.iterations)
              setStatus('done')
            } else if (event === 'error') {
              setErrorMessage(payload.message)
              setStatus('error')
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setErrorMessage(err instanceof Error ? err.message : String(err))
        setStatus('error')
      }
    })()
  }, [])

  return { status, steps, answer, errorMessage, iterations, ask, reset }
}
