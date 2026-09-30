import { useState, useEffect } from 'react';

export function usePageState<T>(fetchFn: () => Promise<T>) {
  const [state, setState] = useState<{
    data: T | null;
    isLoading: boolean;
    error: Error | null;
  }>({
    data: null,
    isLoading: true,
    error: null,
  });

  const execute = async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const data = await fetchFn();
      setState({ data, isLoading: false, error: null });
    } catch (e) {
      setState({
        data: null,
        isLoading: false,
        error: e instanceof Error ? e : new Error('An unexpected error occurred')
      });
    }
  };

  useEffect(() => {
    execute();
  }, []);

  return { ...state, retry: execute };
}
