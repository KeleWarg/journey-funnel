import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@components/ui/collapsible';
import { ChevronDownIcon, SparklesIcon, TrendingUpIcon } from 'lucide-react';
import { LLMAssessmentResult, LLMStepAssessment } from '../types';
import { Badge } from '@components/ui/badge';

interface LLMAssessmentPanelProps {
  assessmentResult: LLMAssessmentResult | null;
  isLoading: boolean;
  baselineCR: number;
}

const LLMAssessmentPanel: React.FC<LLMAssessmentPanelProps> = ({
  assessmentResult,
  isLoading,
  baselineCR
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const toggleStepExpanded = (stepIndex: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepIndex)) {
      newExpanded.delete(stepIndex);
    } else {
      newExpanded.add(stepIndex);
    }
    setExpandedSteps(newExpanded);
  };

  // Get uplift data from assessment result (already calculated with cumulative tracking)
  const upliftData = assessmentResult ? {
    newOverallCR: assessmentResult.predicted_CR_total,
    totalUpliftPP: assessmentResult.uplift_total * 100,
    averageUpliftPerStep: assessmentResult.assessments.length > 0 
      ? (assessmentResult.assessments.reduce((sum, a) => sum + a.estimated_uplift, 0) * 100) / assessmentResult.assessments.length
      : 0
  } : null;

  return (
    <Card className="border border-purple-200 shadow-sm bg-gradient-to-r from-purple-50 to-indigo-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg font-semibold text-purple-900">
              LLM Copywriting Assessment
            </CardTitle>
            {upliftData && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                <TrendingUpIcon className="h-3 w-3" />
                +{upliftData.totalUpliftPP.toFixed(1)}pp
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
            
            {/* Description */}
            <div className="text-center py-2">
              <p className="text-sm text-gray-600">
                Apply 9 proven frameworks (PAS, Fogg, Nielsen, AIDA, Cialdini, SCARF, JTBD, TOTE, ELM) to optimize your question copy.
              </p>
              {!assessmentResult && !isLoading && (
                <p className="text-sm text-gray-500 mt-2">
                  Use the "Run Detailed Assessment" button above to get AI-powered copy recommendations.
                </p>
              )}
            </div>

            {/* Results Summary */}
            {upliftData && (
              <div className="p-4 bg-white rounded-lg border border-purple-200">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingUpIcon className="h-4 w-4 text-green-600" />
                  Projected Improvements
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-700">
                      {(upliftData.newOverallCR * 100).toFixed(2)}%
                    </div>
                    <div className="text-gray-600">New Overall CR</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-700">
                      +{upliftData.totalUpliftPP.toFixed(1)}pp
                    </div>
                    <div className="text-gray-600">Total Uplift</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-700">
                      +{upliftData.averageUpliftPerStep.toFixed(1)}pp
                    </div>
                    <div className="text-gray-600">Avg per Step</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 text-center">
                  <div className="text-sm text-gray-700 font-medium">
                    Overall Predicted CR_total: {(upliftData.newOverallCR * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            )}

            {/* Per-Step Impact Table */}
            {assessmentResult && (
              <div className="p-4 bg-white rounded-lg border border-purple-200">
                <h4 className="font-medium text-gray-900 mb-3">Step-by-Step Impact Analysis</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-medium text-gray-700">Step</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-700">Base CR_s (%)</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-700">ΔCR_s (pp)</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-700">New CR_s (%)</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-700">Cumulative CR_s (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessmentResult.assessments.map((assessment: LLMStepAssessment) => (
                        <tr key={assessment.stepIndex} className="border-b border-gray-100">
                          <td className="py-2 px-3 font-medium">Step {assessment.stepIndex + 1}</td>
                          <td className="text-right py-2 px-3">{(assessment.base_CR_s * 100).toFixed(2)}%</td>
                          <td className={`text-right py-2 px-3 font-medium ${assessment.estimated_uplift >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {assessment.estimated_uplift >= 0 ? '+' : ''}{(assessment.estimated_uplift * 100).toFixed(1)}pp
                          </td>
                          <td className="text-right py-2 px-3">{(assessment.new_CR_s * 100).toFixed(2)}%</td>
                          <td className="text-right py-2 px-3 font-medium text-blue-700">{(assessment.cumulative_new_CR_s * 100).toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Step-by-Step Assessments */}
            {assessmentResult && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Step-by-Step Recommendations</h4>
                {assessmentResult.assessments.map((assessment: LLMStepAssessment) => (
                  <Card key={assessment.stepIndex} className="border border-gray-200">
                    <Collapsible 
                      open={expandedSteps.has(assessment.stepIndex)} 
                      onOpenChange={() => toggleStepExpanded(assessment.stepIndex)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-gray-50 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-gray-900">
                                Step {assessment.stepIndex + 1}
                              </span>
                              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                                <TrendingUpIcon className="h-3 w-3" />
                                +{(assessment.estimated_uplift * 100).toFixed(1)}pp
                              </div>
                            </div>
                            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="py-3">
                          {/* Title Suggestion */}
                          {assessment.titleSuggestion && (
                            <div className="mb-4">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Title Suggestion</h5>
                              <div className="bg-blue-50 p-3 rounded-md text-blue-800">
                                {assessment.titleSuggestion}
                              </div>
                            </div>
                          )}

                          {/* Support Copy Suggestion */}
                          {assessment.supportCopySuggestion && (
                            <div className="mb-4">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Support Copy Suggestion</h5>
                              <div className="bg-purple-50 p-3 rounded-md text-purple-800">
                                {assessment.supportCopySuggestion}
                              </div>
                            </div>
                          )}

                          {/* Extra Support Text Suggestions */}
                          {assessment.extraSupportSuggestions && assessment.extraSupportSuggestions.length > 0 && (
                            <div className="mb-4">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Additional Context Suggestions</h5>
                              <div className="space-y-2">
                                {assessment.extraSupportSuggestions.map((text, idx) => (
                                  <div key={idx} className="bg-green-50 p-3 rounded-md text-green-800">
                                    {text}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Existing Framework Suggestions */}
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Framework Suggestions</h5>
                            <div className="space-y-3">
                              {assessment.suggestions.map((suggestion, idx) => (
                                <div key={idx} className="bg-gray-50 p-3 rounded-md">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="bg-gray-100">
                                      {suggestion.framework}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-800 mb-2">{suggestion.revisedText}</p>
                                  <p className="text-xs text-gray-600 italic">{suggestion.rationale}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}

            {/* Help Text */}
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <p><strong>How it works:</strong> Each framework analyzes your question copy and suggests improvements based on proven psychology and UX principles. The estimated uplift is calculated based on current performance, complexity, and improvement potential.</p>
            </div>

      </CardContent>
    </Card>
  );
};

export default LLMAssessmentPanel; 