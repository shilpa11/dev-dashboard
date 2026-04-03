# Decisions

## Architecture

I went with Next.js 16 (App Router) + React 19 because it lets me run the GraphQL API and the UI from the same project — no separate server to spin up. That simplicity comes at the cost of mixing concerns, but for a project this size it's the right call.

The GraphQL server runs via `graphql-yoga` inside a route handler at `/api/graphql`. I picked yoga because it speaks the native fetch API, which means it just works with App Router without any glue code. Schema and resolvers live in `src/lib/graphql/` separate from the route file so they're testable on their own.

I originally used `graphql-request` as the client-side GraphQL client, but it fell over at runtime because Next.js 16 uses Turbopack by default and the library has bundler compatibility issues. Switched to a small native `fetch` wrapper I wrote in `src/lib/graphql-client.ts` — it's about 20 lines and does exactly what I need.

For server state I used TanStack Query v5. Caching, retries, background refetching, loading/error states — all handled. The `queryKey` arrays act as cache keys, so revisiting a developer you already viewed doesn't trigger a new request.

The AI consent token lives in Zustand with `persist`. It needs to survive navigation and component unmounts, so component state wasn't an option. I had to set `skipHydration: true` because Zustand's persist middleware reads from localStorage, which doesn't exist on the server — without that flag React throws a hydration mismatch on first load.

Styling is Tailwind v4 with CSS custom properties for design tokens. Tailwind v4 dropped `tailwind.config.js` in favor of a CSS-first approach, which I actually prefer since the tokens live next to the styles.

---

## AI Development Workflow

I used Claude Code throughout. A few things I set up that helped:

I gave the assistant explicit instructions to read the Next.js docs from `node_modules/next/dist/docs/` before writing any Next.js code. This matters because Next.js 16 has breaking changes from older versions that fall outside the model's training data. Without that instruction it would confidently write code against the old APIs.

I used plan mode before starting the main implementation — it forced me to think through the architecture before touching any files, and I caught a few bad ideas early.

Where things needed correction: the `graphql-request` issue above was one. The AI generated code that compiled cleanly and failed silently at runtime. I tracked it down by testing the API with `curl`, ruling out the server, then narrowing it to the client — not something the AI caught on its own. The Zustand hydration issue was another; the fix was suggested but I had to understand why localStorage doesn't exist on the server to trust the suggestion.

For a longer project I'd write a proper architecture doc and conventions file upfront rather than letting the AI infer patterns from the code as it goes.

---

## Data and API

Mock data is generated with `@faker-js/faker` with a fixed seed of `42`, so the same 60 developers come back on every restart. This makes the app easy to demo without a database.

Cursor-based pagination was the fiddliest part. I keep a `cursorStack` array indexed by page number — `cursorStack[0]` is `null` (first page), `cursorStack[1]` is the `endCursor` from page 1, etc. Going backward is just decrementing the index rather than re-fetching.

The AI insights endpoint adds 600–1400ms of fake latency and throws errors on 5% of requests so I had something real to test loading and error states against.

---

## Privacy and Security

The consent flow is opt-in and explicit — nothing goes to the AI endpoint until the user clicks "Enable AI Insights." Every request requires a `x-consent-token` header; the server returns 403 without it. The client also stores the token in localStorage via Zustand persist, which I'm not totally happy about — an httpOnly cookie is harder to steal. I do also set an httpOnly cookie on the server side as a backup, but the client-side store is what drives the UI state.

The telemetry endpoint takes arbitrary JSON right now and just logs it. In production it would need input validation and rate limiting before forwarding to something like Segment.

---

## What's Missing

A real database would be the first thing I'd add — swap faker for a seed script and SQLite via Drizzle. The resolvers are already structured so the change would be isolated to the data layer.

Auth is the other big gap. The consent token isn't tied to any user identity, which doesn't make sense in a real app.

On the AI side I'd look at streaming responses — right now it waits for the full JSON blob. With a real LLM you'd want to stream tokens as they arrive using the Vercel AI SDK.

---

## Testing

I'd test three layers in CI:

The GraphQL resolvers are pure functions so unit tests are straightforward — Vitest, test filter combinations, empty results, cursor edge cases.

For the API routes I'd spin up Next.js in test mode and hit the actual endpoints over HTTP. This is where you catch the schema/resolver gaps that unit tests miss.

For components I'd focus on the consent flow and error states with React Testing Library, mocking `fetch` at the network boundary using `msw`. For the AI component specifically I'd test all the response shapes — missing fields, empty summary, very long text — but not the content itself since it's non-deterministic. What I care about is that the right UI state shows up for each status code.
