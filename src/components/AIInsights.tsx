'use client'

import { useState } from 'react'
import { useAIInsights } from '@/hooks/useAIInsights'
import { useConsentStore } from '@/store/consent'
import { telemetry } from '@/lib/telemetry'

const CONFIDENCE_COLORS = {
  HIGH: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-gray-100 text-gray-600',
}

interface Props {
  employeeId: string
}

function ConsentPrompt() {
  const grantConsent = useConsentStore((s) => s.grantConsent)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConsent() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreed: true }),
      })
      if (!res.ok) throw new Error('Failed to obtain consent token')
      const { token } = await res.json()
      grantConsent(token)
      telemetry.aiConsentGranted()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] p-5 bg-[var(--accent-subtle)]">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🤖</span>
        <div className="flex-1">
          <h4 className="font-semibold text-[var(--text-primary)] mb-1">AI Activity Insights</h4>
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            Generate an AI summary of this developer&apos;s recent activity — commits, PRs, code reviews, and incidents over the past 30 days.
          </p>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            By enabling this feature, you acknowledge that developer activity data will be processed to generate insights. You can revoke access at any time.
          </p>
          {error && <p className="text-xs text-[var(--danger)] mb-3">{error}</p>}
          <button
            onClick={handleConsent}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium bg-[var(--accent)] text-white rounded-[var(--radius)] hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors"
          >
            {loading ? 'Enabling…' : 'Enable AI Insights'}
          </button>
        </div>
      </div>
    </div>
  )
}

function InsightsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-full" />
      <div className="h-3 bg-gray-200 rounded w-5/6" />
      <div className="h-3 bg-gray-200 rounded w-4/6" />
      <div className="grid grid-cols-3 gap-3 mt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-[var(--radius)]" />
        ))}
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-[var(--radius)] p-3 text-center border border-[var(--border)]">
      <div className="text-xl font-bold text-[var(--text-primary)]">{value}</div>
      <div className="text-xs text-[var(--text-muted)] mt-0.5">{label}</div>
    </div>
  )
}

export function AIInsights({ employeeId }: Props) {
  const token = useConsentStore((s) => s.token)
  const revokeConsent = useConsentStore((s) => s.revokeConsent)
  const { data, isLoading, isError, error, refetch } = useAIInsights(employeeId)

  async function handleRevoke() {
    await fetch('/api/ai/consent', { method: 'DELETE' })
    revokeConsent()
    telemetry.aiConsentRevoked()
  }

  if (!token) {
    return <ConsentPrompt />
  }

  if (isLoading) {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--border)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-[var(--text-primary)]">AI Activity Insights</h4>
          <span className="text-xs text-[var(--text-muted)] animate-pulse">Generating…</span>
        </div>
        <InsightsSkeleton />
      </div>
    )
  }

  if (isError) {
    const status = (error as { status?: number }).status
    return (
      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--danger-subtle)] p-5">
        <h4 className="font-semibold text-[var(--text-primary)] mb-1">AI Activity Insights</h4>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          {status === 504
            ? 'AI service took too long to respond. Please try again.'
            : status === 503
            ? 'AI service is temporarily unavailable. Please try again in a moment.'
            : 'Failed to load insights.'}
        </p>
        <button
          onClick={() => refetch()}
          className="text-sm text-[var(--accent)] hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  // Track view once data loads
  telemetry.aiInsightsViewed(employeeId, data.confidence)

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-[var(--text-primary)]">AI Activity Insights</h4>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONFIDENCE_COLORS[data.confidence]}`}>
            {data.confidence} confidence
          </span>
          <span className="text-xs text-[var(--text-muted)]">{data.dataWindow}</span>
        </div>
      </div>

      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{data.summary}</p>

      <div className="grid grid-cols-3 gap-2">
        <MetricCard label="Commits" value={data.metrics.commits} />
        <MetricCard label="Pull Requests" value={data.metrics.pullRequests} />
        <MetricCard label="Code Reviews" value={data.metrics.codeReviews} />
      </div>

      {data.focusAreas.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-1.5">Focus Areas</p>
          <div className="flex flex-wrap gap-1.5">
            {data.focusAreas.map((area) => (
              <span key={area} className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-medium">
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.strengths.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-1.5">Strengths</p>
          <ul className="space-y-1">
            {data.strengths.map((s) => (
              <li key={s} className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                <span className="text-[var(--success)]">✓</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.flags.length > 0 && (
        <div className="rounded-[var(--radius)] bg-yellow-50 border border-yellow-200 p-3">
          <p className="text-xs font-medium text-yellow-800 mb-1">Flags</p>
          {data.flags.map((f) => (
            <p key={f} className="text-xs text-yellow-700">⚠ {f}</p>
          ))}
        </div>
      )}

      <div className="pt-2 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--text-muted)]">
          Generated {new Date(data.generatedAt).toLocaleString()} ·{' '}
          <button onClick={handleRevoke} className="text-[var(--danger)] hover:underline">
            Revoke AI access
          </button>
        </p>
      </div>
    </div>
  )
}
