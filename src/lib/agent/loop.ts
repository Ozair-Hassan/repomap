import { chat, type Message } from '@/lib/groq/client'
import { TOOLS_DESCRIPTION, executeTool, parseToolCall } from './tools'
import type { AgentOptions, AgentResult, AgentStep } from './types'

const DEFAULT_MAX_ITERATIONS = 15

function buildSystemPrompt(owner: string, repo: string): string {
  return `
You are an expert code analysis agent. Your task is to answer questions about the GitHub repository "${owner}/${repo}" by exploring its contents using the tools provided.

${TOOLS_DESCRIPTION}

Guidelines:
- Start by listing the root directory to orient yourself.
- Navigate systematically: explore directories before reading files.
- Read only the files that are relevant to the user's question.
- Be concise in your reasoning but thorough in your exploration.
- Once you have enough information, call finish with a clear, complete answer.
- Do not guess. If you are unsure, explore more before finishing.
`.trim()
}

function buildToolResultMessage(step: AgentStep): string {
  const { toolCall, toolResult } = step
  const label = toolResult.error ? 'ERROR' : 'RESULT'

  return (
    `TOOL: ${toolCall.name}\n` +
    `ARGS:\n${Object.entries(toolCall.args)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')}\n\n` +
    `${label}:\n${toolResult.output}`
  )
}

export async function runAgent(
  goal: string,
  owner: string,
  repo: string,
  options: AgentOptions = {},
): Promise<AgentResult> {
  const { maxIterations = DEFAULT_MAX_ITERATIONS, onStep } = options

  const systemPrompt = buildSystemPrompt(owner, repo)
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: goal },
  ]

  const steps: AgentStep[] = []
  let iterations = 0

  while (iterations < maxIterations) {
    iterations++

    // Ask the LLM what to do next
    const raw = await chat(messages)

    // Parse the tool call from the response
    const toolCall = parseToolCall(raw)

    // We're done
    if (toolCall.name === 'finish') {
      const answer = toolCall.args.answer ?? raw
      return { answer, steps, iterations }
    }

    // Execute the tool against GitHub
    const toolResult = await executeTool(owner, repo, toolCall)

    const step: AgentStep = {
      thinking: raw,
      toolCall,
      toolResult,
    }

    steps.push(step)
    onStep?.(step)

    // Append assistant message (its tool call) and the tool result to history
    messages.push({ role: 'assistant', content: raw })
    messages.push({
      role: 'user',
      content: buildToolResultMessage(step),
    })
  }

  // Hit the iteration limit — ask the model to summarise what it found so far
  messages.push({
    role: 'user',
    content:
      'You have reached the maximum number of steps. Call finish now with the best answer you can give based on what you have explored so far.',
  })

  const finalRaw = await chat(messages)
  const finalCall = parseToolCall(finalRaw)
  const answer =
    finalCall.name === 'finish' ? (finalCall.args.answer ?? finalRaw) : finalRaw

  return { answer, steps, iterations }
}
