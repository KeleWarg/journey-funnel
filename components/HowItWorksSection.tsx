import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ChevronDown, ChevronUp, Info, Target, Brain, BarChart3, Upload, Zap } from 'lucide-react';

const HowItWorksSection: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="relative bg-gradient-to-br from-white/90 via-gray-100/80 to-gray-200/70 backdrop-blur-xl border border-white/20 shadow-md">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10"></div>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="relative cursor-pointer hover:bg-white/30 transition-colors backdrop-blur-sm py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-gray-700" />
                <CardTitle className="text-lg bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">How It Works</CardTitle>
              </div>
              <Button variant="ghost" size="sm" className="text-gray-700 hover:bg-white/40 backdrop-blur-sm border border-white/30 h-8 px-3">
                {isOpen ? (
                  <>
                    Hide Details <ChevronUp className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    Learn More <ChevronDown className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="relative pt-0 space-y-6">
            {/* Overview */}
            <div className="bg-white/40 backdrop-blur-sm rounded-lg p-4 border border-white/30">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Target className="h-5 w-5 text-gray-700" />
                What This Tool Does
              </h3>
              <p className="text-gray-700 leading-relaxed">
                The Lead Gen Funnel Reviewer uses advanced psychological frameworks and AI analysis to optimize your multi-step forms and landing pages. 
                It simulates user behavior through your funnel, identifies friction points, and provides data-driven recommendations to maximize conversion rates.
              </p>
            </div>

            {/* Key Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/40 backdrop-blur-sm rounded-lg p-4 border border-white/30">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Upload className="h-4 w-4 text-green-600" />
                  Data Import
                </h4>
                <p className="text-sm text-gray-600">
                  Upload spreadsheets with your existing funnel data or build steps manually. Supports CSV and Excel formats with flexible column mapping.
                </p>
              </div>

              <div className="bg-white/40 backdrop-blur-sm rounded-lg p-4 border border-white/30">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-600" />
                  AI Analysis
                </h4>
                <p className="text-sm text-gray-600">
                  Uses psychological frameworks (PAS, AIDA, Fogg B=MAT, Cialdini) to analyze each step and provide specific optimization recommendations.
                </p>
              </div>

              <div className="bg-white/40 backdrop-blur-sm rounded-lg p-4 border border-white/30">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  Step Optimization
                </h4>
                <p className="text-sm text-gray-600">
                  Automatically finds the optimal order of your funnel steps using intelligent algorithms and real conversion data.
                </p>
              </div>

              <div className="bg-white/40 backdrop-blur-sm rounded-lg p-4 border border-white/30">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-600" />
                  Landing Pages
                </h4>
                <p className="text-sm text-gray-600">
                  Optimize landing page content with fold-based analysis, providing specific recommendations for headlines, CTAs, and copy.
                </p>
              </div>
            </div>

            {/* How Weights Work */}
            <div className="bg-white/40 backdrop-blur-sm rounded-lg p-4 border border-white/30">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Understanding the Weights System</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Step Complexity Weights (c1, c2, c3)</h4>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4">
                    <li><strong>c1:</strong> Question Type complexity (toggle vs text input)</li>
                    <li><strong>c2:</strong> Information invasiveness (email vs personal details)</li>
                    <li><strong>c3:</strong> Cognitive difficulty (easy vs complex questions)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Page Score Weights (w_c, w_f)</h4>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4">
                    <li><strong>w_c:</strong> How much step complexity affects user dropout</li>
                    <li><strong>w_f:</strong> How much user fatigue affects dropout over time</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Entry Motivation Weights (w_E, w_N)</h4>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4">
                    <li><strong>w_E:</strong> How much user excitement/interest drives initial motivation</li>
                    <li><strong>w_N:</strong> How much perceived need/urgency drives motivation</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Getting Started */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <h3 className="text-lg font-semibold text-green-900 mb-3">Getting Started</h3>
              <ol className="text-sm text-green-800 space-y-2">
                <li><strong>1.</strong> Set your funnel category and basic parameters (excitement, need, traffic source)</li>
                <li><strong>2.</strong> Either upload a spreadsheet with existing data or manually create journey steps</li>
                <li><strong>3.</strong> Configure each step with questions, input types, and difficulty ratings</li>
                <li><strong>4.</strong> Run the complete analysis to get AI-powered optimization recommendations</li>
                <li><strong>5.</strong> Apply suggested step reordering and content improvements</li>
                <li><strong>6.</strong> Use the landing page tab to optimize your page content with the same frameworks</li>
              </ol>
            </div>

            {/* Advanced Features */}
            <div className="bg-white/40 backdrop-blur-sm rounded-lg p-4 border border-white/30">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Advanced Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Fogg B=MAT Analysis</h4>
                  <p>Uses Behavior = Motivation × Ability × Trigger framework for intelligent step ordering</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Back-solve Optimization</h4>
                  <p>Automatically finds optimal weight parameters based on your observed conversion rates</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Enhanced MCP Analysis</h4>
                  <p>Runs multiple psychological frameworks simultaneously for comprehensive optimization</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Export & Share</h4>
                  <p>Export results as JSON or PDF reports for team collaboration and implementation</p>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default HowItWorksSection; 