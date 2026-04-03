/**
 * Feature flags — driven by environment variables so they can be toggled
 * without a redeploy (set via hosting platform env vars or .env.local).
 */
export const flags = {
  aiInsights: process.env.NEXT_PUBLIC_AI_INSIGHTS_ENABLED !== 'false',
} as const
