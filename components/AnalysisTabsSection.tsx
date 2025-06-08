import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { BarChart3Icon, BrainIcon, SparklesIcon, Loader2Icon, ListIcon } from 'lucide-react';
import MCPComparisonTable from './MCPComparisonTable';
import EnhancedComparisonTable from './EnhancedComparisonTable';
import UniqueCombinationTable from './UniqueCombinationTable';
import FoggModelAnalysis from './FoggModelAnalysis';
import FogMetricsTable from './FogMetricsTable';
import FoggOrderResult from './FoggOrderResult';
import LLMAssessmentPanel from './LLMAssessmentPanel';
import { 
  MCPFunnelResult, 
  LLMAssessmentResult, 
  Step,
  MCPFunnelVariant,
  Question,
  SimulationData
} from '../types';

interface AnalysisTabsSectionProps {
  // Standard Analysis props
  mcpFunnelResult: MCPFunnelResult | null;
  enhancedMcpResult: any;
  isEnhancedMCPAnalyzing: boolean;
  isMCPAnalyzing: boolean;
  onApplyRecommendedOrder?: (variant: MCPFunnelVariant) => void;
  onRunEnhancedMCP?: () => void;
  onApplyEnhancedVariant?: (variant: any) => void;
  
  // Fogg Model props
  steps: Step[];
  onRunFoggAnalysis?: () => void;
  onApplyFoggOrder?: (order: number[]) => void;
  
  // LLM Copy & Uplift props
  llmAssessmentResult: LLMAssessmentResult | null;
  isAssessing: boolean;
  onRunAssessment: () => void;
  baselineCR: number;

