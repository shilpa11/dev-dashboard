import { getAllDevelopers, getAllTeams, type Developer } from '../data/seed'

const PAGE_SIZE_DEFAULT = 20
const PAGE_SIZE_MAX = 50

function encodeCursor(index: number): string {
  return Buffer.from(`cursor:${index}`).toString('base64')
}

function decodeCursor(cursor: string): number {
  const decoded = Buffer.from(cursor, 'base64').toString('utf-8')
  const match = decoded.match(/^cursor:(\d+)$/)
  if (!match) throw new Error('Invalid cursor')
  return parseInt(match[1], 10)
}

function filterDevelopers(
  developers: Developer[],
  filters: {
    search?: string | null
    team?: string | null
    trackingStatus?: string | null
    accountType?: string | null
  },
): Developer[] {
  return developers.filter((dev) => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!dev.name.toLowerCase().includes(q) && !dev.email.toLowerCase().includes(q)) {
        return false
      }
    }
    if (filters.team) {
      const teamMatch = dev.teams.some(
        (t) => t.id === filters.team || t.name.toLowerCase() === filters.team!.toLowerCase(),
      )
      if (!teamMatch) return false
    }
    if (filters.trackingStatus) {
      if (dev.trackingStatus !== filters.trackingStatus) return false
    }
    if (filters.accountType) {
      const hasAccount = dev.accounts.some(
        (a) => a.type === filters.accountType && a.connected,
      )
      if (!hasAccount) return false
    }
    return true
  })
}

export const resolvers = {
  Query: {
    developers: (
      _: unknown,
      args: {
        first?: number | null
        after?: string | null
        search?: string | null
        team?: string | null
        trackingStatus?: string | null
        accountType?: string | null
      },
    ) => {
      const all = getAllDevelopers()
      const filtered = filterDevelopers(all, {
        search: args.search,
        team: args.team,
        trackingStatus: args.trackingStatus,
        accountType: args.accountType,
      })

      const limit = Math.min(args.first ?? PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX)
      const startIndex = args.after ? decodeCursor(args.after) + 1 : 0

      const slice = filtered.slice(startIndex, startIndex + limit)
      const edges = slice.map((node, i) => ({
        node,
        cursor: encodeCursor(startIndex + i),
      }))

      return {
        edges,
        totalCount: filtered.length,
        pageInfo: {
          hasNextPage: startIndex + limit < filtered.length,
          hasPreviousPage: startIndex > 0,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
      }
    },

    developer: (_: unknown, args: { id: string }) => {
      const all = getAllDevelopers()
      return all.find((d) => d.id === args.id) ?? null
    },

    teams: () => getAllTeams(),
  },
}
