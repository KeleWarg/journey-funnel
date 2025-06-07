
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Label } from '@components/ui/label';
import { Input } from '@components/ui/input';
import { Loader2Icon } from 'lucide-react';

interface OptimizeControlsProps {
  numSamples: number;
  setNumSamples: (value: number) => void;
  onRunOptimize: () => void;
  isOptimizing: boolean;
}

const OptimizeControls: React.FC<OptimizeControlsProps> = ({
  numSamples,
  setNumSamples,
  onRunOptimize,
  isOptimizing
}) => {
  return (
    <Card className="border border-gray-200 shadow-sm bg-indigo-50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-indigo-900">
          Find Optimal Flow
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          
          {/* Number of Samples Input */}
          <div className="space-y-2">
            <Label htmlFor="num-samples" className="text-sm font-medium text-gray-700">
              # of Samples to Try
            </Label>
            <Input
              id="num-samples"
              type="number"
              step={100}
              min={100}
              max={10000}
              value={numSamples}
              onChange={(e) => setNumSamples(parseInt(e.target.value) || 1000)}
              className="w-32 border-gray-300 focus:border-indigo-500"
            />
          </div>

          {/* Run Optimize Button */}
          <Button
            onClick={onRunOptimize}
            disabled={isOptimizing}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {isOptimizing ? (
              <>
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                Optimizing...
              </>
            ) : (
              'Run Optimize'
            )}
          </Button>

        </div>

        {/* Help Text */}
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <strong>Optimization</strong> will test different question orderings to find the flow that maximizes conversion rate.
          </p>
          <p>
            More samples = better results but longer processing time. After completion, the Results Table will show optimal positions and the best overall CR.
          </p>
        </div>

      </CardContent>
    </Card>
  );
};

export default OptimizeControls;
