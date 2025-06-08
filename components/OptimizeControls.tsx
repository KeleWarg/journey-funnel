
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
  hybridSeeding: boolean;
  setHybridSeeding: (value: boolean) => void;
  hasLLMAssessments?: boolean;
}

const OptimizeControls: React.FC<OptimizeControlsProps> = ({
  numSamples,
  setNumSamples,
  onRunOptimize,
  isOptimizing,
  hybridSeeding,
  setHybridSeeding,
  hasLLMAssessments = false
}) => {
  return (
    <Card className="border border-gray-200 shadow-sm bg-indigo-50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-indigo-900">
          Find Optimal Flow
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Number of Samples Input */}
          <div className="space-y-2">
            <Label htmlFor="num-samples" className="text-sm font-medium text-gray-700">
              # of Samples to Try
            </Label>
            <Input
              id="num-samples"
              type="number"
              step={1000}
              min={1000}
              max={20000}
              value={numSamples}
              onChange={(e) => setNumSamples(parseInt(e.target.value) || 20000)}
              className="w-32 border-gray-300 focus:border-indigo-500"
            />
          </div>

          {/* Hybrid Seeding Checkbox */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Optimization Options
            </Label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hybrid-seeding"
                checked={hybridSeeding}
                onChange={(e) => setHybridSeeding(e.target.checked)}
                disabled={!hasLLMAssessments}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label 
                htmlFor="hybrid-seeding" 
                className={`text-sm ${hasLLMAssessments ? 'text-gray-900' : 'text-gray-400'}`}
              >
                Hybrid Fogg + ELM Seeding
              </label>
            </div>
            {!hasLLMAssessments && (
              <p className="text-xs text-amber-600">
                ⚠️ Run LLM Assessment first to enable seeding
              </p>
            )}
          </div>

          {/* Run Optimize Button */}
          <div className="flex items-end">
            <Button
              onClick={onRunOptimize}
              disabled={isOptimizing}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 w-full lg:w-auto"
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

        </div>

        {/* Help Text */}
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <strong>Optimization</strong> will test different question orderings to find the flow that maximizes conversion rate.
          </p>
          <p>
            More samples = better results but longer processing time. <strong>Hybrid Seeding</strong> uses Fogg Behavior Model + ELM analysis to intelligently seed the search with high-potential orderings.
          </p>
          <p>
            After completion, the Results Table will show optimal positions and the best overall CR.
          </p>
        </div>

      </CardContent>
    </Card>
  );
};

export default OptimizeControls;
