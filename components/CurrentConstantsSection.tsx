
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Label } from '@components/ui/label';
import { Input } from '@components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@components/ui/collapsible';
import { ChevronDownIcon } from 'lucide-react';

interface CurrentConstantsSectionProps {
  overrides: Record<string, number>;
  setOverrides: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

const CurrentConstantsSection: React.FC<CurrentConstantsSectionProps> = ({
  overrides,
  setOverrides
}) => {
  const defaultK = 0.1;
  const defaultGamma = 2.0;
  const defaultEpsilon = 0.05;

  const updateOverride = (key: string, value: number) => {
    setOverrides(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="border border-gray-200 shadow-sm">
      <Collapsible>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Current Constants
              </CardTitle>
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="bg-gray-50 border-t border-dashed border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="space-y-2">
                <Label htmlFor="k-input" className="text-sm font-medium text-gray-700">
                  k (Motivation Decay)
                </Label>
                <Input
                  id="k-input"
                  type="number"
                  step={0.01}
                  value={overrides.k ?? defaultK}
                  onChange={(e) => updateOverride('k', parseFloat(e.target.value) || 0)}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-300"
                  title="Controls how quickly motivation falls per step"
                />
                <p className="text-xs text-gray-500">Controls how quickly motivation falls per step</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gamma-input" className="text-sm font-medium text-gray-700">
                  γ_exit (Exit Sensitivity)
                </Label>
                <Input
                  id="gamma-input"
                  type="number"
                  step={0.01}
                  value={overrides.gamma_exit ?? defaultGamma}
                  onChange={(e) => updateOverride('gamma_exit', parseFloat(e.target.value) || 0)}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-300"
                  title="Controls how sensitive exit probability is to burden gap"
                />
                <p className="text-xs text-gray-500">Controls how sensitive exit probability is to burden gap</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="epsilon-input" className="text-sm font-medium text-gray-700">
                  ε (Multi-question Penalty)
                </Label>
                <Input
                  id="epsilon-input"
                  type="number"
                  step={0.01}
                  value={overrides.epsilon ?? defaultEpsilon}
                  onChange={(e) => updateOverride('epsilon', parseFloat(e.target.value) || 0)}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-300"
                  title="Optional extra penalty when multiple questions exist in one step"
                />
                <p className="text-xs text-gray-500">Optional extra penalty when multiple questions exist in one step</p>
              </div>

            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default CurrentConstantsSection;
