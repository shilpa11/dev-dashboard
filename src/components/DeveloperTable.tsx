'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useDevelopers, type DeveloperSummary, type DevelopersFilters } from '@/hooks/useDevelopers'
import { useTeams } from '@/hooks/useTeams'
import { telemetry } from '@/lib/telemetry'
import { STATUS_LABELS, STATUS_COLORS, ACCOUNT_LABELS, ACCOUNT_ICONS } from '@/lib/constants'
import type { AccountType } from '@/lib/data/seed'
import Image from 'next/image'

const PAGE_SIZE = 20

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

interface Props {
  onSelectDeveloper: (id: string) => void
  selectedId: string | null
}

export function DeveloperTable({ onSelectDeveloper, selectedId }: Props) {
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState<DevelopersFilters>({})
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null])
  const [pageIndex, setPageIndex] = useState(0)
  const prevFiltersRef = useRef(filters)

  const debouncedSearch = useDebounce(searchInput, 300)

  // Merge debounced search into filters and reset pagination
  const activeFilters: DevelopersFilters = { ...filters, search: debouncedSearch || undefined }

  // Reset to page 1 on filter change
  useEffect(() => {
    if (JSON.stringify(prevFiltersRef.current) !== JSON.stringify(activeFilters)) {
      prevFiltersRef.current = activeFilters
      setCursorStack([null])
      setPageIndex(0)
    }
  }, [activeFilters])

  const currentCursor = cursorStack[pageIndex]
  const { data, isLoading, isError, refetch } = useDevelopers(activeFilters, currentCursor, PAGE_SIZE)

  const connection = data?.developers
  const developers = connection?.edges.map((e) => e.node) ?? []
  const pageInfo = connection?.pageInfo
  const totalCount = connection?.totalCount ?? 0

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchInput(e.target.value)
    },
    [],
  )

  const handleFilterChange = useCallback(
    (key: keyof DevelopersFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value || undefined }))
      telemetry.filterChanged(key, value)
    },
    [],
  )

  const handleNext = useCallback(() => {
    if (!pageInfo?.endCursor) return
    setCursorStack((prev) => {
      const next = [...prev]
      next[pageIndex + 1] = pageInfo.endCursor!
      return next
    })
    setPageIndex((i) => i + 1)
  }, [pageInfo?.endCursor, pageIndex])

  const handlePrev = useCallback(() => {
    if (pageIndex === 0) return
    setPageIndex((i) => i - 1)
  }, [pageIndex])

  const handleView = useCallback(
    (dev: DeveloperSummary) => {
      onSelectDeveloper(dev.id)
      telemetry.developerViewed(dev.id)
    },
    [onSelectDeveloper],
  )

  // Track search telemetry
  useEffect(() => {
    if (debouncedSearch && totalCount !== undefined) {
      telemetry.search(debouncedSearch, totalCount)
    }
  }, [debouncedSearch, totalCount])

  const { data: teamsData } = useTeams()
  const teams = teamsData?.teams ?? []

  const startRow = pageIndex * PAGE_SIZE + 1
  const endRow = Math.min(startRow + developers.length - 1, totalCount)

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="search"
          placeholder="Search developers…"
          value={searchInput}
          onChange={handleSearchChange}
          className="border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm w-64 bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
        />

        <select
          value={filters.team ?? ''}
          onChange={(e) => handleFilterChange('team', e.target.value)}
          className="border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <option value="">All Teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <select
          value={filters.trackingStatus ?? ''}
          onChange={(e) => handleFilterChange('trackingStatus', e.target.value)}
          className="border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="PENDING">Pending</option>
        </select>

        <select
          value={filters.accountType ?? ''}
          onChange={(e) => handleFilterChange('accountType', e.target.value)}
          className="border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <option value="">All Accounts</option>
          <option value="GITHUB">GitHub</option>
          <option value="JIRA">Jira</option>
          <option value="PAGERDUTY">PagerDuty</option>
          <option value="CALENDAR">Calendar</option>
        </select>

        {totalCount > 0 && (
          <span className="ml-auto text-sm text-[var(--text-muted)]">
            {startRow}–{endRow} of {totalCount} developers
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-[var(--surface)] rounded-[var(--radius)] border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)] w-56">Name</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Status</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Teams</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Accounts</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
                        <div className="h-2.5 w-40 bg-gray-100 rounded animate-pulse" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-3 w-24 bg-gray-200 rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-5 w-24 bg-gray-200 rounded animate-pulse" /></td>
                  <td className="px-4 py-3" />
                </tr>
              ))
            )}

            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <p className="text-[var(--text-secondary)] mb-3">Failed to load developers.</p>
                  <button
                    onClick={() => refetch()}
                    className="text-sm text-[var(--accent)] hover:underline"
                  >
                    Try again
                  </button>
                </td>
              </tr>
            )}

            {!isLoading && !isError && developers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[var(--text-muted)]">
                  No developers match your filters.
                </td>
              </tr>
            )}

            {!isLoading && developers.map((dev) => (
              <tr
                key={dev.id}
                className={`border-b border-[var(--border)] last:border-0 hover:bg-gray-50 transition-colors ${selectedId === dev.id ? 'bg-[var(--accent-subtle)]' : ''}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Image
                      src={dev.avatar}
                      alt={dev.name}
                      width={32}
                      height={32}
                      className="rounded-full bg-gray-100 flex-shrink-0"
                      unoptimized
                    />
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">{dev.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">{dev.title}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[dev.trackingStatus]}`}>
                    {STATUS_LABELS[dev.trackingStatus]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {dev.teams.map((t) => (
                      <span key={t.id} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-[var(--text-secondary)]">
                        {t.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {dev.accounts.map((acc) => (
                      <span
                        key={acc.type}
                        title={`${ACCOUNT_LABELS[acc.type]}: ${acc.handle}${acc.connected ? '' : ' (disconnected)'}`}
                        className={`text-base ${acc.connected ? 'opacity-100' : 'opacity-30'}`}
                      >
                        {ACCOUNT_ICONS[acc.type]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleView(dev)}
                    className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] hover:underline"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={pageIndex === 0}
            className="px-4 py-2 text-sm border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] disabled:opacity-40 hover:bg-gray-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          <span className="text-sm text-[var(--text-muted)]">Page {pageIndex + 1}</span>
          <button
            onClick={handleNext}
            disabled={!pageInfo?.hasNextPage}
            className="px-4 py-2 text-sm border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] disabled:opacity-40 hover:bg-gray-50 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
