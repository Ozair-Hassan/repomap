'use client'

import { useState, useRef, useEffect } from 'react'
import { useAgent } from '@/hooks/useAgent'
import { sanitizeText, sanitizeRepo } from '@/lib/sanitize'

const PLACEHOLDER_GOALS = [
  'What does this project do and how is it structured?',
  'How is authentication implemented?',
  'What testing strategy is used?',
  'Summarise the main dependencies and why they are used.',
]

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

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
        className="flex items-center gap-2 w-full bg-[var(--surface)] border-none text-[var(--text)] font-mono text-[15px] px-3 py-2 cursor-pointer text-left transition-colors hover:bg-[#2a2a26]"
        onClick={() => setExpanded((e) => !e)}
      >
        <ToolIcon name={step.tool} />
        <span className="text-[var(--amber)] font-medium shrink-0">
          {step.tool}
        </span>
        <span className="text-[var(--text-dim)] overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0">
          {argStr}
        </span>
        <span className="text-[var(--text-dim)] shrink-0 text-[11px]">
          {expanded ? '▲' : '▼'}
        </span>
      </button>
      {expanded && (
        <pre className="p-3 bg-[#1a1a16] border-t border-[var(--border)] text-[var(--text-dim)] text-[15px] overflow-x-auto whitespace-pre-wrap break-words max-h-80 overflow-y-auto">
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

// ---------------------------------------------------------------------------
// Validation — runs after sanitisation, before the request fires
// ---------------------------------------------------------------------------

interface ValidationError {
  repo?: string
  goal?: string
}

function validate(rawRepo: string, goal: string): ValidationError {
  const errors: ValidationError = {}

  if (!rawRepo) {
    errors.repo = 'Repository is required.'
  } else {
    // Strip the protocol + host from URLs so we only test the path portion
    const pathPart = rawRepo.replace(/^https?:\/\/[^/]+/, '')
    if (/[^a-zA-Z0-9/_.\-]/.test(pathPart)) {
      // Characters like spaces, semicolons, quotes, etc. are not valid
      errors.repo = 'Repository contains invalid characters.'
    } else if (
      !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(rawRepo) &&
      !rawRepo.startsWith('https://github.com/')
    ) {
      errors.repo = 'Must be "owner/repo" or a github.com URL.'
    }
  }

  if (!goal) {
    errors.goal = 'Question is required.'
  } else if (goal.length > 500) {
    errors.goal = 'Question must be under 500 characters.'
  }

  return errors
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AgentInterface() {
  const [repo, setRepo] = useState('')
  const [goal, setGoal] = useState('')
  const [validationErrors, setValidationErrors] = useState<ValidationError>({})

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
    if (status === 'running') return

    // Validate raw values first — this catches illegal chars before sanitise strips them
    const errors = validate(repo, goal)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    // Only sanitise after validation passes
    const cleanRepo = sanitizeRepo(repo)
    const cleanGoal = sanitizeText(goal)

    setValidationErrors({})
    ask(cleanGoal, cleanRepo)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
  }

  const handleReset = () => {
    reset()
    setValidationErrors({})
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
        <p className="header-eyebrow font-mono text-sm tracking-[0.15em] text-[var(--amber)] uppercase mb-3">
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
        <p className="mt-2.5 text-[var(--text-dim)] text-base max-w-[580px] max-[640px]:text-[15px] max-[640px]:max-w-full">
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
          <p className="text-sm tracking-[0.1em] uppercase text-[var(--text-dim)] mb-1.5">
            Repository
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--amber-dim)] pointer-events-none text-base">
              ⌥
            </span>
            <input
              type="text"
              value={repo}
              onChange={(e) => {
                setRepo(e.target.value)
                if (validationErrors.repo)
                  setValidationErrors((prev) => ({ ...prev, repo: undefined }))
              }}
              placeholder="owner/repo or https://github.com/owner/repo"
              disabled={isRunning}
              className={validationErrors.repo ? '!border-[var(--red)]' : ''}
            />
          </div>
          {validationErrors.repo && (
            <p className="mt-1 text-xs text-[var(--red)] anim-fade-up">
              {validationErrors.repo}
            </p>
          )}
        </div>

        {/* Goal field */}
        <div>
          <p className="text-sm tracking-[0.1em] uppercase text-[var(--text-dim)] mb-1.5">
            Question
          </p>
          <div className="relative">
            <textarea
              value={goal}
              onChange={(e) => {
                setGoal(e.target.value)
                if (validationErrors.goal)
                  setValidationErrors((prev) => ({ ...prev, goal: undefined }))
              }}
              placeholder="What would you like to know about this codebase?"
              disabled={isRunning}
              className={validationErrors.goal ? '!border-[var(--red)]' : ''}
            />
            {/* Character counter */}
            <span
              className={`absolute bottom-2 right-2.5 text-[11px] pointer-events-none transition-colors ${
                goal.length > 450
                  ? goal.length >= 500
                    ? 'text-[var(--red)]'
                    : 'text-[var(--amber-dim)]'
                  : 'text-[var(--text-dim)] opacity-0'
              }`}
            >
              {goal.length}/500
            </span>
          </div>
          {validationErrors.goal && (
            <p className="mt-1 text-xs text-[var(--red)] anim-fade-up">
              {validationErrors.goal}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {PLACEHOLDER_GOALS.map((g) => (
              <button
                key={g}
                className="bg-transparent border border-[var(--border)] rounded-[20px] text-[var(--text-dim)] font-mono text-sm px-2.5 py-[3px] cursor-pointer transition-all duration-150
                           hover:border-[var(--amber-dim)] hover:text-[var(--amber)] hover:bg-[var(--amber-glow)]
                           disabled:opacity-40 disabled:cursor-not-allowed
                           max-[640px]:text-xs max-[640px]:px-2"
                onClick={() => {
                  setGoal(g)
                  setValidationErrors((prev) => ({ ...prev, goal: undefined }))
                }}
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
            className="border-none rounded-[var(--radius)] text-[#0a0a08] text-base font-[600] tracking-[0.05em] px-6 py-2.5 cursor-pointer transition-all duration-150 whitespace-nowrap
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
              className="bg-transparent border border-[var(--border)] rounded-[var(--radius)] text-[var(--text-dim)] font-mono text-[15px] px-4 py-2.5 cursor-pointer transition-all duration-150
                         hover:border-[var(--border-lit)] hover:text-[var(--text)]
                         max-[640px]:flex-1 max-[640px]:text-center"
              onClick={handleReset}
            >
              Reset
            </button>
          )}

          <span className="text-sm text-[var(--text-dim)] max-[640px]:hidden">
            or ⌘↵
          </span>
        </div>
      </section>

      {/* Status bars */}
      {status === 'running' && (
        <div className="flex items-center gap-2.5 mb-5 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] text-[15px] max-[640px]:text-sm max-[640px]:gap-2">
          <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-[var(--amber)] anim-pulse" />
          <span>Agent running</span>
          <Spinner />
          <span className="text-[var(--text-dim)] ml-auto">
            {steps.length} steps
          </span>
        </div>
      )}

      {status === 'streaming' && (
        <div className="flex items-center gap-2.5 mb-5 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] text-[15px] max-[640px]:text-sm max-[640px]:gap-2">
          <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-[var(--green)] anim-pulse" />
          <span className="text-[var(--green)]">Writing answer</span>
          <Cursor />
          <span className="text-[var(--text-dim)] ml-auto">
            {steps.length} tool calls
          </span>
        </div>
      )}

      {status === 'done' && (
        <div className="flex items-center gap-2.5 mb-5 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] text-[15px] max-[640px]:text-sm max-[640px]:gap-2">
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
          <p className="text-sm tracking-[0.1em] uppercase text-[var(--text-dim)] mb-2.5">
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
            <div className="px-3 py-2 text-[var(--amber)] text-[15px]">
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
            className={`text-sm tracking-[0.1em] uppercase mb-2.5 flex items-center gap-2
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
            className={`bg-[var(--surface)] rounded-[var(--radius)] px-6 py-5 text-[var(--text-bright)] font-mono text-base leading-[1.8] whitespace-pre-wrap break-words
                        max-[640px]:px-4 max-[640px]:text-[15px]
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
            <p className="mt-2 text-sm text-[var(--text-dim)]">
              {iterations} iterations · {steps.length} tool calls
            </p>
          )}
        </section>
      )}

      {/* Error */}
      {errorMessage && (
        <div className="bg-[rgba(240,85,85,0.06)] border border-[rgba(240,85,85,0.3)] rounded-[var(--radius)] px-4 py-3.5 text-[var(--red)] text-base anim-fade-up">
          ✗ {errorMessage}
        </div>
      )}

      {/* Footer */}
      <footer className="mt-20 pt-6 border-t border-[var(--border)] flex flex-col gap-3">
        <p className="text-[var(--text-dim)] text-sm leading-relaxed">
          <span className="text-[var(--amber-dim)]">⚠ Disclaimer —</span> No
          data is stored, logged, or retained. All repository analysis happens
          in-memory at request time and is discarded immediately after. No
          GitHub credentials are required or collected.
        </p>
        <p className="text-sm text-[var(--text-dim)] flex items-center gap-2 flex-wrap">
          <span>Built by</span>
          <a
            href="https://www.ozairhassan.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--amber)] hover:text-[#f0b030] transition-colors duration-150 underline underline-offset-2 decoration-[var(--amber-dim)]"
          >
            Ozair Hassan
          </a>
          <span className="text-[var(--border-lit)]">·</span>
          <a
            href="https://github.com/Ozair-Hassan"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text-dim)] hover:text-[var(--text)] transition-colors duration-150 flex items-center gap-1"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
        </p>
      </footer>
    </div>
  )
}
