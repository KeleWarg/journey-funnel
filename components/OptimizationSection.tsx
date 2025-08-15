import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { useToast } from '@hooks/use-toast';
import { Loader2Icon } from 'lucide-react';
import { useAnalysis } from '../contexts/FunnelAnalysisContext';
import { useOptimization } from '@hooks/use-api';
import { StepWithText } from '../types';

interface OptimizationSectionProps {
  steps: StepWithText[];
  buildPayload: () => any;
  onApplyOptimalOrder?: (order: number[]) => void;
}

const OptimizationSection: React.FC<OptimizationSectionProps> = ({
  steps,
  buildPayload,
  onApplyOptimalOrder
}) => {
  const { toast } = useToast();
  const { state, dispatch } = useAnalysis();
  const [numSamples, setNumSamples] = useState(20000);
  const [hybridSeeding, setHybridSeeding] = useState(false);
  
  // Memoized optimization payload
  const optimizationPayload = React.useMemo(() => ({
    ...buildPayload(),
    sample_count: numSamples,
    use_backsolved_constants: !!state.backsolveResult,
    best_k: state.backsolveResult?.bestParams?.best_k,
    best_gamma_exit: state.backsolveResult?.bestParams?.best_gamma_exit,
    include_sample_results: true,
    hybrid_seeding: hybridSeeding,
    seeded_order: hybridSeeding,
    llmAssessments: state.llmAssessmentResult?.assessments || [],
    foggStepAssessments: state.foggStepAssessments?.assessments || [],
    useFoggSeeding: state.foggStepAssessments?.assessments && state.foggStepAssessments.assessments.length > 0,
    optimizationStrategy: state.foggStepAssessments?.assessments && state.foggStepAssessments.assessments.length > 0 ? 'fogg_intelligent' : 'standard'
  }), [buildPayload, numSamples, hybridSeeding, state.backsolveResult, state.llmAssessmentResult, state.foggStepAssessments]);

  const { 
    data: optimizationData, 
    error: optimizationError, 
    refresh: runOptimization,
    isLoading: isOptimizing 
  } = useOptimization(optimizationPayload, false); // Manual trigger

  const handleOptimize = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING_STATE', payload: { key: 'isOptimizing', value: true } });
      
      const result = await runOptimization();
      
      if (result) {
        // Convert optimalOrder array to optimalPositions object
        const optimalPositionsMap: Record<number, number> = {};
        if (result.optimalOrder && Array.isArray(result.optimalOrder)) {
          result.optimalOrder.forEach((originalIndex: number, newPosition: number) => {
            optimalPositionsMap[originalIndex] = newPosition;
          });
        }
        
        // Map API response to expected format
        const mappedData = {
          ...result,
          optimal_step_order: result.optimalOrder,
          optimal_CR_total: result.optimalCRTotal,
          sample_results: result.allSamples || []
        };
        
        dispatch({ type: 'SET_OPTIMAL_POSITIONS', payload: optimalPositionsMap });
        dispatch({ type: 'SET_OPTIMIZE_RESULT', payload: mappedData });
        
        // Update simulation with best CR
        if (state.simulationData) {
          dispatch({ 
            type: 'SET_SIMULATION_DATA', 
            payload: { 
              ...state.simulationData, 
              bestCR: result.optimalCRTotal 
            } 
          });
        }
        
        toast({
          title: "Optimization Complete",
          description: `Best CR found: ${(result.optimalCRTotal * 100).toFixed(2)}% using ${result.algorithm} algorithm${result.fogg_seeding?.enabled ? ' with Fogg B=MAT seeding' : result.hybrid_seeding?.enabled ? ' with Hybrid seeding' : ''}`
        });
      }
    } catch (error) {
      console.error('Optimization error:', error);
      toast({
        title: "Optimization Failed", 
        description: "Please try again with different parameters.",
        variant: "destructive"
      });
    } finally {
      dispatch({ type: 'SET_LOADING_STATE', payload: { key: 'isOptimizing', value: false } });
    }
  }, [runOptimization, dispatch, state.simulationData, toast]);

  // Don't render if no simulation data
  if (!state.simulationData) {
    return null;
  }

  return (
    <Card className="border border-gray-200 shadow-sm bg-gradient-to-r from-purple-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-indigo-900">
          🎯 Find Optimal Step Flow
        </CardTitle>
        <p className="text-gray-600">
          AI-powered step reordering using live Fogg B=MAT analysis, unique combinations impact, and intelligent optimization.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Fogg-Based Optimization Status */}
        {state.foggStepAssessments?.assessments && state.foggStepAssessments.assessments.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🧠</span>
              <h4 className="text-lg font-semibold text-blue-900">🧠 Fogg B=MAT Intelligence Available</h4>
              {!state.foggStepAssessments.isMock && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Live AI Analysis
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {state.foggStepAssessments.assessments.map((assessment, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-sm font-medium text-gray-900 mb-2">Step {assessment.stepIndex + 1}</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-bold text-blue-600">{assessment.motivation_score != null ? assessment.motivation_score.toFixed(1) : 'N/A'}</div>
                      <div className="text-gray-600">Motivation</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-green-600">{assessment.ability_score != null ? assessment.ability_score.toFixed(1) : 'N/A'}</div>
                      <div className="text-gray-600">Ability</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-purple-600">{assessment.trigger_score != null ? assessment.trigger_score.toFixed(1) : 'N/A'}</div>
                      <div className="text-gray-600">Trigger</div>
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <div className="text-sm font-bold text-gray-900">
                      Overall: {assessment.overall_score != null ? assessment.overall_score.toFixed(1) : 'N/A'}/5
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-blue-700">
              ✨ <strong>Smart Optimization:</strong> Using live Fogg scores to intelligently seed step reordering for maximum conversion impact.
            </p>
          </div>
        )}

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
              Optimization Strategy
            </Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="fogg-seeding"
                  checked={state.foggStepAssessments?.assessments && state.foggStepAssessments.assessments.length > 0}
                  disabled={true}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="text-sm text-gray-900">
                  🧠 Fogg B=MAT Seeding {state.foggStepAssessments?.assessments && state.foggStepAssessments.assessments.length > 0 ? '(Active)' : '(Run Assessment)'}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hybrid-seeding"
                  checked={hybridSeeding}
                  onChange={(e) => setHybridSeeding(e.target.checked)}
                  disabled={!state.llmAssessmentResult?.assessments?.length}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label 
                  htmlFor="hybrid-seeding" 
                  className={`text-sm ${state.llmAssessmentResult?.assessments?.length ? 'text-gray-900' : 'text-gray-400'}`}
                >
                  📊 Framework Analysis Boost
                </label>
              </div>
            </div>
            {!(state.foggStepAssessments?.assessments && state.foggStepAssessments.assessments.length > 0) && (
              <p className="text-xs text-amber-600">
                ⚠️ Run Detailed Assessment first for AI-powered optimization
              </p>
            )}
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleOptimize}
              disabled={isOptimizing}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 w-full lg:w-auto"
            >
              {isOptimizing ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  Optimizing...
                </>
              ) : (
                state.foggStepAssessments?.assessments && state.foggStepAssessments.assessments.length > 0 ? '🧠 AI-Optimize Flow' : 'Find Optimal Flow'
              )}
            </Button>
          </div>
        </div>

        {/* Enhanced Help Text */}
        <div className="text-sm text-gray-600 space-y-2 bg-white p-4 rounded-lg">
          <p>
            <strong>🎯 AI-Powered Step Optimization:</strong> Uses live Fogg Behavior Model analysis to intelligently reorder steps for maximum conversion.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <p className="font-medium text-gray-800">🧠 Fogg B=MAT Seeding:</p>
              <p className="text-xs">Orders steps by Motivation × Ability × Trigger scores from live AI analysis</p>
            </div>
            <div>
              <p className="font-medium text-gray-800">📊 Framework Analysis:</p>
              <p className="text-xs">Combines PAS, AIDA, Nielsen principles with Fogg insights for optimal flow</p>
            </div>
          </div>
        </div>

        {/* Optimization Results */}
        {state.optimizeResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-800">🚀 Optimization Results</h4>
              {state.optimizeResult.algorithm && (
                <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                  {state.optimizeResult.algorithm === 'hybrid_seeded_sampling' ? '🧠 Hybrid Seeded' : 
                   state.optimizeResult.algorithm === 'exhaustive' ? '🔍 Exhaustive' : '🔄 Heuristic'} Search
                </span>
              )}
            </div>
            
            {/* Optimal Flow */}
            {state.optimizeResult.optimal_step_order && (
              <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-purple-700">✨ Optimal Flow</span>
                  <span className="text-lg font-bold text-green-700">
                    {(state.optimizeResult.optimal_CR_total * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {state.optimizeResult.optimal_step_order.map((originalStepIndex, position) => (
                    <div key={position} className="flex items-center gap-1">
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                        Step {originalStepIndex + 1}
                      </span>
                      {position < state.optimizeResult.optimal_step_order.length - 1 && (
                        <span className="text-gray-400">→</span>
                      )}
                    </div>
                  ))}
                </div>
                {onApplyOptimalOrder && (
                  <Button
                    onClick={() => onApplyOptimalOrder!(state.optimizeResult!.optimal_step_order)}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Apply This Order
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error display */}
        {optimizationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{optimizationError.message}</p>
            <Button onClick={runOptimization} variant="outline" size="sm" className="mt-2">
              Retry Optimization
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default React.memo(OptimizationSection);