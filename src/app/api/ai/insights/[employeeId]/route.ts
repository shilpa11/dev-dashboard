import { NextRequest } from 'next/server'
import { getAllDevelopers } from '@/lib/data/seed'
import { Faker, en, base } from '@faker-js/faker'

function validateConsent(request: NextRequest): boolean {
  const token = request.headers.get('x-consent-token')
  if (!token) return false
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))
    if (!payload.granted) return false
    // Token expires after 30 days
    const age = Date.now() - payload.issuedAt
    if (age > 30 * 24 * 60 * 60 * 1000) return false
    return true
  } catch {
    return false
  }
}

function generateInsights(employeeId: string, developerName: string) {
  // Seeded per-developer so insights are deterministic
  const faker = new Faker({ locale: [en, base] })
  faker.seed(parseInt(employeeId.replace(/\D/g, ''), 10) || 1)

  const prCount = faker.number.int({ min: 2, max: 18 })
  const reviewCount = faker.number.int({ min: 5, max: 40 })
  const commitCount = faker.number.int({ min: 10, max: 120 })
  const incidentCount = faker.number.int({ min: 0, max: 4 })
  const avgPrCycleHours = faker.number.int({ min: 4, max: 72 })
  const focusAreas = faker.helpers.arrayElements(
    ['frontend', 'backend', 'infra', 'testing', 'documentation', 'tooling', 'performance', 'security'],
    faker.number.int({ min: 2, max: 4 }),
  )
  const collaborators = Array.from({ length: faker.number.int({ min: 2, max: 6 }) }, () =>
    faker.person.firstName(),
  )

  const summaries = [
    `${developerName} has been highly active this quarter with ${commitCount} commits and ${prCount} pull requests merged. Their average PR cycle time of ${avgPrCycleHours}h is ${avgPrCycleHours < 24 ? 'well below' : 'around'} the team median. They've been focused primarily on ${focusAreas.slice(0, 2).join(' and ')}.`,
    `Over the past 30 days, ${developerName} contributed ${commitCount} commits across ${focusAreas.length} focus areas. They completed ${reviewCount} code reviews, making them one of the more active reviewers on the team. ${incidentCount > 0 ? `They were involved in resolving ${incidentCount} incident${incidentCount > 1 ? 's' : ''}.` : 'No incidents were attributed to their changes.'}`,
    `${developerName}'s recent work spans ${focusAreas.join(', ')}. With ${prCount} PRs and ${reviewCount} reviews in the last month, they maintain strong collaboration — frequently working with ${collaborators.slice(0, 3).join(', ')}.`,
  ]

  const summary = faker.helpers.arrayElement(summaries)

  const strengths = faker.helpers.arrayElements(
    [
      'Consistent commit cadence',
      'Strong code review participation',
      'Low PR cycle time',
      'Cross-team collaboration',
      'Documentation quality',
      'Incident response',
      'Test coverage',
      'Mentoring junior engineers',
    ],
    faker.number.int({ min: 2, max: 3 }),
  )

  const flags = incidentCount >= 3
    ? ['High incident involvement — may indicate on-call burden or flaky ownership area']
    : avgPrCycleHours > 48
      ? ['PR cycle time trending high — consider reviewing review queue depth']
      : []

  return {
    employeeId,
    generatedAt: new Date().toISOString(),
    summary,
    metrics: {
      commits: commitCount,
      pullRequests: prCount,
      codeReviews: reviewCount,
    },
    focusAreas,
    strengths,
    flags,
    confidence: faker.helpers.arrayElement(['HIGH', 'MEDIUM', 'LOW']),
    dataWindow: '30 days',
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  const { employeeId } = await params

  if (!validateConsent(request)) {
    return Response.json(
      { error: 'AI insights require explicit user consent. Please grant consent first.' },
      { status: 403 },
    )
  }

  const developers = getAllDevelopers()
  const developer = developers.find((d) => d.id === employeeId)

  if (!developer) {
    return Response.json({ error: 'Developer not found' }, { status: 404 })
  }

  // Simulate variable latency like a real LLM service
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 800))

  // Simulate occasional errors (5% of the time)
  if (Math.random() < 0.05) {
    return Response.json(
      { error: 'AI service temporarily unavailable. Please retry.' },
      { status: 503 },
    )
  }

  const insights = generateInsights(employeeId, developer.name)
  return Response.json(insights)
}
