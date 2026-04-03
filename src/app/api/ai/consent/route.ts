import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

// Consent token is a signed timestamp; in production this would be a proper JWT
function issueConsentToken(): string {
  const payload = { granted: true, issuedAt: Date.now() }
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { agreed } = body as { agreed?: boolean }

  if (!agreed) {
    return Response.json(
      { error: 'Consent must be explicitly granted' },
      { status: 400 },
    )
  }

  const token = issueConsentToken()

  // Also persist in a cookie for convenience
  const cookieStore = await cookies()
  cookieStore.set('ai_consent', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  return Response.json({ token })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('ai_consent')
  return Response.json({ revoked: true })
}
