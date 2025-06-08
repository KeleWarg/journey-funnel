import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Question } from '../types';

interface ResultsTableProps {
  steps: {
    questions: Question[];
    observedCR: number;
  }[];
  simulationData: {
    predictedSteps: { CR_s: number }[];
    CR_total: number;
    bestCR?: number;
  };
  optimalPositions: Record<number, number>;
  llmCache: Record<string, string>;
  setLlmCache: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  llmAssessmentResult?: {
    assessments: Array<{
      stepIndex: number;
      estimated_uplift: number;
    }>;
  } | null;
}

const ResultsTable: React.FC<ResultsTableProps> = ({
  steps,
  simulationData,
  optimalPositions,
  llmCache,
  setLlmCache,
  llmAssessmentResult
}) => {

  
  // Fetch LLM recommendations for each question
  useEffect(() => {
    // DISABLED: LLM recommendations require OpenAI API key configuration
    // For now, we'll show a placeholder message
    if (!steps || steps.length === 0 || !simulationData) {
      return;
    }

    // Set placeholder messages for all questions
    const placeholderMessages: Record<string, string> = {};
    steps.forEach((step, stepIndex) => {
      if (step && step.questions) {
        step.questions.forEach((question, questionIndex) => {
          const cacheKey = `${stepIndex}-${questionIndex}`;
          placeholderMessages[cacheKey] = 'LLM recommendations require OpenAI API configuration';
        });
          }
    });

    setLlmCache(placeholderMessages);
  }, [steps, simulationData, setLlmCache]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 Simulation Results</h3>
      
      {/* Overall CR Summary */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">🎯 Overall Conversion Rates</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="text-sm text-gray-600">Overall Predicted CR</div>
            <div className="text-2xl font-bold text-green-700">
              {(simulationData.CR_total * 100).toFixed(2)}%
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="text-sm text-gray-600">Overall Observed CR</div>
            <div className="text-2xl font-bold text-blue-700">
              {(steps.reduce((product, step) => product * step.observedCR, 1) * 100).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

    <div className="overflow-x-auto">
                <table className="w-full border-collapse border-2 border-gray-800">
        
        {/* Table Header */}
          <thead className="bg-blue-50">
          <tr>
              <th className="border-2 border-gray-800 px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Step
            </th>
              <th className="border-2 border-gray-800 px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Question Details
            </th>
              <th className="border-2 border-gray-800 px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Observed CR
            </th>
              <th className="border-2 border-gray-800 px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Predicted CR
            </th>
              <th className="border-2 border-gray-800 px-4 py-3 text-left text-sm font-semibold text-gray-900">
                LLM Improvement
              </th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody>
          {steps.map((step, stepIndex) => (
            <tr key={stepIndex} className="hover:bg-blue-50 even:bg-gray-50">
              
              {/* Step Number */}
              <td className="border-2 border-gray-800 px-4 py-3 text-center text-sm font-medium">
                {stepIndex + 1}
              </td>

              {/* Question Details */}
              <td className="border-2 border-gray-800 px-4 py-3 text-sm max-w-xs">
                <div className="space-y-3">
                  {step.questions.map((question, questionIndex) => {
                    // Get input type label
                    const getInputTypeLabel = (inputType: string) => {
                      const types = {
                        '1': 'Toggle/Yes-No',
                        '2': 'Single Dropdown', 
                        '3': 'Multi-select/Slider',
                        '4': 'Calendar/Upload',
                        '5': 'Open Text Field'
                      };
                      return types[inputType as keyof typeof types] || `Type ${inputType}`;
                    };

                    return (
                      <div key={questionIndex} className="p-2 bg-gray-50 rounded border">
                        <div className="font-medium text-sm text-gray-900 mb-1">
                          Q{questionIndex + 1}: {question.title}
                        </div>
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-blue-700">Type:</span>
                            <span className="text-gray-700">{getInputTypeLabel(question.input_type)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-orange-700">Invasiveness:</span>
                            <span className="text-gray-700">{question.invasiveness}/5</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-purple-700">Difficulty:</span>
                            <span className="text-gray-700">{question.difficulty}/5</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </td>

              {/* Observed CR */}
              <td className="border-2 border-gray-800 px-4 py-3 text-center text-sm font-mono font-semibold text-blue-700">
                {(step.observedCR * 100).toFixed(2)}%
              </td>

              {/* Predicted CR */}
              <td className="border-2 border-gray-800 px-4 py-3 text-center text-sm font-mono font-semibold text-green-700">
                {simulationData.predictedSteps[stepIndex] 
                  ? (simulationData.predictedSteps[stepIndex].CR_s * 100).toFixed(2) + '%'
                  : '—'
                }
              </td>

              {/* LLM Improvement */}
              <td className="border-2 border-gray-800 px-4 py-3 text-center text-sm font-mono font-semibold text-purple-700">
                {(() => {
                  if (!llmAssessmentResult) return '—';
                  const assessment = llmAssessmentResult.assessments.find(a => a.stepIndex === stepIndex);
                  if (!assessment) return '—';
                  return `+${(assessment.estimated_uplift * 100).toFixed(1)}pp`;
                })()}
              </td>

            </tr>
          ))}
        </tbody>

      </table>
      </div>


    </div>
  );
};

export default ResultsTable;
