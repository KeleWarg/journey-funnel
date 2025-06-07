import React, { useState, useMemo } from 'react';
import { Button } from '@components/ui/button';

interface FrameworkVariant {
  framework: string;
  step_order: number[];
  baseline_CR: number;
  model_CR: number;
  uplift_pp: number;
  suggestions: Array<{
    stepIndex: number;
    suggestion: string;
    reasoning: string;
    estimated_uplift_pp: number;
  }>;
  algorithm: string;
  samples_evaluated: number;
}

interface EnhancedComparisonTableProps {
  variantResults?: FrameworkVariant[];
  ceilingAnalysis?: {
    baseline_CR: number;
    model_ceiling_CR: number;
    potential_gain_pp: number;
    best_framework: string;
  };
  isLoading?: boolean;
  onApplyVariant?: (variant: FrameworkVariant) => void;
}

type SortField = 'framework' | 'model_CR' | 'uplift_pp' | 'samples_evaluated';
type SortDirection = 'asc' | 'desc';

export default function EnhancedComparisonTable({
  variantResults = [],
  ceilingAnalysis,
  isLoading = false,
  onApplyVariant
}: EnhancedComparisonTableProps) {
  const [sortField, setSortField] = useState<SortField>('uplift_pp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterMinUplift, setFilterMinUplift] = useState<number>(0);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const sortedAndFilteredResults = useMemo(() => {
    let filtered = variantResults.filter(result => result.uplift_pp >= filterMinUplift);
    
    return filtered.sort((a, b) => {
      let aValue: number | string = a[sortField];
      let bValue: number | string = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      aValue = aValue as number;
      bValue = bValue as number;
      
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [variantResults, sortField, sortDirection, filterMinUplift]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleRowExpansion = (framework: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(framework)) {
      newExpanded.delete(framework);
    } else {
      newExpanded.add(framework);
    }
    setExpandedRows(newExpanded);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getPerformanceColor = (uplift: number) => {
    if (uplift >= 2.0) return 'text-green-600';
    if (uplift >= 1.0) return 'text-yellow-600';
    if (uplift >= 0.5) return 'text-orange-600';
    return 'text-gray-500';
  };

  const getPerformanceBadge = (uplift: number) => {
    if (uplift >= 2.0) return { text: 'Excellent', class: 'bg-green-100 text-green-800' };
    if (uplift >= 1.0) return { text: 'Good', class: 'bg-yellow-100 text-yellow-800' };
    if (uplift >= 0.5) return { text: 'Marginal', class: 'bg-orange-100 text-orange-800' };
    return { text: 'Minimal', class: 'bg-gray-100 text-gray-800' };
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-900 mr-2"></div>
            Framework Variant Analysis
          </h3>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!variantResults || variantResults.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-600 mb-2">Framework Variant Analysis</h3>
        <p className="text-gray-500">Run enhanced MCP analysis to see framework variant comparisons</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            📊 Framework Variant Analysis ({variantResults.length} variants)
          </h3>
          {ceilingAnalysis && (
            <div className="text-sm text-gray-600">
              Best: <span className="font-medium text-green-600">{ceilingAnalysis.best_framework}</span>
              {' '}(+{ceilingAnalysis.potential_gain_pp.toFixed(1)}pp)
            </div>
          )}
        </div>
        
        {/* Filters */}
        <div className="mt-3 flex items-center gap-4">
          <label className="text-sm text-gray-600">
            Min Uplift:
            <input
              type="number"
              value={filterMinUplift}
              onChange={(e) => setFilterMinUplift(Number(e.target.value))}
              className="ml-2 w-20 px-2 py-1 border border-gray-300 rounded text-sm"
              step="0.1"
              min="0"
            />
            pp
          </label>
          <div className="text-sm text-gray-500">
            Showing {sortedAndFilteredResults.length} of {variantResults.length} variants
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('framework')}
                  className="flex items-center hover:text-gray-700"
                >
                  Framework {getSortIcon('framework')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Baseline CR
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('model_CR')}
                  className="flex items-center hover:text-gray-700"
                >
                  Model CR {getSortIcon('model_CR')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('uplift_pp')}
                  className="flex items-center hover:text-gray-700"
                >
                  Uplift {getSortIcon('uplift_pp')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Performance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('samples_evaluated')}
                  className="flex items-center hover:text-gray-700"
                >
                  Samples {getSortIcon('samples_evaluated')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedAndFilteredResults.map((variant, index) => {
              const isExpanded = expandedRows.has(variant.framework);
              const performanceBadge = getPerformanceBadge(variant.uplift_pp);
              const isTopPerformer = index === 0 && sortField === 'uplift_pp' && sortDirection === 'desc';
              
              return (
                <React.Fragment key={variant.framework}>
                  <tr className={`${isTopPerformer ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {isTopPerformer && <span className="text-green-500 mr-2">👑</span>}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{variant.framework}</div>
                          <div className="text-xs text-gray-500">{variant.algorithm}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(variant.baseline_CR * 100).toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(variant.model_CR * 100).toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getPerformanceColor(variant.uplift_pp)}`}>
                        {variant.uplift_pp >= 0 ? '+' : ''}{variant.uplift_pp.toFixed(2)}pp
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${performanceBadge.class}`}>
                        {performanceBadge.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {variant.samples_evaluated.toLocaleString()}
                    </td>
                  </tr>
                  
                  {/* Expanded Details */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 bg-gray-50">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Copy Suggestions:</h4>
                            <div className="space-y-2">
                              {variant.suggestions.map((suggestion, suggestionIndex) => (
                                <div key={suggestionIndex} className="bg-white p-3 rounded border">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-gray-900">
                                        Step {suggestion.stepIndex + 1}
                                      </div>
                                      <div className="text-sm text-gray-700 mt-1">
                                        {suggestion.suggestion}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {suggestion.reasoning}
                                      </div>
                                    </div>
                                    <div className="text-sm font-medium text-green-600 ml-4">
                                      +{suggestion.estimated_uplift_pp.toFixed(1)}pp
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Recommended Step Order:</h4>
                            <div className="flex items-center space-x-2">
                              {variant.step_order.map((stepIndex, position) => (
                                <React.Fragment key={stepIndex}>
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                    Step {stepIndex + 1}
                                  </span>
                                  {position < variant.step_order.length - 1 && (
                                    <span className="text-gray-400">→</span>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {sortedAndFilteredResults.length === 0 && filterMinUplift > 0 && (
        <div className="px-6 py-8 text-center text-gray-500">
          No variants found with minimum {filterMinUplift}pp uplift.
          <button 
            onClick={() => setFilterMinUplift(0)}
            className="text-blue-600 hover:text-blue-800 ml-1"
          >
            Clear filter
          </button>
        </div>
      )}
    </div>
  );
} 