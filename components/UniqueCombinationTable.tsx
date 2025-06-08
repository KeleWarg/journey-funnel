import React from 'react';

interface Suggestion {
  stepIndex: number;
  suggestion: string;
  reasoning: string;
  estimated_uplift_pp: number;
}

interface UniqueCombination {
  step_order: number[];
  best_CR_total: number;
  uplift_pp: number;
  frameworks: string[];
  suggestions: Suggestion[];
  algorithm: string;
  samples_evaluated: number;
}

interface UniqueCombinationTableProps {
  combinations: UniqueCombination[];
  baselineCR: number;
}

export const UniqueCombinationTable: React.FC<UniqueCombinationTableProps> = ({ 
  combinations, 
  baselineCR 
}) => {
  if (!combinations || combinations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No unique combinations found. Run analysis to see results.
      </div>
    );
  }

  // Helper function to format step order for display
  const formatStepOrder = (stepOrder: number[]): string => {
    return stepOrder.map(stepIndex => `Step ${stepIndex + 1}`).join(' → ');
  };

  // Helper function to get primary suggestions text
  const getPrimarySuggestion = (suggestions: Suggestion[]): string => {
    if (!suggestions || suggestions.length === 0) return 'No suggestions available';
    
    // Get the suggestion with highest uplift
    const topSuggestion = suggestions.reduce((best, current) => 
      current.estimated_uplift_pp > best.estimated_uplift_pp ? current : best
    );
    
    return topSuggestion.suggestion || 'No specific suggestion';
  };

  return (
    <div className="w-full overflow-hidden">
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          📊 Unique Step-Order Combinations
        </h3>
        <p className="text-sm text-blue-700">
          Each row shows the best-performing framework(s) for that specific step order. 
          Combinations are sorted by conversion rate performance.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Step Order
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Best CR
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Uplift
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Framework(s)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Top Copy Suggestion
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {combinations.map((combination, index) => (
              <tr 
                key={`${combination.step_order.join('-')}-${index}`}
                className={`hover:bg-gray-50 transition-colors ${
                  index === 0 ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                }`}
              >
                <td className="px-4 py-4 text-sm text-gray-900">
                  <div className="font-medium">
                    {formatStepOrder(combination.step_order)}
                  </div>
                  {index === 0 && (
                    <div className="text-xs text-green-600 font-medium mt-1">
                      🏆 Best Overall
                    </div>
                  )}
                </td>
                
                <td className="px-4 py-4 text-sm">
                  <div className="font-semibold text-gray-900">
                    {(combination.best_CR_total * 100).toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    vs {(baselineCR * 100).toFixed(2)}% baseline
                  </div>
                </td>
                
                <td className="px-4 py-4 text-sm">
                  <span 
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      combination.uplift_pp > 0 
                        ? 'bg-green-100 text-green-800' 
                        : combination.uplift_pp < 0
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {combination.uplift_pp > 0 ? '+' : ''}{combination.uplift_pp.toFixed(1)}pp
                  </span>
                </td>
                
                <td className="px-4 py-4 text-sm">
                  <div className="flex flex-wrap gap-1">
                    {combination.frameworks.map((framework, fIndex) => (
                      <span 
                        key={fIndex}
                        className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800"
                      >
                        {framework}
                      </span>
                    ))}
                  </div>
                  {combination.frameworks.length > 1 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Tied performance
                    </div>
                  )}
                </td>
                
                <td className="px-4 py-4 text-sm text-gray-700 max-w-xs">
                  <div className="truncate" title={getPrimarySuggestion(combination.suggestions)}>
                    {getPrimarySuggestion(combination.suggestions)}
                  </div>
                  {combination.suggestions && combination.suggestions.length > 1 && (
                    <div className="text-xs text-gray-500 mt-1">
                      +{combination.suggestions.length - 1} more suggestions
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {combinations.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Analysis Summary:</span> Found {combinations.length} unique step 
            order{combinations.length !== 1 ? 's' : ''}.{' '}
            {combinations[0] && combinations[0].uplift_pp > 0 ? (
              <span className="text-green-700 font-medium">
                Best order shows +{combinations[0].uplift_pp.toFixed(1)}pp improvement using {' '}
                {combinations[0].frameworks.join(', ')} framework{combinations[0].frameworks.length > 1 ? 's' : ''}.
              </span>
            ) : (
              <span className="text-gray-700">
                Current order appears to be optimal based on model predictions.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 