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

function calcGrade(parsedLines) {
  const body = parsedLines.filter((l) => !l.is_signature)
  const T = body.length
  if (T === 0) return { overall_score: 0, grade: 'F' }

  const D = body.findIndex((l) => l.score <= 25) // 0-indexed, -1 if none

  let avg, penalty
  if (D === -1) {
    avg = body.reduce((s, l) => s + l.score, 0) / T
    penalty = 0
  } else {
    const preDeath = body.slice(0, D)
    avg = preDeath.length > 0 ? preDeath.reduce((s, l) => s + l.score, 0) / preDeath.length : 0
    const d1 = D + 1 // 1-indexed position of death line
    if (d1 <= 2) penalty = 50
    else if (d1 <= T / 2) penalty = 35
    else if (d1 === T - 1) penalty = 15
    else if (d1 === T) penalty = 5
    else penalty = 20
  }

  const score = Math.max(0, Math.round(avg - penalty))
  const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F'
  return { overall_score: score, grade }
}

function gradeColor(grade) {
  if (grade === 'A') return 'text-green-400'
  if (grade === 'B') return 'text-green-500'
  if (grade === 'C') return 'text-amber-400'
  if (grade === 'D') return 'text-red-400'
  return 'text-red-500'
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

function LineCard({ item, isDeath, isFaded, isSignature }) {
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
      {isSignature && (
        <div className="absolute -top-2.5 left-3 bg-gray-700 text-gray-400 text-xs font-bold font-mono px-2 py-0.5 rounded tracking-widest">
          SIGNATURE
        </div>
      )}
      <div className="flex items-start gap-4">
        <div className={`font-mono text-xl font-bold w-10 shrink-0 text-right tabular-nums ${isSignature ? 'text-gray-600' : scoreColor(item.score)}`}>
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
    <div>
      <div className="flex items-center justify-center gap-1.5 py-16">
        <div className="w-2 h-2 rounded-full bg-red-700 animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 rounded-full bg-red-700 animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 rounded-full bg-red-700 animate-bounce" />
      </div>
      <p className="text-center text-gray-600 text-xs font-mono tracking-widest uppercase">
        Reading as a skeptic...
      </p>
    </div>
  )
}

