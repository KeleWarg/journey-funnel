import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Trash2Icon, PlusIcon, ZapIcon, SparklesIcon } from 'lucide-react';

export interface BoostElement {
  id: string;
  text: string;
  category?: string;
  score?: number;
}

export interface StepBoostElements {
  stepIndex: number;
  elements: BoostElement[];
  totalScore: number;
  cappedScore: number;
}

interface BoostElementsControlProps {
  stepIndex: number;
  elements: BoostElement[];
  onElementsChange: (stepIndex: number, elements: BoostElement[]) => void;
  isClassifying?: boolean;
  onClassifyElements?: (stepIndex: number, elements: BoostElement[]) => Promise<void>;
  maxBoostScore?: number;
}

const BoostElementsControl: React.FC<BoostElementsControlProps> = ({
  stepIndex,
  elements,
  onElementsChange,
  isClassifying = false,
  onClassifyElements,
  maxBoostScore = 5
}) => {
  const [newElementText, setNewElementText] = useState('');

  const addElement = () => {
    if (!newElementText.trim()) return;
    
    const newElement: BoostElement = {
      id: `step-${stepIndex}-element-${Date.now()}`,
      text: newElementText.trim(),
    };
    
    const updatedElements = [...elements, newElement];
    onElementsChange(stepIndex, updatedElements);
    setNewElementText('');
  };

  const removeElement = (elementId: string) => {
    const updatedElements = elements.filter(el => el.id !== elementId);
    onElementsChange(stepIndex, updatedElements);
  };

  const updateElement = (elementId: string, newText: string) => {
    const updatedElements = elements.map(el => 
      el.id === elementId ? { ...el, text: newText } : el
    );
    onElementsChange(stepIndex, updatedElements);
  };

  const handleClassify = () => {
    if (onClassifyElements && elements.length > 0) {
      onClassifyElements(stepIndex, elements);
    }
  };

  const totalScore = elements.reduce((sum, el) => sum + (el.score || 0), 0);
  const cappedScore = Math.min(totalScore, maxBoostScore);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'social-proof': 'bg-blue-100 text-blue-800',
      'authority': 'bg-purple-100 text-purple-800',
      'urgency': 'bg-red-100 text-red-800',
      'scarcity': 'bg-orange-100 text-orange-800',
      'visual': 'bg-green-100 text-green-800',
      'security': 'bg-gray-100 text-gray-800',
      'progress': 'bg-indigo-100 text-indigo-800',
      'personalization': 'bg-pink-100 text-pink-800',
      'unknown': 'bg-gray-100 text-gray-600'
    };
    return colors[category] || colors['unknown'];
  };

  return (
    <Card className="border border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
            <SparklesIcon className="h-4 w-4" />
            Boost Elements
          </CardTitle>
          <div className="flex items-center gap-2">
            {totalScore > 0 && (
              <Badge variant="outline" className="text-xs">
                Score: {cappedScore}/{maxBoostScore}
                {totalScore > maxBoostScore && (
                  <span className="text-amber-600 ml-1">(capped)</span>
                )}
              </Badge>
            )}
            {elements.length > 0 && onClassifyElements && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleClassify}
                disabled={isClassifying}
                className="text-xs h-7 px-2"
              >
                {isClassifying ? (
                  <>
                    <ZapIcon className="h-3 w-3 mr-1 animate-spin" />
                    Classifying...
                  </>
                ) : (
                  <>
                    <ZapIcon className="h-3 w-3 mr-1" />
                    Classify
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Existing Elements */}
        {elements.length > 0 && (
          <div className="space-y-2">
            {elements.map((element) => (
              <div key={element.id} className="p-3 bg-white rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-2">
                                         <Textarea
                       value={element.text}
                       onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateElement(element.id, e.target.value)}
                       placeholder="Describe the boost element (e.g., testimonial, security badge, urgency timer...)"
                       className="min-h-[60px] text-sm border-gray-300 focus:border-blue-500"
                       rows={2}
                     />
                    
                    {element.category && (
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getCategoryColor(element.category)}`}>
                          {element.category}
                        </Badge>
                        {element.score && (
                          <Badge variant="outline" className="text-xs">
                            +{element.score}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeElement(element.id)}
                    className="text-red-500 border-red-300 hover:bg-red-50 flex-shrink-0"
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Element */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Add Boost Element
          </Label>
          <div className="flex gap-2">
                         <Textarea
               value={newElementText}
               onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewElementText(e.target.value)}
               placeholder="Enter boost element description (e.g., 'Customer testimonials showing 5-star ratings')"
               className="flex-1 min-h-[60px] text-sm border-gray-300 focus:border-blue-500"
               rows={2}
               onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                 if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   addElement();
                 }
               }}
             />
            <Button
              onClick={addElement}
              disabled={!newElementText.trim()}
              className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Describe any boost elements on this step (testimonials, security badges, urgency indicators, etc.)
          </p>
        </div>

        {/* Helper Text */}
        {elements.length === 0 && (
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border border-gray-200">
            <p><strong>Boost Elements Examples:</strong></p>
            <ul className="mt-1 ml-4 list-disc space-y-1">
              <li>Customer testimonials and reviews</li>
              <li>Security badges and trust indicators</li>
              <li>Urgency timers or limited-time offers</li>
              <li>Social proof counters ("X people signed up")</li>
              <li>Progress indicators and completion bars</li>
              <li>Personalization elements</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BoostElementsControl; 