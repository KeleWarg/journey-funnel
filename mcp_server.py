#!/usr/bin/env python3
"""
Journey Funnel MCP Server
Implements assessSteps and manusFunnel tools for funnel optimization
"""

import asyncio
import json
import os
import logging
from typing import Dict, List, Any, Optional
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
    from mcp.types import (
        Resource,
        Tool,
        TextContent,
        ImageContent,
        EmbeddedResource,
        LoggingLevel
    )
    import mcp.types as types
except ImportError:
    print("MCP SDK not found. Install with: pip install mcp")
    exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("journey-funnel-mcp")

# Initialize OpenAI client
openai_client = None
if os.getenv("OPENAI_API_KEY"):
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    logger.info("✅ OpenAI client initialized")
else:
    logger.warning("⚠️ OPENAI_API_KEY not found - using mock responses")

# Framework definitions
FRAMEWORKS = {
    "PAS": {
        "name": "Problem-Agitation-Solution",
        "description": "Identify pain points, amplify urgency, present clear solution",
        "focus": "emotional triggers and problem-solving"
    },
    "Fogg": {
        "name": "Fogg Behavior Model",
        "description": "Behavior = Motivation × Ability × Trigger",
        "focus": "reducing friction and increasing motivation"
    },
    "Nielsen": {
        "name": "Nielsen's Usability Heuristics",
        "description": "User interface design principles for better UX",
        "focus": "usability and user experience optimization"
    },
    "AIDA": {
        "name": "Attention-Interest-Desire-Action",
        "description": "Classic marketing funnel progression",
        "focus": "progressive engagement and conversion"
    },
    "Cialdini": {
        "name": "Cialdini's Persuasion Principles",
        "description": "Social proof, scarcity, authority, commitment",
        "focus": "psychological persuasion triggers"
    },
    "SCARF": {
        "name": "Status-Certainty-Autonomy-Relatedness-Fairness",
        "description": "Neuroleadership model for reducing threat response",
        "focus": "psychological safety and trust building"
    },
    "JTBD": {
        "name": "Jobs To Be Done",
        "description": "Focus on the job users are hiring your product to do",
        "focus": "user motivation and outcome achievement"
    },
    "TOTE": {
        "name": "Test-Operate-Test-Exit",
        "description": "Iterative improvement and feedback loops",
        "focus": "continuous optimization and user feedback"
    },
    "ELM": {
        "name": "Elaboration Likelihood Model",
        "description": "Central vs peripheral route to persuasion",
        "focus": "cognitive processing and persuasion depth"
    }
}

server = Server("journey-funnel-mcp")

