import React from 'react';

interface FogMetric {
  stepIndex: number;
  motivation: number;
  ability: number;
  trigger: number;
  fogg_score: number;
  complexity?: number;
}

interface FogMetricsTableProps {
  rows: FogMetric[];
}

const FogMetricsTable: React.FC<FogMetricsTableProps> = ({ rows }) => {
  if (!rows || rows.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No Fogg metrics available. Run MCP Analysis with Fogg framework to see results.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Step
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Motivation
              <div className="text-xs text-gray-400 normal-case">User desire (1-5)</div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ability
              <div className="text-xs text-gray-400 normal-case">Ease of use (1-5)</div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Trigger
              <div className="text-xs text-gray-400 normal-case">Call to action (1-5)</div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fogg Score
              <div className="text-xs text-gray-400 normal-case">M × A × T (1-125)</div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((row) => (
            <tr key={row.stepIndex}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Step {row.stepIndex + 1}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className="font-mono">{row.motivation.toFixed(1)}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className="font-mono">{row.ability.toFixed(1)}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className="font-mono">{row.trigger.toFixed(1)}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className="font-mono font-medium text-indigo-600">{row.fogg_score.toFixed(1)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FogMetricsTable; 