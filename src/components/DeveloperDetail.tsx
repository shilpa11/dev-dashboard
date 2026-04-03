'use client'

import { useState, useEffect } from 'react'
import { useDeveloper } from '@/hooks/useDeveloper'
import { AIInsights } from './AIInsights'
import { flags } from '@/lib/feature-flags'
import { STATUS_COLORS, ACCOUNT_LABELS, ACCOUNT_ICONS } from '@/lib/constants'
import type { TrackingStatus, AccountType } from '@/lib/data/seed'
import Image from 'next/image'

interface Props {
  developerId: string | null
  onClose: () => void
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gray-200" />
        <div className="space-y-2">
          <div className="h-4 w-36 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-3 bg-gray-100 rounded w-full" />
        ))}
      </div>
    </div>
  )
}

export function DeveloperDetail({ developerId, onClose }: Props) {
  const { data, isLoading, isError } = useDeveloper(developerId)
  const developer = data?.developer
  const [showInsights, setShowInsights] = useState(false)

  // Reset when switching to a different developer
  useEffect(() => {
    setShowInsights(false)
  }, [developerId])

  if (!developerId) return null

  return (
    <div className="w-96 flex-shrink-0 bg-[var(--surface)] border-l border-[var(--border)] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <h3 className="font-semibold text-[var(--text-primary)] text-sm">Developer Profile</h3>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && <Skeleton />}

        {isError && (
          <div className="p-6 text-sm text-[var(--text-secondary)]">
            Failed to load developer details.
          </div>
        )}

        {!isLoading && !isError && !developer && (
          <div className="p-6 text-sm text-[var(--text-muted)]">Developer not found.</div>
        )}

        {developer && (
          <div className="p-5 space-y-5">
            {/* Identity */}
            <div className="flex items-start gap-4">
              <Image
                src={developer.avatar}
                alt={developer.name}
                width={56}
                height={56}
                className="rounded-full bg-gray-100 flex-shrink-0"
                unoptimized
              />
              <div>
                <h4 className="font-semibold text-[var(--text-primary)]">{developer.name}</h4>
                <p className="text-sm text-[var(--text-secondary)]">{developer.title}</p>
                <p className="text-xs text-[var(--text-muted)]">{developer.email}</p>
              </div>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[var(--text-muted)] mb-0.5">Department</p>
                <p className="font-medium text-[var(--text-primary)]">{developer.department}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)] mb-0.5">Status</p>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[developer.trackingStatus]}`}>
                  {developer.trackingStatus}
                </span>
              </div>
              <div>
                <p className="text-[var(--text-muted)] mb-0.5">Hired</p>
                <p className="font-medium text-[var(--text-primary)]">
                  {new Date(developer.hiredAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)] mb-0.5">Teams</p>
                <div className="flex flex-wrap gap-1">
                  {developer.teams.map((t) => (
                    <span key={t.id} className="px-1.5 py-0.5 rounded bg-gray-100 text-[var(--text-secondary)]">
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Accounts */}
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-2">Connected Accounts</p>
              <div className="space-y-1.5">
                {developer.accounts.map((acc) => (
                  <div key={acc.type} className="flex items-center gap-2 text-xs">
                    <span className={acc.connected ? 'opacity-100' : 'opacity-30'}>
                      {ACCOUNT_ICONS[acc.type]}
                    </span>
                    <span className="font-medium text-[var(--text-secondary)] w-20">
                      {ACCOUNT_LABELS[acc.type]}
                    </span>
                    <span className={`flex-1 truncate ${acc.connected ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] line-through'}`}>
                      {acc.handle}
                    </span>
                    <span className={`text-xs ${acc.connected ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                      {acc.connected ? '●' : '○'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Insights */}
            {flags.aiInsights && (
              showInsights ? (
                <AIInsights employeeId={developer.id} />
              ) : (
                <button
                  onClick={() => setShowInsights(true)}
                  className="w-full py-2 px-4 text-sm font-medium text-[var(--accent)] border border-[var(--accent)] rounded-[var(--radius)] hover:bg-[var(--accent-subtle)] transition-colors"
                >
                  View AI Insights
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
