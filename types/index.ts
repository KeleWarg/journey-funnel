import { Dispatch, SetStateAction } from 'react';

export interface FrameworkAssessment {
  framework: string;
  issues: string[];
  suggestions: string[];
  rewrittenQuestion?: string;
}

// New LLM Assessment interfaces
export interface LLMFrameworkSuggestion {
  framework: string;
  revisedText: string;
  rationale: string;
}

export interface LLMStepAssessment {
  stepIndex: number;
  base_CR_s: number;
  estimated_uplift: number;
  new_CR_s: number;
  cumulative_new_CR_s: number;
  suggestions: LLMFrameworkSuggestion[];
  titleSuggestion?: string;
  supportCopySuggestion?: string;
  extraSupportSuggestions?: string[];
}

export interface LLMAssessmentResult {
  assessments: Array<{
    questionTitle: string;
    frameworkAssessments: Array<{
      framework: string;
      issues: string[];
      suggestions: string[];
      rewrittenQuestion?: string;
    }>;
  }>;
  timestamp: string;
}

export interface FoggRecommendation {
  type: 'content_rewrite' | 'interaction_improvement' | 'support_content' | 'ux_enhancement';
  title: string;
  description: string;
  before?: string;
  after?: string;
  implementation?: string;
}

export interface FoggStepAssessment {
  stepIndex: number;
  motivation_score: number;
  ability_score: number;
  trigger_score: number;
  overall_score: number;
  barriers: string[];
  recommendations: FoggRecommendation[];
  improvement_summary: string;
}

export interface FoggStepAssessmentResult {
  assessments: FoggStepAssessment[];
  isMock?: boolean;
}

// MCP-specific interfaces
export interface MCPStepAssessment {
  stepIndex: number;
  base_CR_s: number;
  estimated_uplift: number;
  new_CR_s: number;
  cumulative_new_CR_s: number;
  suggestions: LLMFrameworkSuggestion[];
  titleSuggestion?: string;
  supportCopySuggestion?: string;
  extraSupportSuggestions?: string[];
}

export interface MCPOrderRecommendation {
  framework: string;
  recommendedOrder: number[];
  expected_CR_total: number;
}

export interface MCPAssessmentResult {
  assessments: MCPStepAssessment[];
  order_recommendations: MCPOrderRecommendation[];
  baseline_CR_total: number;
  predicted_CR_total: number;
  boosted_CR_total: number; // For backward compatibility
  uplift_total: number;
}

export interface MCPFunnelVariant {
  framework: string;
  step_order: number[];
  CR_total: number;
  uplift_pp: number;
  suggestions: Array<{
    framework: string;
    revisedText: string;
    rationale: string;
    estimated_uplift: number;
  }>;
}

export interface MCPFunnelResult {
  baselineCR: number;
  variants: MCPFunnelVariant[];
  metadata: {
    totalVariants: number;
    topPerformer: MCPFunnelVariant;
    averageUplift: number;
    frameworksAnalyzed: string[];
  };
}

export interface Question {
  title: string;
  input_type: string;
  invasiveness: number;
  difficulty: number;
}

export interface BoostElement {
  id: string;
  text: string;
  category?: string;
  score?: number;
}

export interface Step {
  boosts: number;
  observedCR: number;
  questions: Question[];
  boostElements?: BoostElement[];
}

export interface SimulationData {
  predictedSteps: { CR_s: number }[];
  CR_total: number;  // Keep CR_total for internal use, transformed from overall_predicted_CR
  bestCR?: number;
}

export interface BacksolveResult {
  bestParams: {
    best_k: number;
    best_gamma_exit: number;
    best_mse: number;
    overall_predicted_CR_best: number;
    overall_observed_CR: number;
  };
}

export interface OptimizeResult {
  optimal_step_order: number[];
  optimal_CR_total: number;
  sample_results?: Array<{
    order: number[];
    CR_total: number;
  }>;
  fogg_seeding?: {
    enabled: boolean;
    seeded_order: number[] | null;
    seeded_order_is_optimal: boolean;
  };
  hybrid_seeding?: {
    enabled: boolean;
    seeded_order: number[] | null;
    seeded_order_is_optimal: boolean;
  };
  algorithm?: string;
  samplesEvaluated?: number;
}

export interface JourneyConstants {
  journeyType: string;
  E: number;
  N_importance: number;
  source: string;
  c1: number;
  c2: number;
  c3: number;
  w_c: number;
  w_f: number;
  w_E: number;
  w_N: number;
  U0: number;
}

export interface StepsEditorProps {
  steps: Step[];
  onAddStep: () => void;
  onRemoveStep: (index: number) => void;
  onUpdateStep: (index: number, updates: Partial<Step>) => void;
  onAddQuestion: (stepIndex: number) => void;
  onRemoveQuestion: (stepIndex: number, questionIndex: number) => void;
  onUpdateQuestion: (stepIndex: number, questionIndex: number, updates: Partial<Question>) => void;
  inputTypeOptions: { value: string; label: string }[];
  invasivenessOptions: { value: number; label: string }[];
  difficultyOptions: { value: number; label: string }[];
}

export interface OptimizeControlsProps {
  numSamples: number;
  setNumSamples: (value: number) => void;
  onRunOptimize: () => void;
  isOptimizing: boolean;
  hybridSeeding: boolean;
  setHybridSeeding: (value: boolean) => void;
  hasLLMAssessments?: boolean;
}

export interface FunnelSettingsSectionProps {
  journeyType: string;
  onJourneyTypeChange: (type: string) => void;
  E: number;
  setE: (value: number) => void;
  N: number;
  setN: (value: number) => void;
  source: string;
  setSource: (value: string) => void;
  U0: number;
  setU0: (value: number) => void;
  c1: number;
  setC1: (value: number) => void;
  c2: number;
  setC2: (value: number) => void;
  c3: number;
  setC3: (value: number) => void;
  w_c: number;
  setWC: (value: number) => void;
  w_f: number;
  setWF: (value: number) => void;
  w_E: number;
  setWE: (value: number) => void;
  w_N: number;
  setWN: (value: number) => void;
}

export interface CurrentConstantsSectionProps {
  overrides: Record<string, number>;
  setOverrides: Dispatch<SetStateAction<Record<string, number>>>;
}

export interface BacksolveResultPanelProps {
  backsolveResult: BacksolveResult;
}

export interface SimulationBacksolveControlsProps {
  onRunCompleteAnalysis: () => void;
  isRunningComplete: boolean;
  loadingMessage: string;
  canRunCompleteAnalysis: boolean;
  categoryTitle?: string;
}

export interface APIResponse<T> {
  data?: T;
  error?: string;
  details?: string;
}

export interface StepWithText extends Step {
  questionTexts: string[];
  title?: string;
  supportCopy?: string;
  extraSupportTexts?: string[];
} 