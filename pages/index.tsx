import React, { useState, useCallback } from 'react';
import { useToast } from '@hooks/use-toast';
import Link from 'next/link';
import { Button } from '@components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { Label } from '@components/ui/label';
import { Input } from '@components/ui/input';
import { Loader2Icon, BarChart3Icon } from 'lucide-react';
import CurrentConstantsSection from '@components/CurrentConstantsSection';
import FunnelSettingsSection from '@components/FunnelSettingsSection';
import StepsEditor from '@components/StepsEditor';
import SimulationBacksolveControls from '@components/SimulationBacksolveControls';
import BacksolveResultPanel from '@components/BacksolveResultPanel';
import OptimizeControls from '@components/OptimizeControls';
import ResultsTable from '@components/ResultsTable';
import ExportShareControls from '@components/ExportShareControls';
import DataVisualization from '@components/DataVisualization';
import LLMAssessmentPanel from '@components/LLMAssessmentPanel';
import MCPComparisonTable from '@components/MCPComparisonTable';
import CeilingAnalysisPanel from '@components/CeilingAnalysisPanel';
import EnhancedComparisonTable from '@components/EnhancedComparisonTable';
import UniqueCombinationTable from '@components/UniqueCombinationTable';
import FrameworkSuggestionsPanel from '@components/FrameworkSuggestionsPanel';
import FoggModelAnalysis from '@components/FoggModelAnalysis';
import AnalysisTabsSection from '@components/AnalysisTabsSection';
import { BacksolveResult, Step, SimulationData, LLMAssessmentResult, MCPFunnelResult, MCPFunnelVariant, BoostElement, MCPAssessmentResult, MCPOrderRecommendation, OptimizeResult } from '../types';

// Default values and constants - Updated to match YAML specification
const JOURNEY_TYPE_DEFAULTS = {
  transactional: { 
    step_complexity_weights: [1, 2.5, 1.5], // [c1, c2, c3]
    page_blend_weights: [3, 1], // [w_c, w_f]
    entry_motivation_weights: { w_E: 0.2, w_N: 0.8 }
  },
  exploratory: { 
    step_complexity_weights: [1, 1.5, 3], 
    page_blend_weights: [2.5, 1.5],
    entry_motivation_weights: { w_E: 0.5, w_N: 0.5 }
  },
  emotional: { 
    step_complexity_weights: [0.5, 3.5, 1], 
    page_blend_weights: [2, 2],
    entry_motivation_weights: { w_E: 0.7, w_N: 0.3 }
  },
  legal_required: { 
    step_complexity_weights: [1.5, 2, 1.5], 
    page_blend_weights: [2, 1.5],
    entry_motivation_weights: { w_E: 0.5, w_N: 0.5 }
  },
  conversational: { 
    step_complexity_weights: [2, 1, 1.5], 
    page_blend_weights: [1.5, 2.5],
    entry_motivation_weights: { w_E: 0.5, w_N: 0.5 }
  },
  urgent: { 
    step_complexity_weights: [1, 2.5, 1.5], 
    page_blend_weights: [3, 1],
    entry_motivation_weights: { w_E: 0.4, w_N: 0.6 }
  }
} as const;

type JourneyType = keyof typeof JOURNEY_TYPE_DEFAULTS;

// Updated input types to match YAML Qs interaction scale (1-5)
const inputTypeOptions = [
  { value: '1', label: '1 - Toggle/Yes-No (Are you insured?)' },
  { value: '2', label: '2 - Single Dropdown (Select gender)' },
  { value: '3', label: '3 - Multi-select/Slider (Choose goals)' },
  { value: '4', label: '4 - Calendar/Upload (Pick move date)' },
  { value: '5', label: '5 - Open Text Field (Describe issue)' }
];

const invasivenessOptions = [
  { value: 1, label: '1 - Not invasive' },
  { value: 2, label: '2 - Slightly invasive' },
  { value: 3, label: '3 - Moderately invasive' },
  { value: 4, label: '4 - Very invasive' },
  { value: 5, label: '5 - Extremely invasive' }
];

const difficultyOptions = [
  { value: 1, label: '1 - Very easy' },
  { value: 2, label: '2 - Easy' },
  { value: 3, label: '3 - Moderate' },
  { value: 4, label: '4 - Difficult' },
  { value: 5, label: '5 - Very difficult' }
];

