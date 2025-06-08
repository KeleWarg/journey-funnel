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
  SimulationData,
  FoggStepAssessmentResult,
  FoggRecommendation
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
  
  // Fogg Step Assessment props
  foggStepAssessments: FoggStepAssessmentResult | null;
  isFoggStepAssessing: boolean;
  onRunFoggStepAssessment: () => void;
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
  setLlmCache,
  foggStepAssessments,
  isFoggStepAssessing,
  onRunFoggStepAssessment
}) => {
  const [activeTab, setActiveTab] = useState('step_flow');
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  // Toggle row expansion
  const toggleRowExpansion = (stepIndex: number) => {
    console.log('Toggling row:', stepIndex, 'Current state:', expandedRows[stepIndex]);
    setExpandedRows(prev => ({
      ...prev,
      [stepIndex]: !prev[stepIndex]
    }));
  };

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
              if (onRunFoggStepAssessment) onRunFoggStepAssessment();
            }}
            disabled={isMCPAnalyzing || isEnhancedMCPAnalyzing || isAssessing || isFoggStepAssessing}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2 rounded-md"
          >
            {(isMCPAnalyzing || isEnhancedMCPAnalyzing || isAssessing || isFoggStepAssessing) ? (
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="step_flow" className="flex items-center gap-2">
              <ListIcon className="h-4 w-4" />
              Step Flow
            </TabsTrigger>
            <TabsTrigger value="llm_copy" className="flex items-center gap-2">
              <SparklesIcon className="h-4 w-4" />
              Content Strategy
            </TabsTrigger>
            <TabsTrigger value="framework_analysis" className="flex items-center gap-2">
              <BarChart3Icon className="h-4 w-4" />
              Framework Benchmarks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="step_flow">
            {/* Step Flow - Table moved from ResultsTable component */}
            <div className="space-y-6">
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
                    {steps.map((step, stepIndex) => {
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

                      // Check if we have Fogg assessment for this step
                      const foggAssessment = foggStepAssessments?.assessments?.find(a => a.stepIndex === stepIndex);

                      return (
                        <React.Fragment key={stepIndex}>
                          {/* Main Step Row */}
                          <tr className="hover:bg-blue-50 even:bg-gray-50">
                            
                            {/* Step Number */}
                            <td className="border-2 border-gray-800 px-4 py-3 text-center text-sm font-medium">
                              {stepIndex + 1}
                            </td>

                            {/* Question Details */}
                            <td className="border-2 border-gray-800 px-4 py-3 text-sm max-w-xs">
                              <div className="space-y-3">
                                {step.questions.map((question, questionIndex) => (
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
                                ))}
                                
                                {/* Fogg Recommendations CTA */}
                                {(foggAssessment || isFoggStepAssessing) && (
                                  <div className="pt-2">
                                    <button
                                      onClick={() => toggleRowExpansion(stepIndex)}
                                      className="w-full text-center bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 py-2 px-3 rounded-md text-sm font-medium transition-colors border border-blue-200 hover:border-blue-300"
                                    >
                                      {expandedRows[stepIndex] ? 
                                        "Hide recommendations" : 
                                        "Read recommendations"
                                      }
                                    </button>
                                  </div>
                                )}
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

                          {/* Fogg Analysis Row - spans all columns */}
                          {(foggAssessment || isFoggStepAssessing) && expandedRows[stepIndex] && (
                            <tr className="bg-blue-50/30">
                              <td colSpan={5} className="border-2 border-gray-800 px-6 py-4">
                                {/* Loading State */}
                                {isFoggStepAssessing && !foggAssessment && (
                                  <div className="flex items-center justify-center gap-3 py-4">
                                    <Loader2Icon className="h-5 w-5 animate-spin text-blue-600" />
                                    <span className="text-sm text-blue-700 font-medium">Analyzing Step {stepIndex + 1} with Fogg Behavior Model...</span>
                                  </div>
                                )}

                                {/* Fogg Assessment Display */}
                                {foggAssessment && (
                                  <div className="bg-white rounded-lg border border-blue-200 p-6 shadow-sm">
                                    {/* Header */}
                                    <div className="flex items-center gap-3 mb-4">
                                      <BrainIcon className="h-6 w-6 text-blue-600" />
                                      <h4 className="text-lg font-semibold text-blue-900">
                                        Fogg B=MAT Analysis - Step {stepIndex + 1}
                                      </h4>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                      {/* Left Column: Scores & Summary */}
                                      <div className="space-y-4">
                                        {/* Fogg Scores */}
                                        <div className="bg-gray-50 rounded-lg p-4">
                                          <h5 className="font-semibold text-gray-900 mb-3">B=MAT Scores</h5>
                                          <div className="grid grid-cols-3 gap-4">
                                            <div className="text-center">
                                              <div className="text-2xl font-bold text-blue-600">
                                                {foggAssessment.motivation_score.toFixed(1)}
                                              </div>
                                              <div className="text-sm text-gray-600">Motivation</div>
                                            </div>
                                            <div className="text-center">
                                              <div className="text-2xl font-bold text-green-600">
                                                {foggAssessment.ability_score.toFixed(1)}
                                              </div>
                                              <div className="text-sm text-gray-600">Ability</div>
                                            </div>
                                            <div className="text-center">
                                              <div className="text-2xl font-bold text-purple-600">
                                                {foggAssessment.trigger_score.toFixed(1)}
                                              </div>
                                              <div className="text-sm text-gray-600">Trigger</div>
                                            </div>
                                          </div>
                                          
                                          {/* Overall Score */}
                                          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                                            <div className="text-xl font-bold text-gray-900">
                                              Overall: {foggAssessment.overall_score.toFixed(1)}/5
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Key Insight */}
                                        <div className="bg-blue-50 rounded-lg p-4">
                                          <h5 className="font-semibold text-blue-900 mb-2">Key Insight</h5>
                                          <p className="text-blue-800 text-sm">{foggAssessment.improvement_summary}</p>
                                        </div>
                                      </div>

                                      {/* Right Column: Recommendations */}
                                      <div className="space-y-4">
                                        <h5 className="font-semibold text-gray-900">Recommendations</h5>
                                        {foggAssessment.recommendations.map((rec, idx) => (
                                          <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="flex items-center gap-2 mb-2">
                                              <span className={`w-3 h-3 rounded-full ${
                                                rec.type === 'content_rewrite' ? 'bg-green-500' :
                                                rec.type === 'interaction_improvement' ? 'bg-blue-500' :
                                                rec.type === 'support_content' ? 'bg-purple-500' : 'bg-orange-500'
                                              }`}></span>
                                              <span className="font-semibold text-gray-900">{rec.title}</span>
                                              <span className={`text-xs px-2 py-1 rounded-full ${
                                                rec.type === 'content_rewrite' ? 'bg-green-100 text-green-700' :
                                                rec.type === 'interaction_improvement' ? 'bg-blue-100 text-blue-700' :
                                                rec.type === 'support_content' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                                              }`}>
                                                {rec.type.replace('_', ' ')}
                                              </span>
                                            </div>
                                            <p className="text-gray-700 text-sm mb-3">{rec.description}</p>
                                            
                                            {/* Before/After for content rewrites */}
                                            {rec.before && rec.after && (
                                              <div className="bg-white rounded p-3 mb-3 space-y-2">
                                                <div className="text-sm">
                                                  <span className="font-semibold text-red-700">Before:</span>
                                                  <span className="ml-2 text-gray-700">{rec.before}</span>
                                                </div>
                                                <div className="text-sm">
                                                  <span className="font-semibold text-green-700">After:</span>
                                                  <span className="ml-2 text-gray-700">{rec.after}</span>
                                                </div>
                                              </div>
                                            )}
                                            
                                            {/* Implementation guidance */}
                                            {rec.implementation && (
                                              <div className="bg-yellow-50 rounded p-3 border border-yellow-200">
                                                <div className="text-sm">
                                                  <span className="font-semibold text-yellow-800">Implementation:</span>
                                                  <span className="ml-2 text-yellow-700">{rec.implementation}</span>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Fogg Model Analysis - Moved from separate tab */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <BrainIcon className="h-5 w-5" />
                    Fogg Behavior Model (B = MAT)
                  </h3>
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

              {/* Enhanced Framework Analysis - Moved from Framework Analysis tab */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <BarChart3Icon className="h-5 w-5" />
                    Enhanced Framework Analysis
                  </h3>
                  <p className="text-gray-600">
                    Advanced analysis with unique step combinations and framework variant comparisons.
                  </p>
                </div>

                {enhancedMcpResult ? (
                  <div>
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
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3Icon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="mb-2">No Enhanced Framework analysis available</p>
                    <p className="text-sm text-gray-500">
                      Use the "Run Detailed Assessment" button above to see enhanced framework variant comparisons
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="llm_copy">
            {/* Content Strategy - LLMAssessmentPanel per YAML spec */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Content Strategy & Optimization</h3>
                <p className="text-gray-600">
                  AI-powered analysis of step content with strategic improvement suggestions and uplift predictions.
                </p>
              </div>
              
              <LLMAssessmentPanel
                assessmentResult={llmAssessmentResult}
                isLoading={isAssessing}
                baselineCR={baselineCR}
              />
            </div>
          </TabsContent>

          <TabsContent value="framework_analysis">
            {/* Framework Benchmarks - ComparisonTable per YAML spec */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold">Framework Benchmarks & Comparison</h3>
                <p className="text-gray-600">
                  Benchmark performance across different optimization frameworks and step orderings.
                </p>
              </div>
              
              {/* Standard MCP Framework Comparison */}
              <MCPComparisonTable
                mcpResult={mcpFunnelResult}
                onApplyVariant={onApplyRecommendedOrder || (() => {})}
                isLoading={isMCPAnalyzing}
              />
              
              {!mcpFunnelResult && !isMCPAnalyzing && (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3Icon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Run detailed assessment to see framework benchmark results</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AnalysisTabsSection; 