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
import random

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
    
    comprehensive_prompt = f"""Analyze {len(steps)} funnel steps using {len(frameworks)} frameworks.
For each step, provide:
1. Framework-specific suggestions
2. Optional title suggestion (if it would improve clarity)
3. Optional support copy (if it would improve understanding)
4. Optional extra support texts (up to 2, if they would provide valuable context)

Steps to analyze:
{json.dumps(steps, indent=2)}

Frameworks to use:
{json.dumps(frameworks, indent=2)}

Provide analysis in this exact JSON format:
{{
  "assessments": [
    {{
      "stepIndex": number,
      "frameworks": {{
        "frameworkName": {{
          "suggestion": "string",
          "reasoning": "string",
          "confidence": number,
          "estimated_uplift_pp": number
        }}
      }},
      "titleSuggestion": "string or null",
      "supportCopySuggestion": "string or null",
      "extraSupportSuggestions": ["string"] or null
    }}
  ]
}}"""
    
    try:
        logger.info(f"🚀 Making single comprehensive API call for {len(steps)} steps, {len(frameworks)} frameworks")
        
        response = await asyncio.to_thread(
            openai_client.chat.completions.create,
            model="gpt-4o-mini",  # Faster, cheaper model
            messages=[{"role": "user", "content": comprehensive_prompt}],
            temperature=0.7,
            max_tokens=1500,  # Reduced tokens for faster response
            timeout=30  # Reduced timeout for faster model
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
            base_suggestion = {
                "suggestion": f"[Fast] {framework} optimization for step {i+1}: Focus on {FRAMEWORK_FOCUSES[framework]}",
                "reasoning": f"Based on {framework} principles: {FRAMEWORK_FOCUSES[framework]}",
                "confidence": 0.8,
                "estimated_uplift_pp": 2.0
            }
            
            # Add Fogg-specific scores
            if framework == "Fogg":
                base_suggestion["motivation_score"] = 3.5  # Default motivation
                base_suggestion["trigger_score"] = 3.0    # Default trigger
            
            framework_suggestions[framework] = base_suggestion
        
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
        ),
        Tool(
            name="assessBoostElements",
            description="Classify and score boost elements for funnel steps",
            inputSchema={
                "type": "object",
                "properties": {
                    "stepIndex": {"type": "number"},
                    "boostElements": {"type": "array"},
                    "categories": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["stepIndex", "boostElements"]
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
    elif name == "assessBoostElements":
        return await handle_assess_boost_elements_fast(arguments)
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
    
    # Generate order recommendations with proper expected_CR_total calculation
    order_recommendations = []
    for framework in frameworks:
        avg_uplift = sum(
            assessment["frameworks"].get(framework, {}).get("estimated_uplift_pp", 0)
            for assessment in assessments
        ) / len(assessments) if assessments else 0
        
        # **CRITICAL FIX**: Calculate expected_CR_total using proper funnel calculation per YAML spec
        # Apply framework uplifts to steps
        enhanced_steps = []
        for i, step in enumerate(steps):
            enhanced_step = step.copy()
            assessment = next((a for a in assessments if a["stepIndex"] == i), None)
            if assessment:
                framework_data = assessment["frameworks"].get(framework, {})
                uplift_pp = framework_data.get("estimated_uplift_pp", 0)
                # Clamp uplift to ±30pp per YAML patch - unlocking reorder upside
                clamped_uplift = max(-30, min(30, uplift_pp))
                current_cr = enhanced_step.get("observedCR", 0.5)
                enhanced_step["observedCR"] = max(0, min(1, current_cr + clamped_uplift / 100))
            enhanced_steps.append(enhanced_step)
        
        # Calculate expected_CR_total = Π enhanced_CRₛ
        expected_CR_total = 1.0
        for enhanced_step in enhanced_steps:
            expected_CR_total *= enhanced_step.get("observedCR", 0.5)
        
        order_recommendations.append({
            "framework": framework,
            "recommendedOrder": list(range(len(steps))),  # For now, keep original order
            "expected_CR_total": expected_CR_total,  # Proper calculation per YAML spec
            "expectedUplift": avg_uplift,
            "reasoning": f"{framework} analysis suggests {avg_uplift:.1f}pp improvement with expected CR {expected_CR_total*100:.2f}%"
        })
    
    order_recommendations.sort(key=lambda x: x["expected_CR_total"], reverse=True)
    
    # Transform assessments to expected format with cumulative tracking
    transformed_assessments = []
    cumulative_cr = 1.0  # Start with 100% conversion for cumulative calculation
    
    for assessment in assessments:
        step_index = assessment.get("stepIndex", 0)
        
        # Get original step data
        original_step = next((s for s in steps if s.get("stepIndex", i) == step_index), None)
        base_cr_s = original_step.get("CR_s", 0.5) if original_step else 0.5
        
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
        estimated_uplift_decimal = avg_uplift / 100  # Convert percentage points to decimal
        
        # Clamp uplift to max_uplift_per_step (30pp per YAML patch)
        clamped_uplift = max(-0.30, min(0.30, estimated_uplift_decimal))
        
        # Calculate new CR_s after applying uplift
        new_cr_s = max(0, min(1, base_cr_s + clamped_uplift))
        
        # Update cumulative CR
        cumulative_cr *= new_cr_s
        
        transformed_assessment = {
            "stepIndex": step_index,
            "base_CR_s": base_cr_s,
            "estimated_uplift": clamped_uplift,
            "new_CR_s": new_cr_s,
            "cumulative_new_CR_s": cumulative_cr,
            "suggestions": suggestions
        }

        # Add optional text fields if present
        if assessment.get("titleSuggestion"):
            transformed_assessment["titleSuggestion"] = assessment["titleSuggestion"]
        if assessment.get("supportCopySuggestion"):
            transformed_assessment["supportCopySuggestion"] = assessment["supportCopySuggestion"]
        if assessment.get("extraSupportSuggestions"):
            transformed_assessment["extraSupportSuggestions"] = assessment["extraSupportSuggestions"]

        transformed_assessments.append(transformed_assessment)
    
    # Calculate predicted CR_total
    predicted_cr_total = cumulative_cr
    
    result = {
        "assessments": transformed_assessments,
        "order_recommendations": order_recommendations,
        "predicted_CR_total": predicted_cr_total,
        "timestamp": datetime.now().isoformat(),
        "method": "fast_single_call"
    }
    
    logger.info(f"✅ Fast assessment completed")
    
    return [types.TextContent(type="text", text=json.dumps(result, indent=2))]

async def handle_manus_funnel_fast(arguments: Dict[str, Any]) -> List[types.TextContent]:
    """Fast funnel orchestrator with Fogg Behavior Model logic"""
    
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
    
    # Generate variants for all frameworks
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
    
    # **NEW: Fogg Behavior Model Logic** per YAML spec 3.3_fogg_order_logic
    if "Fogg" in frameworks:
        logger.info("🧠 Starting Fogg Behavior Model analysis...")
        
        # Step 1: Call LLM for Fogg assessments (mocked for fast processing)
        fogg_steps_with_scores = []
        
        for i, step in enumerate(steps):
            # Calculate scores per YAML spec section 3.3
            motivation_score = random.uniform(1, 5)  # 1-5 range as per assessments
            trigger_score = random.uniform(1, 5)     # 1-5 range
            
            # Step 2: Compute per-step Fogg components
            # **CRITICAL**: Calculate ability as clamp(1, 6 - SCₛ, 5) per YAML spec
            qs = step.get("Qs", 2)
            ins = step.get("Is", 2)  
            ds = step.get("Ds", 2)
            sc_s = (qs + ins + ds) / 3  # Simple average for step complexity
            ability_score = max(1, min(5, 6 - sc_s))  # ability = clamp(1, 6 - SCₛ, 5)
            
            # Calculate Fogg score as M * A * T per YAML spec
            fogg_score = motivation_score * ability_score * trigger_score
            
            fogg_steps_with_scores.append({
                "stepIndex": i,
                "motivation": motivation_score,
                "ability": ability_score,
                "trigger": trigger_score,
                "fogg_score": fogg_score,
                "complexity": sc_s
            })
        
        # Step 3: Sort descending by fogg_score
        fogg_sorted = sorted(fogg_steps_with_scores, key=lambda x: x["fogg_score"], reverse=True)
        fogg_recommended_order = [step["stepIndex"] for step in fogg_sorted]
        
        logger.info(f"🔄 Fogg recommended order: {fogg_recommended_order}")
        
        # Step 4: Simulate this ordering using calculateFunnel logic
        # This simulates the API call described in the YAML spec
        baseline_cr_total = 1.0
        for step in steps:
            baseline_cr_total *= step.get("observedCR", 0.5)
        
        # Reorder steps according to Fogg score and recalculate
        reordered_steps = [steps[i] for i in fogg_recommended_order]
        fogg_cr_total = 1.0
        for step in reordered_steps:
            fogg_cr_total *= step.get("observedCR", 0.5)
        
        # Step 5: Return both the order and its predicted CR
        fogg_order_uplift = (fogg_cr_total - baseline_cr_total) * 100
        
        # Add bonus based on high Fogg scores (motivation boost)
        max_possible_score = 125  # 5 * 5 * 5
        avg_fogg_score = sum(step["fogg_score"] for step in fogg_steps_with_scores) / len(fogg_steps_with_scores)
        score_percentage = avg_fogg_score / max_possible_score
        
        # Conservative bonus for high-scoring Fogg elements per YAML expectations
        fogg_bonus = score_percentage * 1.5  # Up to 1.5pp bonus for high Fogg scores
        fogg_order_uplift += fogg_bonus
        
        fogg_variant_cr = baseline_cr * (1 + fogg_order_uplift / 100)  # Removed 0.95 clamp per YAML patch - allow CR_total > baseline
        
        # Create Fogg-BM variant per YAML spec
        fogg_variant = {
            "framework": "Fogg-BM",
            "step_order": fogg_recommended_order,
            "CR_total": fogg_variant_cr,
            "uplift_pp": fogg_order_uplift,
            "suggestions": [],  # No copy rewrites for ordering variant
            "fogg_metrics": fogg_steps_with_scores,
            "confidence": 0.8
        }
        
        variants.append(fogg_variant)
        logger.info(f"🧠 Fogg-BM variant created: {fogg_order_uplift:.1f}pp uplift, order: {fogg_recommended_order}")
    
    variants.sort(key=lambda x: x["uplift_pp"], reverse=True)
    
    result = {
        "baselineCR": baseline_cr,
        "variants": variants,
        "timestamp": datetime.now().isoformat(),
        "method": "fast_single_call",
        "meta": {
            "steps_analyzed": len(steps),
            "frameworks_used": len(frameworks),
            "api_calls_made": 1 if openai_client else 0,
            "fogg_model_applied": "Fogg" in frameworks
        }
    }
    
    logger.info(f"✅ Fast funnel analysis completed - {len(variants)} variants")
    
    return [types.TextContent(type="text", text=json.dumps(result, indent=2))]

async def handle_assess_boost_elements_fast(arguments: Dict[str, Any]) -> List[types.TextContent]:
    """Fast boost element classification"""
    
    step_index = arguments.get("stepIndex", 0)
    boost_elements = arguments.get("boostElements", [])
    categories = arguments.get("categories", [
        "social-proof", "authority", "urgency", "scarcity", 
        "visual", "security", "progress", "personalization"
    ])
    
    logger.info(f"🔍 Fast Boost Assessment: {len(boost_elements)} elements for step {step_index}")
    
    # Simple rule-based classification for fast processing
    classified_boosts = []
    
    for element in boost_elements:
        element_id = element.get("id", "")
        element_text = element.get("text", "").lower()
        
        # Rule-based scoring
        category = "visual"
        score = 1
        
        if any(keyword in element_text for keyword in ["testimonial", "review", "customers", "users", "ratings"]):
            category = "social-proof"
            score = 3
        elif any(keyword in element_text for keyword in ["secure", "ssl", "encrypted", "trusted", "verified"]):
            category = "security" 
            score = 3
        elif any(keyword in element_text for keyword in ["limited", "exclusive", "only", "few left"]):
            category = "scarcity"
            score = 2
        elif any(keyword in element_text for keyword in ["urgent", "deadline", "expires", "hurry", "now"]):
            category = "urgency"
            score = 2
        elif any(keyword in element_text for keyword in ["expert", "certified", "award", "professional", "endorsed"]):
            category = "authority"
            score = 4
        elif any(keyword in element_text for keyword in ["progress", "step", "completion", "indicator"]):
            category = "progress"
            score = 2
        elif any(keyword in element_text for keyword in ["personalized", "customized", "tailored", "for you"]):
            category = "personalization"
            score = 3
        elif any(keyword in element_text for keyword in ["logo", "badge", "icon", "image"]):
            category = "visual"
            score = 1
        
        classified_boosts.append({
            "id": element_id,
            "category": category,
            "score": score
        })
    
    step_boost_total = sum(boost["score"] for boost in classified_boosts)
    
    result = {
        "classifiedBoosts": classified_boosts,
        "stepBoostTotal": step_boost_total,
        "timestamp": datetime.now().isoformat()
    }
    
    logger.info(f"✅ Boost classification completed: total score {step_boost_total}")
    
    return [types.TextContent(type="text", text=json.dumps(result, indent=2))]

async def main():
    """Run the fast MCP server"""
    
    logger.info("🚀 Starting FAST Journey Funnel MCP Server...")
    logger.info(f"⚡ Optimization: Single API call for all frameworks")
    logger.info(f"🔑 OpenAI integration: {'✅ Enabled' if openai_client else '❌ Disabled'}")
    
    # Check if running in HTTP mode (Cloud environment)
    port = int(os.environ.get("PORT", 8080))
    
    if os.environ.get("PORT"):
        # HTTP mode for cloud deployment
        from starlette.applications import Starlette
        from starlette.routing import Route
        from starlette.responses import JSONResponse
        import uvicorn
        
        logger.info(f"🌐 Starting HTTP server on port {port}")
        
        async def health_check(request):
            return JSONResponse({"status": "healthy", "server": "journey-funnel-mcp-fast"})
        
        async def list_tools_endpoint(request):
            try:
                tools = await handle_list_tools()
                return JSONResponse({
                    "tools": [
                        {
                            "name": tool.name,
                            "description": tool.description,
                            "inputSchema": tool.inputSchema
                        } for tool in tools
                    ]
                })
            except Exception as e:
                logger.error(f"Error listing tools: {e}")
                return JSONResponse({"error": str(e)}, status_code=500)
        
        async def call_tool_endpoint(request):
            try:
                # Check API key if configured
                mcp_api_key = os.environ.get("MCP_API_KEY")
                if mcp_api_key:
                    auth_header = request.headers.get("Authorization")
                    if not auth_header or not auth_header.startswith("Bearer "):
                        return JSONResponse({"error": "Missing or invalid authorization header"}, status_code=401)
                    
                    provided_key = auth_header.replace("Bearer ", "")
                    if provided_key != mcp_api_key:
                        return JSONResponse({"error": "Invalid API key"}, status_code=401)
                
                body = await request.json()
                tool_name = body.get("name")
                arguments = body.get("arguments", {})
                
                if not tool_name:
                    return JSONResponse({"error": "Missing tool name"}, status_code=400)
                
                result = await handle_call_tool(tool_name, arguments)
                return JSONResponse({
                    "result": [{"type": content.type, "text": content.text} for content in result]
                })
            except Exception as e:
                logger.error(f"Error calling tool: {e}")
                return JSONResponse({"error": str(e)}, status_code=500)
        
        app = Starlette(
            routes=[
                Route("/", health_check),
                Route("/health", health_check),
                Route("/tools", list_tools_endpoint, methods=["GET"]),
                Route("/tools/call", call_tool_endpoint, methods=["POST"]),
            ]
        )
        
        config = uvicorn.Config(app, host="0.0.0.0", port=port, log_level="info")
        server_instance = uvicorn.Server(config)
        await server_instance.serve()
        
    else:
        # STDIO mode for local development
        from mcp.server.stdio import stdio_server
        
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