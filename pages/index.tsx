import React, { useState, useCallback } from 'react';
import { useToast } from '@hooks/use-toast';
import Link from 'next/link';
import CurrentConstantsSection from '@components/CurrentConstantsSection';
import FunnelSettingsSection from '@components/FunnelSettingsSection';
import StepsEditor from '@components/StepsEditor';
import SimulationBacksolveControls from '@components/SimulationBacksolveControls';
import BacksolveResultPanel from '@components/BacksolveResultPanel';
import OptimizeControls from '@components/OptimizeControls';
import ResultsTable from '@components/ResultsTable';
import ExportShareControls from '@components/ExportShareControls';
import { BacksolveResult, Step, SimulationData } from '../types';

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
    ]
  }]);
  const [journeyType, setJourneyType] = useState<JourneyType>('transactional');
  const [backsolveResult, setBacksolveResult] = useState<BacksolveResult | null>(null);
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [optimizeResult, setOptimizeResult] = useState<{
    optimal_step_order: number[];
    optimal_CR_total: number;
    sample_results?: Array<{
      order: number[];
      CR_total: number;
    }>;
  } | null>(null);
  const [optimalPositions, setOptimalPositions] = useState<Record<number, number>>({});
  const [llmCache, setLlmCache] = useState<Record<string, string>>({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [isBacksolving, setIsBacksolving] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [numSamples, setNumSamples] = useState(1000);
  const [backupOverrides, setBackupOverrides] = useState<Record<string, number> | null>(null);

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
      questions: []
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
      epsilon_override: overrides.epsilon
    };
  }, [journeyType, E, N, source, steps, c1, c2, c3, w_c, w_f, w_E, w_N, U0, overrides]);

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
        include_sample_results: true
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
      
      // Convert optimal_step_order array to optimalPositions object
      const optimalPositionsMap: Record<number, number> = {};
      if (data.optimal_step_order && Array.isArray(data.optimal_step_order)) {
        data.optimal_step_order.forEach((originalIndex: number, newPosition: number) => {
          optimalPositionsMap[originalIndex] = newPosition;
        });
      }
      
      setOptimalPositions(optimalPositionsMap);
      setSimulationData((prev: SimulationData | null) => prev ? { ...prev, bestCR: data.optimal_CR_total } : null);
      
      toast({
        title: "Optimization Complete",
        description: `Best CR found: ${(data.optimal_CR_total * 100).toFixed(2)}%`
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

        {/* Optimize Controls */}
        <OptimizeControls
          numSamples={numSamples}
          setNumSamples={setNumSamples}
          onRunOptimize={runOptimize}
          isOptimizing={isOptimizing}
        />

        {/* Results Table */}
        {simulationData && (
          <ResultsTable
            steps={steps}
            simulationData={simulationData}
            optimalPositions={optimalPositions}
            optimizeData={optimizeResult || undefined}
            llmCache={llmCache}
            setLlmCache={setLlmCache}
          />
        )}

        {/* Export & Share Controls */}
        <ExportShareControls
          buildPayload={buildPayload}
          simulationData={simulationData}
          backsolveResult={backsolveResult}
          optimalPositions={optimalPositions}
          llmCache={llmCache}
        />

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
