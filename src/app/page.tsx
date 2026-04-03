'use client'

import { useState, useEffect } from 'react'
import { DeveloperTable } from '@/components/DeveloperTable'
import { DeveloperDetail } from '@/components/DeveloperDetail'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { telemetry } from '@/lib/telemetry'

export default function HomePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    telemetry.pageView('/')
  }, [])

  return (
    <div className="flex flex-col h-screen">
      {/* Top nav */}
      <header className="bg-[var(--surface)] border-b border-[var(--border)] px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center">
          <span className="text-white text-xs font-bold">DI</span>
        </div>
        <h1 className="font-semibold text-[var(--text-primary)]">Dev Insights</h1>
        <span className="text-[var(--text-muted)] text-sm ml-1">/ Developers</span>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Table area */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Developers</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                View and manage your engineering team.
              </p>
            </div>
            <ErrorBoundary name="DeveloperTable">
              <DeveloperTable
                onSelectDeveloper={setSelectedId}
                selectedId={selectedId}
              />
            </ErrorBoundary>
          </div>
        </main>

        {/* Detail panel */}
        {selectedId && (
          <ErrorBoundary name="DeveloperDetail">
            <DeveloperDetail
              developerId={selectedId}
              onClose={() => setSelectedId(null)}
            />
          </ErrorBoundary>
        )}
      </div>
    </div>
  )
}
