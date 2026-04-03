'use client'

import { useQuery } from '@tanstack/react-query'
import { gqlRequest } from '@/lib/graphql-client'
import type { DeveloperSummary } from './useDevelopers'

const DEVELOPER_QUERY = `
  query Developer($id: ID!) {
    developer(id: $id) {
      id
      name
      email
      avatar
      title
      department
      hiredAt
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
`

export interface DeveloperDetail extends DeveloperSummary {
  hiredAt: string
}

export function useDeveloper(id: string | null) {
  return useQuery({
    queryKey: ['developer', id],
    queryFn: () =>
      gqlRequest<{ developer: DeveloperDetail | null }>(DEVELOPER_QUERY, { id }),
    enabled: !!id,
  })
}
