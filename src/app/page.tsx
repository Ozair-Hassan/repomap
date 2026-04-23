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
  if (name === 'list_directory') return <span className="tool-icon">◈</span>
  if (name === 'read_file') return <span className="tool-icon">◉</span>
  return <span className="tool-icon">◎</span>
}

function StepRow({ step, index }: { step: any; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const argStr = Object.entries(step.args)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ')

  return (
    <div
      className={`step-row ${step.error ? 'step-error' : ''}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <button
        className="step-header"
        onClick={() => setExpanded((e) => !e)}
      >
        <ToolIcon name={step.tool} />
        <span className="step-tool">{step.tool}</span>
        <span className="step-args">{argStr}</span>
        <span className="step-chevron">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && <pre className="step-output">{step.output}</pre>}
    </div>
  )
}

function Spinner() {
  return <span className="spinner">▋</span>
}

function Cursor() {
  return <span className="cursor">▌</span>
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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Syne:wght@400;600;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #181814;
          --surface: #222220;
          --border: #38382e;
          --border-lit: #525244;
          --amber: #f0aa28;
          --amber-dim: #9a6818;
          --amber-glow: rgba(240,170,40,0.14);
          --green: #5aefaa;
          --red: #f06868;
          --text: #e0dbd0;
          --text-dim: #8a8474;
          --text-bright: #f8f4e8;
          --font-mono: 'DM Mono', monospace;
          --font-display: 'Syne', sans-serif;
          --radius: 4px;
        }

        html, body { height: 100%; }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 13px;
          line-height: 1.6;
          min-height: 100vh;
        }

        /* Scanline overlay */
        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.04) 2px,
            rgba(0,0,0,0.04) 4px
          );
          pointer-events: none;
          z-index: 1000;
        }

        .page {
          width: 75%;
          max-width: 1400px;
          min-width: 320px;
          margin: 0 auto;
          padding: 48px 0 120px;
        }

        @media (max-width: 1024px) {
          .page { width: 88%; }
        }

        @media (max-width: 640px) {
          .page { width: 92%; padding: 28px 0 80px; }
        }

        /* Header */
        .header {
          margin-bottom: 48px;
          animation: fadeUp 0.5s ease both;
        }
        .header-eyebrow {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.15em;
          color: var(--amber);
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .header-eyebrow::before { content: '> '; opacity: 0.5; }
        .header-title {
          font-family: var(--font-display);
          font-size: clamp(32px, 5vw, 52px);
          font-weight: 800;
          color: var(--text-bright);
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
        .header-title span { color: var(--amber); }
        .header-sub {
          margin-top: 10px;
          color: var(--text-dim);
          font-size: 13px;
          max-width: 580px;
        }

        @media (max-width: 640px) {
          .header { margin-bottom: 32px; }
          .header-title { font-size: clamp(28px, 8vw, 40px); }
          .header-sub { font-size: 12px; max-width: 100%; }
        }

        /* Form */
        .form-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 32px;
          animation: fadeUp 0.5s 0.1s ease both;
        }

        .field-label {
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 6px;
        }

        .input-wrap { position: relative; }
        .input-prefix {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--amber-dim);
          pointer-events: none;
          font-size: 13px;
        }

        input, textarea {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text-bright);
          font-family: var(--font-mono);
          font-size: 13px;
          padding: 10px 12px 10px 28px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          resize: none;
        }
        input:focus, textarea:focus {
          border-color: var(--amber-dim);
          box-shadow: 0 0 0 3px var(--amber-glow);
        }
        input::placeholder, textarea::placeholder { color: var(--text-dim); }

        textarea { padding: 10px 12px; min-height: 80px; }

        .hint-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }
        .hint-pill {
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 20px;
          color: var(--text-dim);
          font-family: var(--font-mono);
          font-size: 11px;
          padding: 3px 10px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .hint-pill:hover {
          border-color: var(--amber-dim);
          color: var(--amber);
          background: var(--amber-glow);
        }

        .submit-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .submit-row { gap: 8px; }
          .btn-run { flex: 1; text-align: center; }
          .btn-reset { flex: 1; text-align: center; }
          .kbd-hint { display: none; }
          .hint-pills { gap: 4px; }
          .hint-pill { font-size: 10px; padding: 3px 8px; }
        }

        .btn-run {
          background: var(--amber);
          border: none;
          border-radius: var(--radius);
          color: #0a0a08;
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.05em;
          padding: 10px 24px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .btn-run:hover:not(:disabled) {
          background: #f0b030;
          box-shadow: 0 0 20px var(--amber-glow);
        }
        .btn-run:disabled { opacity: 0.4; cursor: not-allowed; }

        .btn-reset {
          background: transparent;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text-dim);
          font-family: var(--font-mono);
          font-size: 12px;
          padding: 10px 16px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-reset:hover { border-color: var(--border-lit); color: var(--text); }

        .kbd-hint {
          font-size: 11px;
          color: var(--text-dim);
        }

        /* Status bar */
        .status-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding: 8px 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          font-size: 12px;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .status-dot.running   { background: var(--amber); animation: pulse 1.2s ease-in-out infinite; }
        .status-dot.streaming { background: var(--green); animation: pulse 1.2s ease-in-out infinite; }
        .status-dot.done      { background: var(--green); }
        .status-dot.error     { background: var(--red); }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        /* Steps */
        .steps-section { margin-bottom: 24px; }
        .steps-label {
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 10px;
        }

        .step-row {
          border: 1px solid var(--border);
          border-radius: var(--radius);
          margin-bottom: 6px;
          overflow: hidden;
          animation: fadeUp 0.3s ease both;
        }
        .step-row.step-error { border-color: rgba(240,85,85,0.3); }

        .step-header {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          background: var(--surface);
          border: none;
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 12px;
          padding: 8px 12px;
          cursor: pointer;
          text-align: left;
          transition: background 0.1s;
        }
        .step-header:hover { background: #2a2a26; }

        .tool-icon { color: var(--amber); flex-shrink: 0; }
        .step-tool { color: var(--amber); font-weight: 500; flex-shrink: 0; }
        .step-args {
          color: var(--text-dim);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          min-width: 0;
        }
        .step-chevron { color: var(--text-dim); flex-shrink: 0; font-size: 9px; }

        .step-output {
          padding: 12px;
          background: #1a1a16;
          border-top: 1px solid var(--border);
          color: var(--text-dim);
          font-size: 12px;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 320px;
          overflow-y: auto;
        }

        @media (max-width: 640px) {
          .step-tool { font-size: 11px; }
          .step-args { font-size: 11px; }
          .status-bar { font-size: 11px; gap: 8px; }
        }

        /* Answer */
        .answer-section {
          animation: fadeUp 0.4s ease both;
        }
        .answer-label {
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--green);
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .answer-label::before {
          content: '';
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--green);
        }
        .answer-label.streaming-label { color: var(--amber); }
        .answer-label.streaming-label::before { background: var(--amber); }

        .answer-box {
          background: var(--surface);
          border: 1px solid var(--border-lit);
          border-radius: var(--radius);
          padding: 20px 24px;
          color: var(--text-bright);
          font-family: var(--font-mono);
          font-size: 13px;
          line-height: 1.8;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .answer-box.streaming-box {
          border-color: var(--amber-dim);
          box-shadow: 0 0 0 1px var(--amber-glow);
        }
        .answer-meta {
          margin-top: 8px;
          font-size: 11px;
          color: var(--text-dim);
        }

        @media (max-width: 640px) {
          .answer-box { padding: 16px; font-size: 12px; }
        }

        /* Error */
        .error-box {
          background: rgba(240,85,85,0.06);
          border: 1px solid rgba(240,85,85,0.3);
          border-radius: var(--radius);
          padding: 14px 16px;
          color: var(--red);
          font-size: 13px;
          animation: fadeUp 0.3s ease both;
        }

        /* Spinner */
        .spinner {
          display: inline-block;
          color: var(--amber);
          animation: blink 0.8s step-end infinite;
        }

        /* Blinking cursor for token streaming */
        .cursor {
          display: inline-block;
          color: var(--amber);
          animation: blink 0.6s step-end infinite;
          margin-left: 1px;
          line-height: 1;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="page">
        <header className="header">
          <p className="header-eyebrow">repo map</p>
          <h1 className="header-title">
            Ask your
            <br />
            <span>codebase</span>
          </h1>
          <p className="header-sub">
            Point at any public GitHub repo. Ask anything. Watch the agent
            explore it in real time.
          </p>
        </header>

        <section
          className="form-section"
          onKeyDown={handleKeyDown}
        >
          <div>
            <p className="field-label">Repository</p>
            <div className="input-wrap">
              <span className="input-prefix">⌥</span>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="owner/repo or https://github.com/owner/repo"
                disabled={isRunning}
              />
            </div>
          </div>

          <div>
            <p className="field-label">Question</p>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What would you like to know about this codebase?"
              disabled={isRunning}
            />
            <div className="hint-pills">
              {PLACEHOLDER_GOALS.map((g) => (
                <button
                  key={g}
                  className="hint-pill"
                  onClick={() => setGoal(g)}
                  disabled={isRunning}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="submit-row">
            <button
              className="btn-run"
              onClick={handleSubmit}
              disabled={!repo.trim() || !goal.trim() || isRunning}
            >
              {isRunning ? 'Running…' : 'Run Agent →'}
            </button>
            {status !== 'idle' && (
              <button
                className="btn-reset"
                onClick={reset}
              >
                Reset
              </button>
            )}
            <span className="kbd-hint">or ⌘↵</span>
          </div>
        </section>

        {status === 'running' && (
          <div className="status-bar">
            <span className="status-dot running" />
            <span>Agent running</span>
            <Spinner />
            <span style={{ color: 'var(--text-dim)', marginLeft: 'auto' }}>
              {steps.length} steps
            </span>
          </div>
        )}

        {status === 'streaming' && (
          <div className="status-bar">
            <span className="status-dot streaming" />
            <span style={{ color: 'var(--green)' }}>Writing answer</span>
            <Cursor />
            <span style={{ color: 'var(--text-dim)', marginLeft: 'auto' }}>
              {steps.length} tool calls
            </span>
          </div>
        )}

        {status === 'done' && (
          <div className="status-bar">
            <span className="status-dot done" />
            <span style={{ color: 'var(--green)' }}>Complete</span>
            <span style={{ color: 'var(--text-dim)', marginLeft: 'auto' }}>
              {iterations} iterations · {steps.length} tool calls
            </span>
          </div>
        )}

        {steps.length > 0 && (
          <section className="steps-section">
            <p className="steps-label">Agent trace</p>
            {steps.map((step: any, i: number) => (
              <StepRow
                key={i}
                step={step}
                index={i}
              />
            ))}
            {status === 'running' && (
              <div
                style={{
                  padding: '8px 12px',
                  color: 'var(--amber)',
                  fontSize: 12,
                }}
              >
                <Spinner /> thinking…
              </div>
            )}
          </section>
        )}

        {displayAnswer && (
          <section
            className="answer-section"
            ref={answerRef}
          >
            <p
              className={`answer-label${showCursor ? ' streaming-label' : ''}`}
            >
              {showCursor ? 'Writing answer' : 'Answer'}
            </p>
            <div className={`answer-box${showCursor ? ' streaming-box' : ''}`}>
              {displayAnswer}
              {showCursor && <Cursor />}
            </div>
            {status === 'done' && (
              <p className="answer-meta">
                {iterations} iterations · {steps.length} tool calls
              </p>
            )}
          </section>
        )}

        {errorMessage && <div className="error-box">✗ {errorMessage}</div>}
      </div>
    </>
  )
}
