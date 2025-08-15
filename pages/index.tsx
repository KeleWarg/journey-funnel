import React, { useState, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { useToast } from '@hooks/use-toast';
import { useDebounce } from '@hooks/use-debounce';
import { useCalculation, useAssessment, useBacksolve } from '@hooks/use-api';
import Link from 'next/link';
import { Button } from '@components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { Label } from '@components/ui/label';
import { Input } from '@components/ui/input';
import { Loader2Icon, BarChart3Icon } from 'lucide-react';
// Static imports for critical components
import CurrentConstantsSection from '@components/CurrentConstantsSection';
import FunnelSettingsSection from '@components/FunnelSettingsSection';
import MainContentTabs from '@components/MainContentTabs';
import SimulationBacksolveControls from '@components/SimulationBacksolveControls';
import HowItWorksSection from '@components/HowItWorksSection';

// Dynamic imports for performance optimization
import {
  DataVisualizationDynamic,
  LLMAssessmentPanelDynamic,
  MCPComparisonTableDynamic,
  CeilingAnalysisPanelDynamic,
  EnhancedComparisonTableDynamic,
  UniqueCombinationTableDynamic,
  FrameworkSuggestionsPanelDynamic,
  FoggModelAnalysisDynamic,
  AnalysisTabsSectionDynamic,
  OptimizeControlsDynamic,
  ExportShareControlsDynamic,
  BacksolveResultPanelDynamic
} from '../components/dynamic-imports';
import { BacksolveResult, Step, SimulationData, LLMAssessmentResult, MCPFunnelResult, MCPFunnelVariant, BoostElement, MCPAssessmentResult, MCPOrderRecommendation, OptimizeResult, FoggStepAssessmentResult, StepWithText } from '../types';

// Default values and constants - Updated to match YAML specification
const JOURNEY_TYPE_DEFAULTS = {
  transactional: { 
    step_complexity_weights: [1, 2.5, 1.5], // [c1, c2, c3]
    page_blend_weights: [3, 1], // [w_c, w_f]
    entry_motivation_weights: { w_E: 0.2, w_N: 0.8 }
  },
  exploratory: { 
    step_complexity_weights: [1, 1.5, 3], 
    page_blend_weights: [2.5, 1.5],
    entry_motivation_weights: { w_E: 0.5, w_N: 0.5 }
  },
  emotional: { 
    step_complexity_weights: [0.5, 3.5, 1], 
    page_blend_weights: [2, 2],
    entry_motivation_weights: { w_E: 0.7, w_N: 0.3 }
  },
  legal_required: { 
    step_complexity_weights: [1.5, 2, 1.5], 
    page_blend_weights: [2, 1.5],
    entry_motivation_weights: { w_E: 0.5, w_N: 0.5 }
  },
  conversational: { 
    step_complexity_weights: [2, 1, 1.5], 
    page_blend_weights: [1.5, 2.5],
    entry_motivation_weights: { w_E: 0.5, w_N: 0.5 }
  },
  urgent: { 
    step_complexity_weights: [1, 2.5, 1.5], 
    page_blend_weights: [3, 1],
    entry_motivation_weights: { w_E: 0.4, w_N: 0.6 }
  }
} as const;

type JourneyType = keyof typeof JOURNEY_TYPE_DEFAULTS;

// Updated input types to match YAML Qs interaction scale (1-5)
const inputTypeOptions = [
  { value: '1', label: '1 - Toggle/Yes-No (Are you insured?)' },
  { value: '2', label: '2 - Single Dropdown (Select gender)' },
  { value: '3', label: '3 - Multi-select/Slider (Choose goals)' },
  { value: '4', label: '4 - Calendar/Upload (Pick move date)' },
  { value: '5', label: '5 - Open Text Field (Describe issue)' }
];

const invasivenessOptions = [
  { value: 1, label: '1 - Not invasive' },
  { value: 2, label: '2 - Slightly invasive' },
  { value: 3, label: '3 - Moderately invasive' },
  { value: 4, label: '4 - Very invasive' },
  { value: 5, label: '5 - Extremely invasive' }
];

const difficultyOptions = [
  { value: 1, label: '1 - Very easy' },
  { value: 2, label: '2 - Easy' },
  { value: 3, label: '3 - Moderate' },
  { value: 4, label: '4 - Difficult' },
  { value: 5, label: '5 - Very difficult' }
];

interface CachedAssessment {
  timestamp: number;
  data: any;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 5; // Process 5 questions at a time

const useAssessmentCache = () => {
  const [cache, setCache] = useState<Record<string, CachedAssessment>>({});

  const getCachedAssessment = useCallback((key: string) => {
    const cached = cache[key];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }, [cache]);

  const setCachedAssessment = useCallback((key: string, data: any) => {
    setCache(prev => ({
      ...prev,
      [key]: {
        timestamp: Date.now(),
        data
      }
    }));
  }, []);

  return { getCachedAssessment, setCachedAssessment };
};

// Landing Page Content interface
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

const LeadGenFunnelReviewer: React.FC = () => {
  const { toast } = useToast();
  
  // State
  const [steps, setSteps] = useState<StepWithText[]>([{
    boosts: 0,
    observedCR: 0.85,
    questions: [
      {
        title: "What's your email address?",
        input_type: '2', // Single dropdown per YAML Qs scale
        invasiveness: 2,
        difficulty: 1
      }
    ],
    boostElements: [],
    questionTexts: ["What's your email address?"],
    title: undefined,
    supportCopy: undefined,
    extraSupportTexts: undefined
  }]);
  const [journeyType, setJourneyType] = useState<JourneyType>('transactional');
  const [backsolveResult, setBacksolveResult] = useState<BacksolveResult | null>(null);
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult & {
    model_validation?: {
      current_predicted_CR: number;
      current_observed_CR: number;
      accuracy_error_percent: number;
      is_reliable: boolean;
      warning?: string;
    };
  } | null>(null);
  const [optimalPositions, setOptimalPositions] = useState<Record<number, number>>({});
  const [llmCache, setLlmCache] = useState<Record<string, string>>({});
  const [llmAssessmentResult, setLlmAssessmentResult] = useState<LLMAssessmentResult | null>(null);
  const [mcpFunnelResult, setMcpFunnelResult] = useState<MCPFunnelResult | null>(null);
  const [enhancedMcpResult, setEnhancedMcpResult] = useState<any>(null);
  const [isRunningComplete, setIsRunningComplete] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [isMCPAnalyzing, setIsMCPAnalyzing] = useState(false);
  const [isEnhancedMCPAnalyzing, setIsEnhancedMCPAnalyzing] = useState(false);
  const [foggStepAssessments, setFoggStepAssessments] = useState<FoggStepAssessmentResult | null>(null);
  const [isFoggStepAssessing, setIsFoggStepAssessing] = useState(false);
  const [categoryTitle, setCategoryTitle] = useState('');
  const [numSamples, setNumSamples] = useState(20000); // Increased to 20000 per YAML patch - unlocking reorder upside
  const [hybridSeeding, setHybridSeeding] = useState(false); // NEW: Hybrid Fogg+ELM seeding
  const [backupOverrides, setBackupOverrides] = useState<Record<string, number> | null>(null);
  const [isClassifyingBoosts, setIsClassifyingBoosts] = useState(false);

  // Landing Page State
  const [landingPageContent, setLandingPageContent] = useState<LandingPageContent>({
    folds: []
  });
  const [isAnalyzingLandingPage, setIsAnalyzingLandingPage] = useState(false);
  const [landingPageAnalysisResult, setLandingPageAnalysisResult] = useState<LandingPageAnalysisResult | null>(null);
  const [isAutoGeneratingLandingPage, setIsAutoGeneratingLandingPage] = useState(false);

  // Widget State
  const [widgetContent, setWidgetContent] = useState<WidgetContent>({
    widgets: []
  });
  const [isAnalyzingWidgets, setIsAnalyzingWidgets] = useState(false);
  const [widgetAnalysisResult, setWidgetAnalysisResult] = useState<WidgetAnalysisResult | null>(null);
  const [isAutoGeneratingWidgets, setIsAutoGeneratingWidgets] = useState(false);

  // Core state
  const [E, setE] = useState(3);
  const [N, setN] = useState(3);
  const [source, setSource] = useState('paid_search');
  const [U0, setU0] = useState(1000);
  
  // Override constants
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  // Constants state
  const [c1, setC1] = useState<number>(JOURNEY_TYPE_DEFAULTS.transactional.step_complexity_weights[0]);
  const [c2, setC2] = useState<number>(JOURNEY_TYPE_DEFAULTS.transactional.step_complexity_weights[1]);
  const [c3, setC3] = useState<number>(JOURNEY_TYPE_DEFAULTS.transactional.step_complexity_weights[2]);
  const [w_c, setWC] = useState<number>(JOURNEY_TYPE_DEFAULTS.transactional.page_blend_weights[0]);
  const [w_f, setWF] = useState<number>(JOURNEY_TYPE_DEFAULTS.transactional.page_blend_weights[1]);
  const [w_E, setWE] = useState<number>(JOURNEY_TYPE_DEFAULTS.transactional.entry_motivation_weights.w_E);
  const [w_N, setWN] = useState<number>(JOURNEY_TYPE_DEFAULTS.transactional.entry_motivation_weights.w_N);

  // Journey type change handler
  const handleJourneyTypeChange = useCallback((newType: JourneyType) => {
    setJourneyType(newType);
    const defaults = JOURNEY_TYPE_DEFAULTS[newType];
    setC1(defaults.step_complexity_weights[0]);
    setC2(defaults.step_complexity_weights[1]);
    setC3(defaults.step_complexity_weights[2]);
    setWC(defaults.page_blend_weights[0]);
    setWF(defaults.page_blend_weights[1]);
    setWE(defaults.entry_motivation_weights.w_E);
    setWN(defaults.entry_motivation_weights.w_N);
  }, []);

  // Step management
  const addStep = () => {
    setSteps([...steps, { 
      boosts: 0,
      observedCR: 0.8,
      questions: [],
      boostElements: [],
      questionTexts: [],
      title: undefined,
      supportCopy: undefined,
      extraSupportTexts: undefined
    }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, updates: Partial<typeof steps[0]>) => {
    setSteps(steps.map((step, i) => i === index ? { ...step, ...updates } : step));
  };

  // Add types for question operations
  const addQuestion = (stepIndex: number) => {
    setSteps(steps.map((step, i) => {
      if (i === stepIndex) {
        const newQuestions = [...step.questions, {
          title: '',
          input_type: '',
          invasiveness: 2,
          difficulty: 2
        }];
        return {
          ...step,
          questions: newQuestions,
          questionTexts: newQuestions.map(q => q.title)
        };
      }
      return step;
    }));
  };

  const removeQuestion = (stepIndex: number, questionIndex: number) => {
    setSteps(steps.map((step, i) => {
      if (i === stepIndex) {
        return {
          ...step,
          questions: step.questions.filter((_, j) => j !== questionIndex)
        };
      }
      return step;
    }));
  };

  const updateQuestion = (stepIndex: number, questionIndex: number, updates: Partial<typeof steps[0]['questions'][0]>) => {
    setSteps(steps.map((step, i) => {
      if (i === stepIndex) {
        const updatedQuestions = step.questions.map((q, j) => j === questionIndex ? { ...q, ...updates } : q);
        return {
          ...step,
          questions: updatedQuestions,
          questionTexts: updatedQuestions.map(q => q.title) // Update questionTexts array
        };
      }
      return step;
    }));
  };

  // Boost elements management
  const handleBoostElementsChange = (stepIndex: number, elements: BoostElement[]) => {
    setSteps(steps.map((step, i) => {
      if (i === stepIndex) {
        return {
          ...step,
          boostElements: elements
        };
      }
      return step;
    }));
  };

  const handleClassifyBoostElements = async (stepIndex: number, elements: BoostElement[]) => {
    try {
      setIsClassifyingBoosts(true);
      
      // Validate input before sending
      if (!Array.isArray(elements)) {
        throw new Error('Elements must be an array');
      }
      
      if (elements.length === 0) {
        throw new Error('No boost elements to classify');
      }
      
      // Validate each element has required fields
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (!element.id || !element.text) {
          throw new Error(`Element ${i + 1} is missing required fields (id or text)`);
        }
      }
      
      console.log('Classifying boost elements:', { stepIndex, elements });
      
      const response = await fetch('/api/assessBoostElements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepIndex, boostElements: elements })
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: `HTTP ${response.status}: ${errorText || 'Unknown error'}` };
        }
        const errorMessage = errorData?.error || errorData?.details || 'Classification failed';
        throw new Error(String(errorMessage));
      }
      
      const data = await response.json();
      
      // Update the elements with classification results
      const updatedElements = elements.map((element) => {
        const classification = data.classifiedBoosts?.find((boost: any) => boost.id === element.id);
        return {
          ...element,
          category: classification?.category,
          score: classification?.score
        };
      });
      
      // Update the boost score from total classified score
      const totalScore = data.stepBoostTotal || 0;
      const cappedScore = data.cappedBoosts || Math.min(totalScore, 5);
      
      setSteps(steps.map((step, i) => {
        if (i === stepIndex) {
          return {
            ...step,
            boostElements: updatedElements,
            boosts: cappedScore
          };
        }
        return step;
      }));
      
      toast({
        title: "Boost Elements Classified",
        description: `Total boost score: ${cappedScore}/5 (${totalScore > 5 ? 'capped' : 'applied'})`
      });
    } catch (error) {
      console.error('Boost classification error:', error);
      toast({
        title: "Classification Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsClassifyingBoosts(false);
    }
  };

  // Spreadsheet Import Handler
  const handleSpreadsheetImport = useCallback((importedData: any[]) => {
    try {
      // Convert imported data to steps format
      const newSteps: StepWithText[] = importedData.map((data, index) => ({
        id: `imported-step-${index}`,
        questions: data.questions.map((q: any, qIndex: number) => ({
          id: `imported-question-${index}-${qIndex}`,
          title: q.title,
          input_type: q.input_type,
          invasiveness: q.invasiveness,
          difficulty: q.difficulty
        })),
        questionTexts: data.questions.map((q: any) => q.title), // Add required questionTexts field
        observedCR: data.conversionRate,
        boosts: 0,
        boostElements: []
      }));

      // Replace existing steps with imported ones
      setSteps(newSteps);
      
      // Clear any existing analysis results since we have new data
      setSimulationData(null);
      setLlmAssessmentResult(null);
      setMcpFunnelResult(null);
      setEnhancedMcpResult(null);
      setBacksolveResult(null);
      setFoggStepAssessments(null);
      
      toast({
        title: "Spreadsheet Data Imported",
        description: `Successfully imported ${newSteps.length} steps from spreadsheet. You can now run analysis on this data.`
      });
      
    } catch (error) {
      console.error('Spreadsheet import error:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Could not import spreadsheet data",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Landing Page Analysis Function
  const runLandingPageAnalysis = useCallback(async () => {
    // Validate that at least one fold has required content
    const hasValidFold = landingPageContent.folds.length > 0 && 
                        landingPageContent.folds.some(fold => 
                          fold.headline?.trim() && 
                          fold.cta?.trim() && 
                          fold.textBoxes?.some(text => text.trim())
                        );

    if (!hasValidFold || !categoryTitle.trim()) {
      toast({
        title: "Missing Required Fields",
        description: "Please create at least one fold with headline, CTA, and text content, plus category title before running analysis",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsAnalyzingLandingPage(true);
      
      const response = await fetch('/api/assessLandingPage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: landingPageContent,
          categoryTitle,
          frameworks: ['PAS', 'Fogg', 'Nielsen', 'AIDA', 'Cialdini'] // Same frameworks as journey steps
        })
      });
      
      if (!response.ok) throw new Error('Landing page analysis failed');
      
      const data = await response.json();
      setLandingPageAnalysisResult(data);
      
      const frameworkNames = data.assessments?.length > 0 
        ? Array.from(new Set(data.assessments.flatMap((a: any) => a.frameworkAssessments.map((f: any) => f.framework)))).join(', ')
        : 'multiple frameworks';
      
      toast({
        title: "Landing Page Analysis Complete",
        description: `Content analyzed using ${frameworkNames} with optimization recommendations`
      });
    } catch (error) {
      console.error('Landing page analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze landing page content",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzingLandingPage(false);
    }
  }, [landingPageContent, categoryTitle, toast]);

  // Widget Analysis Function
  const runWidgetAnalysis = useCallback(async () => {
    // Validate that at least one widget has required content
    const hasValidWidget = widgetContent.widgets.length > 0 && 
                          widgetContent.widgets.some(widget => 
                            widget.heading?.trim() && 
                            widget.ctaCopy?.trim()
                          );

    if (!hasValidWidget || !categoryTitle.trim()) {
      toast({
        title: "Missing Required Fields",
        description: "Please create at least one widget with heading and CTA copy, plus category title before running analysis",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsAnalyzingWidgets(true);
      
      // Transform widget content to a format similar to landing page folds for analysis
      const transformedContent = {
        folds: widgetContent.widgets.map((widget, index) => ({
          id: widget.id,
          headline: widget.heading,
          subheadline: widget.subheading || '',
          cta: widget.ctaCopy,
          textBoxes: [
            widget.textInputPlaceholder,
            ...widget.supportTexts
          ].filter(text => text.trim()),
          socialProof: ''
        }))
      };
      
      const response = await fetch('/api/assessLandingPage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: transformedContent,
          categoryTitle: `${categoryTitle} Widget`,
          frameworks: ['PAS', 'Fogg', 'Nielsen', 'AIDA', 'Cialdini'] // Same frameworks as journey steps
        })
      });
      
      if (!response.ok) throw new Error('Widget analysis failed');
      
      const data = await response.json();
      setWidgetAnalysisResult(data);
      
      const frameworkNames = data.assessments?.length > 0 
        ? Array.from(new Set(data.assessments.flatMap((a: any) => a.frameworkAssessments.map((f: any) => f.framework)))).join(', ')
        : 'multiple frameworks';
      
      toast({
        title: "Widget Analysis Complete",
        description: `Widget content analyzed using ${frameworkNames} with optimization recommendations`
      });
    } catch (error) {
      console.error('Widget analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze widget content",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzingWidgets(false);
    }
  }, [widgetContent, categoryTitle, toast]);

  // Auto-generate handlers
  const handleAutoGenerateLandingPage = useCallback(async (data: {
    competitorUrls: string[];
    industry: string;
    targetAudience: string;
  }) => {
    setIsAutoGeneratingLandingPage(true);
    
    console.log('🚀 Starting landing page generation with data:', data);
    
    try {
      toast({
        title: "Generating Content...",
        description: `Analyzing ${data.competitorUrls.length} competitor websites`,
      });

      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      console.log('📡 API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error:', errorData);
        throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ API Result:', result);
      
      if (result.success && result.generatedContent?.landingPageFolds) {
        // Transform generated content to match our interface
        const newFolds = result.generatedContent.landingPageFolds.map((fold: any, index: number) => ({
          id: `generated-fold-${Date.now()}-${index}`,
          headline: fold.headline,
          subheadline: fold.subheadline,
          cta: fold.cta,
          textBoxes: fold.textBoxes,
          socialProof: fold.socialProof
        }));

        setLandingPageContent({ folds: newFolds });
        
        toast({
          title: "Content Generated! ✨",
          description: result.competitorsAnalyzed > 0 
            ? `Generated ${newFolds.length} optimized landing page folds from ${result.competitorsAnalyzed} competitors`
            : `Generated ${newFolds.length} optimized landing page folds using industry best practices (competitor analysis unavailable)`,
        });
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('❌ Auto-generate landing page error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Generation Failed",
        description: `Could not generate content: ${errorMessage}. Check console for details.`,
        variant: "destructive"
      });
    } finally {
      setIsAutoGeneratingLandingPage(false);
    }
  }, [toast]);

  const handleAutoGenerateWidgets = useCallback(async (data: {
    competitorUrls: string[];
    industry: string;
    targetAudience: string;
  }) => {
    setIsAutoGeneratingWidgets(true);
    try {
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const result = await response.json();
      
      if (result.success && result.generatedContent?.widgets) {
        // Transform generated content to match our interface
        const newWidgets = result.generatedContent.widgets.map((widget: any, index: number) => ({
          id: `generated-widget-${Date.now()}-${index}`,
          heading: widget.heading,
          subheading: widget.subheading,
          textInputPlaceholder: widget.textInputPlaceholder,
          ctaCopy: widget.ctaCopy,
          supportTexts: widget.supportTexts
        }));

        setWidgetContent({ widgets: newWidgets });
        
        toast({
          title: "Widgets Generated! ✨",
          description: `Generated ${newWidgets.length} optimized widgets from ${result.competitorsAnalyzed} competitors`,
        });
      }
    } catch (error) {
      console.error('Auto-generate widgets error:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate widget content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAutoGeneratingWidgets(false);
    }
  }, [toast]);

  // Memoized base payload to prevent unnecessary recalculations
  const memoizedBasePayload = useMemo(() => ({
    journeyType,
    E,
    N_importance: N,
    source,
    steps,
    c1, c2, c3, w_c, w_f, w_E, w_N,
    U0,
    llmAssessments: llmAssessmentResult?.assessments || null,
    apply_llm_uplift: true
  }), [journeyType, E, N, source, steps, c1, c2, c3, w_c, w_f, w_E, w_N, U0, llmAssessmentResult]);

  // Helper function to build payload with optional parameter overrides
  const buildPayloadWithParams = useCallback((paramOverrides?: any) => {
    const currentOverrides = paramOverrides || overrides;
    return {
      ...memoizedBasePayload,
      k_override: currentOverrides.k,
      gamma_exit_override: currentOverrides.gamma_exit,
      epsilon_override: currentOverrides.epsilon
    };
  }, [memoizedBasePayload, overrides]);

  // Build payload for API calls
  const buildPayload = useCallback(() => {
    return buildPayloadWithParams();
  }, [buildPayloadWithParams]);

  // API call functions will be defined after individual functions

  const runSimulationInternalWithParams = useCallback(async (paramOverrides?: any) => {
    try {
      // Enhanced validation
      if (!steps || steps.length === 0) {
        throw new Error("At least one step is required");
      }
      
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (!step) {
          throw new Error(`Step ${i + 1} is invalid`);
        }
        if (!step.questions || !Array.isArray(step.questions)) {
          throw new Error(`Step ${i + 1} must have questions`);
        }
        if (step.questions.length === 0) {
          throw new Error(`Step ${i + 1} must have at least one question`);
        }
        
        for (let j = 0; j < step.questions.length; j++) {
          const question = step.questions[j];
          if (!question || !question.input_type || !question.title.trim()) {
            throw new Error(`Question ${j + 1} in step ${i + 1} is incomplete`);
          }
        }
      }
      
      const payload = buildPayloadWithParams(paramOverrides);
      console.log("Sending payload:", payload); // Debug log
      
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log('Received response:', response);
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        console.error('API request failed:', response.status, response.statusText);
        let errorMessage = 'Simulation failed';
        try {
          const errorData = await response.json();
          console.error('Error data from API:', errorData);
          errorMessage = errorData?.error || errorData?.details || `HTTP ${response.status}: ${response.statusText}`;
        } catch (jsonError) {
          console.error('Failed to parse error response:', jsonError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        console.error('About to throw error with message:', errorMessage);
        const error = new Error(errorMessage);
        console.error('Created error object:', error);
        throw error;
      }
      
      const data = await response.json();
      console.log("Received data:", data); // Debug log
      
      if (!data || !data.per_step_metrics || !Array.isArray(data.per_step_metrics)) {
        throw new Error("Invalid response from server");
      }
      
      // Transform data to match expected format per YAML specification
      const transformedData = {
        predictedSteps: data.per_step_metrics.map((result: any) => ({ CR_s: result.CR_s })),
        CR_total: data.overall_predicted_CR,
        bestCR: data.bestCR
      };
      
      setSimulationData(transformedData);
    } catch (error) {
      console.error('Simulation error:', error);
      throw error; // Re-throw to be handled by the calling function
    }
  }, [buildPayloadWithParams, steps]);

  const runSimulationInternal = useCallback(async () => {
    await runSimulationInternalWithParams();
  }, [runSimulationInternalWithParams]);

  const runBacksolveInternal = useCallback(async () => {
    try {
      // Validate that all steps have observed CR values
      if (!steps || steps.length === 0) {
        throw new Error("At least one step is required");
      }
      
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (!step || typeof step.observedCR !== 'number' || step.observedCR < 0 || step.observedCR > 1) {
          throw new Error(`Step ${i + 1} must have a valid observed CR value between 0 and 1`);
        }
      }
      
      // Build the payload with the correct format for backsolve API
      const basePayload = buildPayload();
      const backsolvePayload = {
        steps: basePayload.steps.map((step, index) => ({
          questions: step.questions,
          boosts: step.boosts,
          observedCR: steps[index].observedCR  // Include observedCR in each step
        })),
        E: basePayload.E,
        N_importance: basePayload.N_importance,
        source: basePayload.source,
        c1: basePayload.c1,
        c2: basePayload.c2,
        c3: basePayload.c3,
        w_c: basePayload.w_c,
        w_f: basePayload.w_f,
        w_E: basePayload.w_E,
        w_N: basePayload.w_N,
        observed_CR_s: steps.map(step => step.observedCR)
      };
      
      console.log("Sending backsolve payload:", backsolvePayload); // Debug log
      
      const response = await fetch('/api/backsolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backsolvePayload)
      });
      
      if (!response.ok) {
        let errorMessage = 'Back-solve failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData?.error || errorData?.details || `HTTP ${response.status}: ${response.statusText}`;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(String(errorMessage));
      }
      
      const data = await response.json();
      console.log("Received backsolve data:", data); // Debug log
      
      setBacksolveResult(data);
      return data; // Return data for immediate use
    } catch (error) {
      console.error('Back-solve error:', error);
      throw error; // Re-throw to be handled by the calling function
    }
  }, [buildPayload, steps]);

  const updateSimulationWithParams = useCallback(async (backsolveData: any) => {
    if (backsolveData && backsolveData.bestParams) {
      // Store current overrides as backup if not already stored
      if (!backupOverrides) {
        setBackupOverrides(overrides);
      }
      
      // Apply the backsolve parameters to state for future use
      const newOverrides = {
        k: backsolveData.bestParams.best_k,
        gamma_exit: backsolveData.bestParams.best_gamma_exit,
        epsilon: overrides.epsilon // Keep existing epsilon if any
      };
      
      setOverrides(newOverrides);
      
      // Run simulation with new parameters directly (don't wait for state update)
      await runSimulationInternalWithParams(newOverrides);
    } else {
      throw new Error("No valid parameters found in backsolve result");
    }
  }, [backupOverrides, overrides, runSimulationInternalWithParams]);

  const updateSimulationInternal = useCallback(async () => {
    if (backsolveResult && backsolveResult.bestParams) {
      // Store current overrides as backup if not already stored
      if (!backupOverrides) {
        setBackupOverrides(overrides);
      }
      
      // Apply the backsolve parameters
      setOverrides({
        k: backsolveResult.bestParams.best_k,
        gamma_exit: backsolveResult.bestParams.best_gamma_exit,
        epsilon: overrides.epsilon // Keep existing epsilon if any
      });
      
      // Run simulation with new parameters
      await runSimulationInternal();
    } else {
      throw new Error("No valid parameters found in backsolve result");
    }
  }, [backsolveResult, backupOverrides, overrides, runSimulationInternal]);

  // Wrapper for backward compatibility
  const runSimulation = useCallback(async () => {
    try {
      await runSimulationInternal();
      toast({
        title: "Simulation Complete",
        description: "Conversion rates predicted successfully"
      });
    } catch (error) {
      console.error('Simulation error:', error);
      toast({
        title: "Simulation Failed",
        description: error instanceof Error ? error.message : "Please check your inputs and try again.",
        variant: "destructive"
      });
    }
  }, [runSimulationInternal, toast]);

  const runOptimize = useCallback(async () => {
    console.log('🚀 runOptimize called!');
    try {
      setIsOptimizing(true);
      console.log('🔄 isOptimizing set to true');
      
      // Enhanced payload with Fogg-based optimization
      const payload = { 
        ...buildPayload(), 
        sample_count: numSamples,
        use_backsolved_constants: backsolveResult ? true : false,
        best_k: backsolveResult?.bestParams?.best_k,
        best_gamma_exit: backsolveResult?.bestParams?.best_gamma_exit,
        include_sample_results: true,
        hybrid_seeding: hybridSeeding,
        seeded_order: hybridSeeding,
        llmAssessments: llmAssessmentResult?.assessments || [],
        // NEW: Pass Fogg assessment data for intelligent seeding
        foggStepAssessments: foggStepAssessments?.assessments || [],
        useFoggSeeding: foggStepAssessments?.assessments && foggStepAssessments.assessments.length > 0,
        // Enhanced optimization strategy
        optimizationStrategy: foggStepAssessments?.assessments && foggStepAssessments.assessments.length > 0 ? 'fogg_intelligent' : 'standard'
      };
      console.log('📦 Optimization payload:', payload);
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Optimization failed');
      
      const data = await response.json();
      console.log('Optimize response:', data); // Debug log
      
      // Convert optimalOrder array to optimalPositions object
      const optimalPositionsMap: Record<number, number> = {};
      if (data.optimalOrder && Array.isArray(data.optimalOrder)) {
        data.optimalOrder.forEach((originalIndex: number, newPosition: number) => {
          optimalPositionsMap[originalIndex] = newPosition;
        });
      }
      
      // Map API response to expected format for UI components
      const mappedData = {
        ...data,
        optimal_step_order: data.optimalOrder,
        optimal_CR_total: data.optimalCRTotal,
        sample_results: data.allSamples || []
      };
      
      setOptimalPositions(optimalPositionsMap);
      setOptimizeResult(mappedData);
      setSimulationData((prev: SimulationData | null) => prev ? { ...prev, bestCR: data.optimalCRTotal } : null);
      
      toast({
        title: "Optimization Complete",
        description: `Best CR found: ${(data.optimalCRTotal * 100).toFixed(2)}% using ${data.algorithm} algorithm${data.fogg_seeding?.enabled ? ' with Fogg B=MAT seeding' : data.hybrid_seeding?.enabled ? ' with Hybrid seeding' : ''}`
      });
    } catch (error) {
      console.error('Optimization error:', error);
      toast({
        title: "Optimization Failed", 
        description: "Please try again with different parameters.",
        variant: "destructive"
      });
    } finally {
      setIsOptimizing(false);
    }
  }, [buildPayload, numSamples, toast, backsolveResult, hybridSeeding, llmAssessmentResult, foggStepAssessments]);

  const { getCachedAssessment, setCachedAssessment } = useAssessmentCache();

  // Memoized assessment payload for SWR caching
  const assessmentPayload = useMemo(() => {
    if (!simulationData || !steps) return null;
    
    return {
      steps: steps.map((step, stepIndex) => ({
        stepIndex,
        questionTexts: step.questions.map(q => q.title),
        Qs: step.questions.length > 0 ? 
          step.questions.reduce((sum, q) => sum + parseInt(q.input_type || '2'), 0) / step.questions.length : 2,
        Is: step.questions.length > 0 ? 
          step.questions.reduce((sum, q) => sum + q.invasiveness, 0) / step.questions.length : 2,
        Ds: step.questions.length > 0 ? 
          step.questions.reduce((sum, q) => sum + q.difficulty, 0) / step.questions.length : 2,
        CR_s: simulationData.predictedSteps[stepIndex]?.CR_s || 0.5
      })),
      frameworks: ['PAS', 'Fogg', 'Nielsen', 'AIDA', 'Cialdini']
    };
  }, [simulationData, steps]);

  const runLLMAssessment = useCallback(async () => {
    try {
      setIsAssessing(true);
      
      if (!simulationData || !steps) {
        throw new Error("Please run simulation first to get predicted conversion rates");
      }

      // Build payload for LLM assessment
      const assessmentPayload = {
        steps: steps.map((step, stepIndex) => ({
          stepIndex,
          questionTexts: step.questions.map(q => q.title),
          Qs: step.questions.length > 0 ? 
            step.questions.reduce((sum, q) => sum + parseInt(q.input_type || '2'), 0) / step.questions.length : 2,
          Is: step.questions.length > 0 ? 
            step.questions.reduce((sum, q) => sum + q.invasiveness, 0) / step.questions.length : 2,
          Ds: step.questions.length > 0 ? 
            step.questions.reduce((sum, q) => sum + q.difficulty, 0) / step.questions.length : 2,
          CR_s: simulationData.predictedSteps[stepIndex]?.CR_s || 0.5
        }))
      };

      // Process questions in batches
      const allQuestions = steps.flatMap(step => step.questions);
      const batches = [];
      
      for (let i = 0; i < allQuestions.length; i += BATCH_SIZE) {
        const batch = allQuestions.slice(i, i + BATCH_SIZE);
        batches.push(batch);
      }

      const results = [];
      for (const batch of batches) {
        // Check cache for each question in batch
        const uncachedQuestions = batch.filter(q => !getCachedAssessment(q.title));
        
        if (uncachedQuestions.length > 0) {
          // Only assess uncached questions
          const response = await fetch('/api/assessQuestion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questions: uncachedQuestions.map(q => ({
                questionTitle: q.title,
                sampleResponses: []
              })),
              frameworks: ['PAS', 'Fogg', 'Nielsen', 'AIDA', 'Cialdini']
            })
          });

          if (!response.ok) {
            throw new Error(`Assessment failed: ${response.statusText}`);
          }

          const data = await response.json();
          
          // Cache new results
          data.assessments.forEach((assessment: any) => {
            setCachedAssessment(assessment.questionTitle, assessment);
          });

          results.push(...data.assessments);
        } else {
          // Use cached results
          batch.forEach(q => {
            const cached = getCachedAssessment(q.title);
            if (cached) {
              results.push(cached);
            }
          });
        }
      }

      // Update state with all results
      setLlmAssessmentResult({
        assessments: results,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Assessment Complete",
        description: `Analyzed ${allQuestions.length} questions using PAS, Fogg, Nielsen, AIDA, and Cialdini frameworks`,
        duration: 3000,
      });

    } catch (error) {
      console.error("Error in LLM assessment:", error);
      toast({
        title: "Assessment Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsAssessing(false);
    }
  }, [steps, simulationData, getCachedAssessment, setCachedAssessment]);

  const runFoggStepAssessment = useCallback(async () => {
    setIsFoggStepAssessing(true);
    
    try {
      if (!steps || steps.length === 0) {
        throw new Error("Please add steps first");
      }

      if (!categoryTitle.trim()) {
        throw new Error("Please enter a category title first");
      }

      console.log('Running Fogg Step Assessment...');
      
      const response = await fetch('/api/assessStepFogg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps, categoryTitle: categoryTitle.trim() })
      });

      const data = await response.json();
      
      if (response.ok) {
        setFoggStepAssessments(data);
        toast({
          title: "Fogg Step Assessment Complete",
          description: `Analyzed ${data.assessments.length} steps using Fogg Behavior Model (B = MAT)`
        });
      } else {
        toast({
          title: "Fogg Step Assessment Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Fogg Step Assessment error:', error);
      toast({
        title: "Fogg Step Assessment Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsFoggStepAssessing(false);
    }
  }, [steps, categoryTitle, toast]);

  const runMCPFunnelAnalysis = useCallback(async () => {
    try {
      setIsMCPAnalyzing(true);
      
      if (!steps || steps.length === 0) {
        throw new Error("Please configure funnel steps first");
      }

      // Call MCP manusFunnel orchestrator function with timeout
      let data;
      try {
        console.log('Attempting MCP funnel analysis...');
        
        // Create a timeout promise (45 seconds)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('MCP funnel analysis timeout')), 45000)
        );
        
        const fetchPromise = fetch('/api/manusFunnel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            steps: steps,
            frameworks: ['PAS', 'Fogg', 'Nielsen', 'AIDA', 'Cialdini', 'SCARF', 'JTBD', 'TOTE', 'ELM']
          })
        });
        
        const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          
          // Special handling for MCP service unavailable (503 status)
          if (response.status === 503) {
            throw new Error(errorData.message || 'Advanced MCP Framework Analysis is currently unavailable. Please use the basic analysis features.');
          }
          
          // Special handling for MCP not available (legacy)
          if (errorData.error === 'MCP client not available') {
            throw new Error('MCP client not initialized. Please ensure the MCP manus client is properly configured.');
          }
          
          const errorMessage = errorData?.error || errorData?.details || 'MCP funnel analysis failed';
          throw new Error(String(errorMessage));
        }

        data = await response.json();
        console.log('MCP funnel analysis successful');
        
      } catch (mcpError) {
        console.warn('MCP funnel analysis failed:', mcpError);
        
        // For now, throw the error as there's no fallback for funnel analysis
        // In the future, you could implement a simplified analysis here
        const errorMessage = mcpError instanceof Error ? mcpError.message : 'Unknown error';
        throw new Error(`MCP funnel analysis failed: ${String(errorMessage)}`);
      }
      setMcpFunnelResult(data);

      toast({
        title: "MCP Analysis Complete",
        description: `Analyzed ${data.metadata.totalVariants} framework variants. Best: ${data.metadata.topPerformer.framework} (+${data.metadata.topPerformer.uplift_pp.toFixed(2)}pp)`
      });

    } catch (error) {
      console.error('MCP Funnel Analysis error:', error);
      toast({
        title: "MCP Analysis Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsMCPAnalyzing(false);
    }
  }, [steps, toast]);

  const applyMCPVariant = useCallback(async (variant: MCPFunnelVariant) => {
    try {
      // Apply the variant's step order and suggested copy
      // This would integrate with your existing step reordering logic
      
      toast({
        title: "Variant Applied",
        description: `Applied ${variant.framework} framework with ${variant.suggestions.length} improvements`
      });

      // Optionally re-run simulation with new configuration
      
    } catch (error) {
      console.error('Apply variant error:', error);
      toast({
        title: "Apply Variant Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const runEnhancedMCPAnalysis = useCallback(async () => {
    if (!steps || steps.length === 0) return;

    setIsEnhancedMCPAnalyzing(true);
    try {
      const payload = buildPayload();
      
      const response = await fetch('/api/manusFunnelEnhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          frameworks: ['PAS', 'Fogg', 'Nielsen', 'AIDA', 'Cialdini', 'SCARF', 'JTBD', 'TOTE', 'ELM'],
          use_backsolved_constants: !!backsolveResult,
          best_k: backsolveResult?.bestParams?.best_k,
          best_gamma_exit: backsolveResult?.bestParams?.best_gamma_exit
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setEnhancedMcpResult(data);
        toast({
          title: "Enhanced MCP Analysis Complete", 
          description: `Analyzed ${data.baseline_metrics?.frameworks_analyzed || 9} framework variants (PAS, Fogg, Nielsen, AIDA, Cialdini, SCARF, JTBD, TOTE, ELM) using ${data.baseline_metrics?.algorithm_used || 'optimization'}`
        });
      } else {
        // Handle specific MCP service unavailable error
        if (response.status === 503) {
          throw new Error(data?.message || 'Enhanced MCP Analysis service is currently unavailable. Please use the basic analysis features.');
        }
        const errorMessage = data?.details || 'Enhanced analysis failed';
        throw new Error(String(errorMessage));
      }
    } catch (error) {
      console.error('Enhanced MCP analysis error:', error);
      toast({
        title: "Enhanced MCP Analysis Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsEnhancedMCPAnalyzing(false);
    }
  }, [steps, toast, backsolveResult, buildPayload]);

  const applyEnhancedVariant = useCallback(async (variant: any) => {
    try {
      toast({
        title: "Applying Enhanced Variant",
        description: `Implementing ${variant.framework} optimization with ${variant.uplift_pp.toFixed(1)}pp expected uplift`
      });
      
      // Update steps with the suggested order
      const reorderedSteps = variant.step_order.map((index: number) => steps[index]);
      setSteps(reorderedSteps);
      
      // Trigger new simulation with reordered steps
      setTimeout(() => {
        runSimulation();
      }, 100);
      
    } catch (error) {
      toast({
        title: "Application Failed",
        description: "Could not apply enhanced variant",
        variant: "destructive"
      });
    }
  }, [steps, runSimulation, toast]);

  const updateSimulation = async () => {
    if (backsolveResult && backsolveResult.bestParams) {
      // Store current overrides as backup if not already stored
      if (!backupOverrides) {
        setBackupOverrides(overrides);
      }
      
      // Apply the backsolve parameters
      setOverrides({
        k: backsolveResult.bestParams.best_k,
        gamma_exit: backsolveResult.bestParams.best_gamma_exit,
        epsilon: overrides.epsilon // Keep existing epsilon if any
      });
      
      toast({
        title: "Parameters Applied",
        description: `Applied k=${backsolveResult.bestParams.best_k}, gamma_exit=${backsolveResult.bestParams.best_gamma_exit}`
      });
      
      // Automatically run simulation with new parameters
      setTimeout(() => {
        runSimulation();
      }, 100); // Small delay to ensure state is updated
    } else {
      toast({
        title: "Cannot Apply Parameters",
        description: "No valid parameters found in backsolve result",
        variant: "destructive"
      });
    }
  };

  const restoreToDefault = () => {
    if (backupOverrides !== null) {
      setOverrides(backupOverrides);
      setBackupOverrides(null);
      
      toast({
        title: "Parameters Restored",
        description: "Restored to default parameter values"
      });
    } else {
      // If no backup, restore to completely empty overrides (system defaults)
      setOverrides({});
      
      toast({
        title: "Parameters Restored",
        description: "Restored to system default values"
      });
    }
  };

  // Get current step order (indices)
  const getCurrentStepOrder = (): number[] => {
    return steps.map((_, index) => index);
  };

  // Apply recommended order from MCP assessment
  const applyRecommendedOrder = (orderRecommendation: MCPOrderRecommendation) => {
    const newOrder = orderRecommendation.recommendedOrder;
    const reorderedSteps = newOrder.map(index => steps[index]);
    
    setSteps(reorderedSteps);
    
    toast({
      title: "Step Order Applied",
      description: `Applied ${orderRecommendation.framework} recommended order: ${newOrder.map(i => `Step ${i + 1}`).join(' → ')}`
    });

    // Automatically run simulation with new order
    setTimeout(() => {
      runSimulation();
    }, 100);
  };

  // Debounced steps for expensive validation calculations
  const debouncedSteps = useDebounce(steps, 300);
  const debouncedCategoryTitle = useDebounce(categoryTitle, 300);

  // Validation with debounced values to prevent excessive recalculation
  const validationState = useMemo(() => {
    const canRunSimulation = debouncedSteps && debouncedSteps.length > 0 && debouncedSteps.every(step => 
      step && 
      step.questions && 
      Array.isArray(step.questions) && 
      step.questions.length > 0 &&
      step.questions.every(q => q && q.input_type && q.title && q.title.trim() && 
        typeof q.invasiveness === 'number' && typeof q.difficulty === 'number')
    );

    const canRunBacksolve = debouncedSteps && debouncedSteps.length > 0 && debouncedSteps.every(step => 
      step && typeof step.observedCR === 'number' && step.observedCR !== null && step.observedCR !== undefined
    );

    const canRunCompleteAnalysis = canRunSimulation && canRunBacksolve && debouncedCategoryTitle.trim().length > 0;

    return { canRunSimulation, canRunBacksolve, canRunCompleteAnalysis };
  }, [debouncedSteps, debouncedCategoryTitle]);

  const { canRunSimulation, canRunBacksolve, canRunCompleteAnalysis } = validationState;

  // New validation: Detailed Assessment requires Complete Analysis to be run first
  const canRunDetailedAssessment = simulationData !== null && backsolveResult !== null;
  
  // Debug logging to understand validation states
  console.log('🔍 Validation Debug:', {
    simulationData: !!simulationData,
    backsolveResult: !!backsolveResult,
    canRunDetailedAssessment,
    categoryTitle: categoryTitle.trim(),
    canRunCompleteAnalysis
  });

  // Add specific Fogg analysis function per YAML spec 3.3_fogg_order_logic
  const runFoggAnalysis = useCallback(async () => {
    try {
      setIsMCPAnalyzing(true);
      
      if (!steps || steps.length === 0) {
        throw new Error("Please configure funnel steps first");
      }

      console.log('🧠 Running Fogg Behavior Model analysis...');
      
      // Create a timeout promise (30 seconds for focused analysis)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fogg analysis timeout')), 30000)
      );
      
      // Call the dedicated Fogg analysis API that implements the YAML spec
      const fetchPromise = fetch('/api/foggAnalysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps: steps,
          constants: {
            c1, c2, c3, w_c, w_f, w_E, w_N,
            E, N_importance: N, source, U0
          } // Include current constants for calculation API calls
        })
      });
      
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData?.error || errorData?.details || 'Fogg analysis failed';
        throw new Error(String(errorMessage));
      }

      const foggResult = await response.json();
      console.log('✅ Fogg analysis successful:', foggResult);
      
      // Create MCP-compatible result structure for existing components
      const foggVariant = {
        framework: foggResult.framework,
        step_order: foggResult.step_order,
        CR_total: foggResult.CR_total,
        uplift_pp: foggResult.uplift_pp,
        fogg_metrics: foggResult.fogg_metrics,
        suggestions: [] // Fogg is about ordering, not copy rewriting
      };
      
      const mcpCompatibleResult = {
        baselineCR: foggResult.baseline_CR_total,
        variants: [foggVariant],
        metadata: {
          totalVariants: 1,
          topPerformer: foggVariant,
          averageUplift: foggResult.uplift_pp,
          frameworksAnalyzed: ['Fogg-BM']
        }
      };
      
      setMcpFunnelResult(mcpCompatibleResult);

      toast({
        title: "Fogg Analysis Complete",
        description: `Fogg Behavior Model analysis complete. ${foggResult.uplift_pp.toFixed(1)}pp improvement identified.`
      });

    } catch (error) {
      console.error('❌ Fogg Analysis error:', error);
      toast({
        title: "Fogg Analysis Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsMCPAnalyzing(false);
    }
  }, [steps, toast, buildPayload]);

  // Complete analysis workflow function
  const runCompleteAnalysis = useCallback(async () => {
    try {
      setIsRunningComplete(true);
      
      // Step 1: Initial Simulation
      setLoadingMessage('Running initial simulation...');
      await runSimulationInternal();
      
      // Step 2: Back-solve optimization
      setLoadingMessage('Optimizing parameters with back-solve...');
      const backsolveData = await runBacksolveInternal();
      
      // Step 3: Update simulation with optimized parameters
      setLoadingMessage('Re-running simulation with optimized parameters...');
      await updateSimulationWithParams(backsolveData);
      
      toast({
        title: "Complete Analysis Finished",
        description: "Initial simulation, back-solve optimization, and updated simulation completed successfully!"
      });
      
    } catch (error) {
      console.error('Complete analysis error:', error);
      toast({
        title: "Complete Analysis Failed",
        description: error instanceof Error ? error.message : "Please check your inputs and try again.",
        variant: "destructive"
      });
    } finally {
      setIsRunningComplete(false);
      setLoadingMessage('');
    }
  }, [runSimulationInternal, runBacksolveInternal, updateSimulationWithParams, toast]);

  return (
    <>
      <Head>
        <title>Lead Gen Funnel Reviewer</title>
        <meta name="description" content="Optimize your lead generation funnels and landing pages with AI-powered analysis" />
      </Head>
      <div className="min-h-screen bg-gray-50">
      {/* Header with Apple Glass Gradient */}
      <header className="relative bg-gradient-to-br from-white/90 via-gray-100/80 to-gray-200/70 backdrop-blur-xl border-b border-white/20 shadow-md">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-left">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
              Lead Gen Funnel Reviewer
            </h1>
            <p className="text-xl text-gray-700/90 mb-4">
              Optimize your lead generation funnels and landing pages with AI-powered analysis
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600/80 mb-6">
              <span className="flex items-center gap-1 bg-white/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/30">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Psychological Frameworks
              </span>
              <span className="flex items-center gap-1 bg-white/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/30">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                AI-Powered Analysis
              </span>
              <span className="flex items-center gap-1 bg-white/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/30">
                <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                Step Optimization
              </span>
              <span className="flex items-center gap-1 bg-white/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/30">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                Data Import
              </span>
            </div>
            
            {/* How It Works Section in Header */}
            <HowItWorksSection />
          </div>
        </div>
      </header>

      {/* Main Content */}
              <main className="lead-gen-funnel-reviewer-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Current Constants Section */}
        <CurrentConstantsSection {...{
          c1,
          c2,
          c3,
          w_c,
          w_f,
          w_E,
          w_N,
          overrides,
          setOverrides
        }} />

        {/* Funnel Settings Section */}
        <FunnelSettingsSection {...{
          journeyType,
          onJourneyTypeChange: handleJourneyTypeChange as (type: string) => void,
          E,
          setE,
          N,
          setN,
          source,
          setSource,
          U0,
          setU0,
          c1,
          setC1,
          c2,
          setC2,
          c3,
          setC3,
          w_c,
          setWC,
          w_f,
          setWF,
          w_E,
          setWE,
          w_N,
          setWN
        }} />

        {/* Main Content Tabs - Journey Steps and Landing Page */}
        <MainContentTabs
          // Journey Steps props
          steps={steps}
          onAddStep={addStep}
          onRemoveStep={removeStep}
          onUpdateStep={updateStep}
          onAddQuestion={addQuestion}
          onRemoveQuestion={removeQuestion}
          onUpdateQuestion={updateQuestion}
          inputTypeOptions={inputTypeOptions}
          invasivenessOptions={invasivenessOptions}
          difficultyOptions={difficultyOptions}
          onBoostElementsChange={handleBoostElementsChange}
          onClassifyBoostElements={handleClassifyBoostElements}
          isClassifyingBoosts={isClassifyingBoosts}
          categoryTitle={categoryTitle}
          onCategoryTitleChange={setCategoryTitle}
          onImportSpreadsheetData={handleSpreadsheetImport}
          
          // Landing Page props
          landingPageContent={landingPageContent}
          onLandingPageContentChange={setLandingPageContent}
          onRunLandingPageAnalysis={runLandingPageAnalysis}
          isAnalyzingLandingPage={isAnalyzingLandingPage}
          landingPageAnalysisResult={landingPageAnalysisResult}
          
          // Widget props
          widgetContent={widgetContent}
          onWidgetContentChange={setWidgetContent}
          onRunWidgetAnalysis={runWidgetAnalysis}
          isAnalyzingWidgets={isAnalyzingWidgets}
          widgetAnalysisResult={widgetAnalysisResult}
          
          // Auto-generate props
          onAutoGenerateLandingPage={handleAutoGenerateLandingPage}
          isAutoGeneratingLandingPage={isAutoGeneratingLandingPage}
          onAutoGenerateWidgets={handleAutoGenerateWidgets}
          isAutoGeneratingWidgets={isAutoGeneratingWidgets}
          
          // Journey Steps specific sections
          journeyStepsAnalysisSections={
            <>
              {/* Complete Analysis Controls */}
              <SimulationBacksolveControls
                onRunCompleteAnalysis={runCompleteAnalysis}
                isRunningComplete={isRunningComplete}
                loadingMessage={loadingMessage}
                canRunCompleteAnalysis={canRunCompleteAnalysis}
                categoryTitle={categoryTitle}
              />

              {/* Back-solve Result Panel */}
              {backsolveResult && (
                <BacksolveResultPanelDynamic
                  backsolveResult={backsolveResult}
                />
              )}

              {/* Detailed Analysis Results Section */}
              {simulationData && (
                <AnalysisTabsSectionDynamic
                  mcpFunnelResult={mcpFunnelResult}
                  enhancedMcpResult={enhancedMcpResult}
                  isEnhancedMCPAnalyzing={isEnhancedMCPAnalyzing}
                  isMCPAnalyzing={isMCPAnalyzing}
                  onApplyRecommendedOrder={applyMCPVariant}
                  onRunEnhancedMCP={runEnhancedMCPAnalysis}
                  onApplyEnhancedVariant={applyEnhancedVariant}
                  steps={steps}
                  onRunFoggAnalysis={simulationData ? runMCPFunnelAnalysis : undefined}
                  onApplyFoggOrder={(order) => {
                    // Apply the Fogg-recommended order
                    const reorderedSteps = order.map(index => steps[index]);
                    setSteps(reorderedSteps);
                    
                    // Show success message
                    toast({
                      title: "Fogg-BM Order Applied!",
                      description: `Steps reordered based on Fogg Behavior Model: ${order.map(i => `Step ${i + 1}`).join(' → ')}`,
                    });
                    
                    // Re-run simulation with new order
                    updateSimulation();
                  }}
                  llmAssessmentResult={llmAssessmentResult}
                  isAssessing={isAssessing}
                  onRunAssessment={runLLMAssessment}
                  baselineCR={simulationData?.CR_total || 0}
                  simulationData={simulationData}
                  optimalPositions={optimalPositions}
                  llmCache={llmCache}
                  setLlmCache={setLlmCache}
                  foggStepAssessments={foggStepAssessments}
                  isFoggStepAssessing={isFoggStepAssessing}
                  onRunFoggStepAssessment={runFoggStepAssessment}
                  canRunDetailedAssessment={canRunDetailedAssessment}
                />
              )}

              {/* Step Order Optimization Section */}
              {simulationData && (
                <Card className="border border-gray-200 shadow-sm bg-gradient-to-r from-purple-50 to-indigo-50">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-indigo-900">
                      🎯 Find Optimal Step Flow
                    </CardTitle>
                    <p className="text-gray-600">
                      AI-powered step reordering using live Fogg B=MAT analysis, unique combinations impact, and intelligent optimization.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Fogg-Based Optimization Status */}
                    {foggStepAssessments?.assessments && foggStepAssessments.assessments.length > 0 && (
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl">🧠</span>
                          <h4 className="text-lg font-semibold text-blue-900">🧠 Fogg B=MAT Intelligence Available</h4>
                          {!foggStepAssessments.isMock && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              Live AI Analysis
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          {foggStepAssessments.assessments.map((assessment, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="text-sm font-medium text-gray-900 mb-2">Step {assessment.stepIndex + 1}</div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="text-center">
                                  <div className="font-bold text-blue-600">{assessment.motivation_score != null ? assessment.motivation_score.toFixed(1) : 'N/A'}</div>
                                  <div className="text-gray-600">Motivation</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-bold text-green-600">{assessment.ability_score != null ? assessment.ability_score.toFixed(1) : 'N/A'}</div>
                                  <div className="text-gray-600">Ability</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-bold text-purple-600">{assessment.trigger_score != null ? assessment.trigger_score.toFixed(1) : 'N/A'}</div>
                                  <div className="text-gray-600">Trigger</div>
                                </div>
                              </div>
                              <div className="mt-2 text-center">
                                <div className="text-sm font-bold text-gray-900">
                                  Overall: {assessment.overall_score != null ? assessment.overall_score.toFixed(1) : 'N/A'}/5
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-blue-700">
                          ✨ <strong>Smart Optimization:</strong> Using live Fogg scores to intelligently seed step reordering for maximum conversion impact.
                        </p>
                      </div>
                    )}

                    {/* Optimize Controls */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="num-samples" className="text-sm font-medium text-gray-700">
                          # of Samples to Try
                        </Label>
                        <Input
                          id="num-samples"
                          type="number"
                          step={1000}
                          min={1000}
                          max={20000}
                          value={numSamples}
                          onChange={(e) => setNumSamples(parseInt(e.target.value) || 20000)}
                          className="w-32 border-gray-300 focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Optimization Strategy
                        </Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="fogg-seeding"
                              checked={foggStepAssessments?.assessments && foggStepAssessments.assessments.length > 0}
                              disabled={true}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="text-sm text-gray-900">
                              🧠 Fogg B=MAT Seeding {foggStepAssessments?.assessments && foggStepAssessments.assessments.length > 0 ? '(Active)' : '(Run Assessment)'}
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="hybrid-seeding"
                              checked={hybridSeeding}
                              onChange={(e) => setHybridSeeding(e.target.checked)}
                              disabled={!llmAssessmentResult?.assessments?.length}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label 
                              htmlFor="hybrid-seeding" 
                              className={`text-sm ${llmAssessmentResult?.assessments?.length ? 'text-gray-900' : 'text-gray-400'}`}
                            >
                              📊 Framework Analysis Boost
                            </label>
                          </div>
                        </div>
                        {!(foggStepAssessments?.assessments && foggStepAssessments.assessments.length > 0) && (
                          <p className="text-xs text-amber-600">
                            ⚠️ Run Detailed Assessment first for AI-powered optimization
                          </p>
                        )}
                      </div>

                      <div className="flex items-end">
                        <Button
                          onClick={runOptimize}
                          disabled={isOptimizing}
                          className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 w-full lg:w-auto"
                        >
                          {isOptimizing ? (
                            <>
                              <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                              Optimizing...
                            </>
                          ) : (
                            foggStepAssessments?.assessments && foggStepAssessments.assessments.length > 0 ? '🧠 AI-Optimize Flow' : 'Find Optimal Flow'
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Enhanced Help Text */}
                    <div className="text-sm text-gray-600 space-y-2 bg-white p-4 rounded-lg">
                      <p>
                        <strong>🎯 AI-Powered Step Optimization:</strong> Uses live Fogg Behavior Model analysis to intelligently reorder steps for maximum conversion.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="font-medium text-gray-800">🧠 Fogg B=MAT Seeding:</p>
                          <p className="text-xs">Orders steps by Motivation × Ability × Trigger scores from live AI analysis</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">📊 Framework Analysis:</p>
                          <p className="text-xs">Combines PAS, AIDA, Nielsen principles with Fogg insights for optimal flow</p>
                        </div>
                      </div>
                    </div>

                    {/* Optimization Results */}
                    {optimizeResult && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-semibold text-gray-800">🚀 Optimization Results</h4>
                          {optimizeResult.algorithm && (
                            <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                              {optimizeResult.algorithm === 'hybrid_seeded_sampling' ? '🧠 Hybrid Seeded' : 
                               optimizeResult.algorithm === 'exhaustive' ? '🔍 Exhaustive' : '🔄 Heuristic'} Search
                            </span>
                          )}
                        </div>
                        
                        {/* Fogg B=MAT Seeding Info */}
                        {optimizeResult.fogg_seeding?.enabled && optimizeResult.fogg_seeding.seeded_order && (
                          <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-blue-900">🧠 Fogg B=MAT Intelligent Seeded Order:</span>
                              <div className="flex flex-wrap gap-1">
                                {optimizeResult.fogg_seeding.seeded_order?.map((stepIndex: number, position: number) => (
                                  <span key={position} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                    Step {stepIndex + 1}
                                  </span>
                                )) || []}
                              </div>
                              {optimizeResult.fogg_seeding.seeded_order_is_optimal && (
                                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-bold">
                                  🎯 Optimal!
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-blue-700">
                              <strong>🧠 AI-Powered Ordering:</strong> This order was computed using live Fogg Behavior Model analysis 
                              (Motivation × Ability × Trigger scores) from real AI assessment of your steps.
                              {optimizeResult.fogg_seeding.seeded_order_is_optimal 
                                ? ' ✨ The AI-recommended order achieved the optimal result!' 
                                : ' Used as intelligent starting point for optimization search.'}
                            </p>
                          </div>
                        )}

                        {/* Hybrid Seeding Info */}
                        {optimizeResult.hybrid_seeding?.enabled && optimizeResult.hybrid_seeding.seeded_order && (
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-blue-900">📊 Framework Analysis Seeded Order:</span>
                              <div className="flex flex-wrap gap-1">
                                {optimizeResult.hybrid_seeding.seeded_order?.map((stepIndex, position) => (
                                  <span key={position} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                    Step {stepIndex + 1}
                                  </span>
                                )) || []}
                              </div>
                              {optimizeResult.hybrid_seeding.seeded_order_is_optimal && (
                                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-bold">
                                  🎯 Optimal!
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-blue-700">
                              This order combines Fogg Behavior Model with framework analysis (PAS, AIDA, Nielsen) 
                              to intelligently seed the optimization search.
                              {optimizeResult.hybrid_seeding.seeded_order_is_optimal 
                                ? ' The combined approach achieved the optimal result!' 
                                : ' Used as secondary starting point for optimization.'}
                            </p>
                          </div>
                        )}
                        
                        {/* Optimal Flow */}
                        {optimizeResult.optimal_step_order && (
                          <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-purple-700">✨ Optimal Flow</span>
                              <span className="text-lg font-bold text-green-700">
                                {(optimizeResult.optimal_CR_total * 100).toFixed(2)}%
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {optimizeResult.optimal_step_order.map((originalStepIndex, position) => (
                                <div key={position} className="flex items-center gap-1">
                                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                                    Step {originalStepIndex + 1}
                                  </span>
                                  {position < optimizeResult.optimal_step_order.length - 1 && (
                                    <span className="text-gray-400">→</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Export & Share Controls */}
              <ExportShareControlsDynamic
                simulationData={simulationData}
                backsolveResult={backsolveResult}
                optimalPositions={optimalPositions}
                buildPayload={buildPayload}
                llmCache={llmCache}
              />

              {/* Data Visualization */}
              {simulationData && (
                <DataVisualizationDynamic
                  simulationData={simulationData}
                  optimizeResult={optimizeResult}
                  steps={steps}
                  E={E}
                  N_importance={N}
                  source={source}
                  c1={c1}
                  c2={c2}
                  c3={c3}
                  w_c={w_c}
                  w_f={w_f}
                  w_E={w_E}
                  w_N={w_N}
                />
              )}
            </>
          }
        />

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} Lead Gen Funnel Reviewer. All rights reserved.</p>
            <div className="flex space-x-4">
              <Link href="/docs" className="hover:text-gray-700">Documentation</Link>
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
};

export default LeadGenFunnelReviewer;
