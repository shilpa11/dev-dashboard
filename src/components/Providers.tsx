'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useConsentStore } from '@/store/consent'

function ConsentStoreHydrator() {
  useEffect(() => {
    // Rehydrate zustand persist store from localStorage after client mounts,
    // avoiding SSR/client mismatch from localStorage access on the server.
    useConsentStore.persist.rehydrate()
  }, [])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 2,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ConsentStoreHydrator />
      {children}
    </QueryClientProvider>
  )
}
