import { calculateFunnel } from '../../pages/api/calculate';

// Mock test data per YAML specification
const mockSteps = [
  { observedCR: 0.8, questions: [{ question: "Email", title: "Email" }], boosts: 0, boostElements: [] },
  { observedCR: 0.7, questions: [{ question: "Payment", title: "Payment" }], boosts: 0, boostElements: [] },
  { observedCR: 0.9, questions: [{ question: "Confirmation", title: "Confirmation" }], boosts: 0, boostElements: [] }
];

const mockConstants = {
  E: 3,
  N: 3,
  source: 'paid_search',
  c1: 1,
  c2: 2.5,
  c3: 1.5,
  w_c: 3,
  w_f: 1,
  w_E: 0.2,
  w_N: 0.8,
  U0: 1000,
  k: 0.1,
  gamma_exit: 2.0
};

describe('calculateFunnel', () => {
  test('calculates funnel correctly with basic inputs', async () => {
    const result = await calculateFunnel({
      steps: mockSteps,
      ...mockConstants
    });

    expect(result).toBeDefined();
    expect(result.totalCR).toBeGreaterThan(0);
    expect(result.totalCR).toBeLessThanOrEqual(1);
    expect(result.stepResults).toHaveLength(mockSteps.length);
    
    // Verify step CRs multiply to totalCR (approximately)
    const calculatedTotal = result.stepResults.reduce((product, step) => product * step.stepCR, 1);
    expect(Math.abs(calculatedTotal - result.totalCR)).toBeLessThan(0.001);
  });

  test('handles empty steps array', async () => {
    const result = await calculateFunnel({
      steps: [],
      ...mockConstants
    });

    expect(result.totalCR).toBe(1); // Empty funnel = 100% CR
    expect(result.stepResults).toHaveLength(0);
  });

  test('validates step CR bounds (0-1)', async () => {
    const invalidSteps = [
      { observedCR: 1.5, questions: [], boosts: 0, boostElements: [] }, // > 1
      { observedCR: -0.1, questions: [], boosts: 0, boostElements: [] } // < 0
    ];

    await expect(calculateFunnel({
      steps: invalidSteps,
      ...mockConstants
    })).rejects.toThrow();
  });

  test('applies boost calculations correctly', async () => {
    const stepsWithBoosts = [
      { observedCR: 0.8, questions: [], boosts: 2, boostElements: [] },
      { observedCR: 0.7, questions: [], boosts: 0, boostElements: [] }
    ];

    const result = await calculateFunnel({
      steps: stepsWithBoosts,
      ...mockConstants
    });

    // First step should have higher CR due to boosts
    expect(result.stepResults[0].stepCR).toBeGreaterThan(stepsWithBoosts[0].observedCR);
  });

  test('respects boost cap of 5', async () => {
    const stepsWithMaxBoosts = [
      { observedCR: 0.5, questions: [], boosts: 10, boostElements: [] } // Should cap at 5
    ];

    const result = await calculateFunnel({
      steps: stepsWithMaxBoosts,
      ...mockConstants
    });

    // Verify boost was capped (exact calculation depends on boost formula)
    expect(result.stepResults[0].boostsApplied).toBeLessThanOrEqual(5);
  });

  test('calculates motivation decay correctly', async () => {
    const result = await calculateFunnel({
      steps: mockSteps,
      ...mockConstants
    });

    // Later steps should have lower motivation due to decay
    for (let i = 1; i < result.stepResults.length; i++) {
      expect(result.stepResults[i].motivation).toBeLessThanOrEqual(result.stepResults[i-1].motivation);
    }
  });

  test('handles different traffic sources', async () => {
    const sources = ['paid_search', 'organic_search', 'direct_referral', 'paid_social'];
    
    for (const source of sources) {
      const result = await calculateFunnel({
        steps: mockSteps,
        ...mockConstants,
        source
      });
      
      expect(result).toBeDefined();
      expect(result.totalCR).toBeGreaterThan(0);
    }
  });

  test('validates required parameters', async () => {
    // Missing steps
    await expect(calculateFunnel({
      ...mockConstants
    } as any)).rejects.toThrow();

    // Missing constants
    await expect(calculateFunnel({
      steps: mockSteps
    } as any)).rejects.toThrow();
  });
}); 