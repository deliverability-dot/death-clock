function resolveTemplateVars(email) {
  return email
    // {{RANDOM | a | b | c}} → first option
    .replace(/\{\{RANDOM\s*\|([^}]+)\}\}/gi, (_, options) => options.split('|')[0].trim())
    // Known Instantly fields → realistic placeholder values
    .replace(/\{\{firstName\}\}/gi, 'John')
    .replace(/\{\{lastName\}\}/gi, 'Smith')
    .replace(/\{\{companyName\}\}/gi, 'Acme Corp')
    .replace(/\{\{jobTitle\}\}/gi, 'VP of Operations')
    .replace(/\{\{website\}\}/gi, 'acmecorp.com')
    .replace(/\{\{accountSignature\}\}/gi, 'Sarah Johnson\nAccount Executive')
    // Any remaining {{...}} → strip cleanly
    .replace(/\{\{[^}]+\}\}/g, '')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email } = req.body

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email content is required' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' })
  }

  const resolvedEmail = resolveTemplateVars(email)

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
        max_tokens: 1000,
        system:
          `You are a brutally honest attention-tracking engine for cold emails. You read emails as the most skeptical, time-starved B2B buyer alive -- someone who gets 80 cold emails a day, trusts none of them, and deletes without mercy. You are not trying to be encouraging. You are trying to be accurate. Return ONLY valid raw JSON. No markdown, no backticks, no explanation.

You know exactly what earns attention and what kills it.

What scores 80-100:
- A simple first-name greeting (Hi Mark, Hello Sarah) — this is structural, always score 80-100 unless something is wrong with it
- Specific observation about the recipient's org, role, or situation that shows real research (without "I noticed" or "I came across") → 75-90
- A concrete mechanism of value: explains HOW you help, not just that you do → 70-85
- A specific verifiable claim (named program, real dollar range tied to a source) → boosts 10-20 points
- Soft specific close at the end of a strong email ("Happy to send the rebate list", "Worth a look?") → 35-55

What kills attention — score accordingly:
- Generic sentence openers ("I came across your profile", "I hope this finds you well") → drop to 55-65
- Vague value props with unverifiable numbers ("increase pipeline by 40%", "save 10 hours a week", "60-80% of costs") → drop to 25-35
- Corporate buzzwords (leverage, synergy, AI-powered, solutions, streamline) → drop to 20-30
- Fake social proof ("500+ customers", "Fortune 500 companies", "multiple awards") → drop to 10-20
- Pushy asks before earning the right ("I'd love to jump on a call", "Are you free Thursday?") → drop to 10-25
- Spam trigger language (guaranteed, free, limited time, act now) → drop to 5-20
- Anything that sounds like a template → dock 20+ points immediately`,
        messages: [
          {
            role: 'user',
            content: `Analyze this cold email line by line. Skip blank lines. Start attention at 100. Score each non-blank line 0-100. Be accurate, not just brutal -- reward lines that earn it, punish lines that deserve it. Once attention drops to 25 or below it typically stays there. Write a short, specific reason for each score -- what exactly earned or lost the points.

Also provide a one-sentence diagnosis of what fundamentally killed this email (or what kept it alive). If a strong body was ruined by a bad CTA, say so specifically.

Also identify signature lines. A line is a signature if it's part of the closing block at the end of the email: a sign-off word (Best, Thanks, Regards, Cheers, Sincerely, Warmly), the sender's name, job title, company name, phone number, or website. Signature lines should NOT count as death lines -- they are structural, not persuasive content. Mark them with "is_signature": true.

Return ONLY this JSON structure:
{
  "diagnosis": "one sharp sentence about what killed or saved this email",
  "lines": [{"line": "exact line text", "score": 82, "reason": "why attention changed", "is_signature": false}]
}

Email:\n${resolvedEmail}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return res.status(response.status).json({ error: errorText })
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
