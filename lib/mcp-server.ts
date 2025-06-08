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
  // Use real MCP server if mcp_server_fast.py exists
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
      workingDirectory: process.cwd(),
      hasApiKey: !!(config?.apiKey || process.env.MCP_API_KEY),
      hasServerUrl: !!(config?.serverUrl || process.env.MCP_SERVER_URL),
      nodeEnv: process.env.NODE_ENV,
      openaiApiKey: process.env.OPENAI_API_KEY ? 'SET' : 'NOT_SET'
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
    console.log('🔗 Attempting to connect to MCP server...');
    await client.connect(transport);
    console.log('✅ Successfully connected to MCP server');

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
    
    // More detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Check if it's a spawn error (Python not found, file not executable, etc.)
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Error code:', error.code);
      if (error.code === 'ENOENT') {
        console.error('❌ Python executable not found or MCP server file not accessible');
      }
    }
    
    console.log(`
📖 MCP Setup Guide:
1. Your configuration should be:
   Command: python
   Args: ${process.cwd()}/mcp_server_fast.py
   Working Dir: ${process.cwd()}

2. Ensure Python and required packages are installed:
   pip install openai mcp

3. Verify MCP server file is executable:
   python mcp_server_fast.py

4. Check environment variables in .env.local:
   OPENAI_API_KEY=${process.env.OPENAI_API_KEY ? 'SET' : 'NOT_SET'}
   MCP_SERVER_COMMAND=${process.env.MCP_SERVER_COMMAND || 'not set'}
   MCP_SERVER_ARGS=${process.env.MCP_SERVER_ARGS || 'not set'}
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