'use client'

import { useQuery } from '@tanstack/react-query'
import { gqlRequest } from '@/lib/graphql-client'

const TEAMS_QUERY = `
  query Teams {
    teams {
      id
      name
    }
  }
`

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: () => gqlRequest<{ teams: { id: string; name: string }[] }>(TEAMS_QUERY),
    staleTime: Infinity,
  })
}
