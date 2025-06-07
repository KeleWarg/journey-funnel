import { NextApiRequest } from 'next';

export interface Question {
  input_type: string;
  invasiveness: number;
  difficulty: number;
}

export interface Step {
  questions: Question[];
  boosts: number;
}

export interface CalculateRequest extends NextApiRequest {
  body: {
    journeyType: string;
    steps: Step[];
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
    k_override?: number;
    gamma_exit_override?: number;
    epsilon_override?: number;
  };
}

export interface StepResult {
  step: number;
  SC_s: number;
  F_s: number;
  PS_s: number;
  M_s: number;
  delta_s: number;
  p_exit_s: number;
  CR_s: number;
  cumulative_CR_s: number;
  U_s_pred: number;
}

export interface CalculateResponse {
  per_step_metrics: StepResult[];
  overall_predicted_CR: number;
}

export interface AssessQuestionRequest extends NextApiRequest {
  body: {
    questionTitle: string;
    sampleResponses: string[] | string;
    frameworks: string[];
  };
}

export interface FrameworkAssessment {
  framework: string;
  issues: string[];
  suggestions: string[];
  rewrittenQuestion?: string;
}

export interface AssessQuestionResponse {
  frameworkAssessments: FrameworkAssessment[];
}

export interface BacksolveRequest extends NextApiRequest {
  body: {
    steps: Step[];
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
    observed_CR_s: number[];
  };
}

export interface BacksolveResponse {
  bestParams: {
    best_k: number;
    best_gamma_exit: number;
    best_mse: number;
    overall_predicted_CR_best: number;
    overall_observed_CR: number;
  };
}

export interface OptimizeRequest extends NextApiRequest {
  body: {
    steps: Step[];
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
    sample_count?: number;
    use_backsolved_constants?: boolean;
    best_k?: number;
    best_gamma_exit?: number;
    include_sample_results?: boolean;
  };
}

export interface OptimizeResponse {
  optimal_step_order: number[];
  optimal_CR_total: number;
  sample_results?: Array<{
    order: number[];
    CR_total: number;
  }>;
}

export interface APIResponse<T> {
  data?: T;
  error?: string;
  details?: string;
} 