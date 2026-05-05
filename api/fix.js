export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { lines } = req.body

  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'Lines array is required' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' })
  }

  const linesText = lines.join('\n')

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
        max_tokens: 500,
        system:
          'You are a cold email copywriter who rewrites weak lines to hold attention. Be specific, direct, and human. No fluff. No buzzwords.',
        messages: [
          {
            role: 'user',
            content: `The following lines appear near the point where a cold email loses the reader's attention. The last line shown is where attention dropped to 15 or below -- the death line. Rewrite these lines to hold attention all the way through. Keep the same basic intent. Be specific, conversational, credible. No buzzwords or generic claims.\n\nReturn only the rewritten lines, one per line, no labels or extra text.\n\nLines to rewrite:\n${linesText}`,
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
