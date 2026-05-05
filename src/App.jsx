import { useState } from 'react'

const SAMPLE_EMAIL = `Hi John,

I came across your profile on LinkedIn and noticed you're the VP of Sales at Acme Corp.

We help companies like yours increase pipeline by 40% using our AI-powered prospecting platform.

Our solution has won multiple industry awards and is trusted by over 500 companies worldwide including Fortune 500 names.

I'd love to jump on a quick 15-minute call to walk you through exactly how it works for teams your size.

Are you free Thursday at 2pm or Friday morning?

Looking forward to connecting,
Sarah`

function scoreColor(score) {
  if (score >= 65) return 'text-green-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-red-400'
}

function barColor(score) {
  if (score >= 65) return 'bg-green-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

function ScoreBar({ score }) {
  return (
    <div className="w-full bg-gray-800 h-0.5 mt-2 mb-2 rounded-full overflow-hidden">
      <div
        className={`h-0.5 rounded-full transition-all ${barColor(score)}`}
        style={{ width: `${score}%` }}
      />
    </div>
  )
}

function LineCard({ item, isDeath, isFaded }) {
  return (
    <div
      className={`relative p-4 rounded mb-2 bg-gray-950 transition-opacity ${
        isDeath ? 'border border-red-500' : 'border border-gray-800'
      }`}
      style={{ opacity: isFaded ? 0.4 : 1 }}
    >
      {isDeath && (
        <div className="absolute -top-2.5 left-3 bg-red-600 text-white text-xs font-bold font-mono px-2 py-0.5 rounded tracking-widest">
          DEAD HERE
        </div>
      )}
      <div className="flex items-start gap-4">
        <div className={`font-mono text-xl font-bold w-10 shrink-0 text-right tabular-nums ${scoreColor(item.score)}`}>
          {item.score}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-sm text-gray-200 leading-relaxed break-words">{item.line}</div>
          <ScoreBar score={item.score} />
          <div className="text-gray-500 text-xs italic leading-snug">{item.reason}</div>
        </div>
      </div>
    </div>
  )
}

function LoadingDots() {
  return (
    <div className="flex items-center justify-center gap-1.5 py-16">
      <div className="w-2 h-2 rounded-full bg-red-700 animate-bounce [animation-delay:-0.3s]" />
      <div className="w-2 h-2 rounded-full bg-red-700 animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 rounded-full bg-red-700 animate-bounce" />
    </div>
  )
}

export default function App() {
  const [email, setEmail] = useState(SAMPLE_EMAIL)
  const [lines, setLines] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [fix, setFix] = useState(null)
  const [error, setError] = useState(null)

  const deathLineIndex = lines ? lines.findIndex((l) => l.score <= 15) : -1
  const totalLines = lines ? lines.length : 0
  const deadCount = deathLineIndex !== -1 ? totalLines - deathLineIndex : 0
  const deadPct = totalLines > 0 ? Math.round((deadCount / totalLines) * 100) : 0

  async function analyze() {
    setLoading(true)
    setLines(null)
    setFix(null)
    setError(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `API error ${res.status}`)
      if (!data.content?.[0]?.text) throw new Error('Unexpected API response format')

      const raw = data.content[0].text
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleaned)
      if (!Array.isArray(parsed)) throw new Error('Expected an array from the API')
      setLines(parsed.map((l) => ({ ...l, score: Number(l.score) })))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function fixDeathLine() {
    if (deathLineIndex === -1) return
    setFixing(true)
    setFix(null)
    const startIdx = Math.max(0, deathLineIndex - 2)
    const linesToFix = lines.slice(startIdx, deathLineIndex + 1).map((l) => l.line)
    try {
      const res = await fetch('/api/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: linesToFix }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `API error ${res.status}`)
      if (!data.content?.[0]?.text) throw new Error('Unexpected API response format')
      setFix(data.content[0].text.trim())
    } catch (e) {
      setError(e.message)
    } finally {
      setFixing(false)
    }
  }

  function reset() {
    setLines(null)
    setFix(null)
    setError(null)
    setEmail('')
  }

  return (
    <div className="min-h-screen bg-black text-gray-100 px-4 py-10">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">Cold Email Death Clock</h1>
          <p className="text-gray-500 mt-1 text-sm">Find the exact line where your prospect stops reading.</p>
        </header>

        {/* Input state */}
        {!lines && !loading && (
          <div className="space-y-3">
            <textarea
              className="w-full h-64 bg-gray-950 border border-gray-800 rounded p-4 font-mono text-sm text-gray-200 resize-none focus:outline-none focus:border-gray-600 placeholder-gray-700 leading-relaxed"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Paste your cold email here..."
            />
            {error && (
              <p className="text-red-400 text-xs font-mono bg-red-950 border border-red-900 rounded px-3 py-2">
                {error}
              </p>
            )}
            <button
              onClick={analyze}
              disabled={!email.trim()}
              className="w-full py-3 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors text-sm tracking-wide"
            >
              Find the death line
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div>
            <LoadingDots />
            <p className="text-center text-gray-600 text-xs font-mono tracking-widest uppercase">
              Reading as a skeptic...
            </p>
          </div>
        )}

        {/* Results state */}
        {lines && !loading && (
          <div className="space-y-4">

            {/* Summary banner */}
            <div
              className={`p-3.5 rounded border text-sm ${
                deathLineIndex !== -1
                  ? 'bg-red-950 border-red-800 text-red-300'
                  : 'bg-green-950 border-green-800 text-green-300'
              }`}
            >
              {deathLineIndex !== -1 ? (
                <>
                  <span className="font-bold text-red-100">
                    Email died on line {deathLineIndex + 1}.
                  </span>{' '}
                  {deadPct}% of the email was never read.
                </>
              ) : (
                <>
                  <span className="font-bold text-green-100">Attention held all the way through.</span>{' '}
                  No death line detected.
                </>
              )}
            </div>

            {/* Line cards */}
            <div>
              {lines.map((item, i) => (
                <LineCard
                  key={i}
                  item={item}
                  isDeath={i === deathLineIndex}
                  isFaded={deathLineIndex !== -1 && i > deathLineIndex}
                />
              ))}
            </div>

            {error && (
              <p className="text-red-400 text-xs font-mono bg-red-950 border border-red-900 rounded px-3 py-2">
                {error}
              </p>
            )}

            {/* Fix button */}
            {deathLineIndex !== -1 && (
              <button
                onClick={fixDeathLine}
                disabled={fixing}
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 font-semibold rounded transition-colors border border-gray-700 text-sm"
              >
                {fixing ? 'Rewriting...' : 'Fix the death line'}
              </button>
            )}

            {/* Fix result */}
            {fix && (
              <div className="p-4 bg-gray-950 border border-gray-700 rounded">
                <p className="text-xs text-gray-600 uppercase tracking-widest font-mono mb-3">
                  Suggested rewrite
                </p>
                <p className="font-mono text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{fix}</p>
              </div>
            )}

            {/* Reset */}
            <button
              onClick={reset}
              className="w-full py-3 bg-transparent hover:bg-gray-950 text-gray-600 hover:text-gray-400 font-semibold rounded transition-colors border border-gray-900 text-sm"
            >
              Analyze another email
            </button>

          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center">
          <p className="text-gray-800 text-xs">
            Built by{' '}
            <a
              href="https://threeredboxes.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-400 transition-colors"
            >
              Three Red Boxes
            </a>
          </p>
        </footer>

      </div>
    </div>
  )
}
