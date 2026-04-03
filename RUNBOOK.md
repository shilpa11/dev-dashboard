# Runbook: AI Insights

## Quick reference

| Symptom | Likely cause | Start here |
|---|---|---|
| Consent prompt stuck, never goes away | `/api/ai/consent` returning errors | Check server logs for 500s |
| Spinner runs forever | AI request hung, timeout not firing | Verify `AbortSignal.timeout` works in runtime |
| "Timed out" on every request | Upstream AI provider is down | Check provider status page |
| "Temporarily unavailable" on every request | 503 from `/api/ai/insights` | Check error rate on that route |
| Insights show, but for the wrong person | Cache key mismatch | Check `queryKey: ['ai-insights', employeeId]` |
| 403 even right after granting consent | Token expired or malformed | Inspect `x-consent-token` header in DevTools |

---

## Triage order

**1. Check the feature flag**

```bash
echo $NEXT_PUBLIC_AI_INSIGHTS_ENABLED
```

If it's `false` the AI section won't render at all — this is intentional. Stop here if that's the case.

---

**2. Hit the consent endpoint directly**

```bash
curl -X POST https://your-domain/api/ai/consent \
  -H "Content-Type: application/json" \
  -d '{"agreed": true}'
```

You should get back `{"token": "..."}`. A 400 means the request body is wrong; a 500 means something broke server-side. If this fails, no users can get a token and they'll all be stuck on the consent screen.

---

**3. Hit the insights endpoint directly**

```bash
curl https://your-domain/api/ai/insights/dev-001 \
  -H "x-consent-token: <token from step 2>"
```

- 200 with JSON → endpoint is healthy
- 403 → token is bad or expired
- 404 → that developer ID doesn't exist
- 503 → service is down
- 504 → our 8-second timeout fired before a response came back

---

**4. Look at telemetry**

These events are tracked — search your telemetry sink:

| Event | What it tells you |
|---|---|
| `ai_insights_error` | Failed fetch, has `errorCode` attached |
| `ai_consent_granted` | Token was successfully issued |
| `ai_consent_revoked` | User revoked, or a 403 auto-triggered it |
| `error_boundary_triggered` | Component crashed, not just an API error |

Lots of `ai_insights_error` with `errorCode: 504` → AI service is slow. `errorCode: 503` → it's down.

---

**5. Check a specific user's browser**

If the endpoints look healthy but one user is stuck, open their DevTools:

- Network tab → filter `/api/ai/insights` → is the `x-consent-token` header on the request?
- Application → Local Storage → is there an `ai-consent` key? If it's missing or has `null` for the token, their store didn't persist. Have them clear localStorage and re-consent.

---

**6. Timeout tuning**

The client times out after 8 seconds via `AbortSignal.timeout(8_000)` in `src/hooks/useAIInsights.ts`. If users keep hitting the timeout message but the service isn't actually down, check p95 latency on `/api/ai/insights`. If it's regularly above 6s, raise the timeout. If it's fine on average but spikes occasionally, that's a tail latency issue on the AI provider's side.

---

**7. Disabling the feature**

Set `NEXT_PUBLIC_AI_INSIGHTS_ENABLED=false` in your hosting platform and redeploy. The AI section disappears entirely for everyone.

Worth knowing: because it's a `NEXT_PUBLIC_` variable it gets baked into the client bundle at build time, so you do need a redeploy to flip it. If you need a true runtime toggle without deploys, replace it with a server-fetched flag or something like LaunchDarkly.
