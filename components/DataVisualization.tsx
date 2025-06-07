import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Collapsible, CollapsibleContent } from '@components/ui/collapsible';
import { BarChart3Icon } from 'lucide-react';
import { Step, SimulationData, OptimizeResult } from '../types';

interface DataVisualizationProps {
  steps: Step[];
  simulationData: SimulationData | null;
  optimizeResult: OptimizeResult & { 
    model_validation?: {
      current_predicted_CR: number;
      current_observed_CR: number;
      accuracy_error_percent: number;
      is_reliable: boolean;
      warning?: string | null;
    }
  } | null;
  // Simulation parameters needed for calculating step CRs
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
  use_backsolved_constants?: boolean;
  best_k?: number;
  best_gamma_exit?: number;
}

interface StepCombination {
  label: string;
  order: number[];
  stepCRs: number[];
  totalCR: number;
  isOptimal: boolean;
  color: string;
}

const DataVisualization: React.FC<DataVisualizationProps> = ({
  steps,
  simulationData,
  optimizeResult,
  E,
  N_importance,
  source,
  c1,
  c2,
  c3,
  w_c,
  w_f,
  w_E,
  w_N,
  use_backsolved_constants = false,
  best_k,
  best_gamma_exit
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{
    combinationIndex: number;
    stepIndex: number;
    x: number;
    y: number;
  } | null>(null);

  // Function to simulate step-by-step conversion rates for a given order
  const simulateStepByStepCRs = (orderedSteps: Step[]) => {
    // Source multiplier per YAML
    const sourceMultipliers = {
      paid_search: 1.3,
      paid_social: 1.1,
      organic_search: 1.0,
      direct_referral: 1.0,
      display_email: 0.9,
      social_organic: 0.7,
    };
    const S = sourceMultipliers[source as keyof typeof sourceMultipliers] || 1.0;
    
    // Entry motivation per YAML
    let M_prev = Math.min(5, (w_E * E + w_N * N_importance) * S);

    // Constants per YAML specification
    const k = (use_backsolved_constants && best_k) ? best_k : 0.24;
    
    let gammaExit;
    if (use_backsolved_constants && best_gamma_exit) {
      gammaExit = best_gamma_exit;
    } else {
      if (orderedSteps.length <= 6) gammaExit = 1.04;
      else if (orderedSteps.length <= 12) gammaExit = 0.80;
      else gammaExit = 0.60;
    }

    let alpha = Math.min(3.0, 1 + orderedSteps.length / 10);
    
    let beta;
    if (orderedSteps.length <= 6) beta = 0.30;
    else if (orderedSteps.length <= 12) beta = 0.40;
    else beta = 0.50;

    let gammaBoost;
    if (orderedSteps.length <= 6) gammaBoost = 0.20;
    else if (orderedSteps.length <= 12) gammaBoost = 0.25;
    else gammaBoost = 0.30;

    let burdenStreak = 0;
    const stepCRs: number[] = [];

    orderedSteps.forEach((step: any, idx: number) => {
      const s = idx + 1;
      
      // Compute SC_s using YAML Qs scale (1-5)
      let sum_SC = 0;
      step.questions.forEach((q: any) => {
        let Q_s;
        switch (q.input_type) {
          case '1': Q_s = 1; break;
          case '2': Q_s = 2; break;
          case '3': Q_s = 3; break;
          case '4': Q_s = 4; break;
          case '5': Q_s = 5; break;
          default: Q_s = 2;
        }
        
        const I_s = q.invasiveness;
        const D_s = q.difficulty;
        const numerator = c1 * Q_s + c2 * I_s + c3 * D_s;
        const denominator = c1 + c2 + c3;
        sum_SC += numerator / denominator;
      });
      
      // Strategy 2: Add epsilon penalty for multiple questions  
      const epsilon_per_extra_question = 0.05;
      const qCount = step.questions.length;
      const extraQuestions = Math.max(0, qCount - 1);
      const epsilonPenalty = epsilon_per_extra_question * extraQuestions;
      
      const SC_s_raw = sum_SC / step.questions.length;
      const SC_s = Math.min(5, Math.max(1, SC_s_raw + epsilonPenalty));

      const progress = orderedSteps.length <= 6 ? s / orderedSteps.length : Math.sqrt(s / orderedSteps.length);
      
      if (SC_s >= 4) {
        burdenStreak += 1;
      } else {
        burdenStreak = 0;
      }

      const F_s = Math.min(5, Math.max(1, 1 + alpha * progress + beta * burdenStreak - gammaBoost * step.boosts));
      const PS_s = (w_c * SC_s + w_f * F_s) / (w_c + w_f);
      const M_s = Math.max(0, M_prev - k * PS_s);
      const delta_s = PS_s - M_s;
      const p_exit_s = 1 / (1 + Math.exp(-gammaExit * delta_s));
      const CR_s = 1 - p_exit_s;
      
      stepCRs.push(CR_s);
      M_prev = M_s;
    });

    return stepCRs;
  };

  // Prepare data for step combinations
  const combinations = useMemo((): StepCombination[] => {
    if (!steps || !simulationData || !optimizeResult?.sample_results) return [];

    const combos: StepCombination[] = [];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    
    // Add current order (original step order)
    const currentOrderStepCRs = simulateStepByStepCRs(steps);
    combos.push({
      label: 'Current Order',
      order: steps.map((_, i) => i + 1),
      stepCRs: currentOrderStepCRs.map(cr => cr * 100),
      totalCR: simulationData.CR_total * 100,
      isOptimal: false,
      color: colors[0]
    });

    // Add optimal order if available
    if (optimizeResult.optimal_step_order) {
      const optimalOrderedSteps = optimizeResult.optimal_step_order.map(stepIndex => steps[stepIndex]);
      const optimalStepCRs = simulateStepByStepCRs(optimalOrderedSteps);
      combos.push({
        label: 'Optimal Order',
        order: optimizeResult.optimal_step_order.map(i => i + 1),
        stepCRs: optimalStepCRs.map(cr => cr * 100),
        totalCR: optimizeResult.optimal_CR_total * 100,
        isOptimal: true,
        color: colors[1]
      });
    }

    // Add unique alternative combinations
    const uniqueOrders = new Set([
      steps.map((_, i) => i).join('-'),
      optimizeResult.optimal_step_order?.join('-')
    ].filter(Boolean));

    optimizeResult.sample_results
      .sort((a, b) => b.CR_total - a.CR_total)
      .slice(0, 20)
      .forEach((result) => {
        const orderKey = result.order.join('-');
        if (!uniqueOrders.has(orderKey) && combos.length < 6) {
          uniqueOrders.add(orderKey);
          const altOrderedSteps = result.order.map(stepIndex => steps[stepIndex]);
          const altStepCRs = simulateStepByStepCRs(altOrderedSteps);
          combos.push({
            label: `Alternative ${combos.length - 1}`,
            order: result.order.map(i => i + 1),
            stepCRs: altStepCRs.map(cr => cr * 100),
            totalCR: result.CR_total * 100,
            isOptimal: false,
            color: colors[combos.length % colors.length]
          });
        }
      });

    return combos;
  }, [steps, simulationData, optimizeResult, E, N_importance, source, c1, c2, c3, w_c, w_f, w_E, w_N, use_backsolved_constants, best_k, best_gamma_exit]);

  if (!combinations.length) {
    return null;
  }

  // Calculate chart dimensions
  const chartWidth = 600;
  const chartHeight = 300;
  const padding = { top: 20, right: 80, bottom: 40, left: 60 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Calculate scales
  const maxSteps = Math.max(...combinations.map(c => c.stepCRs.length));

  const xScale = (stepIndex: number) => padding.left + (stepIndex / (maxSteps - 1)) * plotWidth;
  const yScale = (cr: number) => padding.top + plotHeight - (cr / 100) * plotHeight;

  return (
    <div className="mt-8">
      {/* Model Validation Warning */}
      {optimizeResult?.model_validation && !optimizeResult.model_validation.is_reliable && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Model Reliability Warning</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{optimizeResult.model_validation.warning}</p>
                <div className="mt-2 flex gap-4 text-xs">
                  <span><strong>Predicted:</strong> {(optimizeResult.model_validation.current_predicted_CR * 100).toFixed(1)}%</span>
                  <span><strong>Observed:</strong> {(optimizeResult.model_validation.current_observed_CR * 100).toFixed(1)}%</span>
                  <span><strong>Error:</strong> {optimizeResult.model_validation.accuracy_error_percent.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="text-center mb-6">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto"
        >
          <BarChart3Icon className="h-5" />
          {isOpen ? 'Hide Visualization' : 'See Visualization'}
        </Button>
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <Card className="border border-indigo-200 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-indigo-900 flex items-center gap-2">
                <BarChart3Icon className="h-6 w-6" />
                Step Combination Performance
              </CardTitle>
              <p className="text-indigo-700">
                Compare conversion rates across different step orderings
              </p>
            </CardHeader>
            
            <CardContent>
              {/* Model Ceiling Panel */}
              {simulationData && optimizeResult && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <h4 className="text-lg font-semibold text-blue-900 mb-3">📈 Model Ceiling Analysis</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-700">
                        {(simulationData.CR_total * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Baseline CR</div>
                      <div className="text-xs text-gray-500">(Current Order)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {(optimizeResult.optimal_CR_total * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Model Ceiling</div>
                      <div className="text-xs text-gray-500">(Optimal Order)</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${
                        optimizeResult.optimal_CR_total > simulationData.CR_total ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {((optimizeResult.optimal_CR_total - simulationData.CR_total) * 100).toFixed(1)}pp
                      </div>
                      <div className="text-sm text-gray-600">Potential Gain</div>
                      <div className="text-xs text-gray-500">
                        {optimizeResult.optimal_CR_total > simulationData.CR_total ? 
                          '(Worth optimizing)' : '(Minimal improvement)'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Model Reliability Status */}
                  {optimizeResult.model_validation && (
                    <div className="mt-4 pt-3 border-t border-blue-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-700">Model Reliability:</span>
                        <span className={`font-medium ${
                          optimizeResult.model_validation.is_reliable ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                                                  {optimizeResult.model_validation.is_reliable ? 
                          '✓ Reliable' : 
                          optimizeResult.model_validation.accuracy_error_percent > 10000 ?
                            '⚠ Error calculation failed' :
                            `⚠ ${optimizeResult.model_validation.accuracy_error_percent.toFixed(1)}% error`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Combined Line Chart */}
              <div className="bg-white rounded-lg p-6 border border-gray-200 relative">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Conversion Rates by Step Position
                </h3>
                
                <div className="relative">
                  <svg 
                    width={chartWidth} 
                    height={chartHeight}
                    className="border border-gray-200 rounded"
                  >
                    
                    {/* Grid lines */}
                    {Array.from({ length: 6 }, (_, i) => {
                      const y = padding.top + (plotHeight / 5) * i;
                      const crValue = 100 - (100 / 5) * i;
                      return (
                        <g key={i}>
                          <line
                            x1={padding.left}
                            y1={y}
                            x2={padding.left + plotWidth}
                            y2={y}
                            stroke="#f3f4f6"
                            strokeWidth={1}
                          />
                          <text
                            x={padding.left - 10}
                            y={y + 4}
                            textAnchor="end"
                            fontSize={12}
                            fill="#6b7280"
                          >
                            {crValue.toFixed(0)}%
                          </text>
                        </g>
                      );
                    })}

                    {/* X-axis labels */}
                    {Array.from({ length: maxSteps }, (_, i) => (
                      <text
                        key={i}
                        x={xScale(i)}
                        y={chartHeight - 10}
                        textAnchor="middle"
                        fontSize={12}
                        fill="#6b7280"
                      >
                        Step {i + 1}
                      </text>
                    ))}

                    {/* Lines and points for each combination */}
                    {combinations.map((combo, comboIndex) => (
                      <g key={comboIndex}>
                        {/* Line */}
                        <polyline
                          points={combo.stepCRs.map((cr, stepIndex) => 
                            `${xScale(stepIndex)},${yScale(cr)}`
                          ).join(' ')}
                          fill="none"
                          stroke={combo.color}
                          strokeWidth={combo.isOptimal ? 4 : 2}
                          strokeDasharray={combo.isOptimal ? "none" : "5,5"}
                        />
                        
                        {/* Points */}
                        {combo.stepCRs.map((cr, stepIndex) => (
                          <circle
                            key={stepIndex}
                            cx={xScale(stepIndex)}
                            cy={yScale(cr)}
                            r={combo.isOptimal ? 6 : 4}
                            fill={combo.color}
                            stroke="white"
                            strokeWidth={2}
                            className="cursor-pointer hover:r-6"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredPoint({
                                combinationIndex: comboIndex,
                                stepIndex,
                                x: rect.left + rect.width / 2,
                                y: rect.top
                              });
                            }}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        ))}
                      </g>
                    ))}

                  </svg>

                  {/* Hover tooltip */}
                  {hoveredPoint && (
                    <div 
                      className="absolute z-10 bg-gray-900 text-white p-3 rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
                      style={{
                        left: hoveredPoint.x - chartWidth/2,
                        top: hoveredPoint.y - 100
                      }}
                    >
                      <div className="text-sm font-semibold">
                        {combinations[hoveredPoint.combinationIndex].label}
                      </div>
                      <div className="text-xs mt-1">
                        Step {hoveredPoint.stepIndex + 1}: {combinations[hoveredPoint.combinationIndex].stepCRs[hoveredPoint.stepIndex].toFixed(1)}%
                      </div>
                      <div className="text-xs">
                        Order: {combinations[hoveredPoint.combinationIndex].order.join(' → ')}
                      </div>
                      <div className="text-xs">
                        Total: {combinations[hoveredPoint.combinationIndex].totalCR.toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-4">
                  {combinations.map((combo, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-0.5"
                          style={{ 
                            backgroundColor: combo.color,
                            borderStyle: combo.isOptimal ? 'solid' : 'dashed'
                          }}
                        />
                        <span className="text-sm text-gray-700">
                          {combo.label}
                          {combo.isOptimal && <span className="text-green-600 ml-1">✨</span>}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        ({combo.totalCR.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>

                {/* Help text */}
                <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  <strong>How to read:</strong> Each line shows how conversion rates change across step positions for different orderings. 
                  Hover over points to see the actual predicted conversion rate per step when steps are in that specific order. 
                  The optimal order is highlighted with a solid line and ✨.
                </div>
              </div>

            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default DataVisualization; 