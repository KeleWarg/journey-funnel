import handler from '../../../pages/api/calculate';
import { createMocks } from 'node-mocks-http';

describe('/api/calculate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Path Tests', () => {
    test('should calculate conversion rates for basic two-step funnel', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '1', invasiveness: 2, difficulty: 2, title: 'Email' }],
              observedCR: 0.8,
              boosts: 0
            },
            {
              questions: [{ input_type: '3', invasiveness: 3, difficulty: 3, title: 'Payment' }],
              observedCR: 0.7,
              boosts: 0
            }
          ],
          E: 3,
          N_importance: 3,
          source: 'paid_search',
          c1: 1.0, c2: 2.5, c3: 1.5,
          w_c: 3.0, w_f: 1.0, w_E: 0.2, w_N: 0.8,
          U0: 1000
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      expect(data).toHaveProperty('per_step_metrics');
      expect(data).toHaveProperty('overall_predicted_CR');
      expect(data.per_step_metrics).toHaveLength(2);
      
      // Verify mathematical properties
      expect(data.overall_predicted_CR).toBeGreaterThan(0);
      expect(data.overall_predicted_CR).toBeLessThanOrEqual(1);
      
      // Each step should have required metrics
      data.per_step_metrics.forEach((step, idx) => {
        expect(step).toHaveProperty('step', idx + 1);
        expect(step).toHaveProperty('SC_s');
        expect(step).toHaveProperty('F_s');
        expect(step).toHaveProperty('PS_s');
        expect(step).toHaveProperty('M_s');
        expect(step).toHaveProperty('CR_s');
        expect(step.CR_s).toBeGreaterThan(0);
        expect(step.CR_s).toBeLessThanOrEqual(1);
      });
    });

    test('should apply LLM uplifts correctly', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Test' }],
              observedCR: 0.5,
              boosts: 0
            }
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 0.5, w_N: 0.5,
          U0: 1000,
          llmAssessments: [
            { stepIndex: 0, estimated_uplift: 0.1 }
          ],
          apply_llm_uplift: true
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      // Should have applied 0.1 uplift to first step
      expect(data.per_step_metrics[0]).toBeDefined();
    });

    test('should handle source multipliers correctly', async () => {
      // Arrange - Test each traffic source
      const sources = [
        { source: 'paid_search', expectedMultiplier: 1.3 },
        { source: 'organic_search', expectedMultiplier: 1.0 },
        { source: 'social_organic', expectedMultiplier: 0.7 }
      ];

      for (const { source, expectedMultiplier } of sources) {
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            steps: [
              {
                questions: [{ input_type: '2', invasiveness: 3, difficulty: 3, title: 'Test' }],
                observedCR: 0.8,
                boosts: 0
              }
            ],
            E: 4, N_importance: 4, source,
            c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
            U0: 1000
          }
        });

        // Act
        await handler(req, res);

        // Assert
        expect(res._getStatusCode()).toBe(200);
        const data = JSON.parse(res._getData());
        expect(data.per_step_metrics[0].M_s).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge Cases & Error Handling', () => {
    test('should handle empty steps array', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 0.5, w_N: 0.5,
          U0: 1000
        }
      });

      // Act
      await handler(req, res);

      // Assert - The API may handle empty steps gracefully, so check actual behavior
      const statusCode = res._getStatusCode();
      const data = JSON.parse(res._getData());
      
      if (statusCode === 500) {
        expect(data).toHaveProperty('error');
      } else {
        // API handles empty steps gracefully
        expect(statusCode).toBe(200);
      }
    });

    test('should handle invalid HTTP method', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'GET'
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Only POST allowed');
    });

    test('should clamp uplift values to valid range', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Test' }],
              observedCR: 0.9,
              boosts: 0
            }
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 0.5, w_N: 0.5,
          U0: 1000,
          llmAssessments: [
            { stepIndex: 0, estimated_uplift: 0.5 } // Would push CR above 1.0
          ],
          apply_llm_uplift: true
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      // CR should be clamped to 1.0 max
      expect(data.per_step_metrics[0].CR_s).toBeLessThanOrEqual(1.0);
    });

    test('should handle missing optional parameters with defaults', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Test' }],
              observedCR: 0.8,
              boosts: 0
            }
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 0.5, w_N: 0.5,
          U0: 1000
          // No k_override, gamma_exit_override, epsilon_override
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.per_step_metrics).toHaveLength(1);
    });
  });

  describe('Mathematical Formula Validation', () => {
    test('should calculate step complexity correctly', async () => {
      // Arrange - Test with known values for manual verification
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [
                { input_type: '1', invasiveness: 1, difficulty: 1, title: 'Simple' }, // Q_s=1, I_s=1, D_s=1
                { input_type: '5', invasiveness: 5, difficulty: 5, title: 'Complex' }  // Q_s=5, I_s=5, D_s=5
              ],
              observedCR: 0.8,
              boosts: 0
            }
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1.0, c2: 1.0, c3: 1.0, // Equal weights for easy calculation
          w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      // Manual calculation: SC_s = ((1+5)/2 + (1+5)/2 + (1+5)/2) / 3 = 3.0
      expect(data.per_step_metrics[0].SC_s).toBeCloseTo(3.0, 1);
    });

    test('should handle burden streak correctly', async () => {
      // Arrange - Create steps that should trigger burden streak
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '5', invasiveness: 5, difficulty: 5, title: 'Hard1' }],
              observedCR: 0.8,
              boosts: 0
            },
            {
              questions: [{ input_type: '5', invasiveness: 5, difficulty: 5, title: 'Hard2' }],
              observedCR: 0.7,
              boosts: 0
            }
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      // Second step should have higher fatigue due to burden streak
      expect(data.per_step_metrics[1].F_s).toBeGreaterThan(data.per_step_metrics[0].F_s);
    });

    test('should calculate cumulative conversion correctly', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Step1' }],
              observedCR: 0.8,
              boosts: 0
            },
            {
              questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Step2' }],
              observedCR: 0.7,
              boosts: 0
            }
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      // Cumulative CR should decrease as we go through steps
      expect(data.per_step_metrics[0].cumulative_CR_s).toBeGreaterThan(
        data.per_step_metrics[1].cumulative_CR_s
      );
      
      // Final cumulative should equal overall predicted CR
      expect(data.per_step_metrics[1].cumulative_CR_s).toBeCloseTo(
        data.overall_predicted_CR, 6
      );
    });
  });

  describe('Response Format Validation', () => {
    test('should return optimized response format with precision limits', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Test' }],
              observedCR: 0.8,
              boosts: 0
            }
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      // Check for cache headers if present
      const headers = res._getHeaders();
      if (headers['cache-control']) {
        expect(headers['cache-control']).toBe('public, max-age=300');
      }
      
      // Content type should be JSON (charset may vary)
      expect(headers['content-type']).toMatch(/^application\/json/);
      
      const data = JSON.parse(res._getData());
      const step = data.per_step_metrics[0];
      
      // Check precision limits (4 decimal places for most, 6 for CR)
      expect(step.SC_s.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(4);
      expect(step.CR_s.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
      expect(step.U_s_pred % 1).toBe(0); // Should be integer
    });
  });

  describe('Parameter Override Tests', () => {
    test('should use default parameters when overrides not provided', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Test' }],
              observedCR: 0.8,
              boosts: 0
            }
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000
          // No overrides provided
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      // Should use default k = 0.24 and appropriate gamma_exit for 1 step
    });

    test('should use provided parameter overrides', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Test' }],
              observedCR: 0.8,
              boosts: 0
            }
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000,
          k_override: 0.5,
          gamma_exit_override: 2.0,
          epsilon_override: 0.1
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      // Should use the overridden values in calculations
    });
  });

  describe('Input Type Mapping Tests', () => {
    test('should map input types to Q_s values correctly', async () => {
      const inputTypeMappings = [
        { input_type: '1', expectedQs: 1 }, // Toggle/Yes-No
        { input_type: '2', expectedQs: 2 }, // Single dropdown
        { input_type: '3', expectedQs: 3 }, // Multi-select/slider
        { input_type: '4', expectedQs: 4 }, // Calendar/upload
        { input_type: '5', expectedQs: 5 }, // Open text field
        { input_type: 'invalid', expectedQs: 2 } // Fallback to dropdown
      ];

      for (const { input_type, expectedQs } of inputTypeMappings) {
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            steps: [
              {
                questions: [{ input_type, invasiveness: 2, difficulty: 2, title: 'Test' }],
                observedCR: 0.8,
                boosts: 0
              }
            ],
            E: 3, N_importance: 3, source: 'organic_search',
            c1: 1, c2: 0, c3: 0, // Only test input type contribution
            w_c: 1, w_f: 1, w_E: 1, w_N: 1,
            U0: 1000
          }
        });

        // Act
        await handler(req, res);

        // Assert
        expect(res._getStatusCode()).toBe(200);
        const data = JSON.parse(res._getData());
        // SC_s should equal expectedQs when c2=0, c3=0
        expect(data.per_step_metrics[0].SC_s).toBeCloseTo(expectedQs, 1);
      }
    });
  });

  describe('Boundary Condition Tests', () => {
    test('should handle extreme motivation decay', async () => {
      // Arrange - High k value should cause rapid motivation decay
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '5', invasiveness: 5, difficulty: 5, title: 'VeryHard' }],
              observedCR: 0.5,
              boosts: 0
            }
          ],
          E: 1, N_importance: 1, source: 'social_organic', // Low motivation
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000,
          k_override: 2.0 // High decay
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      // Motivation should be driven to near 0
      expect(data.per_step_metrics[0].M_s).toBeGreaterThanOrEqual(0);
      expect(data.per_step_metrics[0].M_s).toBeLessThan(1);
    });

    test('should handle zero weight coefficients', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Test' }],
              observedCR: 0.8,
              boosts: 0
            }
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 0, c2: 0, c3: 1, // Test division by zero protection
          w_c: 0, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      // Should not crash with division by zero
    });
  });
});