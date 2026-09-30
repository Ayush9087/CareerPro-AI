import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Throws if the browser is offline and the request is a mutation.
 * Read-only GET requests may still succeed from the service worker cache.
 */
function guardOfflineMutation(method: string | undefined) {
  if (!navigator.onLine && method && method !== 'GET') {
    throw new Error(
      'You are offline. This action requires an internet connection and cannot be saved while offline.'
    );
  }
}

/**
 * Makes an authenticated API request to the FastAPI backend.
 * Automatically attaches the current Supabase session token.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Block mutations when offline — never pretend a mutation succeeded
  guardOfflineMutation(options.method);

  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

/**
 * Convenience wrappers.
 */
export const api = {
  get: <T>(endpoint: string) => apiClient<T>(endpoint),

  post: <T>(endpoint: string, body: unknown) =>
    apiClient<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body: unknown) =>
    apiClient<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body: unknown) =>
    apiClient<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string) =>
    apiClient<T>(endpoint, { method: 'DELETE' }),
};
