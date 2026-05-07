export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { subject } = req.body
  if (!subject || typeof subject !== 'string') {
    return res.status(400).json({ error: 'Subject is required' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' })
  }

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
        max_tokens: 300,
        system:
          'You are a cold email deliverability and open rate expert. You evaluate subject lines exactly as an inbox algorithm and a skeptical B2B buyer would. Return ONLY valid raw JSON. No markdown, no backticks, no explanation.',
        messages: [
          {
            role: 'user',
            content: `Score this cold email subject line for open rate potential. Consider: personalization, curiosity, clarity, spam trigger words, length, and whether it sounds like a human or a template.

Score 0-100. Map to an estimated open rate range for cold outbound email:
- 85-100 → "35-50%"
- 70-84 → "22-35%"
- 55-69 → "12-22%"
- 40-54 → "6-12%"
- 25-39 → "2-6%"
- 0-24 → "under 2%"

Return ONLY: {"score": 74, "open_rate": "22-35%", "reason": "one sharp sentence explaining the score"}

Subject line: ${subject}`,
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
