import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { Button } from '@components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ListIcon, FileTextIcon, Upload, ComponentIcon } from 'lucide-react';
import StepsEditor from '@components/StepsEditor';
import LandingPageEditor from '@components/LandingPageEditor';
import LandingPageAnalysisPanel from '@components/LandingPageAnalysisPanel';
import WidgetEditor from '@components/WidgetEditor';
import WidgetAnalysisPanel from '@components/WidgetAnalysisPanel';
import SpreadsheetUpload from '@components/SpreadsheetUpload';
import { StepWithText, BoostElement } from '../types';

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

interface LandingPageAnalysisResult {
  assessments: any[];
  overallScore?: number;
  topRecommendations?: string[];
}

interface Widget {
  id: string;
  heading: string;
  subheading?: string;
  textInputPlaceholder: string;
  ctaCopy: string;
  supportTexts: string[];
}

interface WidgetContent {
  widgets: Widget[];
}

interface WidgetAnalysisResult {
  assessments: any[];
  overallScore?: number;
  topRecommendations?: string[];
}

interface ParsedStepData {
  stepName: string;
  conversionRate: number;
  questions: Array<{
    title: string;
    input_type: string;
    invasiveness: number;
    difficulty: number;
  }>;
}

interface MainContentTabsProps {
  // Journey Steps props
  steps: StepWithText[];
  onAddStep: () => void;
  onRemoveStep: (index: number) => void;
  onUpdateStep: (index: number, updates: Partial<StepWithText>) => void;
  onAddQuestion: (stepIndex: number) => void;
  onRemoveQuestion: (stepIndex: number, questionIndex: number) => void;
  onUpdateQuestion: (stepIndex: number, questionIndex: number, updates: any) => void;
  inputTypeOptions: Array<{ value: string; label: string }>;
  invasivenessOptions: Array<{ value: number; label: string }>;
  difficultyOptions: Array<{ value: number; label: string }>;
  onBoostElementsChange: (stepIndex: number, elements: BoostElement[]) => void;
  onClassifyBoostElements: (stepIndex: number, elements: BoostElement[]) => Promise<void>;
  isClassifyingBoosts: boolean;
  categoryTitle: string;
  onCategoryTitleChange: (title: string) => void;
  onImportSpreadsheetData?: (data: ParsedStepData[]) => void;
  
  // Landing Page props
  landingPageContent: LandingPageContent;
  onLandingPageContentChange: (content: LandingPageContent) => void;
  onRunLandingPageAnalysis: () => void;
  isAnalyzingLandingPage: boolean;
  landingPageAnalysisResult: LandingPageAnalysisResult | null;
  
  // Widget props
  widgetContent: WidgetContent;
  onWidgetContentChange: (content: WidgetContent) => void;
  onRunWidgetAnalysis: () => void;
  isAnalyzingWidgets: boolean;
  widgetAnalysisResult: WidgetAnalysisResult | null;
  
  // Auto-generate props
  onAutoGenerateLandingPage?: (data: {
    competitorUrls: string[];
    industry: string;
    targetAudience: string;
  }) => void;
  isAutoGeneratingLandingPage?: boolean;
  onAutoGenerateWidgets?: (data: {
    competitorUrls: string[];
    industry: string;
    targetAudience: string;
  }) => void;
  isAutoGeneratingWidgets?: boolean;
  
  // Journey Steps specific sections (passed as children)
  journeyStepsAnalysisSections?: React.ReactNode;
}

