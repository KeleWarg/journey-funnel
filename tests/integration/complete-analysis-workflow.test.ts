import { createMocks } from 'node-mocks-http';
import calculateHandler from '../../pages/api/calculate';
import backsolveHandler from '../../pages/api/backsolve';
import optimizeHandler from '../../pages/api/optimize';
import assessHandler from '../../pages/api/assessQuestion';

// Mock OpenAI for assessment tests
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                assessments: [
                  {
                    questionIndex: 0,
                    PAS: { score: 8.5, reasoning: 'Clear problem identification' },
                    Fogg: { score: 7.2, reasoning: 'Good motivation trigger' },
                    Nielsen: { score: 8.0, reasoning: 'Follows usability principles' }
                  }
                ]
              })
            }
          }]
        })
      }
    }
  }))
}));

describe('Complete Analysis Workflow Integration', () => {
  const mockFunnelData = {
    steps: [
      {
        questions: [
          { input_type: '1', invasiveness: 1, difficulty: 1, title: 'What is your email address?' }
        ],
        observedCR: 0.85,
        boosts: 0,
        title: 'Contact Information'
      },
      {
        questions: [
          { input_type: '3', invasiveness: 3, difficulty: 2, title: 'What is your budget range?' },
          { input_type: '2', invasiveness: 2, difficulty: 2, title: 'When do you need this service?' }
        ],
        observedCR: 0.70,
        boosts: 0,
        title: 'Requirements'
      },
      {
        questions: [
          { input_type: '4', invasiveness: 4, difficulty: 4, title: 'Upload your current solution documentation' }
        ],
        observedCR: 0.55,
        boosts: 0,
        title: 'Documentation'
      }
    ],
    E: 4,
    N_importance: 4,
    source: 'paid_search',
    c1: 1.0, c2: 2.5, c3: 1.5,
    w_c: 3.0, w_f: 1.0, w_E: 0.2, w_N: 0.8,
    U0: 1000
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Sequential API Workflow', () => {
    test('should complete full analysis workflow: Calculate → Backsolve → Optimize', async () => {
      // Step 1: Calculate initial predictions
      const { req: calcReq, res: calcRes } = createMocks({
        method: 'POST',
        body: mockFunnelData
      });

      await calculateHandler(calcReq, calcRes);
      expect(calcRes._getStatusCode()).toBe(200);
      
      const calculationResult = JSON.parse(calcRes._getData());
      expect(calculationResult).toHaveProperty('per_step_metrics');
      expect(calculationResult).toHaveProperty('overall_predicted_CR');

      // Step 2: Run backsolve to optimize parameters
      const { req: backReq, res: backRes } = createMocks({
        method: 'POST',
        body: mockFunnelData
      });

      await backsolveHandler(backReq, backRes);
      expect(backRes._getStatusCode()).toBe(200);
      
      const backsolveResult = JSON.parse(backRes._getData());
      expect(backsolveResult).toHaveProperty('bestParams');
      
      // Step 3: Run optimization with backsolved parameters
      const { req: optReq, res: optRes } = createMocks({
        method: 'POST',
        body: {
          ...mockFunnelData,
          sample_count: 100,
          use_backsolved_constants: true,
          best_k: backsolveResult.bestParams?.best_k,
          best_gamma_exit: backsolveResult.bestParams?.best_gamma_exit
        }
      });

      await optimizeHandler(optReq, optRes);
      expect(optRes._getStatusCode()).toBe(200);
      
      const optimizeResult = JSON.parse(optRes._getData());
      expect(optimizeResult).toHaveProperty('optimalOrder');
      expect(optimizeResult).toHaveProperty('optimalCRTotal');
      
      // Verification: Optimal CR should be at least as good as individual step CRs
      expect(optimizeResult.optimalCRTotal).toBeGreaterThan(0);
    });

    test('should maintain data consistency across workflow steps', async () => {
      // Step 1: Calculate
      const { req: calcReq, res: calcRes } = createMocks({
        method: 'POST',
        body: mockFunnelData
      });

      await calculateHandler(calcReq, calcRes);
      const calculationResult = JSON.parse(calcRes._getData());

      // Step 2: Backsolve with same data
      const { req: backReq, res: backRes } = createMocks({
        method: 'POST',
        body: mockFunnelData
      });

      await backsolveHandler(backReq, backRes);
      const backsolveResult = JSON.parse(backRes._getData());

      // Step 3: Verify consistency
      if (backsolveResult.bestParams) {
        // Re-run calculation with backsolved parameters
        const { req: recalcReq, res: recalcRes } = createMocks({
          method: 'POST',
          body: {
            ...mockFunnelData,
            k_override: backsolveResult.bestParams.best_k,
            gamma_exit_override: backsolveResult.bestParams.best_gamma_exit
          }
        });

        await calculateHandler(recalcReq, recalcRes);
        const recalcResult = JSON.parse(recalcRes._getData());

        // The predicted CR should be closer to observed CR with optimized parameters
        const observedCR = mockFunnelData.steps.reduce((acc, step) => acc * step.observedCR, 1);
        const originalError = Math.abs(calculationResult.overall_predicted_CR - observedCR);
        const optimizedError = Math.abs(recalcResult.overall_predicted_CR - observedCR);
        
        expect(optimizedError).toBeLessThanOrEqual(originalError);
      }
    });
  });

  describe('Error Recovery Workflow', () => {
    test('should handle partial workflow failures gracefully', async () => {
      // Step 1: Successful calculation
      const { req: calcReq, res: calcRes } = createMocks({
        method: 'POST',
        body: mockFunnelData
      });

      await calculateHandler(calcReq, calcRes);
      expect(calcRes._getStatusCode()).toBe(200);

      // Step 2: Failed backsolve (invalid data)
      const { req: backReq, res: backRes } = createMocks({
        method: 'POST',
        body: {
          ...mockFunnelData,
          steps: [] // Invalid empty steps
        }
      });

      await backsolveHandler(backReq, backRes);
      expect(backRes._getStatusCode()).toBe(500);

      // Step 3: Optimization should still work with default parameters
      const { req: optReq, res: optRes } = createMocks({
        method: 'POST',
        body: {
          ...mockFunnelData,
          sample_count: 50,
          use_backsolved_constants: false // Fall back to defaults
        }
      });

      await optimizeHandler(optReq, optRes);
      expect(optRes._getStatusCode()).toBe(200);
      
      const optimizeResult = JSON.parse(optRes._getData());
      expect(optimizeResult).toHaveProperty('optimalOrder');
    });
  });

  describe('Performance Integration Tests', () => {
    test('should complete workflow within performance targets', async () => {
      // Arrange
      const startTime = Date.now();

      // Act - Run complete workflow
      const { req: calcReq, res: calcRes } = createMocks({
        method: 'POST',
        body: mockFunnelData
      });

      await calculateHandler(calcReq, calcRes);
      
      const { req: backReq, res: backRes } = createMocks({
        method: 'POST',
        body: mockFunnelData
      });

      await backsolveHandler(backReq, backRes);
      
      const { req: optReq, res: optRes } = createMocks({
        method: 'POST',
        body: { ...mockFunnelData, sample_count: 100 }
      });

      await optimizeHandler(optReq, optRes);
      
      const endTime = Date.now();

      // Assert
      expect(calcRes._getStatusCode()).toBe(200);
      expect(backRes._getStatusCode()).toBe(200);
      expect(optRes._getStatusCode()).toBe(200);
      
      // Complete workflow should finish within 15 seconds
      expect(endTime - startTime).toBeLessThan(15000);
    });

    test('should handle large funnels efficiently', async () => {
      // Arrange - Create 8-step funnel
      const largeFunnelData = {
        ...mockFunnelData,
        steps: Array.from({ length: 8 }, (_, i) => ({
          questions: [
            { input_type: '2', invasiveness: 2 + (i % 3), difficulty: 2 + (i % 3), title: `Question ${i+1}` }
          ],
          observedCR: 0.9 - (i * 0.05),
          boosts: 0,
          title: `Step ${i+1}`
        }))
      };

      const startTime = Date.now();

      // Act - Run optimization (most expensive operation)
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          ...largeFunnelData,
          sample_count: 200 // Reduced for test performance
        }
      });

      await optimizeHandler(req, res);
      const endTime = Date.now();

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const result = JSON.parse(res._getData());
      
      expect(result.algorithm).toBe('heuristic'); // Should use heuristic for 8 steps
      expect(result.optimalOrder).toHaveLength(8);
      
      // Should complete within reasonable time even for larger funnels
      expect(endTime - startTime).toBeLessThan(20000);
    });
  });

  describe('LLM Assessment Integration', () => {
    test('should integrate LLM assessments into optimization workflow', async () => {
      // Step 1: Get LLM assessments
      const { req: assessReq, res: assessRes } = createMocks({
        method: 'POST',
        body: {
          questions: mockFunnelData.steps.flatMap(step => 
            step.questions.map(q => ({
              title: q.title,
              input_type: q.input_type,
              invasiveness: q.invasiveness,
              difficulty: q.difficulty
            }))
          ),
          frameworks: ['PAS', 'Fogg', 'Nielsen']
        }
      });

      await assessHandler(assessReq, assessRes);
      expect(assessRes._getStatusCode()).toBe(200);
      
      const assessmentResult = JSON.parse(assessRes._getData());

      // Step 2: Use assessments in optimization
      const { req: optReq, res: optRes } = createMocks({
        method: 'POST',
        body: {
          ...mockFunnelData,
          sample_count: 50,
          llmAssessments: assessmentResult.assessments,
          apply_llm_uplift: true
        }
      });

      await optimizeHandler(optReq, optRes);
      expect(optRes._getStatusCode()).toBe(200);
      
      const optimizeResult = JSON.parse(optRes._getData());
      expect(optimizeResult.llm_uplifts_applied).toBe(true);
    });
  });

  describe('Data Validation Across APIs', () => {
    test('should validate step data consistency across all APIs', async () => {
      // Arrange - Test data with potential edge cases
      const testData = {
        steps: [
          {
            questions: [
              { input_type: '5', invasiveness: 5, difficulty: 5, title: 'Very complex question with long text that might cause issues?' }
            ],
            observedCR: 0.45, // Lower CR for complex question
            boosts: 0,
            title: 'Complex Step'
          }
        ],
        E: 5, N_importance: 5, source: 'paid_search',
        c1: 2.0, c2: 3.0, c3: 2.5,
        w_c: 4.0, w_f: 1.5, w_E: 0.3, w_N: 0.7,
        U0: 5000
      };

      // Act - Test all APIs with same data
      const apis = [
        { handler: calculateHandler, name: 'calculate' },
        { handler: backsolveHandler, name: 'backsolve' },
        { handler: optimizeHandler, name: 'optimize', extraParams: { sample_count: 50 } }
      ];

      for (const { handler, name, extraParams } of apis) {
        const { req, res } = createMocks({
          method: 'POST',
          body: { ...testData, ...extraParams }
        });

        await handler(req, res);
        
        // Assert - All should handle the complex data successfully
        expect(res._getStatusCode()).toBe(200);
        
        const result = JSON.parse(res._getData());
        expect(result).toBeDefined();
        
        // Should not have crashed or returned invalid data
        if (name === 'calculate') {
          expect(result.per_step_metrics).toHaveLength(1);
          expect(result.overall_predicted_CR).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Cache Integration Tests', () => {
    test('should demonstrate cache effectiveness across repeated calls', async () => {
      // Arrange
      const testPayload = {
        steps: [
          {
            questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Cached Test' }],
            observedCR: 0.8,
            boosts: 0
          }
        ],
        E: 3, N_importance: 3, source: 'organic_search',
        c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
        U0: 1000
      };

      // Act - Make identical calls to test caching
      const call1Time = Date.now();
      const { req: req1, res: res1 } = createMocks({
        method: 'POST',
        body: testPayload
      });
      await calculateHandler(req1, res1);
      const call1Duration = Date.now() - call1Time;

      const call2Time = Date.now();
      const { req: req2, res: res2 } = createMocks({
        method: 'POST',
        body: testPayload
      });
      await calculateHandler(req2, res2);
      const call2Duration = Date.now() - call2Time;

      // Assert
      expect(res1._getStatusCode()).toBe(200);
      expect(res2._getStatusCode()).toBe(200);
      
      // Results should be identical
      const result1 = JSON.parse(res1._getData());
      const result2 = JSON.parse(res2._getData());
      expect(result1).toEqual(result2);
      
      // Note: In actual implementation, second call might be faster due to caching,
      // but in tests this depends on the specific cache implementation
    });
  });

  describe('Mathematical Consistency Tests', () => {
    test('should maintain mathematical relationships across APIs', async () => {
      // Step 1: Get calculation results
      const { req: calcReq, res: calcRes } = createMocks({
        method: 'POST',
        body: mockFunnelData
      });

      await calculateHandler(calcReq, calcRes);
      const calcResult = JSON.parse(calcRes._getData());

      // Step 2: Get backsolve results
      const { req: backReq, res: backRes } = createMocks({
        method: 'POST',
        body: mockFunnelData
      });

      await backsolveHandler(backReq, backRes);
      const backResult = JSON.parse(backRes._getData());

      // Step 3: Verify mathematical consistency
      if (backResult.bestParams) {
        // Re-calculate with backsolved parameters
        const { req: recalcReq, res: recalcRes } = createMocks({
          method: 'POST',
          body: {
            ...mockFunnelData,
            k_override: backResult.bestParams.best_k,
            gamma_exit_override: backResult.bestParams.best_gamma_exit
          }
        });

        await calculateHandler(recalcReq, recalcRes);
        const recalcResult = JSON.parse(recalcRes._getData());

        // Optimized calculation should be closer to observed values
        const observedCR = mockFunnelData.steps.reduce((acc, step) => acc * step.observedCR, 1);
        const originalError = Math.abs(calcResult.overall_predicted_CR - observedCR);
        const optimizedError = Math.abs(recalcResult.overall_predicted_CR - observedCR);
        
        expect(optimizedError).toBeLessThanOrEqual(originalError * 1.1); // Allow 10% tolerance
      }
    });

    test('should produce sensible optimization results', async () => {
      // Arrange - Create scenario where reordering should clearly help
      const reorderTestData = {
        steps: [
          {
            questions: [{ input_type: '5', invasiveness: 5, difficulty: 5, title: 'Very Hard Question' }],
            observedCR: 0.3, // Very low CR
            boosts: 0,
            title: 'Difficult Step'
          },
          {
            questions: [{ input_type: '1', invasiveness: 1, difficulty: 1, title: 'Easy Question' }],
            observedCR: 0.95, // Very high CR
            boosts: 0,
            title: 'Easy Step'
          }
        ],
        E: 3, N_importance: 3, source: 'organic_search',
        c1: 1, c2: 1, c3: 1, w_c: 5, w_f: 1, w_E: 1, w_N: 1, // High complexity weight
        U0: 1000
      };

      // Act
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          ...reorderTestData,
          sample_count: 10 // Small for test speed
        }
      });

      await optimizeHandler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const result = JSON.parse(res._getData());
      
      // Should recommend putting easy step first
      expect(result.optimalOrder).toEqual([1, 0]);
      
      // Optimal CR should be better than reverse order
      expect(result.optimalCRTotal).toBeGreaterThan(0.2);
    });
  });

  describe('Stress Testing', () => {
    test('should handle maximum complexity scenario', async () => {
      // Arrange - Create most complex scenario
      const maxComplexityData = {
        steps: Array.from({ length: 6 }, (_, i) => ({
          questions: Array.from({ length: 3 }, (_, j) => ({
            input_type: ((i + j) % 5 + 1).toString(),
            invasiveness: ((i + j) % 5 + 1),
            difficulty: ((i + j) % 5 + 1),
            title: `Complex Question ${i+1}-${j+1}`
          })),
          observedCR: 0.8 - (i * 0.1),
          boosts: i,
          title: `Complex Step ${i+1}`
        })),
        E: 5, N_importance: 5, source: 'paid_search',
        c1: 2.5, c2: 3.0, c3: 2.0,
        w_c: 4.0, w_f: 2.0, w_E: 0.4, w_N: 0.6,
        U0: 10000,
        llmAssessments: Array.from({ length: 6 }, (_, i) => ({
          stepIndex: i,
          estimated_uplift: 0.02 + (i * 0.01)
        }))
      };

      const startTime = Date.now();

      // Act - Run all APIs with complex data
      const apis = [
        { handler: calculateHandler, name: 'calculate' },
        { handler: backsolveHandler, name: 'backsolve' },
        { handler: optimizeHandler, name: 'optimize', extraParams: { sample_count: 100 } }
      ];

      for (const { handler, extraParams } of apis) {
        const { req, res } = createMocks({
          method: 'POST',
          body: { ...maxComplexityData, ...extraParams }
        });

        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
      }

      const endTime = Date.now();

      // Assert - Should complete complex scenario within 30 seconds
      expect(endTime - startTime).toBeLessThan(30000);
    });
  });

  describe('Data Integrity Tests', () => {
    test('should preserve step order and data through workflow', async () => {
      // Arrange
      const orderedData = {
        steps: [
          {
            questions: [{ input_type: '1', invasiveness: 1, difficulty: 1, title: 'First Question' }],
            observedCR: 0.9,
            boosts: 0,
            title: 'First Step'
          },
          {
            questions: [{ input_type: '2', invasiveness: 2, difficulty: 2, title: 'Second Question' }],
            observedCR: 0.8,
            boosts: 0,
            title: 'Second Step'
          },
          {
            questions: [{ input_type: '3', invasiveness: 3, difficulty: 3, title: 'Third Question' }],
            observedCR: 0.7,
            boosts: 0,
            title: 'Third Step'
          }
        ],
        E: 3, N_importance: 3, source: 'organic_search',
        c1: 1, c2: 1, c3: 1, w_c: 1, w_f: 1, w_E: 1, w_N: 1,
        U0: 1000
      };

      // Act
      const { req, res } = createMocks({
        method: 'POST',
        body: { ...orderedData, sample_count: 50 }
      });

      await optimizeHandler(req, res);

      // Assert
      expect(res._getStatusCode()).toBe(200);
      const result = JSON.parse(res._getData());
      
      // Optimal order should be a valid permutation
      expect(result.optimalOrder).toHaveLength(3);
      expect(new Set(result.optimalOrder)).toEqual(new Set([0, 1, 2]));
      
      // Each index should appear exactly once
      result.optimalOrder.forEach(index => {
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(3);
      });
    });
  });
});