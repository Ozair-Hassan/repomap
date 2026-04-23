import { fetchTree, fetchFile } from '@/lib/github/client'
import type { ToolCall, ToolResult } from './types'

export const TOOLS_DESCRIPTION = `
You have access to the following tools to explore a GitHub repository:

list_directory(path: string)
  Lists files and folders at the given path. Use "" for the repo root.
  Returns a newline-separated list of entries, suffixed with "/" for directories.

read_file(path: string)
  Reads the full content of a file at the given path.
  Returns the raw file content as a string.

finish(answer: string)
  Call this when you have enough information to answer the user's question.
  The answer argument is your final response to the user.

To call a tool, respond with EXACTLY this format and nothing else:

TOOL: <tool_name>
ARGS:
<arg_name>: <value>

Only one tool call per response. Think step by step before deciding which tool to call.
When you have a complete answer, call finish.
`.trim()

export async function executeTool(
  owner: string,
  repo: string,
  call: ToolCall,
): Promise<ToolResult> {
  const { name, args } = call

  try {
    if (name === 'list_directory') {
      const path = args.path ?? ''
      const items = await fetchTree(owner, repo, path)
      const output = items
        .map((item) => (item.type === 'tree' ? `${item.path}/` : item.path))
        .join('\n')
      return { tool: name, args, output: output || '(empty directory)' }
    }

    if (name === 'read_file') {
      const path = args.path
      if (!path) throw new Error('read_file requires a "path" argument')
      const file = await fetchFile(owner, repo, path)
      // Truncate very large files to avoid blowing the context window
      const MAX_CHARS = 12_000
      const content =
        file.content.length > MAX_CHARS
          ? file.content.slice(0, MAX_CHARS) + '\n\n[...truncated]'
          : file.content
      return { tool: name, args, output: content }
    }

    if (name === 'finish') {
      const answer = args.answer ?? ''
      return { tool: name, args, output: answer }
    }

    throw new Error(`Unknown tool: "${name}"`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { tool: name, args, output: message, error: true }
  }
}

/**
 * Parse the LLM's raw text response into a ToolCall.
 * Expected format:
 *   TOOL: <name>
 *   ARGS:
 *   <key>: <value>
 *
 * Fixes:
 * - Stop reading an arg value if the line starts with TOOL: or ARGS:
 * - Strip surrounding quotes from values
 * - Ignore anything after the last arg block
 */
export function parseToolCall(raw: string): ToolCall {
  const lines = raw
    .trim()
    .split('\n')
    .map((l) => l.trim())

  const toolLineIdx = lines.findIndex((l) => l.startsWith('TOOL:'))
  if (toolLineIdx === -1) {
    return { name: 'finish', args: { answer: raw.trim() } }
  }

  const name = lines[toolLineIdx].replace('TOOL:', '').trim()
  const args: Record<string, string> = {}

  let inArgs = false
  for (let i = toolLineIdx + 1; i < lines.length; i++) {
    const line = lines[i]

    // Stop if we hit another TOOL: block (model output two calls)
    if (line.startsWith('TOOL:')) break

    if (line.startsWith('ARGS:')) {
      inArgs = true
      continue
    }

    if (inArgs && line.length > 0) {
      const colonIdx = line.indexOf(':')
      if (colonIdx !== -1) {
        const key = line.slice(0, colonIdx).trim()
        // Strip inline TOOL= or ARGS= suffixes the model sometimes appends
        let value = line.slice(colonIdx + 1).trim()
        value = value.replace(/\s+TOOL=.*$/, '').replace(/\s+ARGS.*$/, '')
        // Strip surrounding quotes
        value = value.replace(/^["']|["']$/g, '')
        if (key) args[key] = value
      }
    }
  }

  return { name, args }
}
