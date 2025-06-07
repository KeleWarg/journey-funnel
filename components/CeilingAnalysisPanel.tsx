import React from 'react';

interface CeilingAnalysisProps {
  ceilingAnalysis?: {
    baseline_CR: number;
    model_ceiling_CR: number;
    potential_gain_pp: number;
    improvement_possible: boolean;
    best_framework?: string;
    optimization_worthwhile?: boolean;
  };
  algorithmUsed?: string;
  isLoading?: boolean;
}

export default function CeilingAnalysisPanel({ 
  ceilingAnalysis, 
  algorithmUsed = 'heuristic_sampling',
  isLoading = false 
}: CeilingAnalysisProps) {
  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-900 mr-2"></div>
          Analyzing Model Ceiling...
        </h3>
        <div className="space-y-2">
          <div className="bg-blue-100 h-4 rounded animate-pulse"></div>
          <div className="bg-blue-100 h-4 rounded animate-pulse w-3/4"></div>
          <div className="bg-blue-100 h-4 rounded animate-pulse w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!ceilingAnalysis) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-600 mb-2">Model Ceiling Analysis</h3>
        <p className="text-gray-500 text-sm">Run optimization to see potential improvement ceiling</p>
      </div>
    );
  }

  const {
    baseline_CR,
    model_ceiling_CR,
    potential_gain_pp,
    improvement_possible,
    best_framework,
    optimization_worthwhile
  } = ceilingAnalysis;

  // Determine panel color scheme based on improvement potential
  const getColorScheme = () => {
    if (optimization_worthwhile) return 'green'; // >1pp gain = worthwhile
    if (improvement_possible) return 'yellow';   // 0.5-1pp gain = marginal
    return 'gray';                              // <0.5pp gain = minimal
  };

  const colorScheme = getColorScheme();
  
  const colorClasses = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      title: 'text-green-900',
      text: 'text-green-800',
      accent: 'text-green-600',
      badge: 'bg-green-100 text-green-800'
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      title: 'text-yellow-900',
      text: 'text-yellow-800',
      accent: 'text-yellow-600',
      badge: 'bg-yellow-100 text-yellow-800'
    },
    gray: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      title: 'text-gray-900',
      text: 'text-gray-800',
      accent: 'text-gray-600',
      badge: 'bg-gray-100 text-gray-800'
    }
  };

  const colors = colorClasses[colorScheme];

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-lg p-6 mb-6`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${colors.title} flex items-center`}>
          <span className="mr-2">📊</span>
          Model Ceiling vs. Baseline
        </h3>
        <span className={`px-2 py-1 text-xs font-medium ${colors.badge} rounded`}>
          {algorithmUsed === 'exhaustive' ? 'Exhaustive Search' : 'Heuristic Sampling'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className={`text-2xl font-bold ${colors.text}`}>
            {(baseline_CR * 100).toFixed(2)}%
          </div>
          <div className={`text-sm ${colors.accent}`}>Baseline (Observed) CR</div>
        </div>
        
        <div className="text-center">
          <div className={`text-2xl font-bold ${colors.text}`}>
            {(model_ceiling_CR * 100).toFixed(2)}%
          </div>
          <div className={`text-sm ${colors.accent}`}>Best-Modelled CR</div>
        </div>
        
        <div className="text-center">
          <div className={`text-2xl font-bold ${colors.text} flex items-center justify-center`}>
            {potential_gain_pp >= 0 ? '+' : ''}{potential_gain_pp.toFixed(2)}
            <span className="text-lg ml-1">pp</span>
          </div>
          <div className={`text-sm ${colors.accent}`}>Potential Gain</div>
        </div>
      </div>

      {/* Progress Bar Visualization */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className={colors.accent}>Current Performance</span>
          <span className={colors.accent}>Model Ceiling</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${
              colorScheme === 'green' ? 'bg-green-500' : 
              colorScheme === 'yellow' ? 'bg-yellow-500' : 'bg-gray-400'
            }`}
            style={{ width: `${Math.min(100, (model_ceiling_CR / Math.max(baseline_CR, model_ceiling_CR)) * 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Optimization Recommendation */}
      <div className={`p-3 rounded ${colors.badge} text-sm`}>
        {optimization_worthwhile ? (
          <>
            <span className="font-medium">🚀 Optimization Recommended:</span> 
            {` Model suggests ${potential_gain_pp.toFixed(1)}pp improvement is achievable`}
            {best_framework && ` using ${best_framework} framework`}.
          </>
        ) : improvement_possible ? (
          <>
            <span className="font-medium">⚠️ Marginal Gain Available:</span> 
            {` ${potential_gain_pp.toFixed(1)}pp improvement possible, but may not justify optimization effort.`}
          </>
        ) : (
          <>
            <span className="font-medium">✅ Well Optimized:</span> 
            {` Current funnel is already performing near model ceiling (${potential_gain_pp.toFixed(1)}pp gap).`}
          </>
        )}
      </div>

      {/* Technical Details */}
      <details className="mt-4">
        <summary className={`text-sm ${colors.accent} cursor-pointer hover:underline`}>
          Technical Details
        </summary>
        <div className={`mt-2 text-xs ${colors.accent} space-y-1`}>
          <div>• Algorithm: {algorithmUsed === 'exhaustive' ? 'Exhaustive permutation search' : 'Heuristic random sampling'}</div>
          <div>• Baseline CR: {(baseline_CR * 100).toFixed(4)}% (observed performance)</div>
          <div>• Model Ceiling: {(model_ceiling_CR * 100).toFixed(4)}% (theoretical maximum)</div>
          <div>• Gap Analysis: {potential_gain_pp.toFixed(4)} percentage points improvement possible</div>
          {best_framework && <div>• Best Framework: {best_framework} optimization approach</div>}
        </div>
      </details>
    </div>
  );
} 