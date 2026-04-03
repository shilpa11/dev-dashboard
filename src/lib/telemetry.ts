interface EventProperties {
  [key: string]: string | number | boolean | null | undefined
}

async function track(event: string, properties: EventProperties = {}): Promise<void> {
  try {
    await fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, properties, timestamp: new Date().toISOString() }),
    })
  } catch {
    // Telemetry must never throw or affect UX
  }
}

export const telemetry = {
  pageView: (page: string) => track('page_view', { page }),
  search: (query: string, resultCount: number) => track('search', { query, resultCount }),
  filterChanged: (filterName: string, value: string) => track('filter_changed', { filterName, value }),
  developerViewed: (developerId: string) => track('developer_viewed', { developerId }),
  aiConsentGranted: () => track('ai_consent_granted'),
  aiConsentRevoked: () => track('ai_consent_revoked'),
  aiInsightsViewed: (developerId: string, confidence: string) =>
    track('ai_insights_viewed', { developerId, confidence }),
  aiInsightsError: (developerId: string, errorCode: number) =>
    track('ai_insights_error', { developerId, errorCode }),
  errorBoundaryTriggered: (componentName: string, error: string) =>
    track('error_boundary_triggered', { componentName, error }),
}
