import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Textarea } from '@components/ui/textarea';
import { PlusIcon, Trash2Icon, SparklesIcon, GlobeIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

interface AutoGenerateSectionProps {
  onGenerate: (data: {
    competitorUrls: string[];
    industry: string;
    targetAudience: string;
  }) => void;
  isGenerating: boolean;
  contentType: 'landing-page' | 'widgets';
}

const AutoGenerateSection: React.FC<AutoGenerateSectionProps> = ({
  onGenerate,
  isGenerating,
  contentType
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [competitorUrls, setCompetitorUrls] = useState(['']);
  const [industry, setIndustry] = useState('');
  const [targetAudience, setTargetAudience] = useState('business owners');

  const addUrlField = () => {
    setCompetitorUrls([...competitorUrls, '']);
  };

  const removeUrlField = (index: number) => {
    if (competitorUrls.length > 1) {
      setCompetitorUrls(competitorUrls.filter((_, i) => i !== index));
    }
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...competitorUrls];
    newUrls[index] = value;
    setCompetitorUrls(newUrls);
  };

  const handleGenerate = () => {
    const validUrls = competitorUrls.filter(url => url.trim());
    console.log('🚀 Generate button clicked!', { validUrls, industry, targetAudience });
    
    // Always generate content, even if no URLs provided
    const urlsToUse = validUrls.length > 0 ? validUrls : ['https://example.com']; // Use dummy URL for fallback
    
    console.log('✅ Calling onGenerate with data:', {
      competitorUrls: urlsToUse,
      industry: industry.trim() || 'business',
      targetAudience: targetAudience.trim() || 'business owners'
    });

    onGenerate({
      competitorUrls: urlsToUse,
      industry: industry.trim() || 'business',
      targetAudience: targetAudience.trim() || 'business owners'
    });
  };

  const hasValidUrls = competitorUrls.some(url => url.trim());

  return (
    <Card className="bg-gradient-to-br from-purple-50/80 to-blue-50/80 backdrop-blur-sm border border-white/20 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
              <SparklesIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                🚀 Auto-Generate {contentType === 'landing-page' ? 'Landing Page' : 'Widget'} Content
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Analyze competitors and generate optimized content using psychological frameworks
              </p>
            </div>
          </div>
          
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            variant="ghost"
            className="text-purple-600 hover:bg-purple-100/50"
          >
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5" />
            ) : (
              <ChevronDownIcon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Competitor URLs Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">
                Competitor Websites <span className="text-red-500">*</span>
              </Label>
              <Button
                onClick={addUrlField}
                variant="outline"
                size="sm"
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add URL
              </Button>
            </div>
            
            <div className="space-y-3">
              {competitorUrls.map((url, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="flex-1 relative">
                    <GlobeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={url}
                      onChange={(e) => updateUrl(index, e.target.value)}
                      placeholder="https://competitor-website.com"
                      className="pl-10 border-gray-300 focus:border-purple-500"
                    />
                  </div>
                  {competitorUrls.length > 1 && (
                    <Button
                      onClick={() => removeUrlField(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:bg-red-50"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            {!hasValidUrls && competitorUrls[0] && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-700">
                  <strong>💡 Tip:</strong> Enter complete URLs starting with "https://" or "http://"
                </p>
              </div>
            )}
            
            <p className="text-xs text-gray-500">
              Add 2-5 competitor websites for best results. We'll analyze their content patterns and messaging.
              <br />
              <span className="text-purple-600 font-medium">Don't have competitor URLs? That's okay - we'll use industry best practices!</span>
            </p>
          </div>

          {/* Industry & Audience Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry" className="text-sm font-medium text-gray-700">
                Industry/Category
              </Label>
              <Input
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., SaaS, E-commerce, Consulting"
                className="border-gray-300 focus:border-purple-500"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="target-audience" className="text-sm font-medium text-gray-700">
                Target Audience
              </Label>
              <Input
                id="target-audience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., business owners, marketers"
                className="border-gray-300 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Features Preview */}
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-purple-200/50">
            <h4 className="text-sm font-medium text-gray-800 mb-2">✨ What you'll get:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>Fogg B=MAT Framework:</strong> Optimized for motivation, ability, and triggers</li>
              <li>• <strong>Psychological Triggers:</strong> Social proof, scarcity, and authority elements</li>
              <li>• <strong>Competitor Analysis:</strong> Best practices from your industry leaders</li>
              <li>• <strong>A/B Test Ready:</strong> Multiple variations for testing</li>
            </ul>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center pt-2">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-2 font-medium transform transition-all duration-200 hover:scale-105"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Analyzing & Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  {hasValidUrls ? 'Generate from Competitors' : 'Generate with Best Practices'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AutoGenerateSection; 