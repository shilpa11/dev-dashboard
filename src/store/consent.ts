'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ConsentState {
  token: string | null
  grantConsent: (token: string) => void
  revokeConsent: () => void
}

export const useConsentStore = create<ConsentState>()(
  persist(
    (set) => ({
      token: null,
      grantConsent: (token) => set({ token }),
      revokeConsent: () => set({ token: null }),
    }),
    {
      name: 'ai-consent',
      // Skip hydration from storage on the server to prevent SSR mismatch.
      // The store rehydrates from localStorage after the client mounts.
      skipHydration: true,
    },
  ),
)
