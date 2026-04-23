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
}

export interface AgentOptions {
  maxIterations?: number
  onStep?: (step: AgentStep) => void
}
