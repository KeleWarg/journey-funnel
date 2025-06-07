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
              <div className="text-xs text-gray-400 normal-case">User desire</div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ability
              <div className="text-xs text-gray-400 normal-case">Ease of use</div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Trigger
              <div className="text-xs text-gray-400 normal-case">Call to action</div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fogg Score
              <div className="text-xs text-gray-400 normal-case">M × A × T</div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((row, index) => (
            <tr key={row.stepIndex} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Step {row.stepIndex + 1}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div className="flex items-center">
                  <span className="font-semibold">{row.motivation.toFixed(1)}</span>
                  <div className="ml-2 flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full mr-1 ${
                          i <= row.motivation ? 'bg-blue-500' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div className="flex items-center">
                  <span className="font-semibold">{row.ability.toFixed(1)}</span>
                  <div className="ml-2 flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full mr-1 ${
                          i <= row.ability ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div className="flex items-center">
                  <span className="font-semibold">{row.trigger.toFixed(1)}</span>
                  <div className="ml-2 flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full mr-1 ${
                          i <= row.trigger ? 'bg-purple-500' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div className="flex items-center">
                  <span className="font-bold text-lg text-indigo-600">
                    {row.fogg_score.toFixed(1)}
                  </span>
                  <div className="ml-2 text-xs text-gray-500">
                    {row.motivation.toFixed(1)} × {row.ability.toFixed(1)} × {row.trigger.toFixed(1)}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FogMetricsTable; 