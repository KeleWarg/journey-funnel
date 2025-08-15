import useSWR from 'swr';
import { useCallback } from 'react';

// Generic fetcher function for SWR
const fetcher = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.');
    error.message = await response.text();
    throw error;
  }
  return response.json();
};

// Custom hook for API calls with deduplication and caching
export const useApiCall = <T>(
  key: string | null, 
  url: string, 
  payload?: any,
  options?: {
    revalidateOnFocus?: boolean;
    dedupingInterval?: number;
    errorRetryCount?: number;
  }
) => {
  const swrKey = key && payload ? [key, JSON.stringify(payload)] : null;
  
  const { data, error, mutate, isLoading } = useSWR(
    swrKey,
    () => fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }),
    {
      revalidateOnFocus: options?.revalidateOnFocus ?? false,
      dedupingInterval: options?.dedupingInterval ?? 60000, // 1 minute
      errorRetryCount: options?.errorRetryCount ?? 3,
      ...options
    }
  );

  const refresh = useCallback(() => mutate(), [mutate]);

  return {
    data,
    error,
    isLoading,
    refresh
  };
};

// Specific hooks for common API calls
export const useCalculation = (payload: any, shouldFetch: boolean = true) => {
  return useApiCall<any>(
    shouldFetch ? 'calculation' : null,
    '/api/calculate',
    payload,
    {
      dedupingInterval: 30000, // 30 seconds for calculations
    }
  );
};

export const useAssessment = (payload: any, shouldFetch: boolean = true) => {
  return useApiCall<any>(
    shouldFetch ? 'assessment' : null,
    '/api/assessQuestion',
    payload,
    {
      dedupingInterval: 300000, // 5 minutes for assessments (they change less frequently)
    }
  );
};

export const useBacksolve = (payload: any, shouldFetch: boolean = true) => {
  return useApiCall<any>(
    shouldFetch ? 'backsolve' : null,
    '/api/backsolve',
    payload,
    {
      dedupingInterval: 60000, // 1 minute for backsolve
    }
  );
};

export const useOptimization = (payload: any, shouldFetch: boolean = true) => {
  return useApiCall<any>(
    shouldFetch ? 'optimize' : null,
    '/api/optimize',
    payload,
    {
      dedupingInterval: 120000, // 2 minutes for optimization
    }
  );
};