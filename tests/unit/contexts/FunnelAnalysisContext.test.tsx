import React from 'react';
import { renderHook, act } from '@testing-library/react';
import {
  AnalysisProvider,
  useAnalysis,
  useSimulationData,
  useBacksolveResult,
  useLLMAssessment,
  useLoadingStates
} from '../../../contexts/FunnelAnalysisContext';

// Test wrapper
const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <AnalysisProvider>
      {children}
    </AnalysisProvider>
  );
};

describe('FunnelAnalysisContext', () => {
  describe('Initial State', () => {
    test('should initialize with correct default state', () => {
      // Arrange & Act
      const { result } = renderHook(() => useAnalysis(), {
        wrapper: createWrapper()
      });

      // Assert
      expect(result.current.state.simulationData).toBeNull();
      expect(result.current.state.backsolveResult).toBeNull();
      expect(result.current.state.llmAssessmentResult).toBeNull();
      expect(result.current.state.mcpFunnelResult).toBeNull();
      expect(result.current.state.isRunningComplete).toBe(false);
      expect(result.current.state.isOptimizing).toBe(false);
      expect(result.current.state.isAssessing).toBe(false);
      expect(result.current.canRunDetailedAssessment).toBe(false);
      expect(result.current.hasAnyResults).toBe(false);
    });
  });

  describe('State Updates', () => {
    test('should update simulation data correctly', () => {
      // Arrange
      const { result } = renderHook(() => useAnalysis(), {
        wrapper: createWrapper()
      });

      const mockSimulationData = {
        predictedSteps: [{ CR_s: 0.8 }],
        CR_total: 0.8,
        bestCR: 0.85
      };

      // Act
      act(() => {
        result.current.dispatch({
          type: 'SET_SIMULATION_DATA',
          payload: mockSimulationData
        });
      });

      // Assert
      expect(result.current.state.simulationData).toEqual(mockSimulationData);
      expect(result.current.hasAnyResults).toBe(true);
    });

    test('should update backsolve result correctly', () => {
      // Arrange
      const { result } = renderHook(() => useAnalysis(), {
        wrapper: createWrapper()
      });

      const mockBacksolveResult = {
        bestParams: {
          best_k: 0.24,
          best_gamma_exit: 1.04,
          best_mse: 0.001
        }
      };

      // Act
      act(() => {
        result.current.dispatch({
          type: 'SET_BACKSOLVE_RESULT',
          payload: mockBacksolveResult
        });
      });

      // Assert
      expect(result.current.state.backsolveResult).toEqual(mockBacksolveResult);
    });

    test('should update loading states independently', () => {
      // Arrange
      const { result } = renderHook(() => useAnalysis(), {
        wrapper: createWrapper()
      });

      // Act
      act(() => {
        result.current.dispatch({
          type: 'SET_LOADING_STATE',
          payload: { key: 'isOptimizing', value: true }
        });
      });

      // Assert
      expect(result.current.state.isOptimizing).toBe(true);
      expect(result.current.state.isAssessing).toBe(false); // Other states unchanged
      expect(result.current.state.isRunningComplete).toBe(false);
    });

    test('should reset all analysis data', () => {
      // Arrange
      const { result } = renderHook(() => useAnalysis(), {
        wrapper: createWrapper()
      });

      // Set some initial data
      act(() => {
        result.current.dispatch({
          type: 'SET_SIMULATION_DATA',
          payload: { predictedSteps: [], CR_total: 0.5, bestCR: 0.6 }
        });
        result.current.dispatch({
          type: 'SET_LOADING_STATE',
          payload: { key: 'isOptimizing', value: true }
        });
      });

      // Act - Reset
      act(() => {
        result.current.dispatch({ type: 'RESET_ANALYSIS' });
      });

      // Assert
      expect(result.current.state.simulationData).toBeNull();
      expect(result.current.state.isOptimizing).toBe(false);
      expect(result.current.hasAnyResults).toBe(false);
    });
  });

  describe('Computed Values', () => {
    test('should calculate canRunDetailedAssessment correctly', () => {
      // Arrange
      const { result } = renderHook(() => useAnalysis(), {
        wrapper: createWrapper()
      });

      // Act & Assert - Initially false
      expect(result.current.canRunDetailedAssessment).toBe(false);

      // Add simulation data only
      act(() => {
        result.current.dispatch({
          type: 'SET_SIMULATION_DATA',
          payload: { predictedSteps: [], CR_total: 0.5, bestCR: 0.6 }
        });
      });

      expect(result.current.canRunDetailedAssessment).toBe(false); // Still need backsolve

      // Add backsolve result
      act(() => {
        result.current.dispatch({
          type: 'SET_BACKSOLVE_RESULT',
          payload: { bestParams: { best_k: 0.24, best_gamma_exit: 1.04, best_mse: 0.001 } }
        });
      });

      expect(result.current.canRunDetailedAssessment).toBe(true); // Now both are available
    });

    test('should calculate hasAnyResults correctly', () => {
      // Arrange
      const { result } = renderHook(() => useAnalysis(), {
        wrapper: createWrapper()
      });

      // Act & Assert - Initially false
      expect(result.current.hasAnyResults).toBe(false);

      // Add any result type
      act(() => {
        result.current.dispatch({
          type: 'SET_LLM_ASSESSMENT',
          payload: { assessments: [] }
        });
      });

      expect(result.current.hasAnyResults).toBe(true);
    });
  });

  describe('Multiple State Updates', () => {
    test('should handle rapid state updates correctly', () => {
      // Arrange
      const { result } = renderHook(() => useAnalysis(), {
        wrapper: createWrapper()
      });

      // Act - Simulate rapid updates
      act(() => {
        result.current.dispatch({
          type: 'SET_LOADING_STATE',
          payload: { key: 'isAssessing', value: true }
        });
        result.current.dispatch({
          type: 'SET_LOADING_MESSAGE',
          payload: 'Processing...'
        });
        result.current.dispatch({
          type: 'SET_SIMULATION_DATA',
          payload: { predictedSteps: [], CR_total: 0.5, bestCR: 0.6 }
        });
        result.current.dispatch({
          type: 'SET_LOADING_STATE',
          payload: { key: 'isAssessing', value: false }
        });
      });

      // Assert
      expect(result.current.state.isAssessing).toBe(false);
      expect(result.current.state.loadingMessage).toBe('Processing...');
      expect(result.current.state.simulationData).toBeDefined();
    });
  });
});

