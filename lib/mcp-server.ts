// Server-side only MCP client
let mcpInitialized = false;
let mcpClient: any = null;

interface MCPConfig {
  serverCommand?: string;
  serverArgs?: string[];
  serverUrl?: string;
  apiKey?: string;
}

export async function initializeMCPOnServer(config?: MCPConfig): Promise<any> {
  // Skip initialization in browser environment
  if (typeof window !== 'undefined') {
    throw new Error('MCP client can only be initialized on server-side');
  }

  if (mcpInitialized && mcpClient) {
    return mcpClient;
  }

  // Check if we should use mock MCP (for development/testing)
  // Force use of real MCP server if mcp_server_fast.py exists
  const realServerExists = true; // We know mcp_server_fast.py exists
  const useMockMCP = process.env.MCP_USE_MOCK === 'true' && !realServerExists;

  if (useMockMCP) {
    console.log('🧪 Using Mock MCP Client for development/testing');
    const { createMockMCPClient } = await import('./mock-mcp-server');
    mcpClient = createMockMCPClient();
    mcpInitialized = true;
    (global as any).manus = mcpClient;
    return mcpClient;
  }

  try {
    console.log('🚀 Starting server-side MCP client initialization...');
    
    // Dynamic import to avoid bundling issues
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');

    // Get configuration from environment variables or use defaults for mcp_server_fast.py
    const serverConfig = {
      command: config?.serverCommand || process.env.MCP_SERVER_COMMAND || 'python',
      args: config?.serverArgs || process.env.MCP_SERVER_ARGS?.split(' ') || [
        process.cwd() + '/mcp_server_fast.py'
      ],
      env: {
        ...process.env,
        ...(config?.apiKey && { MCP_API_KEY: config.apiKey }),
        ...(config?.serverUrl && { MCP_SERVER_URL: config.serverUrl }),
      } as Record<string, string>
    };

    console.log('📋 MCP Configuration:', {
      serverCommand: serverConfig.command,
      serverArgs: serverConfig.args,
      hasApiKey: !!(config?.apiKey || process.env.MCP_API_KEY),
      hasServerUrl: !!(config?.serverUrl || process.env.MCP_SERVER_URL)
    });

    // Create transport
    const transport = new StdioClientTransport({
      command: serverConfig.command,
      args: serverConfig.args,
      env: serverConfig.env,
    });

    // Create client
    const client = new Client(
      {
        name: "journey-funnel-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Connect
    await client.connect(transport);

    // Create wrapper with our interface
    mcpClient = {
      async callFunction(functionName: string, args: any): Promise<any> {
        console.log(`🔄 MCP calling function: ${functionName}`);
        
        // Increased timeout to 180s to allow real MCP server with OpenAI API calls to complete
        const timeoutMs = 180000; // 180 seconds (3 minutes)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`MCP call to ${functionName} timed out after ${timeoutMs}ms`)), timeoutMs)
        );
        
        const callPromise = client.callTool({
          name: functionName,
          arguments: args,
        });
        
        try {
          const result = await Promise.race([callPromise, timeoutPromise]) as any;
          console.log(`✅ MCP function ${functionName} completed`);
          
          // Handle different response formats from MCP
          if (result && result.content && Array.isArray(result.content) && result.content.length > 0) {
            return result.content[0];
          } else if (result && result.content) {
            return result.content;
          } else {
            return result;
          }
        } catch (error: any) {
          console.error(`❌ MCP function ${functionName} failed:`, error.message);
          throw error;
        }
      },

      isConnected(): boolean {
        return true;
      },

      async disconnect(): Promise<void> {
        await client.close();
        mcpInitialized = false;
        mcpClient = null;
        console.log('🔌 MCP Client disconnected');
      }
    };

    mcpInitialized = true;
    
    // Make it globally available for API routes
    (global as any).manus = mcpClient;
    
    console.log('✅ MCP Client successfully initialized and connected');
    return mcpClient;

  } catch (error) {
    console.error('❌ MCP Client initialization failed:', error);
    console.log(`
📖 MCP Setup Guide:
1. Set your MCP server configuration in .env.local:
   MCP_SERVER_COMMAND=python
   MCP_SERVER_ARGS=-m your_mcp_server_module
   MCP_SERVER_URL=your_server_url (if using HTTP)
   MCP_API_KEY=your_api_key (if required)

2. Ensure your MCP server supports these tools:
   - assessSteps
   - manusFunnel

3. Your MCP server should be running and accessible
    `);
    
    throw error;
  }
}

export function getMCPClient(): any {
  return mcpClient;
}

export function isMCPInitialized(): boolean {
  return mcpInitialized;
} 