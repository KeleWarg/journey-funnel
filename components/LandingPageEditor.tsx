import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Textarea } from '@components/ui/textarea';
import { Trash2Icon, PlusIcon, SparklesIcon } from 'lucide-react';

interface LandingPageContent {
  headline: string;
  subheadline?: string;
  bodyText: string;
  cta: string;
  supportingCopy?: string;
  valueProposition?: string;
  socialProof?: string;
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
  const handleInputChange = (field: keyof LandingPageContent, value: string) => {
    onContentChange({
      ...content,
      [field]: value
    });
  };

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Landing Page Content
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Configure your landing page elements for content optimization analysis
            </p>
          </div>
          <Button
            onClick={onRunContentAnalysis}
            disabled={isAnalyzing || !content.headline || !content.bodyText || !content.cta}
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

      <CardContent className="space-y-6">
        {/* Category Title */}
        <div className="space-y-2">
          <Label htmlFor="category-title" className="text-sm font-medium text-gray-700">
            Category/Industry Title
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

        {/* Main Content Elements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Headline */}
          <div className="space-y-2">
            <Label htmlFor="headline" className="text-sm font-medium text-gray-700">
              Headline <span className="text-red-500">*</span>
            </Label>
            <Input
              id="headline"
              value={content.headline}
              onChange={(e) => handleInputChange('headline', e.target.value)}
              placeholder="Your compelling headline"
              className="border-gray-300 focus:border-purple-500"
            />
          </div>

          {/* Subheadline */}
          <div className="space-y-2">
            <Label htmlFor="subheadline" className="text-sm font-medium text-gray-700">
              Subheadline
            </Label>
            <Input
              id="subheadline"
              value={content.subheadline || ''}
              onChange={(e) => handleInputChange('subheadline', e.target.value)}
              placeholder="Supporting headline text"
              className="border-gray-300 focus:border-purple-500"
            />
          </div>

          {/* CTA Button */}
          <div className="space-y-2">
            <Label htmlFor="cta" className="text-sm font-medium text-gray-700">
              Call-to-Action Text <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cta"
              value={content.cta}
              onChange={(e) => handleInputChange('cta', e.target.value)}
              placeholder="Get Started Now"
              className="border-gray-300 focus:border-purple-500"
            />
          </div>

          {/* Value Proposition */}
          <div className="space-y-2">
            <Label htmlFor="valueProposition" className="text-sm font-medium text-gray-700">
              Value Proposition
            </Label>
            <Input
              id="valueProposition"
              value={content.valueProposition || ''}
              onChange={(e) => handleInputChange('valueProposition', e.target.value)}
              placeholder="What makes you different?"
              className="border-gray-300 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Body Text */}
        <div className="space-y-2">
          <Label htmlFor="bodyText" className="text-sm font-medium text-gray-700">
            Body Text <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="bodyText"
            value={content.bodyText}
            onChange={(e) => handleInputChange('bodyText', e.target.value)}
            placeholder="Main body content that explains your offer, benefits, and value..."
            rows={4}
            className="border-gray-300 focus:border-purple-500 resize-none"
          />
        </div>

        {/* Supporting Copy */}
        <div className="space-y-2">
          <Label htmlFor="supportingCopy" className="text-sm font-medium text-gray-700">
            Supporting Copy
          </Label>
          <Textarea
            id="supportingCopy"
            value={content.supportingCopy || ''}
            onChange={(e) => handleInputChange('supportingCopy', e.target.value)}
            placeholder="Additional details, features, or supporting information..."
            rows={3}
            className="border-gray-300 focus:border-purple-500 resize-none"
          />
        </div>

        {/* Social Proof */}
        <div className="space-y-2">
          <Label htmlFor="socialProof" className="text-sm font-medium text-gray-700">
            Social Proof / Testimonials
          </Label>
          <Textarea
            id="socialProof"
            value={content.socialProof || ''}
            onChange={(e) => handleInputChange('socialProof', e.target.value)}
            placeholder="Customer testimonials, logos, statistics, or other social proof..."
            rows={3}
            className="border-gray-300 focus:border-purple-500 resize-none"
          />
        </div>

        {/* Requirements Notice */}
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
                  Complete the required fields (headline, body text, CTA) and category title to run AI-powered content optimization analysis.
                  The analysis will use the same psychological frameworks as the journey steps to provide strategic recommendations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LandingPageEditor; 