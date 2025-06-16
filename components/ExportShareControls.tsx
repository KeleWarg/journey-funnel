import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';
import { DownloadIcon, ShareIcon, FileTextIcon, Loader2Icon } from 'lucide-react';
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
  const [isGeneratingPDF, setIsGeneratingPDF] = React.useState(false);

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
      a.download = `lead-gen-funnel-reviewer-${Date.now()}.json`;
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
    const url = window.location.href;
    
    try {
      // Check if modern Clipboard API is available
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Link Copied",
          description: "Shareable link copied to clipboard"
        });
        return;
      }
      
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        toast({
          title: "Link Copied",
          description: "Shareable link copied to clipboard"
        });
      } else {
        throw new Error('execCommand failed');
      }
      
    } catch (error) {
      console.error('Copy failed:', error);
      
      // Final fallback - show the URL for manual copying
      const message = `Please copy this link manually: ${url}`;
      toast({
        title: "Copy Failed",
        description: "Link displayed below for manual copying",
        variant: "destructive"
      });
      
      // Also log to console for easy copying
      console.log('Shareable link:', url);
      
      // Show a prompt as additional fallback
      if (window.prompt) {
        window.prompt('Copy this link:', url);
      }
    }
  };

  const downloadPDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      // Dynamic imports to avoid SSR issues
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;
      
      toast({
        title: "Generating PDF",
        description: "Capturing analysis content...",
      });

      // Find the main content area to capture
      const element = document.querySelector('.lead-gen-funnel-reviewer-content') || 
                     document.querySelector('main') || 
                     document.body;

      if (!element) {
        throw new Error('Could not find content to export');
      }

      // Capture the content as canvas
      const canvas = await html2canvas(element as HTMLElement, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Calculate dimensions to fit the page
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20; // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10; // Top margin

      // Add title page info
      pdf.setFontSize(16);
      pdf.text('Journey Funnel Analysis Report', pageWidth / 2, position, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, position + 10, { align: 'center' });
      
      position += 20;

      // Add the captured content
      if (imgHeight <= pageHeight - position - 10) {
        // Content fits on one page
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      } else {
        // Content needs multiple pages
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - position - 10);

        while (heightLeft > 0) {
          pdf.addPage();
          position = 10; // Reset to top margin for new page
          pdf.addImage(imgData, 'PNG', 10, position - imgHeight + (pageHeight - position - 10), imgWidth, imgHeight);
          heightLeft -= (pageHeight - 20);
        }
      }

      // Save the PDF
      const filename = `journey-funnel-report-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

      toast({
        title: "PDF Generated",
        description: `Report saved as ${filename}`,
      });

    } catch (error) {
      console.error('PDF generation failed:', error);
      toast({
        title: "PDF Generation Failed",
        description: error instanceof Error ? error.message : "Unable to generate PDF report",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPDF(false);
    }
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

          {/* Download PDF */}
          <Button
            onClick={downloadPDF}
            disabled={isGeneratingPDF}
            variant="outline"
            className="text-indigo-600 border-indigo-300 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingPDF ? (
              <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileTextIcon className="h-4 w-4 mr-2" />
            )}
            {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF Report'}
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