  // Step Flow props (previously from ResultsTable)
  simulationData: SimulationData;
  optimalPositions: Record<number, number>;
  llmCache: Record<string, string>;
  setLlmCache: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const AnalysisTabsSection: React.FC<AnalysisTabsSectionProps> = ({
  mcpFunnelResult,
  enhancedMcpResult,
  isEnhancedMCPAnalyzing,
  isMCPAnalyzing,
  onApplyRecommendedOrder,
  onRunEnhancedMCP,
  onApplyEnhancedVariant,
  steps,
  onRunFoggAnalysis,
  onApplyFoggOrder,
  llmAssessmentResult,
  isAssessing,
  onRunAssessment,
  baselineCR,
  simulationData,
  optimalPositions,
  llmCache,
  setLlmCache
}) => {
  const [activeTab, setActiveTab] = useState('step_flow');

  // Fetch LLM recommendations for each question (moved from ResultsTable)
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

  // Get Fogg variant from results (with extended fogg_metrics property)
  const foggVariant: (MCPFunnelVariant & { fogg_metrics?: any[] }) | null = 
    mcpFunnelResult?.variants?.find(v => 
      v.framework === 'Fogg-BM' || v.framework === 'Fogg'
    ) || 
    enhancedMcpResult?.variant_results?.find((v: any) => 
      v.framework === 'Fogg-BM' || v.framework === 'Fogg'
    ) || null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detailed Analysis Results</CardTitle>
        <div className="flex justify-between items-center mt-4">
          <p className="text-gray-600">
            Comprehensive analysis across behavioral models, frameworks, and copy optimization.
          </p>
          <Button
            onClick={() => {
              if (onRunFoggAnalysis) onRunFoggAnalysis();
              if (onRunEnhancedMCP) onRunEnhancedMCP();
              if (onRunAssessment) onRunAssessment();
            }}
            disabled={isMCPAnalyzing || isEnhancedMCPAnalyzing || isAssessing}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2 rounded-md"
          >
            {(isMCPAnalyzing || isEnhancedMCPAnalyzing || isAssessing) ? (
              <>
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                Running Detailed Assessment...
              </>
            ) : (
              '🚀 Run Detailed Assessment'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Overall CR Summary - Above tabs */}
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="step_flow" className="flex items-center gap-2">
              <ListIcon className="h-4 w-4" />
              Step Flow
            </TabsTrigger>
            <TabsTrigger value="fogg_model" className="flex items-center gap-2">
              <BrainIcon className="h-4 w-4" />
              Fogg Model
            </TabsTrigger>
            <TabsTrigger value="framework_analysis" className="flex items-center gap-2">
              <BarChart3Icon className="h-4 w-4" />
              Framework Analysis
            </TabsTrigger>
            <TabsTrigger value="llm_copy" className="flex items-center gap-2">
              <SparklesIcon className="h-4 w-4" />
              Copy & Uplift
            </TabsTrigger>
          </TabsList>

          <TabsContent value="step_flow">
            {/* Step Flow - Table moved from ResultsTable component */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Step-by-Step Analysis</h3>
                <p className="text-gray-600">
                  Detailed breakdown of each step's performance, question details, and optimization opportunities.
                </p>
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
                        Question Details
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

                        {/* Question Details */}
                        <td className="border-2 border-gray-800 px-4 py-3 text-sm max-w-xs">
                          <div className="space-y-3">
                            {step.questions.map((question, questionIndex) => {
                              // Get input type label
                              const getInputTypeLabel = (inputType: string) => {
                                const types = {
                                  '1': 'Toggle/Yes-No',
                                  '2': 'Single Dropdown', 
                                  '3': 'Multi-select/Slider',
                                  '4': 'Calendar/Upload',
                                  '5': 'Open Text Field'
                                };
                                return types[inputType as keyof typeof types] || `Type ${inputType}`;
                              };

                              return (
                                <div key={questionIndex} className="p-2 bg-gray-50 rounded border">
                                  <div className="font-medium text-sm text-gray-900 mb-1">
                                    Q{questionIndex + 1}: {question.title}
                                  </div>
                                  <div className="text-xs space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-blue-700">Type:</span>
                                      <span className="text-gray-700">{getInputTypeLabel(question.input_type)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-orange-700">Invasiveness:</span>
                                      <span className="text-gray-700">{question.invasiveness}/5</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-purple-700">Difficulty:</span>
                                      <span className="text-gray-700">{question.difficulty}/5</span>
                                    </div>
                                  </div>
                                </div>
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
            </div>
          </TabsContent>

          <TabsContent value="fogg_model">
            {/* Fogg Model - FogMetricsTable + FoggOrderResult per YAML spec */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Fogg Behavior Model (B = MAT)</h3>
                <p className="text-gray-600">
                  Analyze steps using Motivation × Ability × Trigger framework for optimal conversion flow.
                </p>
              </div>

              {foggVariant ? (
                <div className="space-y-6">
                  {/* Step Metrics Table */}
                  {(foggVariant as any).fogg_metrics && (
                    <div>
                      <h4 className="text-md font-semibold mb-3">Step-by-Step Fogg Metrics</h4>
                      <FogMetricsTable rows={(foggVariant as any).fogg_metrics} />
                    </div>
                  )}
                  
                  {/* Recommended Order Results */}
                  <div>
                    <h4 className="text-md font-semibold mb-3">Fogg-Optimized Step Order</h4>
                    <FoggOrderResult
                      order={foggVariant.step_order}
                      CR_total={foggVariant.CR_total}
                      uplift_pp={foggVariant.uplift_pp}
                      onApplyOrder={onApplyFoggOrder}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BrainIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="mb-2">No Fogg Model analysis available</p>
                  <p className="text-sm text-gray-500">
                    Use the "Run Detailed Assessment" button above to analyze your funnel with the Fogg Behavior Model (B = MAT)
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="framework_analysis">
            {/* Framework Analysis - ComparisonTable per YAML spec */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold">Framework Analysis & Comparison</h3>
                <p className="text-gray-600">
                  Compare performance across different optimization frameworks and step orderings.
                </p>
              </div>
              
              {/* Standard MCP Framework Comparison */}
              <MCPComparisonTable
                mcpResult={mcpFunnelResult}
                onApplyVariant={onApplyRecommendedOrder || (() => {})}
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
                      onApplyVariant={onApplyEnhancedVariant || (() => {})}
                    />
                  )}
                </div>
              )}
              
              {!mcpFunnelResult && !enhancedMcpResult && !isMCPAnalyzing && !isEnhancedMCPAnalyzing && (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3Icon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Run detailed assessment to see framework comparison results</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="llm_copy">
            {/* Copy & Uplift - LLMAssessmentPanel per YAML spec */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Copy Optimization & Uplift Analysis</h3>
                <p className="text-gray-600">
                  AI-powered analysis of step copy with specific improvement suggestions and uplift predictions.
                </p>
              </div>
              
              <LLMAssessmentPanel
                assessmentResult={llmAssessmentResult}
                isLoading={isAssessing}
                baselineCR={baselineCR}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AnalysisTabsSection; 