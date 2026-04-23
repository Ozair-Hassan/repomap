'use client'

import { useState, useRef, useEffect } from 'react'
import { useAgent } from '@/hooks/useAgent'

const PLACEHOLDER_GOALS = [
  'What does this project do and how is it structured?',
  'How is authentication implemented?',
  'What testing strategy is used?',
  'Summarise the main dependencies and why they are used.',
]

function ToolIcon({ name }: { name: string }) {
  if (name === 'list_directory')
    return <span className="tool-icon text-[var(--amber)]">◈</span>
  if (name === 'read_file')
    return <span className="tool-icon text-[var(--amber)]">◉</span>
  return <span className="tool-icon text-[var(--amber)]">◎</span>
}

function StepRow({ step, index }: { step: any; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const argStr = Object.entries(step.args)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ')

  return (
    <div
      className={`border rounded-[var(--radius)] mb-1.5 overflow-hidden anim-fade-up ${
        step.error ? 'border-red-500/30' : 'border-[var(--border)]'
      }`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <button
        className="flex items-center gap-2 w-full bg-[var(--surface)] border-none text-[var(--text)] font-mono text-xs px-3 py-2 cursor-pointer text-left transition-colors hover:bg-[#2a2a26]"
        onClick={() => setExpanded((e) => !e)}
      >
        <ToolIcon name={step.tool} />
        <span className="text-[var(--amber)] font-medium shrink-0">
          {step.tool}
        </span>
        <span className="text-[var(--text-dim)] overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0">
          {argStr}
        </span>
        <span className="text-[var(--text-dim)] shrink-0 text-[9px]">
          {expanded ? '▲' : '▼'}
        </span>
      </button>
      {expanded && (
        <pre className="p-3 bg-[#1a1a16] border-t border-[var(--border)] text-[var(--text-dim)] text-xs overflow-x-auto whitespace-pre-wrap break-words max-h-80 overflow-y-auto">
          {step.output}
        </pre>
      )}
    </div>
  )
}

function Spinner() {
  return <span className="inline-block text-[var(--amber)] anim-blink">▋</span>
}

function Cursor() {
  return (
    <span className="inline-block text-[var(--amber)] anim-blink-cursor ml-px leading-none">
      ▌
    </span>
  )
}

export default function HomePage() {
  const [repo, setRepo] = useState('')
  const [goal, setGoal] = useState('')
  const {
    status,
    steps,
    answer,
    streamingAnswer,
    errorMessage,
    iterations,
    ask,
    reset,
  } = useAgent()
  const answerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (streamingAnswer || answer)
      answerRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [!!streamingAnswer, !!answer]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = () => {
    if (!repo.trim() || !goal.trim() || status === 'running') return
    ask(goal.trim(), repo.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
  }

  const isRunning = status === 'running' || status === 'streaming'
  const displayAnswer = answer ?? streamingAnswer
  const showCursor = status === 'streaming'

  return (
    <div
      className="w-[75%] max-w-[1400px] min-w-[320px] mx-auto py-12 pb-[120px]
                      max-[1024px]:w-[88%]
                      max-[640px]:w-[92%] max-[640px]:py-7 max-[640px]:pb-20"
    >
      {/* Header */}
      <header className="mb-12 anim-fade-up-slow max-[640px]:mb-8">
        <p className="header-eyebrow font-mono text-[11px] tracking-[0.15em] text-[var(--amber)] uppercase mb-3">
          repo map
        </p>
        <h1
          className="text-[clamp(32px,5vw,52px)] font-[800] text-[var(--text-bright)] tracking-[-0.02em] leading-[1.1]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Ask your
          <br />
          <span className="text-[var(--amber)]">codebase</span>
        </h1>
        <p className="mt-2.5 text-[var(--text-dim)] text-[13px] max-w-[580px] max-[640px]:text-xs max-[640px]:max-w-full">
          Point at any public GitHub repo. Ask anything. Watch the agent explore
          it in real time.
        </p>
      </header>

      {/* Form */}
      <section
        className="flex flex-col gap-3 mb-8 anim-fade-up-delay"
        onKeyDown={handleKeyDown}
      >
        {/* Repo field */}
        <div>
          <p className="text-[11px] tracking-[0.1em] uppercase text-[var(--text-dim)] mb-1.5">
            Repository
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--amber-dim)] pointer-events-none text-[13px]">
              ⌥
            </span>
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="owner/repo or https://github.com/owner/repo"
              disabled={isRunning}
            />
          </div>
        </div>

        {/* Goal field */}
        <div>
          <p className="text-[11px] tracking-[0.1em] uppercase text-[var(--text-dim)] mb-1.5">
            Question
          </p>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="What would you like to know about this codebase?"
            disabled={isRunning}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {PLACEHOLDER_GOALS.map((g) => (
              <button
                key={g}
                className="bg-transparent border border-[var(--border)] rounded-[20px] text-[var(--text-dim)] font-mono text-[11px] px-2.5 py-[3px] cursor-pointer transition-all duration-150
                             hover:border-[var(--amber-dim)] hover:text-[var(--amber)] hover:bg-[var(--amber-glow)]
                             disabled:opacity-40 disabled:cursor-not-allowed
                             max-[640px]:text-[10px] max-[640px]:px-2"
                onClick={() => setGoal(g)}
                disabled={isRunning}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Submit row */}
        <div className="flex items-center gap-3 flex-wrap max-[640px]:gap-2">
          <button
            className="border-none rounded-[var(--radius)] text-[#0a0a08] text-[13px] font-[600] tracking-[0.05em] px-6 py-2.5 cursor-pointer transition-all duration-150 whitespace-nowrap
                         bg-[var(--amber)] hover:bg-[#f0b030] hover:shadow-[0_0_20px_var(--amber-glow)]
                         disabled:opacity-40 disabled:cursor-not-allowed
                         max-[640px]:flex-1 max-[640px]:text-center"
            style={{ fontFamily: 'var(--font-display)' }}
            onClick={handleSubmit}
            disabled={!repo.trim() || !goal.trim() || isRunning}
          >
            {isRunning ? 'Running…' : 'Run Agent →'}
          </button>

          {status !== 'idle' && (
            <button
              className="bg-transparent border border-[var(--border)] rounded-[var(--radius)] text-[var(--text-dim)] font-mono text-xs px-4 py-2.5 cursor-pointer transition-all duration-150
                           hover:border-[var(--border-lit)] hover:text-[var(--text)]
                           max-[640px]:flex-1 max-[640px]:text-center"
              onClick={reset}
            >
              Reset
            </button>
          )}

          <span className="text-[11px] text-[var(--text-dim)] max-[640px]:hidden">
            or ⌘↵
          </span>
        </div>
      </section>

      {/* Status bars */}
      {status === 'running' && (
        <div className="flex items-center gap-2.5 mb-5 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] text-xs max-[640px]:text-[11px] max-[640px]:gap-2">
          <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-[var(--amber)] anim-pulse" />
          <span>Agent running</span>
          <Spinner />
          <span className="text-[var(--text-dim)] ml-auto">
            {steps.length} steps
          </span>
        </div>
      )}

      {status === 'streaming' && (
        <div className="flex items-center gap-2.5 mb-5 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] text-xs max-[640px]:text-[11px] max-[640px]:gap-2">
          <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-[var(--green)] anim-pulse" />
          <span className="text-[var(--green)]">Writing answer</span>
          <Cursor />
          <span className="text-[var(--text-dim)] ml-auto">
            {steps.length} tool calls
          </span>
        </div>
      )}

      {status === 'done' && (
        <div className="flex items-center gap-2.5 mb-5 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] text-xs max-[640px]:text-[11px] max-[640px]:gap-2">
          <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-[var(--green)]" />
          <span className="text-[var(--green)]">Complete</span>
          <span className="text-[var(--text-dim)] ml-auto">
            {iterations} iterations · {steps.length} tool calls
          </span>
        </div>
      )}

      {/* Agent trace */}
      {steps.length > 0 && (
        <section className="mb-6">
          <p className="text-[11px] tracking-[0.1em] uppercase text-[var(--text-dim)] mb-2.5">
            Agent trace
          </p>
          {steps.map((step: any, i: number) => (
            <StepRow
              key={i}
              step={step}
              index={i}
            />
          ))}
          {status === 'running' && (
            <div className="px-3 py-2 text-[var(--amber)] text-xs">
              <Spinner /> thinking…
            </div>
          )}
        </section>
      )}

      {/* Answer */}
      {displayAnswer && (
        <section
          className="anim-fade-up"
          ref={answerRef}
        >
          <p
            className={`text-[11px] tracking-[0.1em] uppercase mb-2.5 flex items-center gap-2
              before:content-[''] before:inline-block before:w-1.5 before:h-1.5 before:rounded-full
              ${
                showCursor
                  ? 'text-[var(--amber)] before:bg-[var(--amber)]'
                  : 'text-[var(--green)] before:bg-[var(--green)]'
              }`}
          >
            {showCursor ? 'Writing answer' : 'Answer'}
          </p>
          <div
            className={`bg-[var(--surface)] rounded-[var(--radius)] px-6 py-5 text-[var(--text-bright)] font-mono text-[13px] leading-[1.8] whitespace-pre-wrap break-words
                          max-[640px]:px-4 max-[640px]:text-xs
                          ${
                            showCursor
                              ? 'border border-[var(--amber-dim)] shadow-[0_0_0_1px_var(--amber-glow)]'
                              : 'border border-[var(--border-lit)]'
                          }`}
          >
            {displayAnswer}
            {showCursor && <Cursor />}
          </div>
          {status === 'done' && (
            <p className="mt-2 text-[11px] text-[var(--text-dim)]">
              {iterations} iterations · {steps.length} tool calls
            </p>
          )}
        </section>
      )}

      {/* Error */}
      {errorMessage && (
        <div className="bg-[rgba(240,85,85,0.06)] border border-[rgba(240,85,85,0.3)] rounded-[var(--radius)] px-4 py-3.5 text-[var(--red)] text-[13px] anim-fade-up">
          ✗ {errorMessage}
        </div>
      )}
    </div>
  )
}