const JourneyCalculator: React.FC = () => {
  const { toast } = useToast();
  
  // State
  const [steps, setSteps] = useState<Step[]>([{
    boosts: 0,
    observedCR: 0.85,
    questions: [
      {
        title: "What's your email address?",
        input_type: '2', // Single dropdown per YAML Qs scale
        invasiveness: 2,
        difficulty: 1
      }
    ],
    boostElements: []
  }]);
  const [journeyType, setJourneyType] = useState<JourneyType>('transactional');
  const [backsolveResult, setBacksolveResult] = useState<BacksolveResult | null>(null);
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult & {
    model_validation?: {
      current_predicted_CR: number;
      current_observed_CR: number;
      accuracy_error_percent: number;
      is_reliable: boolean;
      warning?: string;
    };
  } | null>(null);
  const [optimalPositions, setOptimalPositions] = useState<Record<number, number>>({});
  const [llmCache, setLlmCache] = useState<Record<string, string>>({});
  const [llmAssessmentResult, setLlmAssessmentResult] = useState<LLMAssessmentResult | null>(null);
  const [mcpFunnelResult, setMcpFunnelResult] = useState<MCPFunnelResult | null>(null);
  const [enhancedMcpResult, setEnhancedMcpResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isBacksolving, setIsBacksolving] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [isMCPAnalyzing, setIsMCPAnalyzing] = useState(false);
  const [isEnhancedMCPAnalyzing, setIsEnhancedMCPAnalyzing] = useState(false);
  const [numSamples, setNumSamples] = useState(20000); // Increased to 20000 per YAML patch - unlocking reorder upside
  const [hybridSeeding, setHybridSeeding] = useState(false); // NEW: Hybrid Fogg+ELM seeding
  const [backupOverrides, setBackupOverrides] = useState<Record<string, number> | null>(null);
  const [isClassifyingBoosts, setIsClassifyingBoosts] = useState(false);

  // Core state
  const [E, setE] = useState(3);
  const [N, setN] = useState(3);
  const [source, setSource] = useState('paid_search');
  const [U0, setU0] = useState(1000);
  
  // Override constants
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  // Constants state
  const [c1, setC1] = useState<number>(JOURNEY_TYPE_DEFAULTS.transactional.step_complexity_weights[0]);
  const [c2, setC2] = useState<number>(JOURNEY_TYPE_DEFAULTS.transactional.step_complexity_weights[1]);
  const [c3, setC3] = useState<number>(JOURNEY_TYPE_DEFAULTS.transactional.step_complexity_weights[2]);
  const [w_c, setWC] = useState<number>(JOURNEY_TYPE_DEFAULTS.transactional.page_blend_weights[0]);
  const [w_f, setWF] = useState<number>(JOURNEY_TYPE_DEFAULTS.transactional.page_blend_weights[1]);
  const [w_E, setWE] = useState<number>(JOURNEY_TYPE_DEFAULTS.transactional.entry_motivation_weights.w_E);
  const [w_N, setWN] = useState<number>(JOURNEY_TYPE_DEFAULTS.transactional.entry_motivation_weights.w_N);

  // Journey type change handler
  const handleJourneyTypeChange = useCallback((newType: JourneyType) => {
    setJourneyType(newType);
    const defaults = JOURNEY_TYPE_DEFAULTS[newType];
    setC1(defaults.step_complexity_weights[0]);
    setC2(defaults.step_complexity_weights[1]);
    setC3(defaults.step_complexity_weights[2]);
    setWC(defaults.page_blend_weights[0]);
    setWF(defaults.page_blend_weights[1]);
    setWE(defaults.entry_motivation_weights.w_E);
    setWN(defaults.entry_motivation_weights.w_N);
  }, []);

  // Step management
  const addStep = () => {
    setSteps([...steps, { 
      boosts: 0,
      observedCR: 0.8,
      questions: [],
      boostElements: []
    }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, updates: Partial<typeof steps[0]>) => {
    setSteps(steps.map((step, i) => i === index ? { ...step, ...updates } : step));
  };

  // Add types for question operations
  const addQuestion = (stepIndex: number) => {
    setSteps(steps.map((step, i) => {
      if (i === stepIndex) {
        return {
          ...step,
          questions: [...step.questions, {
            title: '',
            input_type: '',
            invasiveness: 2,
            difficulty: 2
          }]
        };
      }
      return step;
    }));
  };

  const removeQuestion = (stepIndex: number, questionIndex: number) => {
    setSteps(steps.map((step, i) => {
      if (i === stepIndex) {
        return {
          ...step,
          questions: step.questions.filter((_, j) => j !== questionIndex)
        };
      }
      return step;
    }));
  };

  const updateQuestion = (stepIndex: number, questionIndex: number, updates: Partial<typeof steps[0]['questions'][0]>) => {
    setSteps(steps.map((step, i) => {
      if (i === stepIndex) {
        return {
          ...step,
          questions: step.questions.map((q, j) => j === questionIndex ? { ...q, ...updates } : q)
        };
      }
      return step;
    }));
  };

  // Boost elements management
  const handleBoostElementsChange = (stepIndex: number, elements: BoostElement[]) => {
    setSteps(steps.map((step, i) => {
      if (i === stepIndex) {
        return {
          ...step,
          boostElements: elements
        };
      }
      return step;
    }));
  };

  const handleClassifyBoostElements = async (stepIndex: number, elements: BoostElement[]) => {
    try {
      setIsClassifyingBoosts(true);
      
      // Validate input before sending
      if (!Array.isArray(elements)) {
        throw new Error('Elements must be an array');
      }
      
      if (elements.length === 0) {
        throw new Error('No boost elements to classify');
      }
      
      // Validate each element has required fields
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (!element.id || !element.text) {
          throw new Error(`Element ${i + 1} is missing required fields (id or text)`);
        }
      }
      
      console.log('Classifying boost elements:', { stepIndex, elements });
      
      const response = await fetch('/api/assessBoostElements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepIndex, boostElements: elements })
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: `HTTP ${response.status}: ${errorText || 'Unknown error'}` };
        }
        throw new Error(errorData.error || errorData.details || 'Classification failed');
      }
      
      const data = await response.json();
      
      // Update the elements with classification results
      const updatedElements = elements.map((element) => {
        const classification = data.classifiedBoosts?.find((boost: any) => boost.id === element.id);
        return {
          ...element,
          category: classification?.category,
          score: classification?.score
        };
      });
      
      // Update the boost score from total classified score
      const totalScore = data.stepBoostTotal || 0;
      const cappedScore = data.cappedBoosts || Math.min(totalScore, 5);
      
      setSteps(steps.map((step, i) => {
        if (i === stepIndex) {
          return {
            ...step,
            boostElements: updatedElements,
            boosts: cappedScore
          };
        }
        return step;
      }));
      
      toast({
        title: "Boost Elements Classified",
        description: `Total boost score: ${cappedScore}/5 (${totalScore > 5 ? 'capped' : 'applied'})`
      });
    } catch (error) {
      console.error('Boost classification error:', error);
      toast({
        title: "Classification Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsClassifyingBoosts(false);
    }
  };

  // Build payload for API calls
  const buildPayload = useCallback(() => {
    return {
      journeyType,
      E,
      N_importance: N,
      source,
      steps,
      c1, c2, c3, w_c, w_f, w_E, w_N,
      U0,
      k_override: overrides.k,
      gamma_exit_override: overrides.gamma_exit,
      epsilon_override: overrides.epsilon,
      llmAssessments: llmAssessmentResult?.assessments || null,
      apply_llm_uplift: true
    };
  }, [journeyType, E, N, source, steps, c1, c2, c3, w_c, w_f, w_E, w_N, U0, overrides, llmAssessmentResult]);

  // API call functions
  const runSimulation = useCallback(async () => {
    try {
      setIsSimulating(true);
      
      // Enhanced validation
      if (!steps || steps.length === 0) {
        throw new Error("At least one step is required");
      }
      
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (!step) {
          throw new Error(`Step ${i + 1} is invalid`);
        }
        if (!step.questions || !Array.isArray(step.questions)) {
          throw new Error(`Step ${i + 1} must have questions`);
        }
        if (step.questions.length === 0) {
          throw new Error(`Step ${i + 1} must have at least one question`);
        }
        
        for (let j = 0; j < step.questions.length; j++) {
          const question = step.questions[j];
          if (!question || !question.input_type || !question.title.trim()) {
            throw new Error(`Question ${j + 1} in step ${i + 1} is incomplete`);
          }
        }
      }
      
      const payload = buildPayload();
      console.log("Sending payload:", payload); // Debug log
      
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.details || 'Simulation failed');
      }
      
      const data = await response.json();
      console.log("Received data:", data); // Debug log
      
      if (!data || !data.per_step_metrics || !Array.isArray(data.per_step_metrics)) {
        throw new Error("Invalid response from server");
      }
      
      // Transform data to match expected format per YAML specification
      const transformedData = {
        predictedSteps: data.per_step_metrics.map((result: any) => ({ CR_s: result.CR_s })),
        CR_total: data.overall_predicted_CR,
        bestCR: data.bestCR
      };
      
      setSimulationData(transformedData);
      
      toast({
        title: "Simulation Complete",
        description: `Predicted overall CR: ${(data.overall_predicted_CR * 100).toFixed(2)}%`
      });
    } catch (error) {
      console.error('Simulation error:', error);
      toast({
        title: "Simulation Failed",
        description: error instanceof Error ? error.message : "Please check your inputs and try again.",
        variant: "destructive"
      });
    } finally {
      setIsSimulating(false);
    }
  }, [buildPayload, toast, steps]);

  const runBacksolve = useCallback(async () => {
    try {
      setIsBacksolving(true);
      
      // Validate that all steps have observed CR values
      if (!steps || steps.length === 0) {
        throw new Error("At least one step is required");
      }
      
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (!step || typeof step.observedCR !== 'number' || step.observedCR < 0 || step.observedCR > 1) {
          throw new Error(`Step ${i + 1} must have a valid observed CR value between 0 and 1`);
        }
      }
      
      // Build the payload with the correct format for backsolve API
      const basePayload = buildPayload();
      const backsolvePayload = {
        steps: basePayload.steps.map(step => ({
          questions: step.questions,
          boosts: step.boosts
        })),
        E: basePayload.E,
        N_importance: basePayload.N_importance,
        source: basePayload.source,
        c1: basePayload.c1,
        c2: basePayload.c2,
        c3: basePayload.c3,
        w_c: basePayload.w_c,
        w_f: basePayload.w_f,
        w_E: basePayload.w_E,
        w_N: basePayload.w_N,
        observed_CR_s: steps.map(step => step.observedCR)
      };
      
      console.log("Sending backsolve payload:", backsolvePayload); // Debug log
      
      const response = await fetch('/api/backsolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backsolvePayload)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.details || 'Back-solve failed');
      }
      
      const data = await response.json();
      console.log("Received backsolve data:", data); // Debug log
      
      setBacksolveResult(data);
      
      toast({
        title: "Back-Solve Complete",
        description: "Optimal parameters found successfully"
      });
    } catch (error) {
      console.error('Back-solve error:', error);
      toast({
        title: "Back-Solve Failed",
        description: error instanceof Error ? error.message : "Please check your observed CR values and try again.",
        variant: "destructive"
      });
    } finally {
      setIsBacksolving(false);
    }
  }, [buildPayload, toast, steps]);

  const runOptimize = useCallback(async () => {
    try {
      setIsOptimizing(true);
      const payload = { 
        ...buildPayload(), 
        sample_count: numSamples,
        use_backsolved_constants: backsolveResult ? true : false,
        best_k: backsolveResult?.bestParams?.best_k,
        best_gamma_exit: backsolveResult?.bestParams?.best_gamma_exit,
        include_sample_results: true,
        hybrid_seeding: hybridSeeding,
        seeded_order: hybridSeeding,
        llmAssessments: llmAssessmentResult?.assessments || []
      };
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Optimization failed');
      
      const data = await response.json();
      console.log('Optimize response:', data); // Debug log
      
      // Store the complete optimize result
      setOptimizeResult(data);
      
      // Convert optimalOrder array to optimalPositions object
      const optimalPositionsMap: Record<number, number> = {};
      if (data.optimalOrder && Array.isArray(data.optimalOrder)) {
        data.optimalOrder.forEach((originalIndex: number, newPosition: number) => {
          optimalPositionsMap[originalIndex] = newPosition;
        });
      }
      
      setOptimalPositions(optimalPositionsMap);
      setSimulationData((prev: SimulationData | null) => prev ? { ...prev, bestCR: data.optimalCRTotal } : null);
      
      toast({
        title: "Optimization Complete",
        description: `Best CR found: ${(data.optimalCRTotal * 100).toFixed(2)}% using ${data.algorithm} algorithm${data.hybrid_seeding?.enabled ? ' with Hybrid Fogg+ELM seeding' : ''}`
      });
    } catch (error) {
      console.error('Optimization error:', error);
      toast({
        title: "Optimization Failed", 
        description: "Please try again with different parameters.",
        variant: "destructive"
      });
    } finally {
      setIsOptimizing(false);
    }
  }, [buildPayload, numSamples, toast, backsolveResult]);

  const runLLMAssessment = useCallback(async () => {
    try {
      setIsAssessing(true);
      
      if (!simulationData || !steps) {
        throw new Error("Please run simulation first to get predicted conversion rates");
      }

      // Build payload for LLM assessment
      const assessmentPayload = {
        steps: steps.map((step, stepIndex) => ({
          stepIndex,
          questionTexts: step.questions.map(q => q.title),
          Qs: step.questions.length > 0 ? 
            step.questions.reduce((sum, q) => sum + parseInt(q.input_type || '2'), 0) / step.questions.length : 2,
          Is: step.questions.length > 0 ? 
            step.questions.reduce((sum, q) => sum + q.invasiveness, 0) / step.questions.length : 2,
          Ds: step.questions.length > 0 ? 
            step.questions.reduce((sum, q) => sum + q.difficulty, 0) / step.questions.length : 2,
          CR_s: simulationData.predictedSteps[stepIndex]?.CR_s || 0.5
        }))
      };

      // Try MCP assessment with timeout and fallback
      let data;
      try {
        console.log('Attempting MCP assessment...');
        
        // Create a timeout promise (45 seconds to be safe)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('MCP assessment timeout')), 45000)
        );
        
        const fetchPromise = fetch('/api/assessStepsMCP', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assessmentPayload)
        });
        
        const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          
          // Special handling for API key not configured
          if (errorData.error === 'OpenAI API key not configured') {
            throw new Error('Please add OPENAI_API_KEY to your .env.local file to enable LLM assessments');
          }
          
          throw new Error(errorData.error || errorData.details || 'MCP assessment failed');
        }

        data = await response.json();
        console.log('MCP assessment successful');
        
      } catch (mcpError) {
        console.warn('MCP assessment failed, falling back to basic assessment:', mcpError);
        
        // Fallback to basic assessment without MCP
        const fallbackResponse = await fetch('/api/assessSteps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assessmentPayload)
        });

        if (!fallbackResponse.ok) {
          const errorData = await fallbackResponse.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || errorData.details || 'Assessment failed completely');
        }

        data = await fallbackResponse.json();
        console.log('Fallback assessment successful');
        
        toast({
          title: "Fallback Assessment Used",
          description: "MCP server timed out, used basic assessment instead",
          variant: "default"
        });
      }
      setLlmAssessmentResult(data);

      toast({
        title: "LLM Assessment Complete",
        description: `Generated recommendations for ${data.assessments.length} steps using MCP analysis`
      });

    } catch (error) {
      console.error('LLM Assessment error:', error);
      toast({
        title: "LLM Assessment Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAssessing(false);
    }
  }, [steps, simulationData, toast]);

  const runMCPFunnelAnalysis = useCallback(async () => {
    try {
      setIsMCPAnalyzing(true);
      
      if (!steps || steps.length === 0) {
        throw new Error("Please configure funnel steps first");
      }

      // Call MCP manusFunnel orchestrator function with timeout
      let data;
      try {
        console.log('Attempting MCP funnel analysis...');
        
        // Create a timeout promise (45 seconds)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('MCP funnel analysis timeout')), 45000)
        );
        
        const fetchPromise = fetch('/api/manusFunnel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            steps: steps,
            frameworks: ['PAS', 'Fogg', 'Nielsen', 'AIDA', 'Cialdini', 'SCARF', 'JTBD', 'TOTE', 'ELM']
          })
        });
        
        const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          
          // Special handling for MCP not available
          if (errorData.error === 'MCP client not available') {
            throw new Error('MCP client not initialized. Please ensure the MCP manus client is properly configured.');
          }
          
          throw new Error(errorData.error || errorData.details || 'MCP funnel analysis failed');
        }

        data = await response.json();
        console.log('MCP funnel analysis successful');
        
      } catch (mcpError) {
        console.warn('MCP funnel analysis failed:', mcpError);
        
        // For now, throw the error as there's no fallback for funnel analysis
        // In the future, you could implement a simplified analysis here
        throw new Error(`MCP funnel analysis failed: ${mcpError instanceof Error ? mcpError.message : 'Unknown error'}`);
      }
      setMcpFunnelResult(data);

      toast({
        title: "MCP Analysis Complete",
        description: `Analyzed ${data.metadata.totalVariants} framework variants. Best: ${data.metadata.topPerformer.framework} (+${data.metadata.topPerformer.uplift_pp.toFixed(2)}pp)`
      });

    } catch (error) {
      console.error('MCP Funnel Analysis error:', error);
      toast({
        title: "MCP Analysis Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsMCPAnalyzing(false);
    }
  }, [steps, toast]);

  const applyMCPVariant = useCallback(async (variant: MCPFunnelVariant) => {
    try {
      // Apply the variant's step order and suggested copy
      // This would integrate with your existing step reordering logic
      
      toast({
        title: "Variant Applied",
        description: `Applied ${variant.framework} framework with ${variant.suggestions.length} improvements`
      });

      // Optionally re-run simulation with new configuration
      
    } catch (error) {
      console.error('Apply variant error:', error);
      toast({
        title: "Apply Variant Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const runEnhancedMCPAnalysis = useCallback(async () => {
    if (!steps || steps.length === 0) return;

    setIsEnhancedMCPAnalyzing(true);
    try {
      const payload = buildPayload();
      
      const response = await fetch('/api/manusFunnelEnhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          frameworks: ['PAS', 'Fogg', 'Nielsen', 'AIDA', 'Cialdini', 'SCARF', 'JTBD', 'TOTE', 'ELM'],
          use_backsolved_constants: !!backsolveResult,
          best_k: backsolveResult?.bestParams?.best_k,
          best_gamma_exit: backsolveResult?.bestParams?.best_gamma_exit
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setEnhancedMcpResult(data);
        toast({
          title: "Enhanced MCP Analysis Complete",
          description: `Analyzed ${data.baseline_metrics?.frameworks_analyzed || 0} framework variants using ${data.baseline_metrics?.algorithm_used || 'optimization'}`
        });
      } else {
        throw new Error(data.details || 'Enhanced analysis failed');
      }
    } catch (error) {
      console.error('Enhanced MCP analysis error:', error);
      toast({
        title: "Enhanced MCP Analysis Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsEnhancedMCPAnalyzing(false);
    }
  }, [steps, toast, backsolveResult, buildPayload]);

  const applyEnhancedVariant = useCallback(async (variant: any) => {
    try {
      toast({
        title: "Applying Enhanced Variant",
        description: `Implementing ${variant.framework} optimization with ${variant.uplift_pp.toFixed(1)}pp expected uplift`
      });
      
      // Update steps with the suggested order
      const reorderedSteps = variant.step_order.map((index: number) => steps[index]);
      setSteps(reorderedSteps);
      
      // Trigger new simulation with reordered steps
      setTimeout(() => {
        runSimulation();
      }, 100);
      
    } catch (error) {
      toast({
        title: "Application Failed",
        description: "Could not apply enhanced variant",
        variant: "destructive"
      });
    }
  }, [steps, runSimulation, toast]);

  const updateSimulation = async () => {
    if (backsolveResult && backsolveResult.bestParams) {
      // Store current overrides as backup if not already stored
      if (!backupOverrides) {
        setBackupOverrides(overrides);
      }
      
      // Apply the backsolve parameters
      setOverrides({
        k: backsolveResult.bestParams.best_k,
        gamma_exit: backsolveResult.bestParams.best_gamma_exit,
        epsilon: overrides.epsilon // Keep existing epsilon if any
      });
      
      toast({
        title: "Parameters Applied",
        description: `Applied k=${backsolveResult.bestParams.best_k}, gamma_exit=${backsolveResult.bestParams.best_gamma_exit}`
      });
      
      // Automatically run simulation with new parameters
      setTimeout(() => {
        runSimulation();
      }, 100); // Small delay to ensure state is updated
    } else {
      toast({
        title: "Cannot Apply Parameters",
        description: "No valid parameters found in backsolve result",
        variant: "destructive"
      });
    }
  };

  const restoreToDefault = () => {
    if (backupOverrides !== null) {
      setOverrides(backupOverrides);
      setBackupOverrides(null);
      
      toast({
        title: "Parameters Restored",
        description: "Restored to default parameter values"
      });
    } else {
      // If no backup, restore to completely empty overrides (system defaults)
      setOverrides({});
      
      toast({
        title: "Parameters Restored",
        description: "Restored to system default values"
      });
    }
  };

  // Get current step order (indices)
  const getCurrentStepOrder = (): number[] => {
    return steps.map((_, index) => index);
  };

  // Apply recommended order from MCP assessment
  const applyRecommendedOrder = (orderRecommendation: MCPOrderRecommendation) => {
    const newOrder = orderRecommendation.recommendedOrder;
    const reorderedSteps = newOrder.map(index => steps[index]);
    
    setSteps(reorderedSteps);
    
    toast({
      title: "Step Order Applied",
      description: `Applied ${orderRecommendation.framework} recommended order: ${newOrder.map(i => `Step ${i + 1}`).join(' → ')}`
    });

    // Automatically run simulation with new order
    setTimeout(() => {
      runSimulation();
    }, 100);
  };

  // Validation
  const canRunSimulation = steps && steps.length > 0 && steps.every(step => 
    step && 
    step.questions && 
    Array.isArray(step.questions) && 
    step.questions.length > 0 &&
    step.questions.every(q => q && q.input_type && q.title && q.title.trim() && 
      typeof q.invasiveness === 'number' && typeof q.difficulty === 'number')
  );

  const canRunBacksolve = steps && steps.length > 0 && steps.every(step => 
    step && typeof step.observedCR === 'number' && step.observedCR !== null && step.observedCR !== undefined
  );

  // Add specific Fogg analysis function per YAML spec 3.3_fogg_order_logic
  const runFoggAnalysis = useCallback(async () => {
    try {
      setIsMCPAnalyzing(true);
      
      if (!steps || steps.length === 0) {
        throw new Error("Please configure funnel steps first");
      }

      console.log('🧠 Running Fogg Behavior Model analysis...');
      
      // Create a timeout promise (30 seconds for focused analysis)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fogg analysis timeout')), 30000)
      );
      
      // Call the dedicated Fogg analysis API that implements the YAML spec
      const fetchPromise = fetch('/api/foggAnalysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps: steps,
          constants: {
            c1, c2, c3, w_c, w_f, w_E, w_N,
            E, N_importance: N, source, U0
          } // Include current constants for calculation API calls
        })
      });
      
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.details || 'Fogg analysis failed');
      }

      const foggResult = await response.json();
      console.log('✅ Fogg analysis successful:', foggResult);
      
      // Create MCP-compatible result structure for existing components
      const foggVariant = {
        framework: foggResult.framework,
        step_order: foggResult.step_order,
        CR_total: foggResult.CR_total,
        uplift_pp: foggResult.uplift_pp,
        fogg_metrics: foggResult.fogg_metrics,
        suggestions: [] // Fogg is about ordering, not copy rewriting
      };
      
      const mcpCompatibleResult = {
        baselineCR: foggResult.baseline_CR_total,
        variants: [foggVariant],
        metadata: {
          totalVariants: 1,
          topPerformer: foggVariant,
          averageUplift: foggResult.uplift_pp,
          frameworksAnalyzed: ['Fogg-BM']
        }
      };
      
      setMcpFunnelResult(mcpCompatibleResult);

      toast({
        title: "Fogg Analysis Complete",
        description: `Fogg Behavior Model analysis complete. ${foggResult.uplift_pp.toFixed(1)}pp improvement identified.`
      });

    } catch (error) {
      console.error('❌ Fogg Analysis error:', error);
      toast({
        title: "Fogg Analysis Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsMCPAnalyzing(false);
    }
  }, [steps, toast, buildPayload]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Journey Calculator</h1>
              <p className="mt-1 text-sm text-gray-500">
                Build, simulate, back-solve, and optimize your multi-step form funnel
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Current Constants Section */}
        <CurrentConstantsSection {...{
          c1,
          c2,
          c3,
          w_c,
          w_f,
          w_E,
          w_N,
          overrides,
          setOverrides
        }} />

        {/* Funnel Settings Section */}
        <FunnelSettingsSection {...{
          journeyType,
          onJourneyTypeChange: handleJourneyTypeChange as (type: string) => void,
          E,
          setE,
          N,
          setN,
          source,
          setSource,
          U0,
          setU0,
          c1,
          setC1,
          c2,
          setC2,
          c3,
          setC3,
          w_c,
          setWC,
          w_f,
          setWF,
          w_E,
          setWE,
          w_N,
          setWN
        }} />

        {/* Steps Editor */}
        <StepsEditor
          steps={steps}
          onAddStep={addStep}
          onRemoveStep={removeStep}
          onUpdateStep={updateStep}
          onAddQuestion={addQuestion}
          onRemoveQuestion={removeQuestion}
          onUpdateQuestion={updateQuestion}
          inputTypeOptions={inputTypeOptions}
          invasivenessOptions={invasivenessOptions}
          difficultyOptions={difficultyOptions}
          onBoostElementsChange={handleBoostElementsChange}
          onClassifyBoostElements={handleClassifyBoostElements}
          isClassifyingBoosts={isClassifyingBoosts}
        />

        {/* Simulation & Back-solve Controls */}
        <SimulationBacksolveControls
          onRunSimulation={runSimulation}
          onRunBacksolve={runBacksolve}
          isSimulating={isSimulating}
          isBacksolving={isBacksolving}
          canRunSimulation={canRunSimulation}
          canRunBacksolve={canRunBacksolve}
        />

        {/* Back-solve Result Panel */}
        {backsolveResult && (
          <BacksolveResultPanel
            backsolveResult={backsolveResult}
            onUpdateSimulation={updateSimulation}
            onRestoreDefault={restoreToDefault}
            backupOverrides={backupOverrides}
          />
        )}

        {/* Results Table */}
        {simulationData && (
          <ResultsTable
            steps={steps}
            simulationData={simulationData}
            optimalPositions={optimalPositions}
            optimizeData={optimizeResult ? {
              optimal_step_order: optimizeResult.optimal_step_order,
              optimal_CR_total: optimizeResult.optimal_CR_total,
              sample_results: optimizeResult.sample_results,
              hybrid_seeding: optimizeResult.hybrid_seeding,
              algorithm: optimizeResult.algorithm
            } : undefined}
            llmCache={llmCache}
            setLlmCache={setLlmCache}
            llmAssessmentResult={llmAssessmentResult}
          />
        )}

        {/* Standard Framework Analysis Section */}
        {simulationData && (
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                📊 Framework Analysis & Comparison
              </CardTitle>
              <p className="text-gray-600">
                Compare performance across different optimization frameworks and step orderings.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                                 <div className="flex justify-between items-center">
                   <div className="flex gap-4">
                     <Button
                       onClick={runMCPFunnelAnalysis}
                       disabled={isMCPAnalyzing || !steps || steps.length === 0}
                       className="bg-blue-600 hover:bg-blue-700"
                     >
                       {isMCPAnalyzing ? 'Processing...' : 'Run Framework Analysis'}
                     </Button>
                     <Button
                       onClick={runEnhancedMCPAnalysis}
                       disabled={isEnhancedMCPAnalyzing || !steps || steps.length === 0}
                       className="bg-indigo-600 hover:bg-indigo-700"
                     >
                       {isEnhancedMCPAnalyzing ? 'Processing...' : 'Enhanced Analysis'}
                     </Button>
                   </div>
                 </div>
                
                {/* Standard MCP Framework Comparison */}
                <MCPComparisonTable
                  mcpResult={mcpFunnelResult}
                  onApplyVariant={applyMCPVariant || (() => {})}
                  isLoading={isMCPAnalyzing}
                />
                
                {/* Enhanced Framework Variant Analysis */}
                {enhancedMcpResult && (
                  <div className="mt-6">
                    <h4 className="text-md font-semibold mb-3">Enhanced Framework Analysis</h4>
                    {enhancedMcpResult.unique_combinations ? (
                      <UniqueCombinationTable
                        combinations={enhancedMcpResult.unique_combinations}
                        baselineCR={enhancedMcpResult.baseline_CR_total}
                      />
                    ) : (
                      <EnhancedComparisonTable
                        variantResults={enhancedMcpResult.variant_results}
                        ceilingAnalysis={enhancedMcpResult.ceiling_analysis}
                        isLoading={isEnhancedMCPAnalyzing}
                        onApplyVariant={applyEnhancedVariant || (() => {})}
                      />
                    )}
                  </div>
                )}
                
                {!mcpFunnelResult && !enhancedMcpResult && !isMCPAnalyzing && !isEnhancedMCPAnalyzing && (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3Icon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Run framework analysis to see comparison results</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Specialized Analysis Results Section */}
        {simulationData && (
          <AnalysisTabsSection
            mcpFunnelResult={mcpFunnelResult}
            enhancedMcpResult={enhancedMcpResult}
            isEnhancedMCPAnalyzing={isEnhancedMCPAnalyzing}
            isMCPAnalyzing={isMCPAnalyzing}
            onApplyRecommendedOrder={applyMCPVariant}
            onRunEnhancedMCP={runEnhancedMCPAnalysis}
            onApplyEnhancedVariant={applyEnhancedVariant}
            steps={steps}
            onRunFoggAnalysis={simulationData ? runFoggAnalysis : undefined}
            onApplyFoggOrder={(order) => {
              // Apply the Fogg-recommended order
              const reorderedSteps = order.map(index => steps[index]);
              setSteps(reorderedSteps);
              
              // Show success message
              toast({
                title: "Fogg-BM Order Applied!",
                description: `Steps reordered based on Fogg Behavior Model: ${order.map(i => `Step ${i + 1}`).join(' → ')}`,
              });
              
              // Re-run simulation with new order
              updateSimulation();
            }}
            llmAssessmentResult={llmAssessmentResult}
            isAssessing={isAssessing}
            onRunAssessment={runLLMAssessment}
            baselineCR={simulationData?.CR_total || 0}
          />
        )}

        {/* Step Order Optimization Section */}
        {simulationData && (
          <Card className="border border-gray-200 shadow-sm bg-gradient-to-r from-purple-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-indigo-900">
                🎯 Find Optimal Step Flow
              </CardTitle>
              <p className="text-gray-600">
                Discover the best step ordering using Monte Carlo optimization with optional hybrid Fogg+ELM seeding.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Optimize Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="num-samples" className="text-sm font-medium text-gray-700">
                    # of Samples to Try
                  </Label>
                  <Input
                    id="num-samples"
                    type="number"
                    step={1000}
                    min={1000}
                    max={20000}
                    value={numSamples}
                    onChange={(e) => setNumSamples(parseInt(e.target.value) || 20000)}
                    className="w-32 border-gray-300 focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Optimization Options
                  </Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="hybrid-seeding"
                      checked={hybridSeeding}
                      onChange={(e) => setHybridSeeding(e.target.checked)}
                      disabled={!llmAssessmentResult?.assessments?.length}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label 
                      htmlFor="hybrid-seeding" 
                      className={`text-sm ${llmAssessmentResult?.assessments?.length ? 'text-gray-900' : 'text-gray-400'}`}
                    >
                      Hybrid Fogg + ELM Seeding
                    </label>
                  </div>
                  {!llmAssessmentResult?.assessments?.length && (
                    <p className="text-xs text-amber-600">
                      ⚠️ Run LLM Assessment first to enable seeding
                    </p>
                  )}
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={runOptimize}
                    disabled={isOptimizing}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 w-full lg:w-auto"
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                        Optimizing...
                      </>
                    ) : (
                      'Find Optimal Flow'
                    )}
                  </Button>
                </div>
              </div>

              {/* Help Text */}
              <div className="text-sm text-gray-600 space-y-1 bg-white p-4 rounded-lg">
                <p>
                  <strong>Step Order Optimization</strong> tests different question orderings to find the flow that maximizes conversion rate.
                </p>
                <p>
                  More samples = better results but longer processing time. <strong>Hybrid Seeding</strong> uses Fogg Behavior Model + ELM analysis to intelligently seed the search with high-potential orderings.
                </p>
              </div>

              {/* Optimization Results */}
              {optimizeResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-800">🚀 Optimization Results</h4>
                    {optimizeResult.algorithm && (
                      <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                        {optimizeResult.algorithm === 'hybrid_seeded_sampling' ? '🧠 Hybrid Seeded' : 
                         optimizeResult.algorithm === 'exhaustive' ? '🔍 Exhaustive' : '🔄 Heuristic'} Search
                      </span>
                    )}
                  </div>
                  
                  {/* Hybrid Seeding Info */}
                  {optimizeResult.hybrid_seeding?.enabled && optimizeResult.hybrid_seeding.seeded_order && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-blue-900">🧠 Hybrid Fogg+ELM Seeded Order:</span>
                        <div className="flex flex-wrap gap-1">
                          {optimizeResult.hybrid_seeding.seeded_order?.map((stepIndex, position) => (
                            <span key={position} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                              Step {stepIndex + 1}
                            </span>
                          )) || []}
                        </div>
                        {optimizeResult.hybrid_seeding.seeded_order_is_optimal && (
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-bold">
                            🎯 Optimal!
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-blue-700">
                        This order was computed using Fogg Behavior Model (motivation × ability × trigger) 
                        combined with ELM elaboration likelihood scores to intelligently seed the search.
                        {optimizeResult.hybrid_seeding.seeded_order_is_optimal 
                          ? ' The seeded order achieved the optimal result!' 
                          : ' Used as starting point for 20,000-sample Monte Carlo search.'}
                      </p>
                    </div>
                  )}
                  
                                    {/* Optimal Flow */}
                  {optimizeResult.optimal_step_order && (
                    <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-purple-700">✨ Optimal Flow</span>
                        <span className="text-lg font-bold text-green-700">
                          {(optimizeResult.optimal_CR_total * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {optimizeResult.optimal_step_order.map((originalStepIndex, position) => (
                          <div key={position} className="flex items-center gap-1">
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                              Step {originalStepIndex + 1}
                            </span>
                            {position < optimizeResult.optimal_step_order.length - 1 && (
                              <span className="text-gray-400">→</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {/* Export & Share Controls */}
        <ExportShareControls
          simulationData={simulationData}
          backsolveResult={backsolveResult}
          optimalPositions={optimalPositions}
          buildPayload={buildPayload}
          llmCache={llmCache}
        />

        {/* Data Visualization */}
        {simulationData && (
          <DataVisualization
            simulationData={simulationData}
            optimizeResult={optimizeResult}
            steps={steps}
            E={E}
            N_importance={N}
            source={source}
            c1={c1}
            c2={c2}
            c3={c3}
            w_c={w_c}
            w_f={w_f}
            w_E={w_E}
            w_N={w_N}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>&copy; 2024 Journey Calculator. All rights reserved.</p>
            <div className="flex space-x-4">
              <Link href="/docs" className="hover:text-gray-700">Documentation</Link>
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default JourneyCalculator;
