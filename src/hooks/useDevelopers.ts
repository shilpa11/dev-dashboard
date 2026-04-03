'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { gqlRequest } from '@/lib/graphql-client'
import type { TrackingStatus, AccountType } from '@/lib/data/seed'

const DEVELOPERS_QUERY = `
  query Developers(
    $first: Int
    $after: String
    $search: String
    $team: String
    $trackingStatus: TrackingStatus
    $accountType: AccountType
  ) {
    developers(
      first: $first
      after: $after
      search: $search
      team: $team
      trackingStatus: $trackingStatus
      accountType: $accountType
    ) {
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        cursor
        node {
          id
          name
          email
          avatar
          title
          department
          trackingStatus
          teams {
            id
            name
          }
          accounts {
            type
            handle
            connected
          }
        }
      }
    }
  }
`

export interface DevelopersFilters {
  search?: string
  team?: string
  trackingStatus?: TrackingStatus
  accountType?: AccountType
}

export interface DeveloperSummary {
  id: string
  name: string
  email: string
  avatar: string
  title: string
  department: string
  trackingStatus: TrackingStatus
  teams: { id: string; name: string }[]
  accounts: { type: AccountType; handle: string; connected: boolean }[]
}

export interface DevelopersConnection {
  totalCount: number
  pageInfo: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    startCursor: string | null
    endCursor: string | null
  }
  edges: { cursor: string; node: DeveloperSummary }[]
}

export function useDevelopers(filters: DevelopersFilters, cursor: string | null, pageSize = 20) {
  return useQuery({
    queryKey: ['developers', filters, cursor, pageSize],
    queryFn: () =>
      gqlRequest<{ developers: DevelopersConnection }>(DEVELOPERS_QUERY, {
        first: pageSize,
        after: cursor ?? undefined,
        search: filters.search || undefined,
        team: filters.team || undefined,
        trackingStatus: filters.trackingStatus || undefined,
        accountType: filters.accountType || undefined,
      }),
    placeholderData: keepPreviousData,
  })
}
