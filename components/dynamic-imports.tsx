// Dynamic imports for performance optimization
// These components are loaded only when needed to reduce initial bundle size

import dynamic from 'next/dynamic';
import { Loader2Icon } from 'lucide-react';

// Loading fallback component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2Icon className="h-6 w-6 animate-spin text-blue-600" />
    <span className="ml-2 text-sm text-gray-600">Loading...</span>
  </div>
);

// Analysis and visualization components (heavy, loaded when tabs are accessed)
export const DataVisualizationDynamic = dynamic(
  () => import('./DataVisualization'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false // These components often use client-side libraries
  }
);

export const LLMAssessmentPanelDynamic = dynamic(
  () => import('./LLMAssessmentPanel'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const MCPComparisonTableDynamic = dynamic(
  () => import('./MCPComparisonTable'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const CeilingAnalysisPanelDynamic = dynamic(
  () => import('./CeilingAnalysisPanel'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const EnhancedComparisonTableDynamic = dynamic(
  () => import('./EnhancedComparisonTable'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const UniqueCombinationTableDynamic = dynamic(
  () => import('./UniqueCombinationTable'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const FrameworkSuggestionsPanelDynamic = dynamic(
  () => import('./FrameworkSuggestionsPanel'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const FoggModelAnalysisDynamic = dynamic(
  () => import('./FoggModelAnalysis'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

// Advanced controls (loaded when expanded/accessed)
export const OptimizeControlsDynamic = dynamic(
  () => import('./OptimizeControls'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const ExportShareControlsDynamic = dynamic(
  () => import('./ExportShareControls'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const BacksolveResultPanelDynamic = dynamic(
  () => import('./BacksolveResultPanel'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

// Analysis tabs (loaded when specific tabs are clicked)
export const AnalysisTabsSectionDynamic = dynamic(
  () => import('./AnalysisTabsSection'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

// File upload components (loaded only when needed)
export const SpreadsheetUploadDynamic = dynamic(
  () => import('./SpreadsheetUpload'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

// Widget and landing page editors (loaded only when accessed)
export const WidgetEditorDynamic = dynamic(
  () => import('./WidgetEditor'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const LandingPageEditorDynamic = dynamic(
  () => import('./LandingPageEditor'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const WidgetAnalysisPanelDynamic = dynamic(
  () => import('./WidgetAnalysisPanel'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const LandingPageAnalysisPanelDynamic = dynamic(
  () => import('./LandingPageAnalysisPanel'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

// Auto-generation features (loaded when accessed)
export const AutoGenerateSectionDynamic = dynamic(
  () => import('./AutoGenerateSection'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

// Keep these components static as they're critical for first render
// - FunnelSettingsSection (main form, needed immediately)
// - MainContentTabs (navigation, needed immediately)  
// - SimulationBacksolveControls (primary actions, needed immediately)
// - HowItWorksSection (educational content, can stay static)
// - CurrentConstantsSection (settings display, needed immediately)