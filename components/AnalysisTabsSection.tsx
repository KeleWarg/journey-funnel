import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { BarChart3Icon, BrainIcon, SparklesIcon } from 'lucide-react';
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
  MCPFunnelVariant
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
  baselineCR
}) => {
  const [activeTab, setActiveTab] = useState('fogg_model');

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
        <CardTitle>Specialized Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fogg_model" className="flex items-center gap-2">
              <BrainIcon className="h-4 w-4" />
              Fogg Model
            </TabsTrigger>
            <TabsTrigger value="llm_copy" className="flex items-center gap-2">
              <SparklesIcon className="h-4 w-4" />
              Copy & Uplift
            </TabsTrigger>
          </TabsList>



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
                  <p className="mb-4">No Fogg Model analysis available</p>
                  {onRunFoggAnalysis && (
                    <div className="space-y-2">
                      <button
                        onClick={onRunFoggAnalysis}
                        disabled={isMCPAnalyzing}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {isMCPAnalyzing ? 'Analyzing...' : 'Run Fogg Analysis'}
                      </button>
                      <p className="text-sm text-gray-500">
                        Click to analyze your funnel with the Fogg Behavior Model (B = MAT)
                      </p>
                    </div>
                  )}
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
                onRunAssessment={onRunAssessment}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AnalysisTabsSection; 