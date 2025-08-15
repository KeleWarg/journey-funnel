import React, { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { useToast } from '@hooks/use-toast';
import { useAnalysis } from '../contexts/FunnelAnalysisContext';
import { useCalculation, useBacksolve } from '@hooks/use-api';
import { StepWithText } from '../types';
import SimulationBacksolveControls from './SimulationBacksolveControls';
import BacksolveResultPanel from './BacksolveResultPanel';

interface SimulationSectionProps {
  steps: StepWithText[];
  categoryTitle: string;
  buildPayload: () => any;
  canRunCompleteAnalysis: boolean;
}

const SimulationSection: React.FC<SimulationSectionProps> = ({
  steps,
  categoryTitle,
  buildPayload,
  canRunCompleteAnalysis
}) => {
  const { toast } = useToast();
  const { state, dispatch } = useAnalysis();
  
  // Memoized payload for API calls
  const payload = React.useMemo(() => buildPayload(), [buildPayload]);
  
  // SWR hooks for API calls (conditionally enabled)
  const { 
    data: calculationData, 
    error: calculationError, 
    refresh: refreshCalculation,
    isLoading: isCalculating 
  } = useCalculation(payload, false); // Manual trigger
  
  const { 
    data: backsolveData, 
    error: backsolveError, 
    refresh: refreshBacksolve,
    isLoading: isBacksolving 
  } = useBacksolve(payload, false); // Manual trigger

  // Handle simulation
  const runSimulation = useCallback(async () => {
    try {
      // Validate steps
      if (!steps || steps.length === 0) {
        throw new Error("At least one step is required");
      }
      
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (!step?.questions?.length) {
          throw new Error(`Step ${i + 1} must have at least one question`);
        }
        
        for (let j = 0; j < step.questions.length; j++) {
          const question = step.questions[j];
          if (!question?.input_type || !question?.title?.trim()) {
            throw new Error(`Question ${j + 1} in step ${i + 1} is incomplete`);
          }
        }
      }

      // Trigger calculation
      const result = await refreshCalculation();
      
      if (result) {
        // Transform data to match expected format
        const transformedData = {
          predictedSteps: result.per_step_metrics.map((r: any) => ({ CR_s: r.CR_s })),
          CR_total: result.overall_predicted_CR,
          bestCR: result.bestCR
        };
        
        dispatch({ type: 'SET_SIMULATION_DATA', payload: transformedData });
        
        toast({
          title: "Simulation Complete",
          description: "Conversion rates predicted successfully"
        });
      }
    } catch (error) {
      console.error('Simulation error:', error);
      toast({
        title: "Simulation Failed",
        description: error instanceof Error ? error.message : "Please check your inputs and try again.",
        variant: "destructive"
      });
    }
  }, [steps, refreshCalculation, dispatch, toast]);

  // Handle backsolve
  const runBacksolve = useCallback(async () => {
    try {
      // Validate observed conversion rates
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (typeof step.observedCR !== 'number' || step.observedCR < 0 || step.observedCR > 1) {
          throw new Error(`Step ${i + 1} must have a valid observed CR value between 0 and 1`);
        }
      }

      const result = await refreshBacksolve();
      
      if (result) {
        dispatch({ type: 'SET_BACKSOLVE_RESULT', payload: result });
        
        toast({
          title: "Back-solve Complete", 
          description: `Optimized parameters: k=${result.bestParams?.best_k?.toFixed(3)}, γ_exit=${result.bestParams?.best_gamma_exit?.toFixed(3)}`
        });
      }
    } catch (error) {
      console.error('Back-solve error:', error);
      toast({
        title: "Back-solve Failed",
        description: error instanceof Error ? error.message : "Please check your observed conversion rates.",
        variant: "destructive"
      });
    }
  }, [steps, refreshBacksolve, dispatch, toast]);

  // Complete analysis workflow
  const runCompleteAnalysis = useCallback(async () => {
    dispatch({ type: 'SET_LOADING_STATE', payload: { key: 'isRunningComplete', value: true } });
    
    try {
      // Step 1: Run simulation
      dispatch({ type: 'SET_LOADING_MESSAGE', payload: 'Running initial simulation...' });
      await runSimulation();
      
      // Step 2: Run backsolve
      dispatch({ type: 'SET_LOADING_MESSAGE', payload: 'Optimizing parameters with back-solve...' });
      await runBacksolve();
      
      // Step 3: Re-run simulation with optimized parameters would happen automatically via SWR
      dispatch({ type: 'SET_LOADING_MESSAGE', payload: 'Analysis complete!' });
      
      toast({
        title: "Complete Analysis Finished",
        description: "Initial simulation and back-solve optimization completed successfully!"
      });
    } catch (error) {
      console.error('Complete analysis error:', error);
      toast({
        title: "Complete Analysis Failed", 
        description: error instanceof Error ? error.message : "Please check your inputs and try again.",
        variant: "destructive"
      });
    } finally {
      dispatch({ type: 'SET_LOADING_STATE', payload: { key: 'isRunningComplete', value: false } });
      dispatch({ type: 'SET_LOADING_MESSAGE', payload: '' });
    }
  }, [runSimulation, runBacksolve, dispatch, toast]);

  return (
    <>
      <SimulationBacksolveControls
        onRunCompleteAnalysis={runCompleteAnalysis}
        isRunningComplete={state.isRunningComplete}
        loadingMessage={state.loadingMessage}
        canRunCompleteAnalysis={canRunCompleteAnalysis}
        categoryTitle={categoryTitle}
      />

      {state.backsolveResult && (
        <BacksolveResultPanel backsolveResult={state.backsolveResult} />
      )}

      {/* Error display */}
      {(calculationError || backsolveError) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">API Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">
              {calculationError?.message || backsolveError?.message}
            </p>
            <div className="mt-2 space-x-2">
              {calculationError && (
                <Button onClick={refreshCalculation} variant="outline" size="sm">
                  Retry Calculation
                </Button>
              )}
              {backsolveError && (
                <Button onClick={refreshBacksolve} variant="outline" size="sm">
                  Retry Backsolve
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default React.memo(SimulationSection);