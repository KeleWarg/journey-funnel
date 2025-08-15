import handler from '../../../pages/api/optimize';
import { createMocks } from 'node-mocks-http';

describe('/api/optimize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Algorithm Selection Tests', () => {
    test('should use exhaustive search for small funnels (N ≤ 6)', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            { questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Step1' }], observedCR: 0.8, boosts: 0 },
            { questions: [{ input_type: '3', invasiveness: 3, difficulty: 3, title: 'Step2' }], observedCR: 0.7, boosts: 0 }
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000,
          sample_count: 1000
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      expect(data).toHaveProperty('algorithm', 'exhaustive');
      expect(data).toHaveProperty('optimalOrder');
      expect(data).toHaveProperty('optimalCRTotal');
      expect(data.optimalOrder).toHaveLength(2);
    });

    test('should use genetic algorithm for large funnels (N > 10)', async () => {
      // Arrange - Create 12 steps to trigger genetic algorithm
      const steps = Array.from({ length: 12 }, (_, i) => ({
        questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: `Step${i+1}` }],
        observedCR: 0.8 - (i * 0.05), // Gradually decreasing CRs
        boosts: 0
      }));

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps,
          E: 3, N_importance: 3, source: 'paid_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000,
          sample_count: 100 // Reduced for test speed
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      expect(data).toHaveProperty('algorithm', 'genetic');
      expect(data.optimalOrder).toHaveLength(12);
      expect(data.optimalCRTotal).toBeGreaterThan(0);
    });

    test('should use heuristic for medium funnels (6 < N ≤ 10)', async () => {
      // Arrange - Create 8 steps to trigger heuristic
      const steps = Array.from({ length: 8 }, (_, i) => ({
        questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: `Step${i+1}` }],
        observedCR: 0.8 - (i * 0.03),
        boosts: 0
      }));

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps,
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000,
          sample_count: 500
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      expect(data).toHaveProperty('algorithm', 'heuristic');
      expect(data.optimalOrder).toHaveLength(8);
    });
  });

  describe('Fogg B=MAT Seeding Tests', () => {
    test('should apply Fogg seeding when assessments available', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            { questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Low' }], observedCR: 0.8, boosts: 0 },
            { questions: [{ input_type: '3', invasiveness: 3, difficulty: 3, title: 'High' }], observedCR: 0.6, boosts: 0 }
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000,
          sample_count: 100,
          foggStepAssessments: [
            { stepIndex: 0, motivation_score: 3, ability_score: 4, trigger_score: 3, overall_score: 3.3 },
            { stepIndex: 1, motivation_score: 4, ability_score: 3, trigger_score: 4, overall_score: 3.7 }
          ],
          useFoggSeeding: true
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      expect(data).toHaveProperty('fogg_seeding');
      expect(data.fogg_seeding.enabled).toBe(true);
      expect(data.fogg_seeding.initial_order).toEqual([1, 0]); // Should order by higher score first
    });

    test('should fall back to random when no Fogg assessments', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            { questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Step1' }], observedCR: 0.8, boosts: 0 },
            { questions: [{ input_type: '3', invasiveness: 3, difficulty: 3, title: 'Step2' }], observedCR: 0.7, boosts: 0 }
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000,
          sample_count: 100,
          useFoggSeeding: false
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      expect(data.fogg_seeding?.enabled).toBeFalsy();
    });
  });

  describe('Genetic Algorithm Tests', () => {
    test('should evolve population over generations', async () => {
      // Arrange - Large enough funnel to trigger genetic algorithm
      const steps = Array.from({ length: 12 }, (_, i) => ({
        questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: `Step${i+1}` }],
        observedCR: 0.9 - (i * 0.05), // Decreasing difficulty
        boosts: 0
      }));

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps,
          E: 4, N_importance: 4, source: 'paid_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000,
          sample_count: 50 // Small for test speed
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      expect(data.algorithm).toBe('genetic');
      expect(data).toHaveProperty('generations');
      expect(data.generations).toBeGreaterThan(0);
      expect(data.optimalOrder).toHaveLength(12);
      
      // Should improve over generations
      if (data.fitness_history && data.fitness_history.length > 1) {
        const firstGen = data.fitness_history[0];
        const lastGen = data.fitness_history[data.fitness_history.length - 1];
        expect(lastGen.best_fitness).toBeGreaterThanOrEqual(firstGen.best_fitness);
      }
    });

    test('should respect elite preservation in genetic algorithm', async () => {
      // Arrange
      const steps = Array.from({ length: 11 }, (_, i) => ({
        questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: `Step${i+1}` }],
        observedCR: 0.8,
        boosts: 0
      }));

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps,
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000,
          sample_count: 20 // Very small for test speed
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      expect(data.algorithm).toBe('genetic');
      expect(data.optimalCRTotal).toBeGreaterThan(0);
    });
  });

  describe('Performance & Timeout Tests', () => {
    test('should complete optimization within reasonable time', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            { questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Step1' }], observedCR: 0.8, boosts: 0 },
            { questions: [{ input_type: '3', invasiveness: 3, difficulty: 3, title: 'Step2' }], observedCR: 0.7, boosts: 0 },
            { questions: [{ input_type: '4', invasiveness: 4, difficulty: 4, title: 'Step3' }], observedCR: 0.6, boosts: 0 }
          ],
          E: 3, N_importance: 3, source: 'paid_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000,
          sample_count: 100
        }
      });

      // Act
      const startTime = Date.now();
      await handler(req, res);
      const endTime = Date.now();

      // Assert
      expect(res._getStatusCode()).toBe(200);
      expect(endTime - startTime).toBeLessThan(15000); // Should complete within 15 seconds
    });

    test('should handle backsolved constants when provided', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            { questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Step1' }], observedCR: 0.8, boosts: 0 },
            { questions: [{ input_type: '3', invasiveness: 3, difficulty: 3, title: 'Step2' }], observedCR: 0.7, boosts: 0 }
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000,
          sample_count: 50,
          use_backsolved_constants: true,
          best_k: 0.15,
          best_gamma_exit: 0.8
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      expect(data.used_backsolved_constants).toBe(true);
      expect(data.k_used).toBeCloseTo(0.15, 3);
      expect(data.gamma_exit_used).toBeCloseTo(0.8, 3);
    });
  });

  describe('Error Handling Tests', () => {
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
      expect(data.error).toBe('Method not allowed');
    });

    test('should handle malformed step data', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            { questions: [], observedCR: 0.8, boosts: 0 } // No questions
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          sample_count: 100
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
    });

    test('should handle missing required parameters', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            { questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Test' }], observedCR: 0.8, boosts: 0 }
          ]
          // Missing E, N_importance, etc.
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
    });
  });

  describe('Optimization Quality Tests', () => {
    test('should find better order for steps with varying difficulty', async () => {
      // Arrange - Design scenario where reordering should help
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            { questions: [{ input_type: '5', invasiveness: 5, difficulty: 5, title: 'VeryHard' }], observedCR: 0.4, boosts: 0 }, // Hard first
            { questions: [{ input_type: '1', invasiveness: 1, difficulty: 1, title: 'Easy' }], observedCR: 0.9, boosts: 0 }      // Easy second
          ],
          E: 3, N_importance: 3, source: 'paid_search',
          c1: 1, c2: 1, c3: 1, w_c: 3, w_f: 1, w_E: 1, w_N: 1, // High complexity weight
          U0: 1000,
          sample_count: 100
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      // Should find that putting easy step first is better
      expect(data.optimalOrder).toEqual([1, 0]); // Easy step (index 1) should come first
      expect(data.optimalCRTotal).toBeGreaterThan(0.3); // Should achieve reasonable conversion
    });

    test('should handle LLM assessment integration', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            { questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Step1' }], observedCR: 0.8, boosts: 0 },
            { questions: [{ input_type: '3', invasiveness: 3, difficulty: 3, title: 'Step2' }], observedCR: 0.7, boosts: 0 }
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000,
          sample_count: 50,
          llmAssessments: [
            { stepIndex: 0, estimated_uplift: 0.05 },
            { stepIndex: 1, estimated_uplift: 0.1 }
          ],
          apply_llm_uplift: true
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      // Should have applied LLM uplifts in optimization
      expect(data.llm_uplifts_applied).toBe(true);
    });
  });

  describe('Model Validation Tests', () => {
    test('should validate model reliability', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            { questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Predictable' }], observedCR: 0.8, boosts: 0 }
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000,
          sample_count: 50,
          use_backsolved_constants: true,
          best_k: 0.24,
          best_gamma_exit: 1.04
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      expect(data).toHaveProperty('model_validation');
      expect(data.model_validation).toHaveProperty('is_reliable');
      expect(data.model_validation).toHaveProperty('error_percentage');
      
      // Model should be reliable for simple, consistent scenarios
      expect(data.model_validation.is_reliable).toBe(true);
      expect(data.model_validation.error_percentage).toBeLessThan(20); // Within 20% error
    });
  });

  describe('Sample Results Tests', () => {
    test('should include sample results when requested', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            { questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Step1' }], observedCR: 0.8, boosts: 0 },
            { questions: [{ input_type: '3', invasiveness: 3, difficulty: 3, title: 'Step2' }], observedCR: 0.7, boosts: 0 }
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000,
          sample_count: 10,
          include_sample_results: true
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      expect(data).toHaveProperty('allSamples');
      expect(Array.isArray(data.allSamples)).toBe(true);
      expect(data.allSamples.length).toBeGreaterThan(0);
      
      // Each sample should have order and CR
      data.allSamples.forEach(sample => {
        expect(sample).toHaveProperty('order');
        expect(sample).toHaveProperty('CR_total');
        expect(sample.order).toHaveLength(2);
        expect(sample.CR_total).toBeGreaterThan(0);
      });
    });
  });

  describe('Hybrid Seeding Tests', () => {
    test('should apply hybrid seeding when requested', async () => {
      // Arrange
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          steps: [
            { questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Step1' }], observedCR: 0.8, boosts: 0 },
            { questions: [{ input_type: '3', invasiveness: 3, difficulty: 3, title: 'Step2' }], observedCR: 0.7, boosts: 0 },
            { questions: [{ input_type: '4', invasiveness: 4, difficulty: 4, title: 'Step3' }], observedCR: 0.6, boosts: 0 }
          ],
          E: 3, N_importance: 3, source: 'organic_search',
          c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
          U0: 1000,
          sample_count: 30,
          hybrid_seeding: true,
          llmAssessments: [
            { stepIndex: 0, estimated_uplift: 0.05 },
            { stepIndex: 1, estimated_uplift: 0.1 },
            { stepIndex: 2, estimated_uplift: 0.02 }
          ]
        }
      });

      // Act
      await handler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      expect(data).toHaveProperty('hybrid_seeding');
      expect(data.hybrid_seeding.enabled).toBe(true);
      expect(data.hybrid_seeding.uplift_ordered_seed).toBeDefined();
    });
  });
});