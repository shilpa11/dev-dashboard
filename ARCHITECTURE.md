# How the app works — step by step

---

## Step 1 — Browser hits localhost:3000

Next.js serves `src/app/layout.tsx` first. This is the shell that wraps every page.

```tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

`children` here is whatever page matches the URL.

---

## Step 2 — Providers sets up global infrastructure

`src/components/Providers.tsx` runs before any UI renders. It does two things:

**Creates the TanStack Query cache:**
```tsx
const [queryClient] = useState(() => new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 2 } }
}))
```
`useState` with a factory function means `new QueryClient()` runs exactly once. If it were outside `useState`, React would recreate the cache on every render and wipe all fetched data.

**Rehydrates the Zustand consent store:**
```tsx
useEffect(() => {
  useConsentStore.persist.rehydrate()
}, [])
```
The consent store has `skipHydration: true` so the server never touches `localStorage` (it doesn't exist server-side). After the browser loads, this manually pulls the saved consent token back from `localStorage`.

---

## Step 3 — page.tsx renders the layout

`src/app/page.tsx` is the actual page. It owns one piece of state:

```tsx
const [selectedId, setSelectedId] = useState<string | null>(null)
```

`null` means no developer is selected. A string like `"dev-001"` means the detail panel is open.

On mount it fires a telemetry event:
```tsx
useEffect(() => { telemetry.pageView('/') }, [])
```

The layout is:
- Header bar — always visible
- `DeveloperTable` on the left — always visible
- `DeveloperDetail` on the right — only when `selectedId !== null`

Both are wrapped in `ErrorBoundary` so a crash in one doesn't bring down the other.

---

## Step 4 — DeveloperTable manages all list state

`src/components/DeveloperTable.tsx` owns four pieces of state:

```tsx
const [searchInput, setSearchInput] = useState('')      // what's typed in the box
const [filters, setFilters] = useState({})              // dropdown selections
const [cursorStack, setCursorStack] = useState([null])  // pagination history
const [pageIndex, setPageIndex] = useState(0)           // which page we're on
```

**Debounce** — a GraphQL request on every keystroke would be too noisy, so:
```tsx
const debouncedSearch = useDebounce(searchInput, 300)
```
`searchInput` updates immediately so the input feels responsive. `debouncedSearch` only updates 300ms after you stop typing, and that's what actually triggers the query.

**Pagination** — the server doesn't understand "page 3". It understands "give me 20 items after cursor X". So we keep a cursor stack:
```
cursorStack = [null,      "abc123",  "xyz789"]
pageIndex   =  0    →      1    →      2
```
- `cursorStack[0]` is always `null` — the first page has no cursor
- Clicking Next stores the `endCursor` from the response into the next slot
- Clicking Prev just decrements `pageIndex` — the cursor is already stored

**Filter reset** — whenever search or filters change, pagination resets to page 1:
```tsx
useEffect(() => {
  if (JSON.stringify(prevFiltersRef.current) !== JSON.stringify(activeFilters)) {
    setCursorStack([null])
    setPageIndex(0)
  }
}, [activeFilters])
```

---

## Step 5 — useDevelopers fetches from GraphQL

`src/hooks/useDevelopers.ts` calls TanStack Query:

```tsx
return useQuery({
  queryKey: ['developers', filters, cursor, pageSize],
  queryFn: () => gqlRequest(DEVELOPERS_QUERY, { ... }),
  placeholderData: keepPreviousData,
})
```

**`queryKey`** is the cache key. Searching "Alice" produces the key `['developers', { search: 'Alice' }, null, 20]`. A different search = different key = different cached result. TanStack Query refetches automatically whenever the key changes.

**`keepPreviousData`** means while the next page is loading, the old rows stay visible instead of flashing blank. Much smoother.

---

## Step 6 — gqlRequest makes the HTTP call

`src/lib/graphql-client.ts`:

```tsx
const res = await fetch('/api/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables }),
})
```

GraphQL always uses `POST`. The body is always `{ query, variables }`. The response is always `{ data, errors }`. If there are errors, we throw. If there's no data, we throw. Otherwise we return `data`.

---

## Step 7 — GraphQL server handles the request

The request hits `src/app/api/graphql/route.ts` which boots `graphql-yoga`. Yoga reads the `query` from the body, matches it against the schema, and calls the right resolver.

**Schema** (`src/lib/graphql/schema.ts`) defines the shape — what queries exist, what fields each type has, what arguments are accepted.

**Resolver** (`src/lib/graphql/resolvers.ts`) is the actual logic:

```ts
developers: (_, args) => {
  const all = getAllDevelopers()               // all 60 from memory
  const filtered = filterDevelopers(all, args) // apply search/filters
  const startIndex = args.after
    ? decodeCursor(args.after) + 1
    : 0
  const slice = filtered.slice(startIndex, startIndex + limit)
  // return { edges, pageInfo, totalCount }
}
```

Cursors are just base64-encoded array indexes:
```ts
encodeCursor(5)           → "Y3Vyc29yOjU="   (btoa("cursor:5"))
decodeCursor("Y3Vyc29yOjU=") → 5
```

The data comes from `src/lib/data/seed.ts` — 60 developers generated with `faker.seed(42)` so the same people appear on every restart.

---

## Step 8 — User clicks "View"

```tsx
<button onClick={() => handleView(dev)}>View</button>
```

`handleView` calls `onSelectDeveloper(dev.id)` which is `setSelectedId` from `page.tsx`. `selectedId` changes from `null` to `"dev-001"`. React re-renders. The `DeveloperDetail` panel slides in from the right.

---

## Step 9 — DeveloperDetail fetches the full profile

`src/hooks/useDeveloper.ts` fires a separate `developer(id: "dev-001")` query. This fetches `hiredAt` too, which the table didn't need, so it's a separate query rather than reusing the table data.

The panel also resets the AI insights button whenever you switch developers:
```tsx
useEffect(() => { setShowInsights(false) }, [developerId])
```

---

## Step 10 — User clicks "View AI Insights"

`showInsights` flips to `true`. The `AIInsights` component mounts and reads the consent token from Zustand:

```tsx
const token = useConsentStore((s) => s.token)
```

- No token → consent prompt is shown
- Has token → `useAIInsights` fires immediately

---

## Step 11 — Consent flow

User clicks "Enable AI Insights":

```tsx
const res = await fetch('/api/ai/consent', {
  method: 'POST',
  body: JSON.stringify({ agreed: true }),
})
const { token } = await res.json()
grantConsent(token)  // saved in Zustand + persisted to localStorage
```

The server issues a base64-encoded token containing `{ granted: true, issuedAt: Date.now() }`. It also sets an httpOnly cookie as a backup. The token is stored in Zustand so it's available everywhere without prop drilling.

---

## Step 12 — useAIInsights fetches insights

`src/hooks/useAIInsights.ts`:

```tsx
const timeout = AbortSignal.timeout(8_000)
const combined = AbortSignal.any([signal, timeout])

