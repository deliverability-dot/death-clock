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
          'You are an attention-tracking engine for cold emails. You read emails exactly as a distracted skeptical B2B buyer does -- fast, with low trust, ready to delete. Return ONLY valid raw JSON. No markdown, no backticks, no explanation.',
        messages: [
          {
            role: 'user',
            content: `Analyze this cold email line by line. Skip blank lines. Start attention at 100. Score each non-blank line 0-100. Be harsh and realistic -- most emails lose people fast. Once a line drops to 15 or below it typically stays there. Write a short, sharp reason for each score. Return ONLY a JSON array: [{"line": "exact line text", "score": 82, "reason": "why attention changed"}]\n\nEmail:\n${email}`,
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
