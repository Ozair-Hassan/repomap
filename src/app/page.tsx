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

export default function HomePage() {
  const [repo, setRepo] = useState('')
  const [goal, setGoal] = useState('')
  const { status, steps, answer, errorMessage, iterations, ask, reset } =
    useAgent()
  const answerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (answer) answerRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [answer])

  const handleSubmit = () => {
    if (!repo.trim() || !goal.trim() || status === 'running') return
    ask(goal.trim(), repo.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Syne:wght@400;600;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0a0a08;
          --surface: #111110;
          --border: #252520;
          --border-lit: #3a3a30;
          --amber: #e8a020;
          --amber-dim: #7a5010;
          --amber-glow: rgba(232,160,32,0.12);
          --green: #4adf8a;
          --red: #f05555;
          --text: #d4cfc0;
          --text-dim: #6a6558;
          --text-bright: #f0ead8;
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
          max-width: 860px;
          margin: 0 auto;
          padding: 48px 24px 120px;
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
          max-width: 480px;
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
          padding: 8px 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          margin-bottom: 16px;
          font-size: 12px;
          animation: fadeUp 0.3s ease both;
        }
        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .status-dot.running { background: var(--amber); animation: pulse 1s infinite; }
        .status-dot.done    { background: var(--green); }
        .status-dot.error   { background: var(--red); }

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
        .step-header:hover { background: #16161400; }

        .tool-icon { color: var(--amber); flex-shrink: 0; }
        .step-tool { color: var(--amber); font-weight: 500; flex-shrink: 0; }
        .step-args {
          color: var(--text-dim);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }
        .step-chevron { color: var(--text-dim); flex-shrink: 0; font-size: 9px; }

        .step-output {
          padding: 12px;
          background: #0d0d0b;
          border-top: 1px solid var(--border);
          color: var(--text-dim);
          font-size: 12px;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 320px;
          overflow-y: auto;
        }

        /* Live cursor */
        .step-row.live .step-header { background: rgba(232,160,32,0.05); }

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
        }
        .answer-meta {
          margin-top: 8px;
          font-size: 11px;
          color: var(--text-dim);
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
          <p className="header-eyebrow">repo intelligence</p>
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
                disabled={status === 'running'}
              />
            </div>
          </div>

          <div>
            <p className="field-label">Question</p>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What would you like to know about this codebase?"
              disabled={status === 'running'}
            />
            <div className="hint-pills">
              {PLACEHOLDER_GOALS.map((g) => (
                <button
                  key={g}
                  className="hint-pill"
                  onClick={() => setGoal(g)}
                  disabled={status === 'running'}
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
              disabled={!repo.trim() || !goal.trim() || status === 'running'}
            >
              {status === 'running' ? 'Running…' : 'Run Agent →'}
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
            {steps.map((step: any, i: any) => (
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

        {answer && (
          <section
            className="answer-section"
            ref={answerRef}
          >
            <p className="answer-label">Answer</p>
            <div className="answer-box">{answer}</div>
            <p className="answer-meta">
              {iterations} iterations · {steps.length} tool calls
            </p>
          </section>
        )}

        {errorMessage && <div className="error-box">✗ {errorMessage}</div>}
      </div>
    </>
  )
}