const res = await fetch(`/api/ai/insights/${employeeId}`, {
  headers: { 'x-consent-token': token },
  signal: combined,
})
```

`AbortSignal.any` cancels the request if either the 8-second timeout fires or TanStack Query cancels it (user navigates away before it finishes).

The server validates the token, generates deterministic insights seeded by `employeeId` (same developer always gets the same summary), adds 600–1400ms of fake latency, and returns JSON. The component then renders the summary, metrics, strengths, and any flags.

---

## Verifying the APIs manually

You can test any endpoint directly from a second terminal while `npm run dev` is running.

**Telemetry**
```bash
curl -X POST http://localhost:3000/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{"event":"test","properties":{"hello":"world"}}'
```
- You get `{"ok":true}` back in this terminal
- In the `npm run dev` terminal you'll see `[telemetry] {"event":"test",...}` printed
- `curl -X POST` means send an HTTP POST request (telemetry only accepts POST, not GET)
- `-H` sets a request header — the server needs to know the body is JSON
- `-d` is the request body — the actual event data

**GraphQL**
```bash
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ developers(first: 3) { totalCount edges { node { id name } } } }"}'
```
- Returns the first 3 developers as JSON
- GraphQL always uses POST — the query is sent in the body, not the URL

**AI consent**
```bash
curl -X POST http://localhost:3000/api/ai/consent \
  -H "Content-Type: application/json" \
  -d '{"agreed": true}'
```
- Returns `{"token":"..."}` — copy that token for the next request

**AI insights** (paste the token from above)
```bash
curl http://localhost:3000/api/ai/insights/dev-001 \
  -H "x-consent-token: <paste-token-here>"
```
- Returns the full insights JSON for developer `dev-001`
- No `-X POST` needed here — `curl` defaults to GET when there's no body
- The `x-consent-token` header is how the server knows you've granted consent

---

## Full data flow

```
Browser
  └── layout.tsx            fonts + HTML shell
        └── Providers        QueryClient cache + Zustand rehydration
              └── page.tsx   owns selectedId
                    │
                    ├── DeveloperTable
                    │     ├── useDevelopers  →  gqlRequest  →  POST /api/graphql
                    │     │                                       └── resolver → seed data
                    │     └── useTeams       →  gqlRequest  →  POST /api/graphql
                    │
                    └── DeveloperDetail  (when selectedId is set)
                          ├── useDeveloper   →  gqlRequest  →  POST /api/graphql
                          └── AIInsights     (when showInsights is true)
                                ├── no token  →  ConsentPrompt  →  POST /api/ai/consent
                                └── has token →  useAIInsights  →  GET /api/ai/insights/:id
```
