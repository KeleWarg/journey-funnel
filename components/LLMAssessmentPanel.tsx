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

  // Get unique frameworks across all assessments
  const getAllFrameworks = () => {
    if (!assessmentResult?.assessments) return [];
    const frameworks = new Set<string>();
    assessmentResult.assessments.forEach(assessment => {
      assessment.frameworkAssessments.forEach(fw => {
        frameworks.add(fw.framework);
      });
    });
    return Array.from(frameworks);
  };

  const allFrameworks = getAllFrameworks();

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
          {allFrameworks.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <span className="text-sm text-gray-700 font-medium">Frameworks analyzed:</span>
              {allFrameworks.map((framework, index) => (
                <Badge key={framework} variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                  {framework}
                </Badge>
              ))}
            </div>
          )}
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

        {/* Framework Summary Section */}
        {assessmentResult && assessmentResult.assessments && allFrameworks.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <SparklesIcon className="h-4 w-4 text-purple-600" />
              Framework Analysis Summary
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allFrameworks.map((framework) => {
                // Count total suggestions across all questions for this framework
                const frameworkData = assessmentResult.assessments.flatMap(assessment => 
                  assessment.frameworkAssessments.filter(fw => fw.framework === framework)
                );
                const totalSuggestions = frameworkData.reduce((sum, fw) => sum + fw.suggestions.length, 0);
                const totalIssues = frameworkData.reduce((sum, fw) => sum + fw.issues.length, 0);
                const hasRewrites = frameworkData.some(fw => fw.rewrittenQuestion);

                return (
                  <div key={framework} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 font-medium">
                        {framework}
                      </Badge>
                      {hasRewrites && (
                        <TrendingUpIcon className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Issues found:</span>
                        <span className="font-medium text-red-600">{totalIssues}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Suggestions:</span>
                        <span className="font-medium text-green-600">{totalSuggestions}</span>
                      </div>
                      {hasRewrites && (
                        <div className="flex justify-between">
                          <span>Rewrites:</span>
                          <span className="font-medium text-blue-600">✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
                          <div className="flex flex-wrap gap-1">
                            {questionAssessment.frameworkAssessments.map((fw, idx) => (
                              <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                {fw.framework}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="py-3">
                      <div className="space-y-4">
                        {questionAssessment.frameworkAssessments.map((frameworkAssessment, frameworkIndex) => (
                          <div key={frameworkIndex} className="bg-gray-50 p-4 rounded-md border border-gray-100">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="outline" className="bg-gray-100 font-semibold">
                                {frameworkAssessment.framework}
                              </Badge>
                              <div className="flex gap-2 text-xs">
                                {frameworkAssessment.issues.length > 0 && (
                                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
                                    {frameworkAssessment.issues.length} issues
                                  </span>
                                )}
                                {frameworkAssessment.suggestions.length > 0 && (
                                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                                    {frameworkAssessment.suggestions.length} suggestions
                                  </span>
                                )}
                                {frameworkAssessment.rewrittenQuestion && (
                                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    Rewrite available
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Issues */}
                            {frameworkAssessment.issues && frameworkAssessment.issues.length > 0 && (
                              <div className="mb-3">
                                <h5 className="text-sm font-medium text-gray-700 mb-2">Issues Identified</h5>
                                <ul className="space-y-1">
                                  {frameworkAssessment.issues.map((issue, issueIndex) => (
                                    <li key={issueIndex} className="text-sm text-red-700 bg-red-50 p-2 rounded border border-red-200">
                                      • {issue}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Suggestions */}
                            {frameworkAssessment.suggestions && frameworkAssessment.suggestions.length > 0 && (
                              <div className="mb-3">
                                <h5 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h5>
                                <ul className="space-y-1">
                                  {frameworkAssessment.suggestions.map((suggestion, suggestionIndex) => (
                                    <li key={suggestionIndex} className="text-sm text-green-700 bg-green-50 p-2 rounded border border-green-200">
                                      • {suggestion}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Rewritten Question */}
                            {frameworkAssessment.rewrittenQuestion && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-700 mb-2">Optimized Question</h5>
                                <div className="bg-blue-50 p-3 rounded-md text-blue-800 border border-blue-200 font-medium">
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