const MainContentTabs: React.FC<MainContentTabsProps> = ({
  // Journey Steps props
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
  isClassifyingBoosts,
  categoryTitle,
  onCategoryTitleChange,
  onImportSpreadsheetData,
  
  // Landing Page props
  landingPageContent,
  onLandingPageContentChange,
  onRunLandingPageAnalysis,
  isAnalyzingLandingPage,
  landingPageAnalysisResult,
  
  // Widget props
  widgetContent,
  onWidgetContentChange,
  onRunWidgetAnalysis,
  isAnalyzingWidgets,
  widgetAnalysisResult,
  
  // Auto-generate props
  onAutoGenerateLandingPage,
  isAutoGeneratingLandingPage,
  onAutoGenerateWidgets,
  isAutoGeneratingWidgets,
  
  // Journey Steps specific sections
  journeyStepsAnalysisSections
}) => {
  const [activeTab, setActiveTab] = useState('journey_steps');
  const [isSpreadsheetDialogOpen, setIsSpreadsheetDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto sm:h-10">
          <TabsTrigger value="journey_steps" className="flex items-center gap-2">
            <ListIcon className="h-4 w-4" />
            Journey Steps
          </TabsTrigger>
          <TabsTrigger value="landing_page" className="flex items-center gap-2">
            <FileTextIcon className="h-4 w-4" />
            Landing Page Content
          </TabsTrigger>
          <TabsTrigger value="widgets" className="flex items-center gap-2">
            <ComponentIcon className="h-4 w-4" />
            Widgets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="journey_steps" className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Journey Steps Configuration</h3>
                <p className="text-gray-600">
                  Build your multi-step form funnel with questions that can be reordered and optimized for maximum conversion.
                </p>
              </div>
              
              {onImportSpreadsheetData && (
                <Dialog open={isSpreadsheetDialogOpen} onOpenChange={setIsSpreadsheetDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Import from Spreadsheet
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Import Funnel Data from Spreadsheet</DialogTitle>
                    </DialogHeader>
                    <SpreadsheetUpload
                      onDataImported={(data) => {
                        onImportSpreadsheetData(data);
                        setIsSpreadsheetDialogOpen(false);
                      }}
                      onClose={() => setIsSpreadsheetDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
            
            <StepsEditor
              steps={steps}
              onAddStep={onAddStep}
              onRemoveStep={onRemoveStep}
              onUpdateStep={onUpdateStep}
              onAddQuestion={onAddQuestion}
              onRemoveQuestion={onRemoveQuestion}
              onUpdateQuestion={onUpdateQuestion}
              inputTypeOptions={inputTypeOptions}
              invasivenessOptions={invasivenessOptions}
              difficultyOptions={difficultyOptions}
              onBoostElementsChange={onBoostElementsChange}
              onClassifyBoostElements={onClassifyBoostElements}
              isClassifyingBoosts={isClassifyingBoosts}
              categoryTitle={categoryTitle}
              onCategoryTitleChange={onCategoryTitleChange}
            />
          </div>
          
          {/* Journey Steps specific sections */}
          {journeyStepsAnalysisSections}
        </TabsContent>

        <TabsContent value="landing_page" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Landing Page Content Optimization</h3>
            <p className="text-gray-600 mb-4">
              Optimize your landing page content using the same psychological frameworks as your journey steps. 
              Content will be analyzed for conversion optimization opportunities without reordering.
            </p>
            
            <div className="space-y-6">
              <LandingPageEditor
                content={landingPageContent}
                onContentChange={onLandingPageContentChange}
                onRunContentAnalysis={onRunLandingPageAnalysis}
                isAnalyzing={isAnalyzingLandingPage}
                categoryTitle={categoryTitle}
                onCategoryTitleChange={onCategoryTitleChange}
                onAutoGenerate={onAutoGenerateLandingPage}
                isAutoGenerating={isAutoGeneratingLandingPage}
              />
              
              <LandingPageAnalysisPanel
                analysisResult={landingPageAnalysisResult}
                isLoading={isAnalyzingLandingPage}
                categoryTitle={categoryTitle}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="widgets" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Widget Content Optimization</h3>
            <p className="text-gray-600 mb-4">
              Create and optimize widget components like lead capture forms, newsletter signups, and contact forms. 
              Each widget will be analyzed using the same psychological frameworks as your landing pages.
            </p>
            
            <div className="space-y-6">
              <WidgetEditor
                content={widgetContent}
                onContentChange={onWidgetContentChange}
                onRunContentAnalysis={onRunWidgetAnalysis}
                isAnalyzing={isAnalyzingWidgets}
                categoryTitle={categoryTitle}
                onCategoryTitleChange={onCategoryTitleChange}
                onAutoGenerate={onAutoGenerateWidgets}
                isAutoGenerating={isAutoGeneratingWidgets}
              />
              
              <WidgetAnalysisPanel
                analysisResult={widgetAnalysisResult}
                isLoading={isAnalyzingWidgets}
                categoryTitle={categoryTitle}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(MainContentTabs); 