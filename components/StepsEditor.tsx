import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Trash2Icon, PlusIcon } from 'lucide-react';
import { Question, Step, BoostElement } from '../types';
import BoostElementsControl from './BoostElementsControl';

interface StepsEditorProps {
  steps: Step[];
  onAddStep: () => void;
  onRemoveStep: (index: number) => void;
  onUpdateStep: (index: number, updates: Partial<Step>) => void;
  onAddQuestion: (stepIndex: number) => void;
  onRemoveQuestion: (stepIndex: number, questionIndex: number) => void;
  onUpdateQuestion: (stepIndex: number, questionIndex: number, updates: Partial<Question>) => void;
  inputTypeOptions: { value: string; label: string }[];
  invasivenessOptions: { value: number; label: string }[];
  difficultyOptions: { value: number; label: string }[];
  onBoostElementsChange?: (stepIndex: number, elements: BoostElement[]) => void;
  onClassifyBoostElements?: (stepIndex: number, elements: BoostElement[]) => Promise<void>;
  isClassifyingBoosts?: boolean;
}

const StepsEditor: React.FC<StepsEditorProps> = ({
  steps,
  onAddStep,
  onRemoveStep,
  onUpdateStep,
  onAddQuestion,
  onRemoveQuestion,
  onUpdateQuestion,
  inputTypeOptions,
  invasivenessOptions,
  difficultyOptions,
  onBoostElementsChange,
  onClassifyBoostElements,
  isClassifyingBoosts
}) => {
  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Steps & Questions
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        
        {steps.map((step, stepIndex) => (
          <Card key={stepIndex} className="border border-gray-300 bg-white">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium text-gray-800">
                  Step {stepIndex + 1}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRemoveStep(stepIndex)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2Icon className="h-4 w-4" />
                  Remove Step
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-4 space-y-4">
              
              {/* Step Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Boosts (0–3)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={3}
                    value={step.boosts}
                    onChange={(e) => onUpdateStep(stepIndex, { boosts: parseInt(e.target.value) || 0 })}
                    className="w-20 border-gray-300 focus:border-blue-500"
                    title="Energy boost reduces fatigue temporarily"
                  />
                  <p className="text-xs text-gray-500">Energy boost reduces fatigue temporarily</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Observed CR (0.00–1.00)
                  </Label>
                  <Input
                    type="number"
                    step={0.01}
                    min={0}
                    max={1}
                    value={step.observedCR}
                    onChange={(e) => onUpdateStep(stepIndex, { observedCR: parseFloat(e.target.value) || 0 })}
                    className={`w-24 focus:border-blue-500 ${
                      step.observedCR < 0.05 ? 'border-yellow-400 bg-yellow-50' : 
                      step.observedCR > 0.95 ? 'border-yellow-400 bg-yellow-50' : 
                      'border-gray-300'
                    }`}
                    title="Actual conversion rate you saw on this step (for Back-Solve)"
                  />
                  <p className="text-xs text-gray-500">Actual conversion rate you saw on this step (for Back-Solve)</p>
                  {step.observedCR < 0.05 && step.observedCR > 0 && (
                    <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                      ⚠️ Very low CR may cause model reliability issues
                    </div>
                  )}
                  {step.observedCR === 0 && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                      🚫 Zero CR will make total funnel CR zero
                    </div>
                  )}
                  {step.observedCR > 0.95 && (
                    <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                      ⚠️ Very high CR (&gt;{Math.round(step.observedCR * 100)}%) is uncommon
                    </div>
                  )}
                </div>
              </div>

              {/* Boost Elements */}
              {onBoostElementsChange && (
                <BoostElementsControl
                  stepIndex={stepIndex}
                  elements={step.boostElements || []}
                  onElementsChange={onBoostElementsChange}
                  onClassifyElements={onClassifyBoostElements}
                  isClassifying={isClassifyingBoosts}
                  maxBoostScore={5}
                />
              )}

              {/* Questions List */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Questions</h4>
                
                {step.questions.map((question, questionIndex) => (
                  <div key={questionIndex} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                      
                      {/* Question Title */}
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-xs text-gray-600">Question Text</Label>
                        <Input
                          value={question.title}
                          onChange={(e) => onUpdateQuestion(stepIndex, questionIndex, { title: e.target.value })}
                          placeholder="Enter question text"
                          className="border-gray-300 focus:border-blue-500"
                        />
                      </div>

                      {/* Input Type */}
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Input Type</Label>
                        <Select 
                          value={question.input_type} 
                          onValueChange={(value) => onUpdateQuestion(stepIndex, questionIndex, { input_type: value })}
                        >
                          <SelectTrigger className="border-gray-300 focus:border-blue-500">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {inputTypeOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Invasiveness */}
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Invasiveness</Label>
                        <Select 
                          value={question.invasiveness.toString()} 
                          onValueChange={(value) => onUpdateQuestion(stepIndex, questionIndex, { invasiveness: parseInt(value) })}
                        >
                          <SelectTrigger className="border-gray-300 focus:border-blue-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {invasivenessOptions.map(option => (
                              <SelectItem key={option.value} value={option.value.toString()}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Difficulty */}
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Difficulty</Label>
                        <Select 
                          value={question.difficulty.toString()} 
                          onValueChange={(value) => onUpdateQuestion(stepIndex, questionIndex, { difficulty: parseInt(value) })}
                        >
                          <SelectTrigger className="border-gray-300 focus:border-blue-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {difficultyOptions.map(option => (
                              <SelectItem key={option.value} value={option.value.toString()}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Remove Question Button */}
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRemoveQuestion(stepIndex, questionIndex)}
                          className="text-red-500 border-red-300 hover:bg-red-50"
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </div>

                    </div>
                  </div>
                ))}

                {/* Add Question Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddQuestion(stepIndex)}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Question
                </Button>

              </div>

            </CardContent>
          </Card>
        ))}

        {/* Add Step Button */}
        <Button
          variant="outline"
          onClick={onAddStep}
          className="w-full text-green-600 border-green-300 hover:bg-green-50"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Step
        </Button>

        {/* Validation Message */}
        {steps.some(step => step.questions.some(q => !q.input_type || !q.title.trim())) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              Please select an Input Type and enter question text for each question to enable simulation.
            </p>
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default StepsEditor;
