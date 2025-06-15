import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@components/ui/collapsible';
import { ChevronDownIcon, SparklesIcon, TrendingUpIcon } from 'lucide-react';
import { LLMAssessmentResult } from '../types';
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
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  const toggleQuestionExpanded = (questionIndex: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionIndex)) {
      newExpanded.delete(questionIndex);
    } else {
      newExpanded.add(questionIndex);
    }
    setExpandedQuestions(newExpanded);
  };

  return (
    <Card className="border border-purple-200 shadow-sm bg-gradient-to-r from-purple-50 to-indigo-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg font-semibold text-purple-900">
              LLM Copywriting Assessment
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Description */}
        <div className="text-center py-2">
          <p className="text-sm text-gray-600">
            AI-powered analysis of your question copy using proven psychological frameworks.
          </p>
          {!assessmentResult && !isLoading && (
            <p className="text-sm text-gray-500 mt-2">
              Use the "Run Detailed Assessment" button above to get AI-powered copy recommendations.
            </p>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Analyzing your questions...</p>
          </div>
        )}

        {/* Assessment Results */}
        {assessmentResult && assessmentResult.assessments && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Question Analysis Results</h4>
            
            {assessmentResult.assessments.map((questionAssessment, questionIndex) => (
              <Card key={questionIndex} className="border border-gray-200">
                <Collapsible 
                  open={expandedQuestions.has(questionIndex)} 
                  onOpenChange={() => toggleQuestionExpanded(questionIndex)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-900">
                            {questionAssessment.questionTitle}
                          </span>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800">
                            {questionAssessment.frameworkAssessments.length} frameworks
                          </Badge>
                        </div>
                        <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="py-3">
                      <div className="space-y-4">
                        {questionAssessment.frameworkAssessments.map((frameworkAssessment, frameworkIndex) => (
                          <div key={frameworkIndex} className="bg-gray-50 p-4 rounded-md">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="outline" className="bg-gray-100">
                                {frameworkAssessment.framework}
                              </Badge>
                            </div>
                            
                            {/* Issues */}
                            {frameworkAssessment.issues && frameworkAssessment.issues.length > 0 && (
                              <div className="mb-3">
                                <h5 className="text-sm font-medium text-gray-700 mb-2">Issues Identified</h5>
                                <ul className="space-y-1">
                                  {frameworkAssessment.issues.map((issue, issueIndex) => (
                                    <li key={issueIndex} className="text-sm text-red-700 bg-red-50 p-2 rounded">
                                      • {issue}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Suggestions */}
                            {frameworkAssessment.suggestions && frameworkAssessment.suggestions.length > 0 && (
                              <div className="mb-3">
                                <h5 className="text-sm font-medium text-gray-700 mb-2">Suggestions</h5>
                                <ul className="space-y-1">
                                  {frameworkAssessment.suggestions.map((suggestion, suggestionIndex) => (
                                    <li key={suggestionIndex} className="text-sm text-green-700 bg-green-50 p-2 rounded">
                                      • {suggestion}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Rewritten Question */}
                            {frameworkAssessment.rewrittenQuestion && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-700 mb-2">Rewritten Question</h5>
                                <div className="bg-blue-50 p-3 rounded-md text-blue-800 border border-blue-200">
                                  {frameworkAssessment.rewrittenQuestion}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}

        {/* No Results State */}
        {assessmentResult && (!assessmentResult.assessments || assessmentResult.assessments.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <SparklesIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="mb-2">No assessment results available</p>
            <p className="text-sm text-gray-500">
              Try running the assessment again or check your question configuration.
            </p>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
          <p><strong>How it works:</strong> Each framework analyzes your question copy and suggests improvements based on proven psychology and UX principles. Use these insights to optimize your question wording for better conversion rates.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LLMAssessmentPanel; 