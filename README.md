# Dev Insights Dashboard

A developer management dashboard with AI-powered activity insights. Built to demonstrate production-grade React, Next.js, and GraphQL patterns.

## What it does

- Browse and search a team of developers
- Filter by team, tracking status, and connected accounts
- Cursor-based pagination
- Click any developer to open a detail panel
- Opt-in AI insights — generates a summary of recent activity (commits, PRs, code reviews) with an explicit consent flow

## Tech stack

- **Next.js 16** (App Router) — frontend + API routes in one project
- **React 19** with TypeScript
- **GraphQL** via `graphql-yoga` — schema, resolvers, and cursor pagination served from `/api/graphql`
- **TanStack Query v5** — server state, caching, background refetching
- **Zustand** — consent token stored globally, persisted to localStorage
- **Tailwind CSS v4**
- **Faker.js** — 60 seeded developers, deterministic on every restart

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No external services or environment variables required — everything runs self-contained.

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── graphql/          # graphql-yoga endpoint
│   │   ├── ai/
│   │   │   ├── consent/      # POST to grant, DELETE to revoke
│   │   │   └── insights/     # AI insights (requires consent token)
│   │   └── telemetry/        # Structured event sink
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── DeveloperTable.tsx
│   ├── DeveloperDetail.tsx
│   ├── AIInsights.tsx
│   ├── ErrorBoundary.tsx
│   └── Providers.tsx
├── hooks/
│   ├── useDevelopers.ts      # Paginated list query
│   ├── useDeveloper.ts       # Single developer query
│   ├── useAIInsights.ts      # AI insights with 8s timeout
│   └── useTeams.ts
├── lib/
│   ├── graphql/
│   │   ├── schema.ts         # GraphQL type definitions
│   │   └── resolvers.ts      # Query resolvers + cursor pagination
│   ├── data/seed.ts          # Faker-based mock data (seed 42)
│   ├── graphql-client.ts     # Fetch wrapper for GraphQL
│   ├── telemetry.ts          # Fire-and-forget event tracking
│   ├── feature-flags.ts      # NEXT_PUBLIC_AI_INSIGHTS_ENABLED
│   └── constants.ts          # Shared UI constants
└── store/
    └── consent.ts            # Zustand consent store
```

## Feature flag

To disable AI insights without redeploying:

```bash
NEXT_PUBLIC_AI_INSIGHTS_ENABLED=false
```

## Further reading

- [DECISIONS.md](./DECISIONS.md) — architecture choices and tradeoffs
- [RUNBOOK.md](./RUNBOOK.md) — how to triage issues with the AI insights feature
