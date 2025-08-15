import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@components/ui/collapsible';
import { ChevronDownIcon, SparklesIcon, TrendingUpIcon, FileTextIcon, FolderIcon } from 'lucide-react';
import { Badge } from '@components/ui/badge';

interface LandingPageFrameworkAssessment {
  framework: string;
  issues: string[];
  suggestions: string[];
  rewrittenContent?: {
    headline?: string;
    subheadline?: string;
    textBoxes?: string[];
    cta?: string;
    socialProof?: string;
  };
  score?: number;
}

interface LandingPageContentAssessment {
  foldId: string;
  foldIndex: number;
  contentType: 'headline' | 'subheadline' | 'textBox' | 'cta' | 'socialProof';
  contentIndex?: number; // For textBoxes
  originalContent: string;
  frameworkAssessments: LandingPageFrameworkAssessment[];
}

interface LandingPageAnalysisResult {
  assessments: LandingPageContentAssessment[];
  overallScore?: number;
  topRecommendations?: string[];
}

interface LandingPageAnalysisPanelProps {
  analysisResult: LandingPageAnalysisResult | null;
  isLoading: boolean;
  categoryTitle: string;
}

const LandingPageAnalysisPanel: React.FC<LandingPageAnalysisPanelProps> = ({
  analysisResult,
  isLoading,
  categoryTitle
}) => {
  const [expandedFolds, setExpandedFolds] = useState<Set<number>>(new Set());
  const [expandedContent, setExpandedContent] = useState<Set<string>>(new Set());

  const toggleFoldExpanded = (foldIndex: number) => {
    const newExpanded = new Set(expandedFolds);
    if (newExpanded.has(foldIndex)) {
      newExpanded.delete(foldIndex);
    } else {
      newExpanded.add(foldIndex);
    }
    setExpandedFolds(newExpanded);
  };

  const toggleContentExpanded = (contentKey: string) => {
    const newExpanded = new Set(expandedContent);
    if (newExpanded.has(contentKey)) {
      newExpanded.delete(contentKey);
    } else {
      newExpanded.add(contentKey);
    }
    setExpandedContent(newExpanded);
  };

  // Get unique frameworks across all assessments
  const getAllFrameworks = () => {
    if (!analysisResult?.assessments) return [];
    const frameworks = new Set<string>();
    analysisResult.assessments.forEach(assessment => {
      assessment.frameworkAssessments.forEach(fw => {
        frameworks.add(fw.framework);
      });
    });
    return Array.from(frameworks);
  };

  // Group assessments by fold
  const getAssessmentsByFold = () => {
    if (!analysisResult?.assessments) return {};
    const foldGroups: { [foldIndex: number]: LandingPageContentAssessment[] } = {};
    
    analysisResult.assessments.forEach(assessment => {
      if (!foldGroups[assessment.foldIndex]) {
        foldGroups[assessment.foldIndex] = [];
      }
      foldGroups[assessment.foldIndex].push(assessment);
    });
    
    return foldGroups;
  };

  const allFrameworks = getAllFrameworks();
  const assessmentsByFold = getAssessmentsByFold();

  const getContentTypeLabel = (contentType: string, contentIndex?: number) => {
    const labels = {
      headline: 'Headline',
      subheadline: 'Subheadline',
      textBox: contentIndex !== undefined ? `Text Box ${contentIndex + 1}` : 'Text Box',
      cta: 'Call-to-Action',
      socialProof: 'Social Proof'
    };
    return labels[contentType as keyof typeof labels] || contentType;
  };

  return (
    <Card className="border border-purple-200 shadow-sm bg-gradient-to-r from-purple-50 to-indigo-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileTextIcon className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg font-semibold text-purple-900">
              Landing Page Content Analysis
            </CardTitle>
          </div>
          {categoryTitle && (
            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
              {categoryTitle}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Description */}
        <div className="text-center py-2">
          <p className="text-sm text-gray-600">
            AI-powered analysis of your landing page folds using proven psychological frameworks for conversion optimization.
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
          {!analysisResult && !isLoading && (
            <p className="text-sm text-gray-500 mt-2">
              Create content folds and click "Run Content Analysis" to get AI-powered optimization recommendations for each fold.
            </p>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Analyzing your landing page content folds...</p>
          </div>
        )}

        {/* Framework Summary Section */}
        {analysisResult && analysisResult.assessments && allFrameworks.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <SparklesIcon className="h-4 w-4 text-purple-600" />
              Framework Analysis Summary
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allFrameworks.map((framework) => {
                // Count total suggestions across all content elements for this framework
                const frameworkData = analysisResult.assessments.flatMap(assessment => 
                  assessment.frameworkAssessments.filter(fw => fw.framework === framework)
                );
                const totalSuggestions = frameworkData.reduce((sum, fw) => sum + fw.suggestions.length, 0);
                const totalIssues = frameworkData.reduce((sum, fw) => sum + fw.issues.length, 0);
                const hasRewrites = frameworkData.some(fw => fw.rewrittenContent);

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

        {/* Overall Score and Top Recommendations */}
        {analysisResult && (analysisResult.overallScore || analysisResult.topRecommendations) && (
          <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Overall Assessment</h4>
              {analysisResult.overallScore && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-600">
                    {analysisResult.overallScore ? analysisResult.overallScore.toFixed(1) : '0.0'}/5
                  </div>
                  <div className="text-xs text-gray-500">Content Score</div>
                </div>
              )}
            </div>
            
            {analysisResult.topRecommendations && analysisResult.topRecommendations.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-800 mb-2">Top Recommendations:</h5>
                <ul className="space-y-1">
                  {analysisResult.topRecommendations.map((recommendation, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-purple-600 font-bold">•</span>
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Fold-based Analysis Results */}
        {analysisResult && Object.keys(assessmentsByFold).length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <FolderIcon className="h-4 w-4 text-purple-600" />
              Content Fold Analysis
            </h4>
            
            {Object.entries(assessmentsByFold)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([foldIndexStr, foldAssessments]) => {
                const foldIndex = parseInt(foldIndexStr);
                const isExpanded = expandedFolds.has(foldIndex);
                
                return (
                  <Card key={foldIndex} className="border border-gray-200">
                    <Collapsible 
                      open={isExpanded} 
                      onOpenChange={() => toggleFoldExpanded(foldIndex)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-gray-50 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FolderIcon className="h-4 w-4 text-purple-600" />
                              <span className="font-medium text-gray-900">
                                Fold {foldIndex + 1}
                              </span>
                              <Badge variant="outline" className="bg-gray-100 text-gray-700">
                                {foldAssessments.length} elements
                              </Badge>
                            </div>
                            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="py-3">
                          <div className="space-y-3">
                            {foldAssessments.map((contentAssessment, assessmentIndex) => {
                              const contentKey = `${foldIndex}-${assessmentIndex}`;
                              const isContentExpanded = expandedContent.has(contentKey);
                              
                              return (
                                <Card key={assessmentIndex} className="border border-gray-100 bg-gray-50">
                                  <Collapsible 
                                    open={isContentExpanded} 
                                    onOpenChange={() => toggleContentExpanded(contentKey)}
                                  >
                                    <CollapsibleTrigger asChild>
                                      <CardHeader className="cursor-pointer hover:bg-gray-100 py-2">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <span className="font-medium text-gray-800 text-sm">
                                              {getContentTypeLabel(contentAssessment.contentType, contentAssessment.contentIndex)}
                                            </span>
                                            <div className="flex flex-wrap gap-1">
                                              {contentAssessment.frameworkAssessments.map((fw, idx) => (
                                                <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                                  {fw.framework}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                          <ChevronDownIcon className="h-3 w-3 text-gray-500" />
                                        </div>
                                        <div className="text-xs text-gray-600 text-left truncate max-w-md">
                                          "{contentAssessment.originalContent}"
                                        </div>
                                      </CardHeader>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <CardContent className="py-2">
                                        <div className="space-y-3">
                                          {contentAssessment.frameworkAssessments.map((frameworkAssessment, frameworkIndex) => (
                                            <div key={frameworkIndex} className="bg-white p-3 rounded-md border border-gray-200">
                                              <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="outline" className="bg-gray-100 font-semibold text-xs">
                                                  {frameworkAssessment.framework}
                                                </Badge>
                                                <div className="flex gap-1 text-xs">
                                                  {frameworkAssessment.issues.length > 0 && (
                                                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                                      {frameworkAssessment.issues.length} issues
                                                    </span>
                                                  )}
                                                  {frameworkAssessment.suggestions.length > 0 && (
                                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                                      {frameworkAssessment.suggestions.length} suggestions
                                                    </span>
                                                  )}
                                                  {frameworkAssessment.rewrittenContent && (
                                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                      Rewrite available
                                                    </span>
                                                  )}
                                                  {frameworkAssessment.score && (
                                                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                                      Score: {frameworkAssessment.score ? frameworkAssessment.score.toFixed(1) : '0.0'}/5
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              
                                              {/* Issues */}
                                              {frameworkAssessment.issues && frameworkAssessment.issues.length > 0 && (
                                                <div className="mb-2">
                                                  <h5 className="text-xs font-medium text-red-800 mb-1">Issues Identified:</h5>
                                                  <ul className="space-y-0.5">
                                                    {frameworkAssessment.issues.map((issue, issueIndex) => (
                                                      <li key={issueIndex} className="text-xs text-red-700 flex items-start gap-1">
                                                        <span className="text-red-500 font-bold">•</span>
                                                        {issue}
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              )}
                                              
                                              {/* Suggestions */}
                                              {frameworkAssessment.suggestions && frameworkAssessment.suggestions.length > 0 && (
                                                <div className="mb-2">
                                                  <h5 className="text-xs font-medium text-green-800 mb-1">Recommendations:</h5>
                                                  <ul className="space-y-0.5">
                                                    {frameworkAssessment.suggestions.map((suggestion, suggestionIndex) => (
                                                      <li key={suggestionIndex} className="text-xs text-green-700 flex items-start gap-1">
                                                        <span className="text-green-500 font-bold">•</span>
                                                        {suggestion}
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              )}
                                              
                                              {/* Rewritten Content */}
                                              {frameworkAssessment.rewrittenContent && (
                                                <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                                  <h5 className="text-xs font-medium text-blue-800 mb-1 flex items-center gap-1">
                                                    <TrendingUpIcon className="h-3 w-3" />
                                                    Optimized Content:
                                                  </h5>
                                                  <div className="space-y-1">
                                                    {Object.entries(frameworkAssessment.rewrittenContent).map(([key, value]) => (
                                                      value && (
                                                        <div key={key} className="text-xs">
                                                          <span className="font-medium text-blue-800 capitalize">{key}:</span>
                                                          <div className="text-blue-700 bg-white p-1 rounded border border-blue-200 mt-0.5">
                                                            {Array.isArray(value) ? (
                                                              <ul className="space-y-0.5">
                                                                {value.map((item, idx) => (
                                                                  <li key={idx}>"{item}"</li>
                                                                ))}
                                                              </ul>
                                                            ) : (
                                                              `"${value}"`
                                                            )}
                                                          </div>
                                                        </div>
                                                      )
                                                    ))}
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
                              );
                            })}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LandingPageAnalysisPanel; 