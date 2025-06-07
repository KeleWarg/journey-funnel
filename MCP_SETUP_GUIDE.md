# MCP Setup Guide for Journey Funnel Calculator

## Overview
The Model Context Protocol (MCP) integration enables advanced LLM-powered funnel analysis using the `assessSteps` and `manusFunnel` orchestrator functions.

## 🚀 Quick Setup

### 1. Configure Environment Variables
Add these to your `.env.local` file:

```bash
# MCP Server Configuration
MCP_SERVER_COMMAND=python
MCP_SERVER_ARGS=-m your_mcp_server_module
MCP_SERVER_URL=http://localhost:8000
MCP_API_KEY=your-mcp-api-key
```

### 2. MCP Server Requirements
Your MCP server must implement these tools:

#### `assessSteps`
- **Input**: `{ steps: StepWithText[], frameworks: string[] }`
- **Output**: `{ assessments: MCPStepAssessment[], order_recommendations: MCPOrderRecommendation[] }`

#### `manusFunnel`
- **Input**: `{ steps: Step[], frameworks: string[] }`
- **Output**: `{ baselineCR: number, variants: MCPFunnelVariant[] }`

### 3. Restart Application
After configuration:
```bash
npm run dev
```

## 📋 Server Setup Examples

### Python MCP Server
```python
# your_mcp_server.py
from mcp import Server, Tool
import asyncio

app = Server("journey-funnel-mcp")

@app.tool("assessSteps")
async def assess_steps(steps, frameworks):
    # Your LLM assessment logic here
    return {
        "assessments": [...],
        "order_recommendations": [...]
    }

@app.tool("manusFunnel")
async def manus_funnel(steps, frameworks):
    # Your funnel analysis logic here
    return {
        "baselineCR": 0.85,
        "variants": [...]
    }

if __name__ == "__main__":
    asyncio.run(app.run())
```

### Node.js MCP Server
```javascript
// server.js
const { MCPServer } = require('@modelcontextprotocol/sdk');

const server = new MCPServer('journey-funnel-mcp');

server.addTool('assessSteps', async (args) => {
    // Your assessment logic
    return { assessments: [], order_recommendations: [] };
});

server.addTool('manusFunnel', async (args) => {
    // Your funnel analysis logic
    return { baselineCR: 0.85, variants: [] };
});

server.listen(8000);
```

## 🔧 Configuration Options

### StdIO Transport (Default)
```bash
MCP_SERVER_COMMAND=python
MCP_SERVER_ARGS=-m your_mcp_server
```

### HTTP Transport
```bash
MCP_SERVER_URL=http://localhost:8000
MCP_API_KEY=your-api-key
```

## 🧪 Testing MCP Connection

1. **Check Console Logs**: Look for MCP initialization messages
2. **Test API Endpoints**: Try `/api/assessStepsMCP` and `/api/manusFunnel`
3. **UI Integration**: Click "Run MCP Analysis" button

### Expected Log Output
```
🚀 Starting MCP client initialization...
📋 MCP Configuration: { serverCommand: "python", ... }
✅ MCP Client connected successfully
```

## ❌ Troubleshooting

### Error: "MCP client not available"
- **Cause**: MCP server not running or misconfigured
- **Solution**: Check server configuration and ensure it's accessible

### Error: "Failed to connect MCP client"
- **Cause**: Network issues or wrong server command
- **Solution**: Verify `MCP_SERVER_COMMAND` and `MCP_SERVER_ARGS`

### Error: "Tool not found"
- **Cause**: MCP server doesn't implement required tools
- **Solution**: Ensure your server has `assessSteps` and `manusFunnel` tools

## 📖 Framework Specifications

### assessSteps Input Format
```typescript
{
  steps: [{
    stepIndex: 0,
    questionTexts: ["What's your email?"],
    Qs: 2, Is: 2, Ds: 1,
    CR_s: 0.85
  }],
  frameworks: ["PAS", "Fogg", "Nielsen", ...]
}
```

### manusFunnel Output Format
```typescript
{
  baselineCR: 0.85,
  variants: [{
    framework: "PAS",
    step_order: [0, 1, 2],
    CR_total: 0.87,
    uplift_pp: 2.5,
    suggestions: [...]
  }]
}
```

## 🔄 Integration Flow

1. **Frontend**: User clicks "Run MCP Analysis"
2. **API**: `/api/manusFunnel` called with step data
3. **MCP Client**: Connects to your MCP server
4. **MCP Server**: Processes with LLM, returns analysis
5. **Frontend**: Displays comparison table with variants

## 🎯 Next Steps

1. Set up your MCP server with the required tools
2. Configure environment variables in `.env.local`  
3. Test the connection and functionality
4. Customize the analysis logic for your specific needs

---

Need help? Check the console logs for detailed error messages and configuration guidance. 