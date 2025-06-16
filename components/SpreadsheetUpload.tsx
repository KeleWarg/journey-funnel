import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface SpreadsheetData {
  headers: string[];
  rows: any[][];
  fileName: string;
}

interface ColumnMapping {
  stepName: string;
  conversionRate: string;
  questions: string;
  inputType: string;
  invasiveness: string;
  difficulty: string;
}

interface ParsedStepData {
  stepName: string;
  conversionRate: number;
  questions: Array<{
    title: string;
    input_type: string;
    invasiveness: number;
    difficulty: number;
  }>;
}

interface SpreadsheetUploadProps {
  onDataImported: (steps: ParsedStepData[]) => void;
  onClose: () => void;
}

const SpreadsheetUpload: React.FC<SpreadsheetUploadProps> = ({ onDataImported, onClose }) => {
  const [uploadedData, setUploadedData] = useState<SpreadsheetData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    stepName: '',
    conversionRate: '',
    questions: '',
    inputType: '',
    invasiveness: '',
    difficulty: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ParsedStepData[]>([]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      // Parse CSV file
      Papa.parse(file, {
        header: false,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError(`CSV parsing error: ${results.errors[0].message}`);
            setIsProcessing(false);
            return;
          }

          const data = results.data as string[][];
          if (data.length < 2) {
            setError('CSV file must have at least a header row and one data row');
            setIsProcessing(false);
            return;
          }

          setUploadedData({
            headers: data[0],
            rows: data.slice(1),
            fileName: file.name
          });
          setIsProcessing(false);
        },
        error: (error) => {
          setError(`Failed to parse CSV: ${error.message}`);
          setIsProcessing(false);
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Parse Excel file
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          if (jsonData.length < 2) {
            setError('Excel file must have at least a header row and one data row');
            setIsProcessing(false);
            return;
          }

          setUploadedData({
            headers: jsonData[0],
            rows: jsonData.slice(1),
            fileName: file.name
          });
          setIsProcessing(false);
        } catch (error) {
          setError(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      setIsProcessing(false);
    }
  }, []);

  const handleColumnMappingChange = (field: keyof ColumnMapping, value: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generatePreview = useCallback(() => {
    if (!uploadedData || !columnMapping.stepName || !columnMapping.conversionRate) {
      return;
    }

    try {
      const stepNameIndex = uploadedData.headers.indexOf(columnMapping.stepName);
      const conversionRateIndex = uploadedData.headers.indexOf(columnMapping.conversionRate);
      const questionsIndex = columnMapping.questions ? uploadedData.headers.indexOf(columnMapping.questions) : -1;
      const inputTypeIndex = columnMapping.inputType ? uploadedData.headers.indexOf(columnMapping.inputType) : -1;
      const invasivenessIndex = columnMapping.invasiveness ? uploadedData.headers.indexOf(columnMapping.invasiveness) : -1;
      const difficultyIndex = columnMapping.difficulty ? uploadedData.headers.indexOf(columnMapping.difficulty) : -1;

      const parsedSteps: ParsedStepData[] = uploadedData.rows
        .filter(row => row[stepNameIndex] && row[conversionRateIndex])
        .map((row, index) => {
          const stepName = String(row[stepNameIndex] || `Step ${index + 1}`);
          const conversionRateValue = row[conversionRateIndex];
          
          // Parse conversion rate (handle percentages and decimals)
          let conversionRate: number;
          if (typeof conversionRateValue === 'string') {
            const cleanValue = conversionRateValue.replace('%', '');
            conversionRate = parseFloat(cleanValue);
            if (conversionRate > 1) {
              conversionRate = conversionRate / 100; // Convert percentage to decimal
            }
          } else {
            conversionRate = Number(conversionRateValue);
          }

          // Parse questions (split by comma or semicolon if multiple)
          const questionsText = questionsIndex >= 0 ? String(row[questionsIndex] || '') : '';
          const questionTitles = questionsText ? questionsText.split(/[,;]/).map(q => q.trim()).filter(q => q) : [`${stepName} Question`];

          // Parse other fields with defaults
          const inputType = inputTypeIndex >= 0 ? String(row[inputTypeIndex] || '2') : '2';
          const invasiveness = invasivenessIndex >= 0 ? Number(row[invasivenessIndex]) || 2 : 2;
          const difficulty = difficultyIndex >= 0 ? Number(row[difficultyIndex]) || 2 : 2;

          return {
            stepName,
            conversionRate: Math.max(0, Math.min(1, conversionRate)), // Clamp between 0 and 1
            questions: questionTitles.map(title => ({
              title,
              input_type: inputType,
              invasiveness: Math.max(1, Math.min(5, invasiveness)),
              difficulty: Math.max(1, Math.min(5, difficulty))
            }))
          };
        });

      setPreviewData(parsedSteps);
      setError(null);
    } catch (error) {
      setError(`Failed to parse data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [uploadedData, columnMapping]);

  const handleImport = () => {
    if (previewData.length === 0) {
      setError('No valid data to import. Please check your column mappings.');
      return;
    }

    onDataImported(previewData);
    onClose();
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Step Name', 'Conversion Rate', 'Questions', 'Input Type', 'Invasiveness', 'Difficulty'],
      ['Email Capture', '0.85', 'What is your email address?', '2', '3', '2'],
      ['Phone Number', '0.72', 'What is your phone number?', '2', '4', '2'],
      ['Personal Info', '0.68', 'What is your name?;What is your age?', '2', '2', '1'],
      ['Payment Info', '0.45', 'Enter your credit card details', '4', '5', '4']
    ];

    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'funnel-data-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Import Funnel Data</h2>
          <p className="text-gray-600">Upload a spreadsheet to automatically populate your journey steps</p>
        </div>
        <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download Template
        </Button>
      </div>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Spreadsheet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Choose CSV or Excel file</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Supported formats: CSV, Excel (.xlsx, .xls)
              </p>
            </div>

            {isProcessing && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Processing file...</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {uploadedData && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Successfully loaded {uploadedData.fileName} with {uploadedData.headers.length} columns and {uploadedData.rows.length} rows
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Column Mapping */}
      {uploadedData && (
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
            <p className="text-sm text-gray-600">
              Map your spreadsheet columns to journey step fields. Required fields are marked with *
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="step-name">Step Name *</Label>
                <Select value={columnMapping.stepName} onValueChange={(value) => handleColumnMappingChange('stepName', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column for step names" />
                  </SelectTrigger>
                  <SelectContent>
                    {uploadedData.headers.map((header, index) => (
                      <SelectItem key={index} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="conversion-rate">Conversion Rate *</Label>
                <Select value={columnMapping.conversionRate} onValueChange={(value) => handleColumnMappingChange('conversionRate', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column for conversion rates" />
                  </SelectTrigger>
                  <SelectContent>
                    {uploadedData.headers.map((header, index) => (
                      <SelectItem key={index} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="questions">Questions</Label>
                <Select value={columnMapping.questions} onValueChange={(value) => handleColumnMappingChange('questions', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column for questions (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {uploadedData.headers.map((header, index) => (
                      <SelectItem key={index} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="input-type">Input Type</Label>
                <Select value={columnMapping.inputType} onValueChange={(value) => handleColumnMappingChange('inputType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column for input types (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {uploadedData.headers.map((header, index) => (
                      <SelectItem key={index} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="invasiveness">Invasiveness</Label>
                <Select value={columnMapping.invasiveness} onValueChange={(value) => handleColumnMappingChange('invasiveness', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column for invasiveness (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {uploadedData.headers.map((header, index) => (
                      <SelectItem key={index} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select value={columnMapping.difficulty} onValueChange={(value) => handleColumnMappingChange('difficulty', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column for difficulty (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {uploadedData.headers.map((header, index) => (
                      <SelectItem key={index} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4">
              <Button 
                onClick={generatePreview} 
                disabled={!columnMapping.stepName || !columnMapping.conversionRate}
                className="w-full"
              >
                Generate Preview
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview ({previewData.length} steps)</CardTitle>
            <p className="text-sm text-gray-600">
              Review the parsed data before importing
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {previewData.map((step, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{step.stepName}</h4>
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {(step.conversionRate * 100).toFixed(1)}% CR
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p><strong>Questions:</strong> {step.questions.map(q => q.title).join(', ')}</p>
                    <p><strong>Input Types:</strong> {step.questions.map(q => q.input_type).join(', ')}</p>
                    <p><strong>Invasiveness:</strong> {step.questions.map(q => q.invasiveness).join(', ')}</p>
                    <p><strong>Difficulty:</strong> {step.questions.map(q => q.difficulty).join(', ')}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleImport} className="flex-1">
                Import {previewData.length} Steps
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SpreadsheetUpload; 