const BASE_ID = 'appkmxaF1OXOE3MqK'
const TABLE_ID = 'tbl9lQ9ZbnnndvoVj'

async function getNextSessionId(token) {
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?fields[]=Session+ID&sort[0][field]=Session+ID&sort[0][direction]=desc&maxRecords=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()
  const last = data.records?.[0]?.fields?.['Session ID'] || 0
  return last + 1
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = process.env.AIRTABLE_TOKEN
  if (!token) return res.status(500).json({ error: 'AIRTABLE_TOKEN not configured' })

  const { type, email, scores, deathLine, recordId, rewrite, subjectLine, subjectScore, overallScore, grade } = req.body

  try {
    if (type === 'fix' && recordId) {
      const fixRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${recordId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            'Fix Death Line': true,
            'Suggested Rewrite': rewrite || '',
          },
        }),
      })
      const fixData = await fixRes.json()
      if (!fixRes.ok) throw new Error(`Airtable error: ${JSON.stringify(fixData)}`)
      return res.status(200).json({ ok: true })
    }

    // New analysis — get next sequential ID then create record
    const sessionId = await getNextSessionId(token)

    const scoreText = scores
      .map((l, i) => `Line ${i + 1} (${l.score}): ${l.line}\n  → ${l.reason}`)
      .join('\n')

    const fields = {
      'Session ID': sessionId,
      'Timestamp': new Date().toISOString(),
      'Email Content': email,
      'Line by Line Score': scoreText + `\n\nDeath line: ${deathLine !== -1 ? deathLine + 1 : 'none'}`,
      'Fix Death Line': false,
    }
    if (subjectLine) fields['Subject Line'] = subjectLine
    if (subjectScore != null) fields['Subject Score'] = subjectScore
    if (overallScore != null) fields['Overall Score'] = overallScore
    if (grade) fields['Grade'] = grade

    const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(`Airtable error: ${JSON.stringify(data)}`)
    return res.status(200).json({ recordId: data.id })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
