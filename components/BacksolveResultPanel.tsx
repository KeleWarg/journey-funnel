import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@components/ui/collapsible';
import { ChevronDownIcon } from 'lucide-react';
import { BacksolveResult } from '../types';

interface BacksolveResultPanelProps {
  backsolveResult: BacksolveResult;
}

const BacksolveResultPanel: React.FC<BacksolveResultPanelProps> = ({
  backsolveResult
}) => {
  return (
    <Card className="border border-purple-200 shadow-sm bg-purple-50">
      <Collapsible defaultOpen>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-purple-100 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-purple-900">
                ✅ Back-Solve Results
              </CardTitle>
              <ChevronDownIcon className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            
            {/* Result Summary */}
            <div className="p-4 bg-white rounded-lg border border-purple-200">
              <h4 className="font-medium text-gray-900 mb-2">Optimal Parameters Found</h4>
              {backsolveResult.bestParams.overall_predicted_CR_best !== null && backsolveResult.bestParams.overall_predicted_CR_best !== undefined && (
                <div className="space-y-1 mb-3">
                  <p className="text-sm text-gray-600">
                    Overall Predicted CR (Best): <span className="font-mono font-semibold text-purple-700">
                      {(backsolveResult.bestParams.overall_predicted_CR_best * 100).toFixed(4)}%
                    </span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Overall Observed CR: <span className="font-mono font-semibold text-blue-700">
                      {(backsolveResult.bestParams.overall_observed_CR * 100).toFixed(4)}%
                  </span>
                </p>
                </div>
              )}
              
              {/* Parameters Display */}
              <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">
                {JSON.stringify(backsolveResult.bestParams, null, 2)}
              </pre>
            </div>

            {/* Info Text */}
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                ✅ <strong>Parameters Applied Automatically:</strong> These optimized parameters have been automatically applied to your simulation model for improved accuracy.
              </p>
            </div>

          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default BacksolveResultPanel;
