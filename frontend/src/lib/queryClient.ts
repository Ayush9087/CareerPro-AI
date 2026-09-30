import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * 5 minutes stale time — prevents duplicate requests when
       * components mount/unmount rapidly (e.g. tab switches).
       */
      staleTime: 5 * 60 * 1000,

      /**
       * 30 minutes garbage-collection time — keeps cached data
       * available longer for instant back-nav.
       */
      gcTime: 30 * 60 * 1000,

      /**
       * Retry once on failure (not for 401/403).
       */
      retry: (failureCount, error) => {
        if (error instanceof Error) {
          const msg = error.message;
          if (msg.includes('401') || msg.includes('403') || msg.includes('Not authenticated')) {
            return false;
          }
        }
        return failureCount < 1;
      },

      /**
       * Don't refetch on window focus — reduce noise for users
       * switching between IDE and browser.
       */
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
