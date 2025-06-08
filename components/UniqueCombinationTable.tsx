import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Badge } from '@components/ui/badge';

interface UniqueCombination {
  step_order: number[];
  best_CR_total: number;
  uplift_pp: number;
  frameworks?: string[];
  suggestions?: string[];
  is_seeded_order?: boolean;
}

interface UniqueCombinationTableProps {
  combinations: UniqueCombination[];
  seededOrder?: number[] | null;
  baselineCR: number;
}

const UniqueCombinationTable: React.FC<UniqueCombinationTableProps> = ({
  combinations,
  seededOrder,
  baselineCR
}) => {
  if (!combinations || combinations.length === 0) {
    return null;
  }

  const formatOrderArray = (order: number[]) => {
    return order.map(stepIndex => `Step ${stepIndex + 1}`).join(' → ');
  };

  const isSeededOrder = (order: number[]) => {
    return seededOrder && JSON.stringify(order) === JSON.stringify(seededOrder);
  };

  // Sort combinations by CR_total descending
  const sortedCombinations = [...combinations].sort((a, b) => b.best_CR_total - a.best_CR_total);

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          🎯 Unique Step Order Combinations
        </CardTitle>
        <p className="text-sm text-gray-600">
          Top performing step orderings discovered during optimization
        </p>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-700">Rank</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Step Order</th>
                <th className="text-right py-2 px-3 font-medium text-gray-700">CR Total</th>
                <th className="text-right py-2 px-3 font-medium text-gray-700">Uplift</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Type</th>
              </tr>
            </thead>
            <tbody>
              {sortedCombinations.map((combination, index) => {
                const isSeeded = isSeededOrder(combination.step_order);
                const upliftPP = (combination.best_CR_total - baselineCR) * 100;
                
                return (
                  <tr 
                    key={index} 
                    className={`border-b border-gray-100 ${isSeeded ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">#{index + 1}</span>
                        {isSeeded && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            🌟 Seeded
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-mono text-xs">
                        {formatOrderArray(combination.step_order)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className="font-medium">
                        {(combination.best_CR_total * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className={`font-medium ${upliftPP >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {upliftPP >= 0 ? '+' : ''}{upliftPP.toFixed(2)}pp
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {isSeeded ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          Hybrid Fogg+ELM
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800 text-xs">
                          Random/GA
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {seededOrder && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-blue-900">🧠 Hybrid Seeded Order:</span>
              <span className="font-mono text-xs text-blue-800">
                {formatOrderArray(seededOrder)}
              </span>
            </div>
            <p className="text-xs text-blue-700">
              This order was computed using Fogg Behavior Model (motivation × ability × trigger) 
              combined with ELM elaboration likelihood scores from LLM assessment.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UniqueCombinationTable; 