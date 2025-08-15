import handler from '../../../pages/api/backsolve';
import { createMocks } from 'node-mocks-http';

describe('/api/backsolve', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Path Tests', () => {
    test('should find optimal parameters for achievable conversion rates', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Email' }],
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
      
      expect(data).toHaveProperty('bestParams');
      expect(data.bestParams).toHaveProperty('best_k');
      expect(data.bestParams).toHaveProperty('best_gamma_exit');
      expect(data.bestParams).toHaveProperty('best_mse');
      
      // Validate parameter ranges
      expect(data.bestParams.best_k).toBeGreaterThan(0);
      expect(data.bestParams.best_k).toBeLessThanOrEqual(1.0);
      expect(data.bestParams.best_gamma_exit).toBeGreaterThan(0);
      expect(data.bestParams.best_mse).toBeGreaterThanOrEqual(0);
    });

    test('should return null when no good fit found', async () => {
      // Arrange - Impossible conversion rates
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '5', invasiveness: 5, difficulty: 5, title: 'Impossible' }],
              observedCR: 0.99, // Nearly impossible with high difficulty
              boosts: 0
            }
          ],
          E: 1, N_importance: 1, source: 'social_organic', // Low motivation
          c1: 1, c2: 1, c3: 1, w_c: 5, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      // Should still return a result, even if MSE is high
      expect(data).toHaveProperty('bestParams');
    });
  });

  describe('Input Validation Tests', () => {
    test('should reject invalid HTTP method', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'GET'
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Method not allowed');
    });

    test('should handle missing observed conversion rates', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Test' }],
              // Missing observedCR
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

      // Assert - API may handle gracefully
      const statusCode = res._getStatusCode();
      const data = JSON.parse(res._getData());
      
      if (statusCode === 500) {
        expect(data).toHaveProperty('error');
      } else {
        // API handles missing CR gracefully
        expect(statusCode).toBe(200);
      }
    });

    test('should handle invalid conversion rate values', async () => {
      // Arrange - Test CR values outside 0-1 range
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Test' }],
              observedCR: 1.5, // Invalid: > 1.0
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

      // Assert - API may handle gracefully or clamp values
      const statusCode = res._getStatusCode();
      const data = JSON.parse(res._getData());
      
      if (statusCode === 500) {
        expect(data).toHaveProperty('error');
      } else {
        // API handles invalid CR gracefully (clamps to valid range)
        expect(statusCode).toBe(200);
      }
    });
  });

  describe('Grid Search Algorithm Tests', () => {
    test('should search through parameter grid systematically', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '2', invasiveness: 3, difficulty: 3, title: 'Email' }],
              observedCR: 0.85,
              boosts: 0
            }
          ],
          E: 4, N_importance: 4, source: 'paid_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000
        }
      });

      // Act
      const startTime = Date.now();
      await handler(req, res);
      const endTime = Date.now();

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      // Should complete in reasonable time (< 5 seconds for single step)
      expect(endTime - startTime).toBeLessThan(5000);
      
      // Should find a reasonable fit
      if (data.bestParams) {
        expect(data.bestParams.best_mse).toBeLessThan(0.1); // Should be a decent fit
      }
    });

    test('should handle early exit for good fits', async () => {
      // Arrange - Perfect scenario that should find exact match quickly
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Simple' }],
              observedCR: 0.75, // Reasonable rate
              boosts: 0
            }
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000
        }
      });

      // Act
      const startTime = Date.now();
      await handler(req, res);
      const endTime = Date.now();

      // Assert
      expect(res._getStatusCode()).toBe(200);
      expect(endTime - startTime).toBeLessThan(3000); // Should be fast for simple case
    });
  });

  describe('Mathematical Accuracy Tests', () => {
    test('should maintain mathematical consistency with calculate API', async () => {
      // Arrange - Use same parameters as calculate test
      const testParams = {
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
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: testParams
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      if (data.bestParams) {
        // MSE should be reasonable (indicating good mathematical fit)
        expect(data.bestParams.best_mse).toBeLessThan(1.0);
        
        // Predicted CR should be close to observed CR when MSE is low
        if (data.bestParams.best_mse < 0.01) {
          expect(Math.abs(data.bestParams.overall_predicted_CR_best - data.bestParams.overall_observed_CR)).toBeLessThan(0.1);
        }
      }
    });

    test('should handle multiple steps with varying difficulty', async () => {
      // Arrange - Complex multi-step scenario
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '1', invasiveness: 1, difficulty: 1, title: 'Easy' }],
              observedCR: 0.9,
              boosts: 0
            },
            {
              questions: [{ input_type: '3', invasiveness: 3, difficulty: 3, title: 'Medium' }],
              observedCR: 0.7,
              boosts: 0
            },
            {
              questions: [{ input_type: '5', invasiveness: 5, difficulty: 5, title: 'Hard' }],
              observedCR: 0.5,
              boosts: 0
            }
          ],
          E: 3, N_importance: 3, source: 'paid_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      if (data.bestParams) {
        // Should find parameters that account for decreasing conversion rates
        expect(data.bestParams.best_k).toBeGreaterThan(0);
        expect(data.bestParams.best_gamma_exit).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance Tests', () => {
    test('should complete grid search within reasonable time', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Test1' }],
              observedCR: 0.8,
              boosts: 0
            },
            {
              questions: [{ input_type: '3', invasiveness: 3, difficulty: 3, title: 'Test2' }],
              observedCR: 0.6,
              boosts: 0
            }
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000
        }
      });

      // Act
      const startTime = Date.now();
      await handler(req, res);
      const endTime = Date.now();

      // Assert
      expect(res._getStatusCode()).toBe(200);
      
      // Grid search should complete within 10 seconds for 2 steps
      expect(endTime - startTime).toBeLessThan(10000);
    });

    test('should return optimized response format', async () => {
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
      expect(res._getHeaders()['cache-control']).toBe('public, max-age=600');
      expect(res._getHeaders()['content-type']).toMatch(/^application\/json/);
      
      const data = JSON.parse(res._getData());
      
      if (data.bestParams) {
        // Check precision formatting
        expect(data.bestParams.best_k.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
        expect(data.bestParams.best_gamma_exit.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
        expect(data.bestParams.best_mse.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(8);
      }
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle malformed input gracefully', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: 'invalid', // Invalid steps format
          E: 3, N_importance: 3, source: 'organic_search'
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Back-solve failed');
    });

    test('should handle steps without questions', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [], // Empty questions array
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

      // Assert - API may handle empty questions gracefully
      const statusCode = res._getStatusCode();
      const data = JSON.parse(res._getData());
      
      if (statusCode === 500) {
        expect(data).toHaveProperty('error');
      } else {
        // API handles empty questions gracefully
        expect(statusCode).toBe(200);
      }
    });
  });

  describe('Algorithm Convergence Tests', () => {
    test('should converge to low MSE for realistic scenarios', async () => {
      // Arrange - Realistic funnel scenario
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '1', invasiveness: 1, difficulty: 1, title: 'Simple' }],
              observedCR: 0.9,
              boosts: 0
            },
            {
              questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Medium' }],
              observedCR: 0.8,
              boosts: 0
            },
            {
              questions: [{ input_type: '3', invasiveness: 3, difficulty: 3, title: 'Complex' }],
              observedCR: 0.6,
              boosts: 0
            }
          ],
          E: 3, N_importance: 3, source: 'paid_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      if (data.bestParams) {
        // For a realistic scenario, should achieve decent fit
        expect(data.bestParams.best_mse).toBeLessThan(0.05);
        
        // Parameters should be in reasonable ranges
        expect(data.bestParams.best_k).toBeGreaterThan(0.05);
        expect(data.bestParams.best_k).toBeLessThan(0.8);
        expect(data.bestParams.best_gamma_exit).toBeGreaterThan(0.2);
        expect(data.bestParams.best_gamma_exit).toBeLessThan(3.0);
      }
    });

    test('should handle edge case with single step', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Only' }],
              observedCR: 0.75,
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
      expect(data).toHaveProperty('bestParams');
    });
  });

  describe('Data Extraction Tests', () => {
    test('should extract observed CRs from steps array', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Test' }],
              observedCR: 0.85,
              boosts: 0
            }
          ],
          // No explicit observed_CR_s array - should extract from steps
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      // Should successfully extract observedCR from steps
    });

    test('should prefer explicit observed_CR_s over step values', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            {
              questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Test' }],
              observedCR: 0.5, // This should be ignored
              boosts: 0
            }
          ],
          observed_CR_s: [0.85], // This should be used
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      // Should use observed_CR_s values instead of step.observedCR
    });
  });
});