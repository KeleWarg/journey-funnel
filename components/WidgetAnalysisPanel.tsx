import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@components/ui/collapsible';
import { ChevronDownIcon, SparklesIcon, TrendingUpIcon, FileTextIcon, ComponentIcon } from 'lucide-react';
import { Badge } from '@components/ui/badge';

interface WidgetFrameworkAssessment {
  framework: string;
  issues: string[];
  suggestions: string[];
  rewrittenContent?: {
    heading?: string;
    subheading?: string;
    textInputPlaceholder?: string;
    ctaCopy?: string;
    supportTexts?: string[];
  };
  score?: number;
}

interface WidgetContentAssessment {
  widgetIndex: number;
  contentType: 'heading' | 'subheading' | 'textInputPlaceholder' | 'ctaCopy' | 'supportText';
  contentIndex?: number;
  originalContent: string;
  frameworkAssessments: WidgetFrameworkAssessment[];
}

interface WidgetAnalysisResult {
  assessments: WidgetContentAssessment[];
  overallScore?: number;
  topRecommendations?: string[];
}

interface WidgetAnalysisPanelProps {
  analysisResult: WidgetAnalysisResult | null;
  isLoading: boolean;
  categoryTitle: string;
}

const WidgetAnalysisPanel: React.FC<WidgetAnalysisPanelProps> = ({
  analysisResult,
  isLoading,
  categoryTitle
}) => {
  const [expandedWidgets, setExpandedWidgets] = useState<Set<number>>(new Set());
  const [expandedContent, setExpandedContent] = useState<Set<string>>(new Set());

  const toggleWidgetExpanded = (widgetIndex: number) => {
    const newExpanded = new Set(expandedWidgets);
    if (newExpanded.has(widgetIndex)) {
      newExpanded.delete(widgetIndex);
    } else {
      newExpanded.add(widgetIndex);
    }
    setExpandedWidgets(newExpanded);
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

  const getContentTypeLabel = (contentType: string, contentIndex?: number): string => {
    switch (contentType) {
      case 'heading':
        return 'Heading';
      case 'subheading':
        return 'Subheading';
      case 'textInputPlaceholder':
        return 'Input Placeholder';
      case 'ctaCopy':
        return 'CTA Button';
      case 'supportText':
        return `Support Text ${(contentIndex || 0) + 1}`;
      default:
        return contentType;
    }
  };

  // Group assessments by widget
  const assessmentsByWidget = analysisResult?.assessments.reduce((acc, assessment) => {
    if (!acc[assessment.widgetIndex]) {
      acc[assessment.widgetIndex] = [];
    }
    acc[assessment.widgetIndex].push(assessment);
    return acc;
  }, {} as Record<number, WidgetContentAssessment[]>) || {};

  if (isLoading) {
    return (
      <Card className="border border-purple-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <SparklesIcon className="h-5 w-5 animate-spin" />
            Analyzing Widget Content...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <SparklesIcon className="h-8 w-8 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">
                Running psychological framework analysis on your widget content...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysisResult) {
    return null;
  }

  return (
    <Card className="border border-purple-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <TrendingUpIcon className="h-5 w-5" />
            Widget Analysis Results
            {categoryTitle && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                {categoryTitle}
              </Badge>
            )}
          </CardTitle>
          
          {analysisResult.overallScore && (
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(analysisResult.overallScore)}%
              </div>
              <div className="text-xs text-gray-500">Overall Score</div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Top Recommendations */}
        {analysisResult.topRecommendations && analysisResult.topRecommendations.length > 0 && (
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h4 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
              <SparklesIcon className="h-4 w-4" />
              Top Recommendations
            </h4>
            <ul className="space-y-1">
              {analysisResult.topRecommendations.map((recommendation, index) => (
                <li key={index} className="text-sm text-purple-800 flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Widget Analysis Results */}
        {analysisResult && Object.keys(assessmentsByWidget).length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <ComponentIcon className="h-4 w-4 text-purple-600" />
              Widget Content Analysis
            </h4>
            
            {Object.entries(assessmentsByWidget)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([widgetIndexStr, widgetAssessments]) => {
                const widgetIndex = parseInt(widgetIndexStr);
                const isExpanded = expandedWidgets.has(widgetIndex);
                
                return (
                  <Card key={widgetIndex} className="border border-gray-200">
                    <Collapsible 
                      open={isExpanded} 
                      onOpenChange={() => toggleWidgetExpanded(widgetIndex)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-gray-50 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <ComponentIcon className="h-4 w-4 text-purple-600" />
                              <span className="font-medium text-gray-900">
                                Widget {widgetIndex + 1}
                              </span>
                              <Badge variant="outline" className="bg-gray-100 text-gray-700">
                                {widgetAssessments.length} elements
                              </Badge>
                            </div>
                            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="py-3">
                          <div className="space-y-3">
                            {widgetAssessments.map((contentAssessment, assessmentIndex) => {
                              const contentKey = `${widgetIndex}-${assessmentIndex}`;
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
                                                  {frameworkAssessment.rewrittenContent && (
                                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                      Rewrite available
                                                    </span>
                                                  )}
                                                  {frameworkAssessment.score && (
                                                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                                      Score: {Math.round(frameworkAssessment.score)}%
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              
                                              {/* Issues */}
                                              {frameworkAssessment.issues.length > 0 && (
                                                <div className="mb-3">
                                                  <h6 className="text-xs font-medium text-red-700 mb-1">Issues Found:</h6>
                                                  <ul className="text-xs text-red-600 space-y-1">
                                                    {frameworkAssessment.issues.map((issue, issueIndex) => (
                                                      <li key={issueIndex} className="flex items-start gap-1">
                                                        <span className="text-red-500 font-bold">•</span>
                                                        {issue}
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              )}

                                              {/* Suggestions */}
                                              {frameworkAssessment.suggestions.length > 0 && (
                                                <div className="mb-3">
                                                  <h6 className="text-xs font-medium text-green-700 mb-1">Suggestions:</h6>
                                                  <ul className="text-xs text-green-600 space-y-1">
                                                    {frameworkAssessment.suggestions.map((suggestion, suggestionIndex) => (
                                                      <li key={suggestionIndex} className="flex items-start gap-1">
                                                        <span className="text-green-500 font-bold">•</span>
                                                        {suggestion}
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              )}

                                              {/* Rewritten Content */}
                                              {frameworkAssessment.rewrittenContent && (
                                                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                                  <h6 className="text-xs font-medium text-blue-700 mb-2">Optimized Content:</h6>
                                                  <div className="space-y-2">
                                                    {Object.entries(frameworkAssessment.rewrittenContent).map(([key, value]) => (
                                                      <div key={key} className="text-xs">
                                                        <span className="font-medium text-blue-800 capitalize">
                                                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                                                        </span>
                                                        <div className="text-blue-700 mt-1 pl-2 border-l-2 border-blue-300">
                                                          {Array.isArray(value) ? (
                                                            <ul className="space-y-1">
                                                              {value.map((item, idx) => (
                                                                <li key={idx}>• {item}</li>
                                                              ))}
                                                            </ul>
                                                          ) : (
                                                            value
                                                          )}
                                                        </div>
                                                      </div>
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

export default WidgetAnalysisPanel; 