async def generate_llm_suggestion(step_data: Dict, framework: str, questions: List[str]) -> Dict:
    """Generate LLM-powered suggestion for a specific framework"""
    
    if not openai_client:
        # Mock response when no OpenAI key
        return {
            "suggestion": f"[Mock] {framework} optimization: Improve {questions[0] if questions else 'this step'} with {FRAMEWORKS[framework]['focus']}",
            "reasoning": f"[Mock] Based on {framework} principles, focusing on {FRAMEWORKS[framework]['focus']}",
            "confidence": 0.8,
            "estimated_uplift_pp": 2.5
        }
    
    framework_def = FRAMEWORKS.get(framework, {})
    
    prompt = f"""
    You are a conversion optimization expert specializing in the {framework} framework.
    
    Framework Details:
    - Name: {framework_def.get('name', framework)}
    - Description: {framework_def.get('description', 'Optimization framework')}
    - Focus: {framework_def.get('focus', 'conversion improvement')}
    
    Step Analysis:
    - Current Conversion Rate: {step_data.get('observedCR', 0) * 100:.1f}%
    - Questions: {', '.join(questions)}
    - Step Index: {step_data.get('stepIndex', 0)}
    
    Provide specific, actionable optimization suggestions using {framework} principles.
    Focus on practical changes that can improve conversion rates.
    
    Respond with valid JSON:
    {{
        "suggestion": "Specific actionable suggestion text",
        "reasoning": "Why this suggestion works based on {framework} principles",
        "confidence": 0.8,
        "estimated_uplift_pp": 2.5
    }}
    """
    
    try:
        response = await asyncio.to_thread(
            openai_client.chat.completions.create,
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=300,  # Reduced for faster responses
            timeout=30  # Add explicit timeout
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Clean response and parse JSON
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        
        # Remove control characters
        response_text = ''.join(char for char in response_text if ord(char) >= 32 or char in '\n\r\t')
        
        suggestion_data = json.loads(response_text)
        return suggestion_data
        
    except Exception as e:
        logger.error(f"Error generating {framework} suggestion: {e}")
        return {
            "suggestion": f"Error generating {framework} suggestion - using fallback",
            "reasoning": f"Technical error occurred, using {framework} best practices",
            "confidence": 0.5,
            "estimated_uplift_pp": 1.0
        }

async def generate_batch_suggestions(step_data: Dict, frameworks: List[str], questions: List[str]) -> Dict[str, Dict]:
    """Generate suggestions for multiple frameworks in parallel"""
    
    if not openai_client:
        # Return mock responses for all frameworks
        return {
            framework: {
                "suggestion": f"[Mock] {framework} optimization: Improve {questions[0] if questions else 'this step'} with {FRAMEWORKS[framework]['focus']}",
                "reasoning": f"[Mock] Based on {framework} principles, focusing on {FRAMEWORKS[framework]['focus']}",
                "confidence": 0.8,
                "estimated_uplift_pp": 2.5
            }
            for framework in frameworks
        }
    
    # Create batch prompt for all frameworks
    framework_descriptions = []
    for framework in frameworks:
        framework_def = FRAMEWORKS.get(framework, {})
        framework_descriptions.append(f"""
{framework}: {framework_def.get('name', framework)}
- Description: {framework_def.get('description', 'Optimization framework')}
- Focus: {framework_def.get('focus', 'conversion improvement')}""")
    
    batch_prompt = f"""
You are a conversion optimization expert. Analyze this funnel step using ALL of the following frameworks and provide specific suggestions for each.

Step Analysis:
- Current Conversion Rate: {step_data.get('observedCR', 0) * 100:.1f}%
- Questions: {', '.join(questions)}
- Step Index: {step_data.get('stepIndex', 0)}

Frameworks to analyze:
{''.join(framework_descriptions)}

For each framework, provide a specific optimization suggestion. Respond with valid JSON:
{{
    "PAS": {{"suggestion": "...", "reasoning": "...", "confidence": 0.8, "estimated_uplift_pp": 2.5}},
    "Fogg": {{"suggestion": "...", "reasoning": "...", "confidence": 0.8, "estimated_uplift_pp": 2.0}},
    ... (continue for all frameworks)
}}
"""
    
    try:
        response = await asyncio.to_thread(
            openai_client.chat.completions.create,
            model="gpt-4",
            messages=[{"role": "user", "content": batch_prompt}],
            temperature=0.7,
            max_tokens=1500,  # Increased for batch response
            timeout=45  # Extended timeout for batch processing
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Clean and parse batch response
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        
        response_text = ''.join(char for char in response_text if ord(char) >= 32 or char in '\n\r\t')
        
        batch_suggestions = json.loads(response_text)
        
        # Ensure all frameworks have responses, fill in missing ones
        for framework in frameworks:
            if framework not in batch_suggestions:
                logger.warning(f"Missing {framework} in batch response, using fallback")
                batch_suggestions[framework] = {
                    "suggestion": f"{framework} optimization suggestion",
                    "reasoning": f"Based on {framework} principles",
                    "confidence": 0.7,
                    "estimated_uplift_pp": 1.5
                }
        
        return batch_suggestions
        
    except Exception as e:
        logger.error(f"Error in batch suggestion generation: {e}")
        # Return fallback for all frameworks
        return {
            framework: {
                "suggestion": f"Error generating {framework} suggestion - using fallback",
                "reasoning": f"Technical error occurred, using {framework} best practices",
                "confidence": 0.5,
                "estimated_uplift_pp": 1.0
            }
            for framework in frameworks
        }

@server.list_tools()
async def handle_list_tools() -> List[Tool]:
    """List available MCP tools"""
    return [
        Tool(
            name="assessSteps",
            description="Assess funnel steps using multiple copywriting frameworks and provide optimization suggestions",
            inputSchema={
                "type": "object",
                "properties": {
                    "steps": {
                        "type": "array",
                        "description": "Array of funnel steps to assess",
                        "items": {
                            "type": "object",
                            "properties": {
                                "stepIndex": {"type": "number"},
                                "questionTexts": {"type": "array", "items": {"type": "string"}},
                                "observedCR": {"type": "number"},
                                "Qs": {"type": "number"},
                                "Is": {"type": "number"},
                                "Ds": {"type": "number"}
                            },
                            "required": ["stepIndex", "questionTexts", "observedCR"]
                        }
                    },
                    "frameworks": {
                        "type": "array",
                        "description": "Copywriting frameworks to use for assessment",
                        "items": {"type": "string"}
                    }
                },
                "required": ["steps", "frameworks"]
            }
        ),
        Tool(
            name="manusFunnel",
            description="Comprehensive funnel analysis orchestrator that assesses steps and calculates optimized variants",
            inputSchema={
                "type": "object",
                "properties": {
                    "steps": {
                        "type": "array",
                        "description": "Array of funnel steps",
                        "items": {
                            "type": "object",
                            "properties": {
                                "boosts": {"type": "number"},
                                "observedCR": {"type": "number"},
                                "questions": {"type": "array", "items": {"type": "object"}}
                            },
                            "required": ["observedCR"]
                        }
                    },
                    "frameworks": {
                        "type": "array",
                        "description": "Frameworks for analysis",
                        "items": {"type": "string"}
                    }
                },
                "required": ["steps", "frameworks"]
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> List[types.TextContent]:
    """Handle tool calls"""
    
    if name == "assessSteps":
        return await handle_assess_steps(arguments)
    elif name == "manusFunnel":
        return await handle_manus_funnel(arguments)
    else:
        raise ValueError(f"Unknown tool: {name}")

async def handle_assess_steps(arguments: Dict[str, Any]) -> List[types.TextContent]:
    """Handle assessSteps tool call"""
    
    steps = arguments.get("steps", [])
    frameworks = arguments.get("frameworks", [])
    
    logger.info(f"🔍 Assessing {len(steps)} steps with {len(frameworks)} frameworks")
    
    assessments = []
    
    # Process each step
    for step in steps:
        step_index = step.get("stepIndex", 0)
        questions = step.get("questionTexts", [])
        observed_cr = step.get("observedCR", 0)
        
        logger.info(f"Processing Step {step_index}: {questions}")
        
        # Generate suggestions for all frameworks in batch
        framework_suggestions = await generate_batch_suggestions(step, frameworks, questions)
        
        assessments.append({
            "stepIndex": step_index,
            "frameworks": framework_suggestions,
            "observedCR": observed_cr,
            "questions": questions
        })
    
    # Generate order recommendations
    order_recommendations = []
    for framework in frameworks:
        # Calculate average uplift for this framework
        avg_uplift = sum(
            assessment["frameworks"].get(framework, {}).get("estimated_uplift_pp", 0)
            for assessment in assessments
        ) / len(assessments) if assessments else 0
        
        order_recommendations.append({
            "framework": framework,
            "recommendedOrder": list(range(len(steps))),  # Default order
            "expectedUplift": avg_uplift,
            "reasoning": f"{framework} analysis suggests {avg_uplift:.1f}pp improvement potential"
        })
    
    # Sort by expected uplift
    order_recommendations.sort(key=lambda x: x["expectedUplift"], reverse=True)
    
    result = {
        "assessments": assessments,
        "order_recommendations": order_recommendations,
        "timestamp": datetime.now().isoformat(),
        "frameworks_used": frameworks
    }
    
    return [types.TextContent(
        type="text",
        text=json.dumps(result, indent=2)
    )]

async def handle_manus_funnel(arguments: Dict[str, Any]) -> List[types.TextContent]:
    """Handle manusFunnel orchestrator tool call"""
    
    steps = arguments.get("steps", [])
    frameworks = arguments.get("frameworks", [])
    
    logger.info(f"🎯 MCP Funnel Analysis: {len(steps)} steps, {len(frameworks)} frameworks")
    
    # Calculate baseline CR
    baseline_cr = 1.0
    for step in steps:
        baseline_cr *= step.get("observedCR", 1.0)
    
    logger.info(f"📊 Baseline CR: {baseline_cr:.4f} ({baseline_cr*100:.2f}%)")
    
    # Create step data for assessment
    assessment_steps = []
    for i, step in enumerate(steps):
        questions = step.get("questions", [])
        question_texts = []
        
        # Extract question text from question objects
        for q in questions:
            if isinstance(q, dict):
                question_texts.append(q.get("question", f"Question {i+1}"))
            else:
                question_texts.append(str(q))
        
        assessment_steps.append({
            "stepIndex": i,
            "questionTexts": question_texts,
            "observedCR": step.get("observedCR", 0.5),
            "Qs": len(questions),
            "Is": step.get("boosts", 0),
            "Ds": 0
        })
    
    # Get assessments
    assess_args = {
        "steps": assessment_steps,
        "frameworks": frameworks
    }
    
    assessment_result = await handle_assess_steps(assess_args)
    assessments_data = json.loads(assessment_result[0].text)
    
    # Generate variants based on assessments
    variants = []
    
    for framework in frameworks:
        # Calculate framework-specific uplift
        total_uplift = 0
        framework_suggestions = []
        
        for assessment in assessments_data["assessments"]:
            framework_data = assessment["frameworks"].get(framework, {})
            total_uplift += framework_data.get("estimated_uplift_pp", 0)
            framework_suggestions.append({
                "stepIndex": assessment["stepIndex"],
                "suggestion": framework_data.get("suggestion", ""),
                "reasoning": framework_data.get("reasoning", ""),
                "confidence": framework_data.get("confidence", 0.5)
            })
        
        # Convert uplift from percentage points to multiplier
        uplift_multiplier = 1 + (total_uplift / 100)
        variant_cr = baseline_cr * uplift_multiplier
        
        variants.append({
            "framework": framework,
            "step_order": list(range(len(steps))),
            "CR_total": variant_cr,
            "uplift_pp": total_uplift,
            "suggestions": framework_suggestions,
            "confidence": sum(s.get("confidence", 0) for s in framework_suggestions) / len(framework_suggestions) if framework_suggestions else 0.5
        })
    
    # Sort variants by uplift
    variants.sort(key=lambda x: x["uplift_pp"], reverse=True)
    
    result = {
        "baselineCR": baseline_cr,
        "variants": variants,
        "timestamp": datetime.now().isoformat(),
        "meta": {
            "steps_analyzed": len(steps),
            "frameworks_used": len(frameworks),
            "total_suggestions": sum(len(v["suggestions"]) for v in variants)
        }
    }
    
    logger.info(f"✅ Generated {len(variants)} variants, top uplift: {variants[0]['uplift_pp']:.1f}pp")
    
    return [types.TextContent(
        type="text",
        text=json.dumps(result, indent=2)
    )]

async def main():
    """Run the MCP server"""
    from mcp.server.stdio import stdio_server
    
    logger.info("🚀 Starting Journey Funnel MCP Server...")
    logger.info(f"📋 Available frameworks: {', '.join(FRAMEWORKS.keys())}")
    logger.info(f"🔑 OpenAI integration: {'✅ Enabled' if openai_client else '❌ Disabled (no API key)'}")
    
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="journey-funnel-mcp",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main()) 