import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Question } from '../types';

interface ResultsTableProps {
  steps: {
    questions: Question[];
    observedCR: number;
  }[];
  simulationData: {
    predictedSteps: { CR_s: number }[];
    CR_total: number;
    bestCR?: number;
  };
  optimalPositions: Record<number, number>;
  optimizeData?: {
    optimal_step_order: number[];
    optimal_CR_total: number;
    sample_results?: Array<{
      order: number[];
      CR_total: number;
    }>;
    hybrid_seeding?: {
      enabled: boolean;
      seeded_order: number[] | null;
      seeded_order_is_optimal: boolean;
    };
    algorithm?: string;
  };
  llmCache: Record<string, string>;
  setLlmCache: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  llmAssessmentResult?: {
    assessments: Array<{
      stepIndex: number;
      estimated_uplift: number;
    }>;
  } | null;
}

const ResultsTable: React.FC<ResultsTableProps> = ({
  steps,
  simulationData,
  optimalPositions,
  optimizeData,
  llmCache,
  setLlmCache,
  llmAssessmentResult
}) => {

  
  // Fetch LLM recommendations for each question
  useEffect(() => {
    // DISABLED: LLM recommendations require OpenAI API key configuration
    // For now, we'll show a placeholder message
    if (!steps || steps.length === 0 || !simulationData) {
      return;
    }

    // Set placeholder messages for all questions
    const placeholderMessages: Record<string, string> = {};
    steps.forEach((step, stepIndex) => {
      if (step && step.questions) {
        step.questions.forEach((question, questionIndex) => {
          const cacheKey = `${stepIndex}-${questionIndex}`;
          placeholderMessages[cacheKey] = 'LLM recommendations require OpenAI API configuration';
        });
          }
    });

    setLlmCache(placeholderMessages);
  }, [steps, simulationData, setLlmCache]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 Simulation Results</h3>
      
      {/* Overall CR Summary */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">🎯 Overall Conversion Rates</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="text-sm text-gray-600">Overall Predicted CR</div>
            <div className="text-2xl font-bold text-green-700">
              {(simulationData.CR_total * 100).toFixed(2)}%
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="text-sm text-gray-600">Overall Observed CR</div>
            <div className="text-2xl font-bold text-blue-700">
              {(steps.reduce((product, step) => product * step.observedCR, 1) * 100).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

    <div className="overflow-x-auto">
                <table className="w-full border-collapse border-2 border-gray-800">
        
        {/* Table Header */}
          <thead className="bg-blue-50">
          <tr>
              <th className="border-2 border-gray-800 px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Step
            </th>
              <th className="border-2 border-gray-800 px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Optimal Position
            </th>
              <th className="border-2 border-gray-800 px-4 py-3 text-left text-sm font-semibold text-gray-900">
              LLM Recommendations
            </th>
              <th className="border-2 border-gray-800 px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Observed CR
            </th>
              <th className="border-2 border-gray-800 px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Predicted CR
            </th>
              <th className="border-2 border-gray-800 px-4 py-3 text-left text-sm font-semibold text-gray-900">
                LLM Improvement
              </th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody>
          {steps.map((step, stepIndex) => (
            <tr key={stepIndex} className="hover:bg-blue-50 even:bg-gray-50">
              
              {/* Step Number */}
              <td className="border-2 border-gray-800 px-4 py-3 text-center text-sm font-medium">
                {stepIndex + 1}
              </td>

              {/* Optimal Position */}
              <td className="border-2 border-gray-800 px-4 py-3 text-center text-sm">
                {optimalPositions[stepIndex] !== undefined ? optimalPositions[stepIndex] + 1 : '—'}
              </td>

              {/* LLM Recommendations */}
              <td className="border-2 border-gray-800 px-4 py-3 text-sm max-w-xs">
                <div className="space-y-2">
                  {step.questions.map((question, questionIndex) => {
                    const cacheKey = `${stepIndex}-${questionIndex}`;
                    const recommendation = llmCache[cacheKey];
                    
                    return (
                      <details key={questionIndex} className="group">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800 text-xs">
                          Q{questionIndex + 1}: {question.title.substring(0, 30)}...
                        </summary>
                        <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                          {recommendation ? (
                            recommendation === 'Loading...' ? (
                              <div className="flex items-center gap-2 text-blue-600">
                              <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Loading recommendations...</span>
                              </div>
                            ) : recommendation === 'Recommendations unavailable' ? (
                              <div className="text-gray-500 italic">
                                Recommendations currently unavailable
                              </div>
                            ) : recommendation === 'LLM recommendations require OpenAI API configuration' ? (
                              <div className="text-amber-600 italic">
                                Configure OpenAI API key to enable recommendations
                              </div>
                            ) : (
                              <p className="text-gray-700">{recommendation}</p>
                            )
                          ) : (
                            <div className="flex items-center gap-2 text-gray-400">
                              <span>No recommendations available</span>
                            </div>
                          )}
                        </div>
                      </details>
                    );
                  })}
                </div>
              </td>

              {/* Observed CR */}
              <td className="border-2 border-gray-800 px-4 py-3 text-center text-sm font-mono font-semibold text-blue-700">
                {(step.observedCR * 100).toFixed(2)}%
              </td>

              {/* Predicted CR */}
              <td className="border-2 border-gray-800 px-4 py-3 text-center text-sm font-mono font-semibold text-green-700">
                {simulationData.predictedSteps[stepIndex] 
                  ? (simulationData.predictedSteps[stepIndex].CR_s * 100).toFixed(2) + '%'
                  : '—'
                }
              </td>

              {/* LLM Improvement */}
              <td className="border-2 border-gray-800 px-4 py-3 text-center text-sm font-mono font-semibold text-purple-700">
                {(() => {
                  if (!llmAssessmentResult) return '—';
                  const assessment = llmAssessmentResult.assessments.find(a => a.stepIndex === stepIndex);
                  if (!assessment) return '—';
                  return `+${(assessment.estimated_uplift * 100).toFixed(1)}pp`;
                })()}
              </td>

            </tr>
          ))}
        </tbody>

      </table>
      </div>

      {/* Optimization Results Section */}
      {optimizeData && (
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">🚀 Step Order Optimization</h4>
            {optimizeData.algorithm && (
              <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                {optimizeData.algorithm === 'hybrid_seeded_sampling' ? '🧠 Hybrid Seeded' : 
                 optimizeData.algorithm === 'exhaustive' ? '🔍 Exhaustive' : '🔄 Heuristic'} Search
              </span>
            )}
          </div>
          
          {/* Hybrid Seeding Info */}
          {optimizeData.hybrid_seeding?.enabled && optimizeData.hybrid_seeding.seeded_order && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-blue-900">🧠 Hybrid Fogg+ELM Seeded Order:</span>
                <div className="flex flex-wrap gap-1">
                  {optimizeData.hybrid_seeding.seeded_order?.map((stepIndex, position) => (
                    <span key={position} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      Step {stepIndex + 1}
                    </span>
                  )) || []}
                </div>
                {optimizeData.hybrid_seeding.seeded_order_is_optimal && (
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-bold">
                    🎯 Optimal!
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-700">
                This order was computed using Fogg Behavior Model (motivation × ability × trigger) 
                combined with ELM elaboration likelihood scores to intelligently seed the search.
                {optimizeData.hybrid_seeding.seeded_order_is_optimal 
                  ? ' The seeded order achieved the optimal result!' 
                  : ' Used as starting point for 20,000-sample Monte Carlo search.'}
              </p>
            </div>
          )}
          
          {/* Ideal Flow */}
          {optimizeData.optimal_step_order && (
            <div className="mb-4 p-3 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-purple-700">✨ Ideal Flow</span>
                <span className="text-lg font-bold text-green-700">
                  {(optimizeData.optimal_CR_total * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {optimizeData.optimal_step_order.map((originalStepIndex, position) => (
                  <div key={position} className="flex items-center gap-1">
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                      Step {originalStepIndex + 1}
                    </span>
                    {position < optimizeData.optimal_step_order.length - 1 && (
                      <span className="text-gray-400">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Combinations */}
          {optimizeData.sample_results && optimizeData.sample_results.length > 1 && (
            <div>
              <h5 className="text-md font-semibold text-gray-700 mb-3">📊 Other Tested Combinations</h5>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(() => {
                  // Group by unique order combinations and find the best CR for each
                  const uniqueCombinations = new Map<string, {order: number[], bestCR: number}>();
                  
                  optimizeData.sample_results.forEach(result => {
                    const orderKey = JSON.stringify(result.order);
                    const existing = uniqueCombinations.get(orderKey);
                    
                    if (!existing || result.CR_total > existing.bestCR) {
                      uniqueCombinations.set(orderKey, {
                        order: result.order,
                        bestCR: result.CR_total
                      });
                    }
                  });
                  
                  // Convert to array, filter out optimal, sort by best CR, and take top 5
                  return Array.from(uniqueCombinations.values())
                    .filter(combo => 
                      JSON.stringify(combo.order) !== JSON.stringify(optimizeData.optimal_step_order)
                    )
                    .sort((a, b) => b.bestCR - a.bestCR)
                    .slice(0, 5)
                    .map((combo, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded shadow-sm">
                        <div className="flex flex-wrap gap-1">
                          {combo.order.map((originalStepIndex, position) => (
                            <div key={position} className="flex items-center gap-1">
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                Step {originalStepIndex + 1}
                              </span>
                              {position < combo.order.length - 1 && (
                                <span className="text-gray-300 text-xs">→</span>
                              )}
                            </div>
                          ))}
                        </div>
                        <span className="text-sm font-mono text-gray-600">
                          {(combo.bestCR * 100).toFixed(2)}%
                        </span>
                      </div>
                    ));
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResultsTable;
