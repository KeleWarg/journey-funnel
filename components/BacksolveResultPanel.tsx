import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@components/ui/collapsible';
import { ChevronDownIcon } from 'lucide-react';
import { BacksolveResult } from '../types';

interface BacksolveResultPanelProps {
  backsolveResult: BacksolveResult;
  onUpdateSimulation: () => void;
  onRestoreDefault: () => void;
  backupOverrides: Record<string, number> | null;
}

const BacksolveResultPanel: React.FC<BacksolveResultPanelProps> = ({
  backsolveResult,
  onUpdateSimulation,
  onRestoreDefault,
  backupOverrides
}) => {
  return (
    <Card className="border border-purple-200 shadow-sm bg-purple-50">
      <Collapsible defaultOpen>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-purple-100 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-purple-900">
                Back-Solve Result
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

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={onUpdateSimulation}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
              >
                Update Simulation
              </Button>
              
              {backupOverrides && (
                <Button
                  onClick={onRestoreDefault}
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Restore to Default
                </Button>
              )}
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-600">
              Update Simulation applies these constants and runs a new simulation, or restore to return to default values.
            </p>

          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default BacksolveResultPanel;
