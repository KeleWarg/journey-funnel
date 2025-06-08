import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  LightbulbIcon,
  TrendingUpIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from 'lucide-react';
import { MCPAssessmentResult, MCPOrderRecommendation } from '../types';

interface FrameworkSuggestionsPanelProps {
  assessmentResult: MCPAssessmentResult | null;
  isLoading: boolean;
  baselineCR: number;
  onApplyRecommendedOrder?: (orderRecommendation: MCPOrderRecommendation) => void;
  currentStepOrder: number[];
}

const FrameworkSuggestionsPanel: React.FC<FrameworkSuggestionsPanelProps> = ({
  assessmentResult,
  isLoading,
  baselineCR,
  onApplyRecommendedOrder,
  currentStepOrder
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [expandedFrameworks, setExpandedFrameworks] = useState<Set<string>>(new Set());

  const toggleStepExpansion = (stepIndex: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepIndex)) {
      newExpanded.delete(stepIndex);
    } else {
      newExpanded.add(stepIndex);
    }
    setExpandedSteps(newExpanded);
  };

  const toggleFrameworkExpansion = (framework: string) => {
    const newExpanded = new Set(expandedFrameworks);
    if (newExpanded.has(framework)) {
      newExpanded.delete(framework);
    } else {
      newExpanded.add(framework);
    }
    setExpandedFrameworks(newExpanded);
  };

  const formatOrderArray = (order: number[]) => {
    return order.map(stepIndex => `Step ${stepIndex + 1}`).join(' → ');
  };

  const getFrameworkColor = (framework: string) => {
    const colors: Record<string, string> = {
      'PAS': 'bg-blue-100 text-blue-800 border-blue-200',
      'Fogg': 'bg-green-100 text-green-800 border-green-200', 
      'Nielsen': 'bg-purple-100 text-purple-800 border-purple-200',
      'AIDA': 'bg-orange-100 text-orange-800 border-orange-200',
      'Cialdini': 'bg-red-100 text-red-800 border-red-200',
      'SCARF': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'JTBD': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'TOTE': 'bg-pink-100 text-pink-800 border-pink-200',
      'ELM': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[framework] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const isCurrentOrder = (recommendedOrder: number[]) => {
    return JSON.stringify(recommendedOrder) === JSON.stringify(currentStepOrder);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LightbulbIcon className="h-5 w-5 text-yellow-500" />
            Framework Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Analyzing frameworks...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!assessmentResult || !assessmentResult.assessments) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LightbulbIcon className="h-5 w-5 text-yellow-500" />
            Framework Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            Run MCP analysis to see detailed framework suggestions
          </p>
        </CardContent>
      </Card>
    );
  }

  const topOrderRecommendation = assessmentResult.order_recommendations?.[0];

  return (
    <div className="space-y-6">
      {/* Order Recommendations Section */}
      {assessmentResult.order_recommendations && assessmentResult.order_recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightIcon className="h-5 w-5 text-blue-500" />
              Recommended Step Order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {assessmentResult.order_recommendations.slice(0, 3).map((recommendation, index) => (
              <div key={recommendation.framework} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={getFrameworkColor(recommendation.framework)}>
                      {recommendation.framework}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {formatOrderArray(recommendation.recommendedOrder)}
                    </span>
                    {isCurrentOrder(recommendation.recommendedOrder) && (
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                                         <div className="text-right">
                       <div className="text-lg font-semibold text-green-600">
                         +{(recommendation.expected_CR_total && !isNaN(recommendation.expected_CR_total) 
                           ? ((recommendation.expected_CR_total - baselineCR) * 100).toFixed(1)
                           : '0.0')}pp
                       </div>
                       <div className="text-xs text-gray-500">Expected gain</div>
                     </div>
                    {onApplyRecommendedOrder && !isCurrentOrder(recommendation.recommendedOrder) && (
                      <Button
                        size="sm"
                        onClick={() => onApplyRecommendedOrder(recommendation)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Apply Order
                      </Button>
                    )}
                  </div>
                </div>
                                 <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                   {`${recommendation.framework} analysis suggests optimal step ordering for improved conversion.`}
                 </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Framework Suggestions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LightbulbIcon className="h-5 w-5 text-yellow-500" />
            Framework Suggestions by Step
          </CardTitle>
          <div className="text-sm text-gray-600">
            Baseline CR: {(baselineCR * 100).toFixed(1)}% → Potential: {((assessmentResult.boosted_CR_total || baselineCR) * 100).toFixed(1)}%
            {assessmentResult.uplift_total && (
              <span className="text-green-600 font-medium ml-2">
                (+{(assessmentResult.uplift_total * 100).toFixed(1)}pp)
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {assessmentResult.assessments.map((stepAssessment) => (
            <div key={stepAssessment.stepIndex} className="border rounded-lg">
              {/* Step Header */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleStepExpansion(stepAssessment.stepIndex)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedSteps.has(stepAssessment.stepIndex) ? (
                      <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                    )}
                    <h3 className="font-medium">Step {stepAssessment.stepIndex + 1}</h3>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {stepAssessment.suggestions.length} frameworks
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUpIcon className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600">
                      +{(stepAssessment.estimated_uplift * 100).toFixed(1)}pp
                    </span>
                  </div>
                </div>
              </div>

              {/* Step Content */}
              {expandedSteps.has(stepAssessment.stepIndex) && (
                <div className="border-t bg-gray-50 p-4 space-y-3">
                  {stepAssessment.suggestions.map((suggestion) => (
                    <div key={suggestion.framework} className="bg-white rounded border">
                      <div 
                        className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleFrameworkExpansion(`${stepAssessment.stepIndex}-${suggestion.framework}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {expandedFrameworks.has(`${stepAssessment.stepIndex}-${suggestion.framework}`) ? (
                              <ChevronDownIcon className="h-3 w-3 text-gray-400" />
                            ) : (
                              <ChevronRightIcon className="h-3 w-3 text-gray-400" />
                            )}
                            <Badge className={getFrameworkColor(suggestion.framework)}>
                              {suggestion.framework}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {expandedFrameworks.has(`${stepAssessment.stepIndex}-${suggestion.framework}`) && (
                        <div className="border-t bg-blue-50 p-3 space-y-3">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-1">Suggested Improvement:</h4>
                            <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                              {suggestion.revisedText}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-1">Rationale:</h4>
                            <p className="text-sm text-gray-600">
                              {suggestion.rationale}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default FrameworkSuggestionsPanel; 