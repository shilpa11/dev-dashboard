import { NextRequest } from 'next/server'

interface TelemetryEvent {
  event: string
  properties?: Record<string, unknown>
  timestamp?: string
}

export async function POST(request: NextRequest) {
  let body: TelemetryEvent

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.event || typeof body.event !== 'string') {
    return Response.json({ error: 'event field is required' }, { status: 400 })
  }

  const event = {
    event: body.event,
    properties: body.properties ?? {},
    timestamp: body.timestamp ?? new Date().toISOString(),
    receivedAt: new Date().toISOString(),
  }

  // In production: forward to Segment, Datadog, etc.
  console.log('[telemetry]', JSON.stringify(event))

  return Response.json({ ok: true })
}