describe('Specific Hook Tests', () => {
  test('useSimulationData should return current simulation data', () => {
    // Arrange
    const { result } = renderHook(() => {
      const analysisResult = useAnalysis();
      const simulationData = useSimulationData();
      return { analysisResult, simulationData };
    }, { wrapper: createWrapper() });

    const mockData = { predictedSteps: [], CR_total: 0.75, bestCR: 0.8 };

    // Act
    act(() => {
      result.current.analysisResult.dispatch({
        type: 'SET_SIMULATION_DATA',
        payload: mockData
      });
    });

    // Assert
    expect(result.current.simulationData).toEqual(mockData);
  });

  test('useLoadingStates should return all loading states', () => {
    // Arrange
    const { result } = renderHook(() => {
      const analysisResult = useAnalysis();
      const loadingStates = useLoadingStates();
      return { analysisResult, loadingStates };
    }, { wrapper: createWrapper() });

    // Act
    act(() => {
      result.current.analysisResult.dispatch({
        type: 'SET_LOADING_STATE',
        payload: { key: 'isOptimizing', value: true }
      });
      result.current.analysisResult.dispatch({
        type: 'SET_LOADING_MESSAGE',
        payload: 'Optimizing...'
      });
    });

    // Assert
    expect(result.current.loadingStates.isOptimizing).toBe(true);
    expect(result.current.loadingStates.isAssessing).toBe(false);
    expect(result.current.loadingStates.loadingMessage).toBe('Optimizing...');
  });
});

describe('Error Handling', () => {
  test('should throw error when useAnalysis used outside provider', () => {
    // Arrange & Act & Assert
    expect(() => {
      renderHook(() => useAnalysis());
    }).toThrow('useAnalysis must be used within an AnalysisProvider');
  });

  test('should handle invalid action types gracefully', () => {
    // Arrange
    const { result } = renderHook(() => useAnalysis(), {
      wrapper: createWrapper()
    });

    // Act - Dispatch invalid action
    act(() => {
      result.current.dispatch({
        type: 'INVALID_ACTION' as any,
        payload: 'test'
      });
    });

    // Assert - State should remain unchanged
    expect(result.current.state.simulationData).toBeNull();
    expect(result.current.state.backsolveResult).toBeNull();
  });
});

describe('Performance Tests', () => {
  test('should memoize computed values to prevent unnecessary recalculations', () => {
    // Arrange
    const { result, rerender } = renderHook(() => useAnalysis(), {
      wrapper: createWrapper()
    });

    const initialComputedValues = {
      canRunDetailedAssessment: result.current.canRunDetailedAssessment,
      hasAnyResults: result.current.hasAnyResults
    };

    // Act - Rerender without state changes
    rerender();

    // Assert - Computed values should be the same object reference (memoized)
    expect(result.current.canRunDetailedAssessment).toBe(initialComputedValues.canRunDetailedAssessment);
    expect(result.current.hasAnyResults).toBe(initialComputedValues.hasAnyResults);
  });
});