export default function App() {
  const [subject, setSubject] = useState('')
  const [email, setEmail] = useState(SAMPLE_EMAIL)
  const [lines, setLines] = useState(null)
  const [diagnosis, setDiagnosis] = useState(null)
  const [subjectResult, setSubjectResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [fix, setFix] = useState(null)
  const [error, setError] = useState(null)
  const [airtableRecordId, setAirtableRecordId] = useState(null)

  const deathLineIndex = lines ? lines.findIndex((l) => l.score <= 25 && !l.is_signature) : -1
  const { overall_score: overallScore, grade } = lines ? calcGrade(lines) : { overall_score: null, grade: null }
  const contentLines = lines ? lines.filter((l) => !l.is_signature) : []
  const contentDeathIdx = contentLines.findIndex((l) => l.score <= 25)
  const deadPct = contentLines.length > 0 && contentDeathIdx !== -1
    ? Math.round(((contentLines.length - contentDeathIdx) / contentLines.length) * 100)
    : 0

  function logAnalysis(parsedLines, deathIdx, rawEmail, subjectText, subjectScoreVal, score, emailGrade) {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'analyze',
        email: rawEmail,
        scores: parsedLines,
        deathLine: deathIdx,
        subjectLine: subjectText || null,
        subjectScore: subjectScoreVal ?? null,
        overallScore: score ?? null,
        grade: emailGrade || null,
      }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.recordId) setAirtableRecordId(d.recordId) })
      .catch(() => {})
  }

  function logFix(recordId, rewriteText) {
    if (!recordId) return
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'fix', recordId, rewrite: rewriteText }),
    }).catch(() => {})
  }

  async function analyze() {
    setLoading(true)
    setLines(null)
    setDiagnosis(null)
    setSubjectResult(null)
    setFix(null)
    setError(null)
    setAirtableRecordId(null)

    try {
      const [bodyRes, subjectRes] = await Promise.all([
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }),
        subject.trim()
          ? fetch('/api/subject', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subject }),
            })
          : Promise.resolve(null),
      ])

      const bodyData = await bodyRes.json()
      if (!bodyRes.ok) throw new Error(bodyData.error || `API error ${bodyRes.status}`)
      if (!bodyData.content?.[0]?.text) throw new Error('Unexpected API response format')

      const raw = bodyData.content[0].text
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleaned)

      const parsedLines = parsed.lines.map((l) => ({ ...l, score: Number(l.score) }))
      const deathIdx = parsedLines.findIndex((l) => l.score <= 25 && !l.is_signature)
      const { overall_score, grade } = calcGrade(parsedLines) // for logging only

      let parsedSubject = null
      if (subjectRes) {
        const subjectData = await subjectRes.json()
        if (subjectRes.ok && subjectData.content?.[0]?.text) {
          const sRaw = subjectData.content[0].text
          const sCleaned = sRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          parsedSubject = JSON.parse(sCleaned)
          setSubjectResult(parsedSubject)
        }
      }

      setLines(parsedLines)
      setDiagnosis(parsed.diagnosis || null)
      logAnalysis(parsedLines, deathIdx, email, subject.trim() || null, parsedSubject?.score ?? null, overall_score, grade)
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
    const bodyLines = lines.filter((l) => !l.is_signature)
    const emailText = bodyLines.map((l) => l.line).join('\n\n')
    const deadLines = bodyLines
      .filter((l) => l.score <= 40)
      .map((l) => ({ line: l.line, score: l.score, reason: l.reason }))
    try {
      const res = await fetch('/api/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailText, deadLines }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `API error ${res.status}`)
      if (!data.content?.[0]?.text) throw new Error('Unexpected API response format')
      const rewriteText = data.content[0].text.trim()
      setFix(rewriteText)
      logFix(airtableRecordId, rewriteText)
    } catch (e) {
      setError(e.message)
    } finally {
      setFixing(false)
    }
  }

  function reset() {
    setLines(null)
    setDiagnosis(null)
    setSubjectResult(null)
    setFix(null)
    setError(null)
    setSubject('')
    setEmail('')
  }

  return (
    <div className="min-h-screen bg-black text-gray-100 px-4 py-10">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-white">Cold Email Death Clock</h1>
          <p className="text-gray-500 mt-1 text-sm">Find the exact line where your prospect stops reading.</p>
        </header>

        {/* Score legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-6 px-3 py-2.5 bg-gray-950 border border-gray-800 rounded text-xs font-mono">
          <span className="text-gray-600 shrink-0">Attention score:</span>
          <span className="text-green-400">65–100 reading</span>
          <span className="text-gray-700">·</span>
          <span className="text-amber-400">40–64 skimming</span>
          <span className="text-gray-700">·</span>
          <span className="text-red-400">26–39 fading</span>
          <span className="text-gray-700">·</span>
          <span className="text-red-500 font-bold">≤25 dead</span>
        </div>

        {/* Input state */}
        {!lines && !loading && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 font-mono uppercase tracking-widest mb-1.5">
                Subject line <span className="text-gray-700 normal-case tracking-normal">(optional)</span>
              </label>
              <input
                type="text"
                className="w-full bg-gray-950 border border-gray-800 rounded px-4 py-2.5 font-mono text-sm text-gray-200 focus:outline-none focus:border-gray-600 placeholder-gray-700"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Re: quick question about your pipeline..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 font-mono uppercase tracking-widest mb-1.5">
                Email body
              </label>
              <textarea
                className="w-full h-64 bg-gray-950 border border-gray-800 rounded p-4 font-mono text-sm text-gray-200 resize-none focus:outline-none focus:border-gray-600 placeholder-gray-700 leading-relaxed"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Paste your cold email here..."
              />
            </div>
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
            <p className="text-center text-gray-800 text-xs">
              Scores are directional, not exact. The line-by-line feedback is the real output.
            </p>
          </div>
        )}

        {/* Loading state */}
        {loading && <LoadingDots />}

        {/* Results state */}
        {lines && !loading && (
          <div className="space-y-4">

            {/* Subject line card */}
            {subjectResult && (
              <div className="p-4 bg-gray-950 border border-gray-800 rounded">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <p className="text-xs text-gray-600 font-mono uppercase tracking-widest">Subject line</p>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`font-mono text-lg font-bold tabular-nums ${scoreColor(subjectResult.score)}`}>
                      {subjectResult.score}
                    </span>
                    <span className="text-xs font-mono text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                      ~{subjectResult.open_rate} cold open rate
                    </span>
                  </div>
                </div>
                <p className="font-mono text-sm text-gray-300 mb-1">"{subject}"</p>
                <ScoreBar score={subjectResult.score} />
                <p className="text-gray-500 text-xs italic">{subjectResult.reason}</p>
              </div>
            )}

            {/* Summary banner */}
            <div
              className={`p-4 rounded border ${
                deathLineIndex !== -1
                  ? 'bg-red-950 border-red-800'
                  : 'bg-green-950 border-green-800'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  {deathLineIndex !== -1 ? (
                    <p className="text-sm text-red-300">
                      <span className="font-bold text-red-100">Died on line {deathLineIndex + 1}.</span>{' '}
                      {deadPct}% was never read.
                    </p>
                  ) : (
                    <p className="text-sm text-green-300">
                      <span className="font-bold text-green-100">Attention held all the way through.</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-600 mt-1">
                    Avg cold email dies on line 3. Top performers survive past line 6.
                  </p>
                </div>
                {grade && overallScore !== null && (
                  <div className="text-right shrink-0">
                    <div className={`font-mono text-3xl font-bold ${gradeColor(grade)}`}>{grade}</div>
                    <div className="font-mono text-xs text-gray-600 tabular-nums">{overallScore}/100</div>
                  </div>
                )}
              </div>
              {diagnosis && (
                <p className="text-xs text-gray-400 italic border-t border-gray-800 pt-2 mt-2">
                  {diagnosis}
                </p>
              )}
            </div>

            {/* Line cards */}
            <div>
              {lines.map((item, i) => (
                <LineCard
                  key={i}
                  item={item}
                  isDeath={i === deathLineIndex}
                  isFaded={deathLineIndex !== -1 && i > deathLineIndex && !item.is_signature}
                  isSignature={!!item.is_signature}
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
                {fixing ? 'Rewriting...' : 'Fix the dead lines'}
              </button>
            )}

            {/* Fix result */}
            {fix && (
              <div className="p-4 bg-gray-950 border border-gray-700 rounded">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-600 uppercase tracking-widest font-mono">
                    Suggested rewrite
                  </p>
                  <button
                    onClick={() => navigator.clipboard.writeText(fix)}
                    className="text-xs text-gray-500 hover:text-gray-300 font-mono border border-gray-700 hover:border-gray-500 px-2 py-1 rounded transition-colors"
                  >
                    Copy
                  </button>
                </div>
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

            <p className="text-center text-gray-800 text-xs">
              Scores are directional, not exact. The line-by-line feedback is the real output.
            </p>

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
