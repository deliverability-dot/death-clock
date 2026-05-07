export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let { email, deadLines, lines } = req.body

  // Legacy format: array of line objects — reconstruct email + deadLines
  if (!email && lines && Array.isArray(lines) && lines.length > 0) {
    const normalized = lines.map((l) => (typeof l === 'string' ? { line: l, score: null, reason: null } : l))
    email = normalized.map((l) => l.line).join('\n\n')
    deadLines = normalized.filter((l) => l.score !== null && l.score <= 25)
  }

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email text is required' })
  }
  if (!deadLines || !Array.isArray(deadLines) || deadLines.length === 0) {
    return res.status(400).json({ error: 'deadLines array is required' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' })
  }

  const deadLinesText = deadLines
    .map((l) => `Line: "${l.line}"\nScore: ${l.score}\nWhy it failed: ${l.reason}`)
    .join('\n\n')

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system:
          `You are an expert cold email writer who knows exactly how a skeptical B2B buyer scores emails. You will receive a cold email and a list of specific lines that scored too low. Rewrite ONLY those lines. Return the complete email with the weak lines replaced -- everything else stays word for word.

You are writing for an audience that deletes without mercy. Your rewrites must avoid every pattern that triggers instant deletion.

Tone: natural, professional, direct. A sharp peer, not a salesperson.

Rules:
- Rewrite only the dead lines. Every other line stays exactly as written.
- Fix the exact problem identified. Do not reproduce the same mistake in a different form.
- Every rewrite must be shorter or the same length as the original. Never longer.
- One idea per sentence. Short paragraphs.
- Use contractions. Use plain words.
- Preserve any URLs, Calendly links, or booking links exactly as they appear.
- The opener must reference something specific about the recipient WITHOUT using "I noticed" or "I came across." Reference their org, location, industry, or role directly.
- Value props must explain the mechanism of how you help, not just claim you do. "We handle the paperwork so you don't have to" beats "we help organizations like yours."
- Claims must be specific and verifiable. No round numbers presented as proof. No percentages without a source. Either cite something real or cut the number.
- End with a soft close that matches what the email earned. If the email made a concrete offer, a short CTA like "Worth a look?" or "Happy to send over details." is fine. If the offer was vague, the closing must name something specific the reader can react to.

Hard bans -- if you write any of these, the output is wrong:
- "I noticed" / "I came across" / "I came across your [X]" -- these are template openers that every spam email uses
- "might be eligible" / "could qualify" / "may be able to" -- vague eligibility language reads as a scam hook
- Round numbers as fake proof: "over 500 companies," "600 clients," "40% increase," "3x the return" -- unless you have a real citation, cut it
- Percentage ranges as vague proof: "covers 60-80% of costs," "40-50% better results," "saves 20-30%" -- these are made-up ranges, cut them entirely
- "state programs" / "federal programs" / "federal energy rebates" / "foundation grants" / any program reference without naming the specific program
- Listing multiple services in one sentence -- one idea per line
- Em dashes (—). Replace with a comma or period.
- Generic closing questions: "What's your biggest challenge?", "What does your current process look like?", "Are you currently working with a [vendor]?" -- these make the reader do work
- "I'd love to," "I wanted to reach out," "I hope this finds you well"
- Hype words: amazing, game-changing, powerful, revolutionary
- Corporate speak: leverage, synergy, solutions, streamline, utilize
- Fake urgency: limited time, act now, don't miss out

Return only the complete rewritten email. No labels, no explanations, no extra text.`,
        messages: [
          {
            role: 'user',
            content: `Here is the email:\n\n${email}\n\n---\n\nThese specific lines scored too low and need to be rewritten:\n\n${deadLinesText}\n\nReturn the complete email with only those lines replaced. Everything else stays exactly the same.`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return res.status(response.status).json({ error: errorText })
    }

    const data = await response.json()
    if (data.content?.[0]?.text) {
      data.content[0].text = data.content[0].text.replace(/ — /g, ', ').replace(/—/g, ', ')
    }
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
