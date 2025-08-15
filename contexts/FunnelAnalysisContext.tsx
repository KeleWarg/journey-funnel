import React, { createContext, useContext, useReducer, useMemo, ReactNode } from 'react';
import { BacksolveResult, SimulationData, LLMAssessmentResult, MCPFunnelResult, OptimizeResult, FoggStepAssessmentResult } from '../types';

// Analysis state interface
interface AnalysisState {
  simulationData: SimulationData | null;
  backsolveResult: BacksolveResult | null;
  llmAssessmentResult: LLMAssessmentResult | null;
  mcpFunnelResult: MCPFunnelResult | null;
  enhancedMcpResult: any | null;
  optimizeResult: OptimizeResult | null;
  foggStepAssessments: FoggStepAssessmentResult | null;
  
  // Loading states
  isRunningComplete: boolean;
  isOptimizing: boolean;
  isAssessing: boolean;
  isMCPAnalyzing: boolean;
  isEnhancedMCPAnalyzing: boolean;
  isFoggStepAssessing: boolean;
  
  // UI state
  loadingMessage: string;
  optimalPositions: Record<number, number>;
}

// Action types
type AnalysisAction =
  | { type: 'SET_SIMULATION_DATA'; payload: SimulationData | null }
  | { type: 'SET_BACKSOLVE_RESULT'; payload: BacksolveResult | null }
  | { type: 'SET_LLM_ASSESSMENT'; payload: LLMAssessmentResult | null }
  | { type: 'SET_MCP_RESULT'; payload: MCPFunnelResult | null }
  | { type: 'SET_ENHANCED_MCP_RESULT'; payload: any }
  | { type: 'SET_OPTIMIZE_RESULT'; payload: OptimizeResult | null }
  | { type: 'SET_FOGG_ASSESSMENTS'; payload: FoggStepAssessmentResult | null }
  | { type: 'SET_LOADING_STATE'; payload: { key: keyof AnalysisState; value: boolean } }
  | { type: 'SET_LOADING_MESSAGE'; payload: string }
  | { type: 'SET_OPTIMAL_POSITIONS'; payload: Record<number, number> }
  | { type: 'RESET_ANALYSIS' };

// Initial state
const initialState: AnalysisState = {
  simulationData: null,
  backsolveResult: null,
  llmAssessmentResult: null,
  mcpFunnelResult: null,
  enhancedMcpResult: null,
  optimizeResult: null,
  foggStepAssessments: null,
  
  isRunningComplete: false,
  isOptimizing: false,
  isAssessing: false,
  isMCPAnalyzing: false,
  isEnhancedMCPAnalyzing: false,
  isFoggStepAssessing: false,
  
  loadingMessage: '',
  optimalPositions: {}
};

// Reducer
const analysisReducer = (state: AnalysisState, action: AnalysisAction): AnalysisState => {
  switch (action.type) {
    case 'SET_SIMULATION_DATA':
      return { ...state, simulationData: action.payload };
    case 'SET_BACKSOLVE_RESULT':
      return { ...state, backsolveResult: action.payload };
    case 'SET_LLM_ASSESSMENT':
      return { ...state, llmAssessmentResult: action.payload };
    case 'SET_MCP_RESULT':
      return { ...state, mcpFunnelResult: action.payload };
    case 'SET_ENHANCED_MCP_RESULT':
      return { ...state, enhancedMcpResult: action.payload };
    case 'SET_OPTIMIZE_RESULT':
      return { ...state, optimizeResult: action.payload };
    case 'SET_FOGG_ASSESSMENTS':
      return { ...state, foggStepAssessments: action.payload };
    case 'SET_LOADING_STATE':
      return { ...state, [action.payload.key]: action.payload.value };
    case 'SET_LOADING_MESSAGE':
      return { ...state, loadingMessage: action.payload };
    case 'SET_OPTIMAL_POSITIONS':
      return { ...state, optimalPositions: action.payload };
    case 'RESET_ANALYSIS':
      return { ...initialState };
    default:
      return state;
  }
};

// Context
interface AnalysisContextType {
  state: AnalysisState;
  dispatch: React.Dispatch<AnalysisAction>;
  
  // Computed values
  canRunDetailedAssessment: boolean;
  hasAnyResults: boolean;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

// Provider component
interface AnalysisProviderProps {
  children: ReactNode;
}

export const AnalysisProvider: React.FC<AnalysisProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(analysisReducer, initialState);
  
  // Memoized computed values
  const contextValue = useMemo(() => ({
    state,
    dispatch,
    canRunDetailedAssessment: state.simulationData !== null && state.backsolveResult !== null,
    hasAnyResults: state.simulationData !== null || state.llmAssessmentResult !== null || state.mcpFunnelResult !== null
  }), [state]);

  return (
    <AnalysisContext.Provider value={contextValue}>
      {children}
    </AnalysisContext.Provider>
  );
};

// Custom hook
export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
};

// Helper hooks for specific analysis types
export const useSimulationData = () => {
  const { state } = useAnalysis();
  return state.simulationData;
};

export const useBacksolveResult = () => {
  const { state } = useAnalysis();
  return state.backsolveResult;
};

export const useLLMAssessment = () => {
  const { state } = useAnalysis();
  return state.llmAssessmentResult;
};

export const useLoadingStates = () => {
  const { state } = useAnalysis();
  return {
    isRunningComplete: state.isRunningComplete,
    isOptimizing: state.isOptimizing,
    isAssessing: state.isAssessing,
    isMCPAnalyzing: state.isMCPAnalyzing,
    isEnhancedMCPAnalyzing: state.isEnhancedMCPAnalyzing,
    isFoggStepAssessing: state.isFoggStepAssessing,
    loadingMessage: state.loadingMessage
  };
};