import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { ListIcon, FileTextIcon } from 'lucide-react';
import StepsEditor from '@components/StepsEditor';
import LandingPageEditor from '@components/LandingPageEditor';
import LandingPageAnalysisPanel from '@components/LandingPageAnalysisPanel';
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
  
  // Landing Page props
  landingPageContent: LandingPageContent;
  onLandingPageContentChange: (content: LandingPageContent) => void;
  onRunLandingPageAnalysis: () => void;
  isAnalyzingLandingPage: boolean;
  landingPageAnalysisResult: LandingPageAnalysisResult | null;
  
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
  
  // Landing Page props
  landingPageContent,
  onLandingPageContentChange,
  onRunLandingPageAnalysis,
  isAnalyzingLandingPage,
  landingPageAnalysisResult,
  
  // Journey Steps specific sections
  journeyStepsAnalysisSections
}) => {
  const [activeTab, setActiveTab] = useState('journey_steps');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-auto sm:h-10">
          <TabsTrigger value="journey_steps" className="flex items-center gap-2">
            <ListIcon className="h-4 w-4" />
            Journey Steps
          </TabsTrigger>
          <TabsTrigger value="landing_page" className="flex items-center gap-2">
            <FileTextIcon className="h-4 w-4" />
            Landing Page Content
          </TabsTrigger>
        </TabsList>

        <TabsContent value="journey_steps" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Journey Steps Configuration</h3>
            <p className="text-gray-600 mb-4">
              Build your multi-step form funnel with questions that can be reordered and optimized for maximum conversion.
            </p>
            
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
              />
              
              <LandingPageAnalysisPanel
                analysisResult={landingPageAnalysisResult}
                isLoading={isAnalyzingLandingPage}
                categoryTitle={categoryTitle}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MainContentTabs; 