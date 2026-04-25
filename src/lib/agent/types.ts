export interface ToolCall {
  name: string
  args: Record<string, string>
}

export interface ToolResult {
  tool: string
  args: Record<string, string>
  output: string
  error?: boolean
}

export interface AgentStep {
  thinking: string
  toolCall: ToolCall
  toolResult: ToolResult
}

export interface AgentResult {
  answer: string
  steps: AgentStep[]
  iterations: number
  timedOut?: boolean
}

export interface AgentOptions {
  maxIterations?: number
  deadline?: number
  onStep?: (step: AgentStep) => void
}
