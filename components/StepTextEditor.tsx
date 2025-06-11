import React from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { StepWithText } from '../types';

interface StepTextEditorProps {
  step: StepWithText;
  onUpdateStep: (updates: Partial<StepWithText>) => void;
}

const StepTextEditor: React.FC<StepTextEditorProps> = ({
  step,
  onUpdateStep,
}) => {
  return (
    <div className="space-y-4">
      {/* Support Copy */}
      <div className="space-y-2">
        <Label htmlFor="support-copy" className="text-sm font-medium text-gray-700">
          Supporting Copy (optional)
        </Label>
        <Textarea
          id="support-copy"
          value={step.supportCopy || ''}
          onChange={(e) => onUpdateStep({ supportCopy: e.target.value })}
          placeholder="Add supporting text to display beneath the question"
          className="border-gray-300 focus:border-blue-500 min-h-[100px]"
        />
      </div>

      {/* Extra Support Texts */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">
          Additional Context (optional, up to 2)
        </Label>
        <div className="space-y-3">
          <Input
            value={step.extraSupportTexts?.[0] || ''}
            onChange={(e) => {
              const newTexts = [...(step.extraSupportTexts || [])];
              newTexts[0] = e.target.value;
              onUpdateStep({ extraSupportTexts: newTexts });
            }}
            placeholder="First additional context"
            className="border-gray-300 focus:border-blue-500"
          />
          <Input
            value={step.extraSupportTexts?.[1] || ''}
            onChange={(e) => {
              const newTexts = [...(step.extraSupportTexts || [])];
              newTexts[1] = e.target.value;
              onUpdateStep({ extraSupportTexts: newTexts });
            }}
            placeholder="Second additional context"
            className="border-gray-300 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default StepTextEditor; 