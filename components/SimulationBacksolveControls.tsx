import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Loader2Icon } from 'lucide-react';

interface SimulationBacksolveControlsProps {
  onRunCompleteAnalysis: () => void;
  isRunningComplete: boolean;
  loadingMessage: string;
  canRunCompleteAnalysis: boolean;
}

const SimulationBacksolveControls: React.FC<SimulationBacksolveControlsProps> = ({
  onRunCompleteAnalysis,
  isRunningComplete,
  loadingMessage,
  canRunCompleteAnalysis
}) => {
  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Run Complete Analysis
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col gap-4">
          
          {/* Run Complete Analysis Button */}
          <Button
            onClick={onRunCompleteAnalysis}
            disabled={!canRunCompleteAnalysis || isRunningComplete}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-md hover:from-blue-700 hover:to-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-base"
          >
            {isRunningComplete ? (
              <>
                <Loader2Icon className="h-5 w-5 mr-3 animate-spin" />
                {loadingMessage}
              </>
            ) : (
              '🚀 Run Complete Analysis'
            )}
          </Button>

        </div>

        {/* Help Text */}
        <div className="mt-4 space-y-2 text-sm text-gray-600">
          {!canRunCompleteAnalysis && (
            <p className="text-red-600">
              Fill in all required fields (question text, input types, and observed CR values) to enable complete analysis.
            </p>
          )}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="font-medium text-blue-900 mb-2">Complete Analysis includes:</p>
            <ul className="space-y-1 text-blue-800">
              <li>• <strong>Initial Simulation:</strong> Predicts conversion rates based on your funnel configuration</li>
              <li>• <strong>Back-Solve Optimization:</strong> Finds optimal constants that match your observed rates</li>
              <li>• <strong>Updated Simulation:</strong> Re-runs simulation with optimized parameters for accurate results</li>
            </ul>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default SimulationBacksolveControls;
