
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Label } from '@components/ui/label';
import { Input } from '@components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@components/ui/collapsible';
import { ChevronDownIcon } from 'lucide-react';

// Move options outside component to prevent recreating on every render
const JOURNEY_TYPE_OPTIONS = [
  { value: 'transactional', label: 'Transactional' },
  { value: 'exploratory', label: 'Exploratory' },
  { value: 'emotional', label: 'Emotional' },
  { value: 'legal_required', label: 'Legal Required' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'urgent', label: 'Urgent' }
] as const;

const EMOTION_OPTIONS = [
  { value: 1, label: '1 - Neutral/Logical' },
  { value: 2, label: '2 - Slightly Emotional' },
  { value: 3, label: '3 - Moderately Emotional' },
  { value: 4, label: '4 - Highly Emotional' },
  { value: 5, label: '5 - Extremely Emotional' }
] as const;

const NECESSITY_OPTIONS = [
  { value: 1, label: '1 - Nice to Have' },
  { value: 2, label: '2 - Somewhat Important' },
  { value: 3, label: '3 - Important' },
  { value: 4, label: '4 - Very Important' },
  { value: 5, label: '5 - Critical/Urgent' }
] as const;

const TRAFFIC_SOURCE_OPTIONS = [
  { value: 'paid_search', label: 'Paid Search' },
  { value: 'paid_social', label: 'Paid Social' },
  { value: 'organic_search', label: 'Organic Search' },
  { value: 'direct_referral', label: 'Direct/Referral' },
  { value: 'display_email', label: 'Display/Email' },
  { value: 'social_organic', label: 'Social Organic' }
] as const;

interface FunnelSettingsSectionProps {
  journeyType: string;
  onJourneyTypeChange: (type: string) => void;
  E: number;
  setE: (value: number) => void;
  N: number;
  setN: (value: number) => void;
  source: string;
  setSource: (value: string) => void;
  U0: number;
  setU0: (value: number) => void;
  c1: number; 
  setC1: (value: number) => void;
  c2: number; 
  setC2: (value: number) => void;
  c3: number; 
  setC3: (value: number) => void;
  w_c: number; 
  setWC: (value: number) => void;
  w_f: number; 
  setWF: (value: number) => void;
  w_E: number; 
  setWE: (value: number) => void;
  w_N: number; 
  setWN: (value: number) => void;
}



