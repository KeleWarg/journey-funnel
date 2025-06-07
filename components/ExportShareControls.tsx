import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';
import { DownloadIcon, ShareIcon, FileTextIcon } from 'lucide-react';
import { BacksolveResult, SimulationData, JourneyConstants, Step } from '../types';

interface JourneyPayload extends JourneyConstants {
  steps: Step[];
  k_override?: number;
  gamma_exit_override?: number;
  epsilon_override?: number;
}

interface ExportShareControlsProps {
  buildPayload: () => JourneyPayload;
  simulationData: SimulationData | null;
  backsolveResult: BacksolveResult | null;
  optimalPositions: Record<number, number>;
  llmCache: Record<string, string>;
}

const ExportShareControls: React.FC<ExportShareControlsProps> = ({
  buildPayload,
  simulationData,
  backsolveResult,
  optimalPositions,
  llmCache
}) => {
  const { toast } = useToast();

  const downloadJSON = () => {
    try {
      const data = {
        configuration: buildPayload(),
        results: {
          simulation: simulationData,
          backsolve: backsolveResult,
          optimization: { optimalPositions },
          llmRecommendations: llmCache
        },
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `journey-calculator-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Funnel configuration and results downloaded successfully"
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "Unable to generate download file",
        variant: "destructive"
      });
    }
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Shareable link copied to clipboard"
      });
    } catch (error) {
      console.error('Copy failed:', error);
      toast({
        title: "Copy Failed",
        description: "Unable to copy link to clipboard",
        variant: "destructive"
      });
    }
  };

  const downloadPDF = () => {
    // Placeholder for PDF generation
    toast({
      title: "PDF Export",
      description: "PDF export feature coming soon",
      variant: "default"
    });
  };

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Export & Share
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-wrap gap-4">
          
          {/* Download JSON */}
          <Button
            onClick={downloadJSON}
            className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900"
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            Download Funnel JSON
          </Button>

          {/* Copy Share Link */}
          <Button
            onClick={copyShareLink}
            variant="outline"
            className="text-gray-600 border-gray-300 hover:bg-gray-50"
          >
            <ShareIcon className="h-4 w-4 mr-2" />
            Copy Shareable Link
          </Button>

          {/* Download PDF (placeholder) */}
          <Button
            onClick={downloadPDF}
            variant="outline"
            className="text-indigo-600 border-indigo-300 hover:bg-indigo-50"
          >
            <FileTextIcon className="h-4 w-4 mr-2" />
            Download PDF Report
          </Button>

        </div>

        <p className="mt-3 text-sm text-gray-600">
          Export your funnel configuration and analysis results, or share a link to this session.
        </p>

      </CardContent>
    </Card>
  );
};

export default ExportShareControls;
