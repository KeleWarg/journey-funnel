import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import FogMetricsTable from './FogMetricsTable';
import FoggOrderResult from './FoggOrderResult';
import { BrainIcon, TrendingUpIcon } from 'lucide-react';

interface FoggVariant {
  framework: string;
  step_order: number[];
  CR_total: number;
  uplift_pp: number;
  fogg_metrics?: Array<{
    stepIndex: number;
    motivation: number;
    ability: number;
    trigger: number;
    fogg_score: number;
    complexity?: number;
  }>;
}

interface FoggModelAnalysisProps {
  foggVariant: FoggVariant | null;
  isLoading: boolean;
  onApplyOrder?: (order: number[]) => void;
  steps: Array<{ questions: any[] }>;
}

const FoggModelAnalysis: React.FC<FoggModelAnalysisProps> = ({
  foggVariant,
  isLoading,
  onApplyOrder,
  steps
}) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'order'>('metrics');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainIcon className="h-5 w-5 text-indigo-500" />
            Fogg Behavior Model Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-gray-600">Computing Fogg Model metrics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!foggVariant || !foggVariant.fogg_metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainIcon className="h-5 w-5 text-indigo-500" />
            Fogg Behavior Model Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BrainIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Ready for Fogg Analysis!</h3>
            <p className="text-gray-500 mb-4">
              Get personalized insights using the Fogg Behavior Model (B = MAT)
            </p>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4 text-left">
              <h4 className="text-sm font-semibold text-indigo-800 mb-2">What you'll get:</h4>
              <ul className="text-sm text-indigo-700 space-y-1">
                <li>• <strong>Motivation scores</strong> for each step</li>
                <li>• <strong>Ability ratings</strong> based on complexity</li>
                <li>• <strong>Trigger effectiveness</strong> analysis</li>
                <li>• <strong>Recommended step order</strong> to maximize conversions</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Click <strong>"Standard MCP"</strong> or <strong>"Enhanced MCP"</strong> above to generate Fogg analysis
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainIcon className="h-5 w-5 text-indigo-500" />
            Fogg Behavior Model Analysis
          </CardTitle>
          <div className="text-sm text-gray-600">
            Behavior = Motivation × Ability × Trigger (B = MAT)
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {foggVariant.fogg_metrics.reduce((sum, m) => sum + m.motivation, 0) / foggVariant.fogg_metrics.length}
              </div>
              <div className="text-sm text-gray-600">Avg Motivation</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {foggVariant.fogg_metrics.reduce((sum, m) => sum + m.ability, 0) / foggVariant.fogg_metrics.length}
              </div>
              <div className="text-sm text-gray-600">Avg Ability</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {foggVariant.fogg_metrics.reduce((sum, m) => sum + m.trigger, 0) / foggVariant.fogg_metrics.length}
              </div>
              <div className="text-sm text-gray-600">Avg Trigger</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'metrics'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('metrics')}
            >
              Step Metrics
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'order'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('order')}
            >
              Recommended Order
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'metrics' && (
            <div>
              <FogMetricsTable rows={foggVariant.fogg_metrics} />
              
              {/* Fogg Model Explanation */}
              <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-indigo-800 mb-2">
                  🧠 How Fogg Behavior Model Works
                </h4>
                <div className="text-sm text-indigo-700 space-y-2">
                  <p>
                    <strong>Motivation:</strong> How much the user wants to complete this step (1-5 scale)
                  </p>
                  <p>
                    <strong>Ability:</strong> How easy it is to complete this step (calculated as 6 - complexity, capped 1-5)
                  </p>
                  <p>
                    <strong>Trigger:</strong> How clear and compelling the call-to-action is (1-5 scale)
                  </p>
                  <p className="mt-3 font-medium">
                    Fogg Score = Motivation × Ability × Trigger. Higher scores indicate steps more likely to drive conversion.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'order' && (
            <FoggOrderResult
              order={foggVariant.step_order}
              CR_total={foggVariant.CR_total}
              uplift_pp={foggVariant.uplift_pp}
              onApplyOrder={onApplyOrder}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FoggModelAnalysis; 