const FunnelSettingsSection: React.FC<FunnelSettingsSectionProps> = ({
  journeyType, onJourneyTypeChange,
  E, setE, N, setN, source, setSource, U0, setU0,
  c1, setC1, c2, setC2, c3, setC3,
  w_c, setWC, w_f, setWF, w_E, setWE, w_N, setWN
}) => {
  return (
    <Card className="border border-gray-200 shadow-sm">
      <Collapsible>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Funnel-Level Settings
              </CardTitle>
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="bg-gray-50 border-t border-dashed border-gray-200 space-y-6">
        
        {/* Main Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Journey Type */}
          <div className="space-y-2">
            <Label htmlFor="journey-type" className="text-sm font-medium text-gray-700">
              Journey Type
            </Label>
            <Select value={journeyType} onValueChange={onJourneyTypeChange}>
              <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-300">
                <SelectValue placeholder="Select journey type" />
              </SelectTrigger>
              <SelectContent>
                {JOURNEY_TYPE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">Select the funnel archetype; defaults will auto-populate weight values</p>
          </div>

          {/* Emotion */}
          <div className="space-y-2">
            <Label htmlFor="emotion" className="text-sm font-medium text-gray-700">
              Emotion (E)
            </Label>
            <Select value={E.toString()} onValueChange={(val) => setE(parseInt(val))}>
              <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-300">
                <SelectValue placeholder="Select emotion level" />
              </SelectTrigger>
              <SelectContent>
                {EMOTION_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">How strongly does this journey pull the user emotionally?</p>
          </div>

          {/* Necessity */}
          <div className="space-y-2">
            <Label htmlFor="necessity" className="text-sm font-medium text-gray-700">
              Necessity (N)
            </Label>
            <Select value={N.toString()} onValueChange={(val) => setN(parseInt(val))}>
              <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-300">
                <SelectValue placeholder="Select necessity level" />
              </SelectTrigger>
              <SelectContent>
                {NECESSITY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">How urgently does the user need to complete this journey?</p>
          </div>

        </div>

        {/* Secondary Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Traffic Source */}
          <div className="space-y-2">
            <Label htmlFor="traffic-source" className="text-sm font-medium text-gray-700">
              Traffic Source
            </Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-300">
                <SelectValue placeholder="Select traffic source" />
              </SelectTrigger>
              <SelectContent>
                {TRAFFIC_SOURCE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">Your traffic source influences the entry-intent multiplier S</p>
          </div>

          {/* Initial Cohort */}
          <div className="space-y-2">
            <Label htmlFor="u0" className="text-sm font-medium text-gray-700">
              U₀ (Initial Cohort)
            </Label>
            <Input
              id="u0"
              type="number"
              step={100}
              value={U0}
              onChange={(e) => setU0(parseInt(e.target.value) || 1000)}
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-300"
            />
            <p className="text-xs text-gray-500">Starting number of users entering the funnel</p>
          </div>

        </div>

        {/* Advanced Weight Settings */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <div className="cursor-pointer p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Advanced Weight Settings</h3>
                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
              </div>
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              
              <div className="space-y-2">
                <Label htmlFor="c1" className="text-sm font-medium text-gray-700">c₁ (interaction weight)</Label>
                <Input
                  id="c1"
                  type="number"
                  step={0.1}
                  value={c1}
                  onChange={(e) => setC1(parseFloat(e.target.value) || 0)}
                  className="border-gray-300 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="c2" className="text-sm font-medium text-gray-700">c₂ (privacy weight)</Label>
                <Input
                  id="c2"
                  type="number"
                  step={0.1}
                  value={c2}
                  onChange={(e) => setC2(parseFloat(e.target.value) || 0)}
                  className="border-gray-300 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="c3" className="text-sm font-medium text-gray-700">c₃ (difficulty weight)</Label>
                <Input
                  id="c3"
                  type="number"
                  step={0.1}
                  value={c3}
                  onChange={(e) => setC3(parseFloat(e.target.value) || 0)}
                  className="border-gray-300 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="w_c" className="text-sm font-medium text-gray-700">w_c (complexity weight)</Label>
                <Input
                  id="w_c"
                  type="number"
                  step={0.1}
                  value={w_c}
                  onChange={(e) => setWC(parseFloat(e.target.value) || 0)}
                  className="border-gray-300 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="w_f" className="text-sm font-medium text-gray-700">w_f (fatigue weight)</Label>
                <Input
                  id="w_f"
                  type="number"
                  step={0.1}
                  value={w_f}
                  onChange={(e) => setWF(parseFloat(e.target.value) || 0)}
                  className="border-gray-300 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="w_E" className="text-sm font-medium text-gray-700">w_E (Emotion weight)</Label>
                <Input
                  id="w_E"
                  type="number"
                  step={0.01}
                  value={w_E}
                  onChange={(e) => setWE(parseFloat(e.target.value) || 0)}
                  className="border-gray-300 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="w_N" className="text-sm font-medium text-gray-700">w_N (Necessity weight)</Label>
                <Input
                  id="w_N"
                  type="number"
                  step={0.01}
                  value={w_N}
                  onChange={(e) => setWN(parseFloat(e.target.value) || 0)}
                  className="border-gray-300 focus:border-blue-500"
                />
              </div>

            </div>
          </CollapsibleContent>
        </Collapsible>

          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

// Memoize component to prevent unnecessary re-renders when props haven't changed
export default React.memo(FunnelSettingsSection);
