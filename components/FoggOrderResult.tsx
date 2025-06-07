import React from 'react';

interface FoggOrderResultProps {
  order: number[];
  CR_total: number;
  uplift_pp: number;
  onApplyOrder?: (order: number[]) => void;
}

const FoggOrderResult: React.FC<FoggOrderResultProps> = ({ 
  order, 
  CR_total, 
  uplift_pp, 
  onApplyOrder 
}) => {
  if (!order || order.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No Fogg-BM order recommendation available.
      </div>
    );
  }

  const isPositiveUplift = uplift_pp > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          🧠 Fogg Behavior Model Order
        </h3>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isPositiveUplift 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {isPositiveUplift ? '+' : ''}{uplift_pp.toFixed(2)}pp
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Recommended Order */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Recommended Step Order (by Fogg Score)
          </h4>
          <div className="flex flex-wrap gap-2">
            {order.map((stepIndex, position) => (
              <div 
                key={stepIndex}
                className="flex items-center bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2"
              >
                <span className="text-xs text-indigo-600 font-medium mr-2">
                  {position + 1}.
                </span>
                <span className="text-sm font-medium text-indigo-800">
                  Step {stepIndex + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion Rate Projection */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Projected Conversion Rate</div>
              <div className="text-2xl font-bold text-gray-900">
                {(CR_total * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Expected Uplift</div>
              <div className={`text-2xl font-bold ${
                isPositiveUplift ? 'text-green-600' : 'text-gray-600'
              }`}>
                {isPositiveUplift ? '+' : ''}{uplift_pp.toFixed(2)} pp
              </div>
            </div>
          </div>
        </div>

        {/* Fogg Model Explanation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="text-sm font-medium text-blue-800 mb-2">
            About Fogg Behavior Model
          </h5>
          <p className="text-sm text-blue-700">
            This order is optimized based on the Fogg Behavior Model (B = MAT), where 
            steps with higher combined scores for <strong>Motivation</strong>, <strong>Ability</strong>, 
            and <strong>Trigger</strong> are placed earlier in the funnel to maximize conversion potential.
          </p>
        </div>

        {/* Apply Order Button */}
        {onApplyOrder && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => onApplyOrder(order)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              <span>Apply Fogg-BM Order</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoggOrderResult; 