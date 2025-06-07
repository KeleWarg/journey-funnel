#!/usr/bin/env python3
"""
Fast Journey Funnel MCP Server - Optimized for speed
Reduced API calls with smart batching and faster responses
"""

import asyncio
import json
import os
import logging
from typing import Dict, List, Any
from datetime import datetime

try:
    import openai
    from openai import OpenAI
except ImportError:
    print("OpenAI library not found. Install with: pip install openai")
    exit(1)

try:
    from mcp.server.models import InitializationOptions
    from mcp.server import NotificationOptions, Server
    from mcp.types import Tool, TextContent
    import mcp.types as types
except ImportError:
    print("MCP SDK not found. Install with: pip install mcp")
    exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("journey-funnel-mcp-fast")

# Initialize OpenAI client
openai_client = None
if os.getenv("OPENAI_API_KEY"):
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    logger.info("✅ OpenAI client initialized")
else:
    logger.warning("⚠️ OPENAI_API_KEY not found - using mock responses")

# Simplified framework definitions
FRAMEWORK_FOCUSES = {
    "PAS": "pain points and urgency",
    "Fogg": "reducing friction", 
    "Nielsen": "usability improvements",
    "AIDA": "progressive engagement",
    "Cialdini": "psychological triggers",
    "SCARF": "trust and safety",
    "JTBD": "user outcomes",
    "TOTE": "feedback loops",
    "ELM": "persuasion depth"
}

server = Server("journey-funnel-mcp-fast")

