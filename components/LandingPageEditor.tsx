import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Textarea } from '@components/ui/textarea';
import { Trash2Icon, PlusIcon, SparklesIcon, GripVerticalIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

interface LandingPageFold {
  id: string;
  headline: string;
  subheadline?: string;
  cta: string;
  textBoxes: string[];
  socialProof?: string;
}

interface LandingPageContent {
  folds: LandingPageFold[];
}

interface LandingPageEditorProps {
  content: LandingPageContent;
  onContentChange: (content: LandingPageContent) => void;
  onRunContentAnalysis: () => void;
  isAnalyzing: boolean;
  categoryTitle: string;
  onCategoryTitleChange: (title: string) => void;
}

const LandingPageEditor: React.FC<LandingPageEditorProps> = ({
  content,
  onContentChange,
  onRunContentAnalysis,
  isAnalyzing,
  categoryTitle,
  onCategoryTitleChange
}) => {
  const [expandedFolds, setExpandedFolds] = useState<Set<string>>(new Set());

  const toggleFoldExpansion = (foldId: string) => {
    const newExpanded = new Set(expandedFolds);
    if (newExpanded.has(foldId)) {
      newExpanded.delete(foldId);
    } else {
      newExpanded.add(foldId);
    }
    setExpandedFolds(newExpanded);
  };

  const addFold = () => {
    const newFold: LandingPageFold = {
      id: `fold-${Date.now()}`,
      headline: '',
      subheadline: '',
      cta: '',
      textBoxes: [''],
      socialProof: ''
    };
    
    const newContent = {
      ...content,
      folds: [...content.folds, newFold]
    };
    
    onContentChange(newContent);
    setExpandedFolds(new Set([...expandedFolds, newFold.id]));
  };

  const removeFold = (foldId: string) => {
    const newContent = {
      ...content,
      folds: content.folds.filter(fold => fold.id !== foldId)
    };
    onContentChange(newContent);
    
    const newExpanded = new Set(expandedFolds);
    newExpanded.delete(foldId);
    setExpandedFolds(newExpanded);
  };

  const updateFold = (foldId: string, updates: Partial<LandingPageFold>) => {
    const newContent = {
      ...content,
      folds: content.folds.map(fold => 
        fold.id === foldId ? { ...fold, ...updates } : fold
      )
    };
    onContentChange(newContent);
  };

  const addTextBox = (foldId: string) => {
    const fold = content.folds.find(f => f.id === foldId);
    if (fold) {
      updateFold(foldId, {
        textBoxes: [...fold.textBoxes, '']
      });
    }
  };

  const removeTextBox = (foldId: string, textBoxIndex: number) => {
    const fold = content.folds.find(f => f.id === foldId);
    if (fold && fold.textBoxes.length > 1) {
      updateFold(foldId, {
        textBoxes: fold.textBoxes.filter((_, index) => index !== textBoxIndex)
      });
    }
  };

  const updateTextBox = (foldId: string, textBoxIndex: number, value: string) => {
    const fold = content.folds.find(f => f.id === foldId);
    if (fold) {
      const newTextBoxes = [...fold.textBoxes];
      newTextBoxes[textBoxIndex] = value;
      updateFold(foldId, { textBoxes: newTextBoxes });
    }
  };

  const hasValidContent = () => {
    return content.folds.length > 0 && 
           content.folds.some(fold => 
             fold.headline.trim() && 
             fold.cta.trim() && 
             fold.textBoxes.some(text => text.trim())
           ) &&
           categoryTitle.trim();
  };

  return (
    <div className="space-y-6">
      {/* Header with Category and Analysis Button */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Landing Page Content Folds
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Create and optimize multiple content sections (folds) for your landing page
              </p>
            </div>
            <Button
              onClick={onRunContentAnalysis}
              disabled={isAnalyzing || !hasValidContent()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  Run Content Analysis
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Category Title */}
          <div className="space-y-2">
            <Label htmlFor="category-title" className="text-sm font-medium text-gray-700">
              Category/Industry Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="category-title"
              value={categoryTitle}
              onChange={(e) => onCategoryTitleChange(e.target.value)}
              placeholder="e.g., SaaS, E-commerce, Financial Services"
              className="border-gray-300 focus:border-purple-500"
            />
            <p className="text-xs text-gray-500">
              Industry context helps tailor content optimization recommendations
            </p>
          </div>

          {/* Add Fold Button */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {content.folds.length} fold{content.folds.length !== 1 ? 's' : ''} created
            </p>
            <Button
              onClick={addFold}
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Fold
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Folds */}
      {content.folds.map((fold, index) => {
        const isExpanded = expandedFolds.has(fold.id);
        
        return (
          <Card key={fold.id} className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <GripVerticalIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <CardTitle className="text-base font-medium text-gray-900">
                      Fold {index + 1}
                      {fold.headline && (
                        <span className="text-sm font-normal text-gray-600 ml-2">
                          - {fold.headline.substring(0, 50)}{fold.headline.length > 50 ? '...' : ''}
                        </span>
                      )}
                    </CardTitle>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => toggleFoldExpansion(fold.id)}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {isExpanded ? (
                      <ChevronUpIcon className="h-4 w-4" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4" />
                    )}
                  </Button>
                  
                  {content.folds.length > 1 && (
                    <Button
                      onClick={() => removeFold(fold.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="space-y-4">
                {/* Headline and Subheadline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Headline <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={fold.headline}
                      onChange={(e) => updateFold(fold.id, { headline: e.target.value })}
                      placeholder="Compelling headline for this fold"
                      className="border-gray-300 focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Subheadline
                    </Label>
                    <Input
                      value={fold.subheadline || ''}
                      onChange={(e) => updateFold(fold.id, { subheadline: e.target.value })}
                      placeholder="Supporting headline text"
                      className="border-gray-300 focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Call-to-Action */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Call-to-Action Text <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={fold.cta}
                    onChange={(e) => updateFold(fold.id, { cta: e.target.value })}
                    placeholder="Get Started Now"
                    className="border-gray-300 focus:border-purple-500"
                  />
                </div>

                {/* Text Boxes */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">
                      Text Content <span className="text-red-500">*</span>
                    </Label>
                    <Button
                      onClick={() => addTextBox(fold.id)}
                      variant="outline"
                      size="sm"
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <PlusIcon className="h-3 w-3 mr-1" />
                      Add Text Box
                    </Button>
                  </div>
                  
                  {fold.textBoxes.map((textBox, textIndex) => (
                    <div key={textIndex} className="flex space-x-2">
                      <Textarea
                        value={textBox}
                        onChange={(e) => updateTextBox(fold.id, textIndex, e.target.value)}
                        placeholder={`Text content ${textIndex + 1} - describe benefits, features, or value proposition...`}
                        rows={3}
                        className="flex-1 border-gray-300 focus:border-purple-500 resize-none"
                      />
                      {fold.textBoxes.length > 1 && (
                        <Button
                          onClick={() => removeTextBox(fold.id, textIndex)}
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 self-start mt-1"
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Social Proof */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Social Proof / Testimonials
                  </Label>
                  <Textarea
                    value={fold.socialProof || ''}
                    onChange={(e) => updateFold(fold.id, { socialProof: e.target.value })}
                    placeholder="Customer testimonials, logos, statistics, or other social proof for this fold..."
                    rows={3}
                    className="border-gray-300 focus:border-purple-500 resize-none"
                  />
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Empty State */}
      {content.folds.length === 0 && (
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <SparklesIcon className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No content folds yet
            </h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              Create your first content fold to start building your landing page. Each fold represents a section of your page with its own headline, content, and call-to-action.
            </p>
            <Button
              onClick={addFold}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create First Fold
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Requirements Notice */}
      {content.folds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <SparklesIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Content Analysis Requirements
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Complete at least one fold with headline, CTA, and text content, plus the category title to run AI-powered content optimization analysis.
                  Each fold will be analyzed using the same psychological frameworks as journey steps.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPageEditor; 