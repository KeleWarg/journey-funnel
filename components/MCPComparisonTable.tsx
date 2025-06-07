import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
// Badge component replacement with inline styling
import { TrendingUpIcon, CrownIcon, ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { MCPFunnelResult, MCPFunnelVariant } from '../types';

interface MCPComparisonTableProps {
  mcpResult: MCPFunnelResult | null;
  onApplyVariant: (variant: MCPFunnelVariant) => void;
  isLoading?: boolean;
}

const MCPComparisonTable: React.FC<MCPComparisonTableProps> = ({
  mcpResult,
  onApplyVariant,
  isLoading = false
}) => {
  const [sortBy, setSortBy] = useState<'CR_total' | 'uplift_pp' | 'framework'>('CR_total');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  if (!mcpResult) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <TrendingUpIcon className="h-5 w-5" />
            MCP Framework Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            {isLoading ? 'Running MCP analysis...' : 'Run MCP Funnel Analysis to see framework comparisons'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedVariants = [...mcpResult.variants].sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;
    
    switch (sortBy) {
      case 'CR_total':
        aVal = a.CR_total;
        bVal = b.CR_total;
        break;
      case 'uplift_pp':
        aVal = a.uplift_pp;
        bVal = b.uplift_pp;
        break;
      case 'framework':
        aVal = a.framework;
        bVal = b.framework;
        break;
      default:
        aVal = a.CR_total;
        bVal = b.CR_total;
    }
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    
    return sortDirection === 'asc' ? 
      (aVal as number) - (bVal as number) : 
      (bVal as number) - (aVal as number);
  });

  const topPerformer = mcpResult.metadata.topPerformer;

  const handleSort = (column: 'CR_total' | 'uplift_pp' | 'framework') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return null;
    return sortDirection === 'asc' ? 
      <ArrowUpIcon className="h-4 w-4 inline ml-1" /> : 
      <ArrowDownIcon className="h-4 w-4 inline ml-1" />;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-700">
          <TrendingUpIcon className="h-5 w-5" />
          MCP Framework Comparison
        </CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-semibold">Baseline CR:</span> {(mcpResult.baselineCR * 100).toFixed(2)}%
          </div>
          <div>
            <span className="font-semibold">Variants:</span> {mcpResult.metadata.totalVariants}
          </div>
          <div>
            <span className="font-semibold">Avg Uplift:</span> +{mcpResult.metadata.averageUplift.toFixed(2)}pp
          </div>
          <div>
            <span className="font-semibold">Top Framework:</span> {topPerformer.framework}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th 
                  className="text-left py-3 px-4 font-semibold cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('framework')}
                >
                  Framework <SortIcon column="framework" />
                </th>
                <th 
                  className="text-center py-3 px-4 font-semibold cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('CR_total')}
                >
                  Total CR <SortIcon column="CR_total" />
                </th>
                <th 
                  className="text-center py-3 px-4 font-semibold cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('uplift_pp')}
                >
                  Uplift <SortIcon column="uplift_pp" />
                </th>
                <th className="text-center py-3 px-4 font-semibold">
                  Recommended Order
                </th>
                <th className="text-center py-3 px-4 font-semibold">
                  Suggestions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedVariants.map((variant, index) => {
                const isTopPerformer = variant.framework === topPerformer.framework;
                const upliftColor = variant.uplift_pp > 0 ? 'text-green-600' : 
                                   variant.uplift_pp < 0 ? 'text-red-600' : 'text-gray-600';
                
                return (
                  <tr key={variant.framework} className={`border-b ${isTopPerformer ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {isTopPerformer && <CrownIcon className="h-4 w-4 text-yellow-500" />}
                        <span className="font-medium">{variant.framework}</span>
                        {isTopPerformer && <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">Best</span>}
                      </div>
                    </td>
                    <td className="text-center py-3 px-4 font-mono font-semibold">
                      {(variant.CR_total * 100).toFixed(2)}%
                    </td>
                    <td className={`text-center py-3 px-4 font-mono font-semibold ${upliftColor}`}>
                      {variant.uplift_pp > 0 ? '+' : ''}{variant.uplift_pp.toFixed(2)}pp
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className="text-xs text-gray-600">
                        [{variant.step_order.join(' → ')}]
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="px-2 py-1 border border-gray-300 text-gray-600 text-xs rounded">
                        {variant.suggestions.length} improvements
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Detailed Suggestions for Top Performer */}
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
            <CrownIcon className="h-4 w-4" />
            Best Performing Framework: {topPerformer.framework}
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {topPerformer.suggestions.slice(0, 4).map((suggestion, index) => (
              <div key={index} className="bg-white p-3 rounded border border-yellow-300">
                <div className="font-medium text-sm text-yellow-700">{suggestion.framework}</div>
                <div className="text-xs text-gray-600 mt-1 line-clamp-2">{suggestion.revisedText}</div>
                <div className="text-xs text-green-600 font-semibold mt-1">
                  +{(suggestion.estimated_uplift * 100).toFixed(1)}pp
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MCPComparisonTable; 