async def generate_fast_analysis(steps: List[Dict], frameworks: List[str]) -> Dict:
    """Generate fast analysis for all steps and frameworks with minimal API calls"""
    
    if not openai_client:
        # Mock response when no OpenAI key
        return create_mock_analysis(steps, frameworks)
    
    # Create a comprehensive prompt for ALL steps and frameworks at once
    steps_text = []
    for i, step in enumerate(steps):
        questions = step.get("questionTexts", step.get("questions", [f"Question {i+1}"]))
        if isinstance(questions[0], dict):
            questions = [q.get("question", f"Question {i+1}") for q in questions]
        elif not isinstance(questions[0], str):
            questions = [str(q) for q in questions]
            
        cr = step.get("observedCR", step.get("CR_s", 0.5))
        steps_text.append(f"Step {i+1}: {', '.join(questions)} (CR: {cr*100:.1f}%)")
    
    frameworks_text = ", ".join([f"{fw} ({FRAMEWORK_FOCUSES[fw]})" for fw in frameworks])
    
    comprehensive_prompt = f"""
You are a conversion optimization expert. Analyze this entire funnel and provide optimization suggestions for each step using multiple frameworks.

FUNNEL STEPS:
{chr(10).join(steps_text)}

FRAMEWORKS TO ANALYZE: {frameworks_text}

For each step and framework combination, provide ONE specific, actionable suggestion. Focus on practical changes.

Respond with valid JSON in this exact format:
{{
  "assessments": [
    {{
      "stepIndex": 0,
      "frameworks": {{
        "PAS": {{"suggestion": "specific suggestion", "reasoning": "why it works", "confidence": 0.8, "estimated_uplift_pp": 2.5}},
        "Fogg": {{"suggestion": "specific suggestion", "reasoning": "why it works", "confidence": 0.7, "estimated_uplift_pp": 1.8}},
        ... (all frameworks)
      }}
    }},
    ... (all steps)
  ]
}}
"""
    
    try:
        logger.info(f"🚀 Making single comprehensive API call for {len(steps)} steps, {len(frameworks)} frameworks")
        
        response = await asyncio.to_thread(
            openai_client.chat.completions.create,
            model="gpt-4",
            messages=[{"role": "user", "content": comprehensive_prompt}],
            temperature=0.7,
            max_tokens=2000,
            timeout=45
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Clean and parse response
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        
        response_text = ''.join(char for char in response_text if ord(char) >= 32 or char in '\n\r\t')
        
        analysis_data = json.loads(response_text)
        
        # Ensure we have all required data
        assessments = analysis_data.get("assessments", [])
        
        # Fill in missing steps/frameworks with reasonable defaults
        for i in range(len(steps)):
            if i >= len(assessments):
                assessments.append({"stepIndex": i, "frameworks": {}})
            
            step_assessment = assessments[i]
            if "frameworks" not in step_assessment:
                step_assessment["frameworks"] = {}
            
            for framework in frameworks:
                if framework not in step_assessment["frameworks"]:
                    step_assessment["frameworks"][framework] = {
                        "suggestion": f"Optimize using {framework} principles",
                        "reasoning": f"Apply {FRAMEWORK_FOCUSES[framework]} to improve conversion",
                        "confidence": 0.7,
                        "estimated_uplift_pp": 1.5
                    }
        
        logger.info(f"✅ Fast analysis completed in single API call")
        return {"assessments": assessments}
        
    except Exception as e:
        logger.error(f"Error in fast analysis: {e}")
        return create_mock_analysis(steps, frameworks)

def create_mock_analysis(steps: List[Dict], frameworks: List[str]) -> Dict:
    """Create mock analysis when OpenAI is not available"""
    assessments = []
    
    for i, step in enumerate(steps):
        framework_suggestions = {}
        for framework in frameworks:
            framework_suggestions[framework] = {
                "suggestion": f"[Fast] {framework} optimization for step {i+1}: Focus on {FRAMEWORK_FOCUSES[framework]}",
                "reasoning": f"Based on {framework} principles: {FRAMEWORK_FOCUSES[framework]}",
                "confidence": 0.8,
                "estimated_uplift_pp": 2.0
            }
        
        assessments.append({
            "stepIndex": i,
            "frameworks": framework_suggestions
        })
    
    return {"assessments": assessments}

@server.list_tools()
async def handle_list_tools() -> List[Tool]:
    """List available MCP tools"""
    return [
        Tool(
            name="assessSteps",
            description="Fast assessment of funnel steps using multiple frameworks",
            inputSchema={
                "type": "object",
                "properties": {
                    "steps": {"type": "array"},
                    "frameworks": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["steps", "frameworks"]
            }
        ),
        Tool(
            name="manusFunnel",
            description="Fast comprehensive funnel analysis",
            inputSchema={
                "type": "object", 
                "properties": {
                    "steps": {"type": "array"},
                    "frameworks": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["steps", "frameworks"]
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> List[types.TextContent]:
    """Handle tool calls"""
    
    if name == "assessSteps":
        return await handle_assess_steps_fast(arguments)
    elif name == "manusFunnel":
        return await handle_manus_funnel_fast(arguments)
    else:
        raise ValueError(f"Unknown tool: {name}")

async def handle_assess_steps_fast(arguments: Dict[str, Any]) -> List[types.TextContent]:
    """Fast assessment handler"""
    
    steps = arguments.get("steps", [])
    frameworks = arguments.get("frameworks", [])
    
    logger.info(f"🚀 Fast Assessment: {len(steps)} steps, {len(frameworks)} frameworks")
    
    # Get fast analysis
    analysis = await generate_fast_analysis(steps, frameworks)
    assessments = analysis["assessments"]
    
    # Generate order recommendations
    order_recommendations = []
    for framework in frameworks:
        avg_uplift = sum(
            assessment["frameworks"].get(framework, {}).get("estimated_uplift_pp", 0)
            for assessment in assessments
        ) / len(assessments) if assessments else 0
        
        order_recommendations.append({
            "framework": framework,
            "recommendedOrder": list(range(len(steps))),
            "expectedUplift": avg_uplift,
            "reasoning": f"{framework} analysis suggests {avg_uplift:.1f}pp improvement"
        })
    
    order_recommendations.sort(key=lambda x: x["expectedUplift"], reverse=True)
    
    # Transform assessments to expected format
    transformed_assessments = []
    for assessment in assessments:
        step_index = assessment.get("stepIndex", 0)
        
        # Convert framework suggestions to expected format
        suggestions = []
        total_uplift = 0
        framework_count = 0
        
        for framework, data in assessment.get("frameworks", {}).items():
            suggestions.append({
                "framework": framework,
                "revisedText": data.get("suggestion", ""),
                "rationale": data.get("reasoning", "")
            })
            total_uplift += data.get("estimated_uplift_pp", 0)
            framework_count += 1
        
        avg_uplift = total_uplift / framework_count if framework_count > 0 else 0
        
        transformed_assessments.append({
            "stepIndex": step_index,
            "suggestions": suggestions,
            "estimated_uplift": avg_uplift / 100  # Convert percentage points to decimal
        })
    
    result = {
        "assessments": transformed_assessments,
        "order_recommendations": order_recommendations,
        "timestamp": datetime.now().isoformat(),
        "method": "fast_single_call"
    }
    
    logger.info(f"✅ Fast assessment completed")
    
    return [types.TextContent(type="text", text=json.dumps(result, indent=2))]

async def handle_manus_funnel_fast(arguments: Dict[str, Any]) -> List[types.TextContent]:
    """Fast funnel orchestrator"""
    
    steps = arguments.get("steps", [])
    frameworks = arguments.get("frameworks", [])
    
    logger.info(f"🎯 Fast MCP Funnel: {len(steps)} steps, {len(frameworks)} frameworks")
    
    # Calculate baseline CR
    baseline_cr = 1.0
    for step in steps:
        baseline_cr *= step.get("observedCR", 0.5)
    
    logger.info(f"📊 Baseline CR: {baseline_cr:.4f} ({baseline_cr*100:.2f}%)")
    
    # Convert steps for assessment
    assessment_steps = []
    for i, step in enumerate(steps):
        questions = step.get("questions", [])
        question_texts = []
        
        for q in questions:
            if isinstance(q, dict):
                question_texts.append(q.get("question", f"Question {i+1}"))
            else:
                question_texts.append(str(q))
        
        assessment_steps.append({
            "stepIndex": i,
            "questionTexts": question_texts,
            "observedCR": step.get("observedCR", 0.5)
        })
    
    # Get fast analysis
    analysis = await generate_fast_analysis(assessment_steps, frameworks)
    assessments = analysis["assessments"]
    
    # Generate variants
    variants = []
    for framework in frameworks:
        total_uplift = sum(
            assessment["frameworks"].get(framework, {}).get("estimated_uplift_pp", 0)
            for assessment in assessments
        )
        
        variant_cr = baseline_cr * (1 + total_uplift / 100)
        
        suggestions = []
        for assessment in assessments:
            framework_data = assessment["frameworks"].get(framework, {})
            suggestions.append({
                "stepIndex": assessment["stepIndex"],
                "suggestion": framework_data.get("suggestion", ""),
                "reasoning": framework_data.get("reasoning", ""),
                "confidence": framework_data.get("confidence", 0.7)
            })
        
        variants.append({
            "framework": framework,
            "step_order": list(range(len(steps))),
            "CR_total": variant_cr,
            "uplift_pp": total_uplift,
            "suggestions": suggestions,
            "confidence": sum(s.get("confidence", 0) for s in suggestions) / len(suggestions) if suggestions else 0.7
        })
    
    variants.sort(key=lambda x: x["uplift_pp"], reverse=True)
    
    result = {
        "baselineCR": baseline_cr,
        "variants": variants,
        "timestamp": datetime.now().isoformat(),
        "method": "fast_single_call",
        "meta": {
            "steps_analyzed": len(steps),
            "frameworks_used": len(frameworks),
            "api_calls_made": 1 if openai_client else 0
        }
    }
    
    logger.info(f"✅ Fast funnel analysis completed - {len(variants)} variants")
    
    return [types.TextContent(type="text", text=json.dumps(result, indent=2))]

async def main():
    """Run the fast MCP server"""
    from mcp.server.stdio import stdio_server
    
    logger.info("🚀 Starting FAST Journey Funnel MCP Server...")
    logger.info(f"⚡ Optimization: Single API call for all frameworks")
    logger.info(f"🔑 OpenAI integration: {'✅ Enabled' if openai_client else '❌ Disabled'}")
    
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="journey-funnel-mcp-fast",
                server_version="2.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main()) 