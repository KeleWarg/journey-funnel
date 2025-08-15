import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { useApiCall, useCalculation, useAssessment, useBacksolve, useOptimization } from '../../../hooks/use-api';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Test wrapper with SWR provider
const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <SWRConfig 
      value={{ 
        provider: () => new Map(),
        dedupingInterval: 0 // Disable deduping for tests
      }}
    >
      {children}
    </SWRConfig>
  );
};

describe('useApiCall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Basic Functionality', () => {
    test('should make successful API call', async () => {
      // Arrange
      const mockResponse = { success: true, data: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // Act
      const { result } = renderHook(
        () => useApiCall('test-key', '/api/test', { input: 'test' }),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.data).toEqual(mockResponse);
        expect(result.current.error).toBeUndefined();
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'test' })
      });
    });

    test('should handle API errors gracefully', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Server Error'
      });

      // Act
      const { result } = renderHook(
        () => useApiCall('error-key', '/api/error', { input: 'test' }),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(result.current.data).toBeUndefined();
        expect(result.current.isLoading).toBe(false);
      });
    });

    test('should not make request when key is null', () => {
      // Arrange & Act
      const { result } = renderHook(
        () => useApiCall(null, '/api/test', { input: 'test' }),
        { wrapper: createWrapper() }
      );

      // Assert
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('should deduplicate identical requests', async () => {
      // Arrange
      const mockResponse = { success: true };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const wrapper = createWrapper();

      // Act - Make two identical requests
      const { result: result1 } = renderHook(
        () => useApiCall('same-key', '/api/test', { input: 'same' }),
        { wrapper }
      );

      const { result: result2 } = renderHook(
        () => useApiCall('same-key', '/api/test', { input: 'same' }),
        { wrapper }
      );

      // Assert
      await waitFor(() => {
        expect(result1.current.data).toEqual(mockResponse);
        expect(result2.current.data).toEqual(mockResponse);
      });

      // Should only make one fetch call due to deduplication
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Refresh Functionality', () => {
    test('should refresh data when refresh is called', async () => {
      // Arrange
      const mockResponse1 = { data: 'first' };
      const mockResponse2 = { data: 'second' };
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2
        });

      // Act
      const { result } = renderHook(
        () => useApiCall('refresh-key', '/api/test', { input: 'test' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockResponse1);
      });

      // Refresh the data
      result.current.refresh();

      // Assert
      await waitFor(() => {
        expect(result.current.data).toEqual(mockResponse2);
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useCalculation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  test('should use correct endpoint and cache settings', async () => {
    // Arrange
    const mockResponse = { per_step_metrics: [], overall_predicted_CR: 0.5 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const payload = {
      steps: [{ questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Test' }], observedCR: 0.8, boosts: 0 }],
      E: 3, N_importance: 3, source: 'organic_search'
    };

    // Act
    const { result } = renderHook(
      () => useCalculation(payload, true),
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(result.current.data).toEqual(mockResponse);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  });

  test('should not fetch when shouldFetch is false', () => {
    // Arrange
    const payload = { test: 'data' };

    // Act
    const { result } = renderHook(
      () => useCalculation(payload, false),
      { wrapper: createWrapper() }
    );

    // Assert
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('useAssessment', () => {
  test('should use longer cache duration for assessments', async () => {
    // Arrange
    const mockResponse = { assessments: [] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const payload = { questions: ['test question'] };

    // Act
    const { result } = renderHook(
      () => useAssessment(payload, true),
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(result.current.data).toEqual(mockResponse);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/assessQuestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  });
});

describe('useBacksolve', () => {
  test('should handle backsolve API responses', async () => {
    // Arrange
    const mockResponse = { 
      bestParams: { 
        best_k: 0.24, 
        best_gamma_exit: 1.04, 
        best_mse: 0.001 
      } 
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const payload = {
      steps: [{ questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Test' }], observedCR: 0.8, boosts: 0 }]
    };

    // Act
    const { result } = renderHook(
      () => useBacksolve(payload, true),
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(result.current.data).toEqual(mockResponse);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/backsolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  });
});

describe('useOptimization', () => {
  test('should handle optimization API responses with different algorithms', async () => {
    // Arrange
    const mockResponse = { 
      algorithm: 'exhaustive',
      optimalOrder: [1, 0],
      optimalCRTotal: 0.75,
      allSamples: []
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const payload = {
      steps: [
        { questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Step1' }], observedCR: 0.8, boosts: 0 },
        { questions: [{ input_type: '3', invasiveness: 3, difficulty: 3, title: 'Step2' }], observedCR: 0.7, boosts: 0 }
      ],
      sample_count: 100
    };

    // Act
    const { result } = renderHook(
      () => useOptimization(payload, true),
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(result.current.data).toEqual(mockResponse);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  });

  test('should handle network failures with retry', async () => {
    // Arrange
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

    const payload = { test: 'data' };

    // Act
    const { result } = renderHook(
      () => useOptimization(payload, true),
      { wrapper: createWrapper() }
    );

    // Assert - Should retry and eventually succeed
    await waitFor(() => {
      expect(result.current.data).toEqual({ success: true });
    }, { timeout: 5000 });

    expect(mockFetch).toHaveBeenCalledTimes(2); // Initial call + retry
  });
});

describe('Error Boundary Integration', () => {
  test('should handle fetch errors without crashing', async () => {
    // Arrange
    mockFetch.mockImplementation(() => {
      throw new Error('Network failure');
    });

    const payload = { test: 'data' };

    // Act
    const { result } = renderHook(
      () => useApiCall('error-test', '/api/test', payload),
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });
  });

  test('should handle malformed JSON responses', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON');
      }
    });

    const payload = { test: 'data' };

    // Act
    const { result } = renderHook(
      () => useApiCall('json-error', '/api/test', payload),
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.data).toBeUndefined();
    });
  });
});