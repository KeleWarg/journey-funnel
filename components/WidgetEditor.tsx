import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Textarea } from '@components/ui/textarea';
import { Label } from '@components/ui/label';
import { PlusIcon, Trash2Icon, GripVerticalIcon, ChevronDownIcon, ChevronUpIcon, SparklesIcon } from 'lucide-react';

interface Widget {
  id: string;
  heading: string;
  subheading?: string;
  textInputPlaceholder: string;
  ctaCopy: string;
  supportTexts: string[];
}

interface WidgetContent {
  widgets: Widget[];
}

interface WidgetEditorProps {
  content: WidgetContent;
  onContentChange: (content: WidgetContent) => void;
  onRunContentAnalysis: () => void;
  isAnalyzing: boolean;
  categoryTitle: string;
  onCategoryTitleChange: (title: string) => void;
}

const WidgetEditor: React.FC<WidgetEditorProps> = ({
  content,
  onContentChange,
  onRunContentAnalysis,
  isAnalyzing,
  categoryTitle,
  onCategoryTitleChange
}) => {
  const [expandedWidgets, setExpandedWidgets] = useState<Set<string>>(new Set());

  const toggleWidgetExpansion = (widgetId: string) => {
    const newExpanded = new Set(expandedWidgets);
    if (newExpanded.has(widgetId)) {
      newExpanded.delete(widgetId);
    } else {
      newExpanded.add(widgetId);
    }
    setExpandedWidgets(newExpanded);
  };

  const addWidget = () => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      heading: '',
      subheading: '',
      textInputPlaceholder: '',
      ctaCopy: '',
      supportTexts: []
    };
    
    onContentChange({
      widgets: [...content.widgets, newWidget]
    });
    
    // Auto-expand the new widget
    setExpandedWidgets(prev => new Set([...prev, newWidget.id]));
  };

  const removeWidget = (widgetId: string) => {
    onContentChange({
      widgets: content.widgets.filter(widget => widget.id !== widgetId)
    });
    
    // Remove from expanded set
    const newExpanded = new Set(expandedWidgets);
    newExpanded.delete(widgetId);
    setExpandedWidgets(newExpanded);
  };

  const updateWidget = (widgetId: string, updates: Partial<Widget>) => {
    onContentChange({
      widgets: content.widgets.map(widget =>
        widget.id === widgetId ? { ...widget, ...updates } : widget
      )
    });
  };

  const addSupportText = (widgetId: string) => {
    const widget = content.widgets.find(w => w.id === widgetId);
    if (widget) {
      updateWidget(widgetId, {
        supportTexts: [...widget.supportTexts, '']
      });
    }
  };

  const removeSupportText = (widgetId: string, index: number) => {
    const widget = content.widgets.find(w => w.id === widgetId);
    if (widget) {
      updateWidget(widgetId, {
        supportTexts: widget.supportTexts.filter((_, i) => i !== index)
      });
    }
  };

  const updateSupportText = (widgetId: string, index: number, text: string) => {
    const widget = content.widgets.find(w => w.id === widgetId);
    if (widget) {
      const newSupportTexts = [...widget.supportTexts];
      newSupportTexts[index] = text;
      updateWidget(widgetId, {
        supportTexts: newSupportTexts
      });
    }
  };

  const hasContent = content.widgets.length > 0 && content.widgets.some(widget => 
    widget.heading.trim() || widget.subheading?.trim() || widget.textInputPlaceholder.trim() || widget.ctaCopy.trim()
  );

  return (
    <div className="space-y-6">
      {/* Header with Category and Analysis Button */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <Label htmlFor="category-title" className="text-sm font-medium text-gray-700 mb-2 block">
                Widget Category/Type
              </Label>
              <Input
                id="category-title"
                value={categoryTitle}
                onChange={(e) => onCategoryTitleChange(e.target.value)}
                placeholder="e.g., Lead Capture Widget, Newsletter Signup, Contact Form..."
                className="border-gray-300 focus:border-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Helps the AI understand the context and purpose of your widgets for better analysis
              </p>
            </div>
            
            <Button
              onClick={onRunContentAnalysis}
              disabled={!hasContent || isAnalyzing}
              className="bg-purple-600 hover:bg-purple-700 text-white min-w-[140px]"
            >
              {isAnalyzing ? (
                <>
                  <SparklesIcon className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Add Widget Button */}
      <div className="flex justify-center">
        <Button
          onClick={addWidget}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Widget
        </Button>
      </div>

      {/* Widgets List */}
      {content.widgets.map((widget, index) => {
        const isExpanded = expandedWidgets.has(widget.id);
        
        return (
          <Card key={widget.id} className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <GripVerticalIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <CardTitle className="text-base font-medium text-gray-900">
                      Widget {index + 1}
                      {widget.heading && (
                        <span className="text-sm font-normal text-gray-600 ml-2">
                          - {widget.heading.substring(0, 50)}{widget.heading.length > 50 ? '...' : ''}
                        </span>
                      )}
                    </CardTitle>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => toggleWidgetExpansion(widget.id)}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {isExpanded ? (
                      <ChevronUpIcon className="h-4 w-4" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4" />
                    )}
                  </Button>
                  
                  {content.widgets.length > 1 && (
                    <Button
                      onClick={() => removeWidget(widget.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="space-y-4">
                {/* Heading */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Heading *
                  </Label>
                  <Input
                    value={widget.heading}
                    onChange={(e) => updateWidget(widget.id, { heading: e.target.value })}
                    placeholder="Main heading for your widget..."
                    className="border-gray-300 focus:border-purple-500"
                  />
                </div>

                {/* Subheading */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Subheading
                  </Label>
                  <Input
                    value={widget.subheading || ''}
                    onChange={(e) => updateWidget(widget.id, { subheading: e.target.value })}
                    placeholder="Optional subheading or description..."
                    className="border-gray-300 focus:border-purple-500"
                  />
                </div>

                {/* Text Input Placeholder */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Text Input Placeholder *
                  </Label>
                  <Input
                    value={widget.textInputPlaceholder}
                    onChange={(e) => updateWidget(widget.id, { textInputPlaceholder: e.target.value })}
                    placeholder="Placeholder text for the input field..."
                    className="border-gray-300 focus:border-purple-500"
                  />
                </div>

                {/* CTA Copy */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    CTA Button Copy *
                  </Label>
                  <Input
                    value={widget.ctaCopy}
                    onChange={(e) => updateWidget(widget.id, { ctaCopy: e.target.value })}
                    placeholder="Text for your call-to-action button..."
                    className="border-gray-300 focus:border-purple-500"
                  />
                </div>

                {/* Support Texts */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">
                      Support Text
                    </Label>
                    <Button
                      onClick={() => addSupportText(widget.id)}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      <PlusIcon className="h-3 w-3 mr-1" />
                      Add Support Text
                    </Button>
                  </div>
                  
                  {widget.supportTexts.map((text, textIndex) => (
                    <div key={textIndex} className="flex gap-2">
                      <Textarea
                        value={text}
                        onChange={(e) => updateSupportText(widget.id, textIndex, e.target.value)}
                        placeholder="Additional support text, disclaimers, or explanatory content..."
                        rows={2}
                        className="border-gray-300 focus:border-purple-500 resize-none flex-1"
                      />
                      <Button
                        onClick={() => removeSupportText(widget.id, textIndex)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 self-start"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {widget.supportTexts.length === 0 && (
                    <p className="text-xs text-gray-500 italic">
                      No support text added. Click "Add Support Text" to include additional content.
                    </p>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Empty State */}
      {content.widgets.length === 0 && (
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <SparklesIcon className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No widgets yet
            </h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              Create your first widget to start building optimized components. Each widget can include headings, input fields, CTAs, and support text.
            </p>
            <Button
              onClick={addWidget}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create First Widget
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Requirements Notice */}
      {content.widgets.length > 0 && (
        <Card className="border border-blue-200 bg-blue-50">
          <CardContent className="py-3">
            <p className="text-sm text-blue-800">
              <strong>Analysis Requirements:</strong> Each widget needs at least a heading and CTA copy to be analyzed. 
              The AI will evaluate your widget content using the same psychological frameworks as landing pages.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WidgetEditor; 