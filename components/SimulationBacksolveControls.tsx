
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Loader2Icon } from 'lucide-react';

interface SimulationBacksolveControlsProps {
  onRunSimulation: () => void;
  onRunBacksolve: () => void;
  isSimulating: boolean;
  isBacksolving: boolean;
  canRunSimulation: boolean;
  canRunBacksolve: boolean;
}

const SimulationBacksolveControls: React.FC<SimulationBacksolveControlsProps> = ({
  onRunSimulation,
  onRunBacksolve,
  isSimulating,
  isBacksolving,
  canRunSimulation,
  canRunBacksolve
}) => {
  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Run Analysis
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4">
          
          {/* Run Simulation Button */}
          <Button
            onClick={onRunSimulation}
            disabled={!canRunSimulation || isSimulating}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSimulating ? (
              <>
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                Running Simulation...
              </>
            ) : (
              'Run Simulation'
            )}
          </Button>

          {/* Run Back-solve Button */}
          <Button
            onClick={onRunBacksolve}
            disabled={!canRunBacksolve || isBacksolving}
            className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isBacksolving ? (
              <>
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                Running Back-Solve...
              </>
            ) : (
              'Run Back-Solve'
            )}
          </Button>

        </div>

        {/* Help Text */}
        <div className="mt-4 space-y-2 text-sm text-gray-600">
          {!canRunSimulation && (
            <p className="text-red-600">
              Fill in all required fields (question text and input types) to enable simulation.
            </p>
          )}
          {!canRunBacksolve && (
            <p className="text-orange-600">
              Enter observed CR values for each step to enable back-solve.
            </p>
          )}
          <p>
            <strong>Simulation:</strong> Predicts conversion rates based on your funnel configuration.
          </p>
          <p>
            <strong>Back-Solve:</strong> Finds optimal constants that best match your observed conversion rates.
          </p>
        </div>

      </CardContent>
    </Card>
  );
};

export default SimulationBacksolveControls;
