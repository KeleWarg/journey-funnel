// Mock MCP server for testing and development
export function createMockMCPClient() {
  return {
    async callFunction(functionName: string, args: any): Promise<any> {
      console.log(`🧪 Mock MCP calling: ${functionName}`, args);
      
      switch (functionName) {
        case 'assessSteps':
          return mockAssessSteps(args);
        case 'manusFunnel':
          return mockManusFunnel(args);
        default:
          throw new Error(`Mock MCP: Function ${functionName} not implemented`);
      }
    },

    isConnected(): boolean {
      return true;
    },

    async disconnect(): Promise<void> {
      console.log('🧪 Mock MCP disconnected');
    }
  };
}

function mockAssessSteps(args: any) {
  const { steps, frameworks } = args;
  
  const assessments = steps.map((step: any, stepIndex: number) => {
    const suggestions = frameworks.slice(0, 3).map((framework: string) => {
      const improvements = {
        PAS: {
          revisedText: `Problem: Having trouble with ${step.questionTexts[0]}? This is crucial for your next step. Solution: ${step.questionTexts[0]}`,
          rationale: 'Applied Problem-Agitate-Solve by identifying friction, emphasizing importance, then providing clear solution'
        },
        Fogg: {
          revisedText: `✓ Quick & Easy: ${step.questionTexts[0]} (This helps us personalize your experience)`,
          rationale: 'Increased motivation with benefit statement, reduced ability barrier with "quick & easy"'
        },
        AIDA: {
          revisedText: `🎯 Almost there! ${step.questionTexts[0]} to unlock your personalized recommendations`,
          rationale: 'Attention with emoji, interest with progress, desire with benefit, action with clear CTA'
        },
        Nielsen: {
          revisedText: `Step ${stepIndex + 1}: ${step.questionTexts[0]} (Progress: ${stepIndex + 1}/${steps.length})`,
          rationale: 'Added progress visibility and system status feedback per Nielsen\'s usability heuristics'
        },
        Cialdini: {
          revisedText: `Join 10,000+ users: ${step.questionTexts[0]} (95% complete this step)`,
          rationale: 'Applied social proof principle with completion statistics'
        }
      };

      const improvement = improvements[framework as keyof typeof improvements] || {
        revisedText: step.questionTexts[0],
        rationale: `${framework} framework analysis applied`
      };

      return {
        framework,
        revisedText: improvement.revisedText,
        rationale: improvement.rationale
      };
    });

    // Calculate estimated uplift based on current CR and complexity
    const currentCR = step.CR_s || 0.5;
    const complexity = (step.Qs + step.Is + step.Ds) / 3;
    const baseUplift = (1 - currentCR) * 0.12; // 12% of headroom
    const complexityBonus = Math.min(0.05, complexity * 0.02);
    const estimated_uplift = Math.min(0.15, baseUplift + complexityBonus);

    return {
      stepIndex,
      suggestions,
      estimated_uplift
    };
  });

  const order_recommendations = [
    {
      framework: 'PAS',
      recommendedOrder: [0, 1, 2].slice(0, steps.length),
      expected_CR_total: 0.87
    },
    {
      framework: 'Fogg',
      recommendedOrder: [1, 0, 2].slice(0, steps.length),
      expected_CR_total: 0.89
    }
  ];

  return {
    assessments,
    order_recommendations
  };
}

function mockManusFunnel(args: any) {
  const { steps, frameworks } = args;
  
  const baselineCR = steps.reduce((total: number, step: any) => total * (step.observedCR || 0.8), 1);
  
  const variants = frameworks.map((framework: string, index: number) => {
    const crBoost = 0.02 + (index * 0.01); // 2-10% boost
    const CR_total = Math.min(0.95, baselineCR + crBoost);
    const uplift_pp = (CR_total - baselineCR) * 100;
    
    // Generate step order variants
    const step_order = steps.map((_: any, i: number) => i);
    if (index > 0) {
      // Shuffle for variety
      step_order.reverse();
    }

    const suggestions = steps.map((step: any, stepIndex: number) => ({
      framework,
      revisedText: `${framework}-optimized: ${step.questions?.[0]?.title || 'Question'}`,
      rationale: `Applied ${framework} principles for ${uplift_pp.toFixed(1)}pp improvement`,
      estimated_uplift: crBoost / steps.length
    }));

    return {
      framework,
      step_order,
      CR_total,
      uplift_pp,
      suggestions
    };
  });

  // Sort by performance
  variants.sort((a: any, b: any) => b.CR_total - a.CR_total);

  return {
    baselineCR,
    variants,
    metadata: {
      totalVariants: variants.length,
      topPerformer: variants[0],
      averageUplift: variants.reduce((sum: number, v: any) => sum + v.uplift_pp, 0) / variants.length,
      frameworksAnalyzed: frameworks
    }
  };
} 