'use client'

import { useQuery } from '@tanstack/react-query'
import { useConsentStore } from '@/store/consent'

export interface AIInsights {
  employeeId: string
  generatedAt: string
  summary: string
  metrics: {
    commits: number
    pullRequests: number
    codeReviews: number
  }
  focusAreas: string[]
  strengths: string[]
  flags: string[]
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  dataWindow: string
}

export function useAIInsights(employeeId: string | null) {
  const token = useConsentStore((s) => s.token)

  return useQuery({
    queryKey: ['ai-insights', employeeId],
    queryFn: async ({ signal }) => {
      // 8-second timeout — AI services can hang; don't make users wait forever.
      // We race TanStack Query's own cancellation signal against our timeout.
      const timeout = AbortSignal.timeout(8_000)
      const combined = AbortSignal.any([signal, timeout])

      let res: Response
      try {
        res = await fetch(`/api/ai/insights/${employeeId}`, {
          headers: token ? { 'x-consent-token': token } : {},
          signal: combined,
        })
      } catch (err) {
        if (err instanceof Error && err.name === 'TimeoutError') {
          throw Object.assign(new Error('AI service timed out. Please try again.'), { status: 504 })
        }
        throw err
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw Object.assign(new Error(body.error ?? 'Failed to fetch insights'), { status: res.status })
      }

      return res.json() as Promise<AIInsights>
    },
    enabled: !!employeeId && !!token,
    retry: (failureCount, error) => {
      const status = (error as { status?: number }).status
      // Don't retry consent errors, not-found, or timeouts (user should explicitly retry)
      if (status === 403 || status === 404 || status === 504) return false
      return failureCount < 2
    },
    staleTime: 5 * 60_000, // 5 min — insights don't change that often
  })
}
