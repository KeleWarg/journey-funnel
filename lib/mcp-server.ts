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

  try {
    console.log('🚀 Starting server-side MCP client initialization...');
    
    // Dynamic import to avoid bundling issues
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');

    // Determine if we should use HTTP transport (production) or StdIO (development)
    const useHttp = process.env.NODE_ENV === 'production' || process.env.MCP_SERVER_URL;
    
    let transport;
    if (useHttp) {
      // Use HTTP transport for production
      const serverUrl = config?.serverUrl || process.env.MCP_SERVER_URL;
      const apiKey = config?.apiKey || process.env.MCP_API_KEY;
      
      if (!serverUrl) {
        throw new Error('MCP_SERVER_URL is required for HTTP transport');
      }

      console.log('📡 Using HTTP transport for MCP');
      
      // Create a custom HTTP client for our deployed MCP server
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

      // Custom HTTP implementation instead of using StreamableHTTPClientTransport
      mcpClient = {
        async callFunction(functionName: string, args: any): Promise<any> {
          console.log(`🔄 HTTP MCP calling function: ${functionName}`);
          
          const response = await fetch(`${serverUrl}/tools/call`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
            },
            body: JSON.stringify({
              name: functionName,
              arguments: args,
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();
          console.log(`✅ HTTP MCP function ${functionName} completed`);
          
          // Extract text content from result
          if (result.result && Array.isArray(result.result) && result.result.length > 0) {
            return { type: 'text', text: result.result[0].text };
          }
          return result;
        },

        isConnected(): boolean {
          return true;
        },

        async disconnect(): Promise<void> {
          console.log('🔌 HTTP MCP Client disconnected');
        }
      };
      
      mcpInitialized = true;
      (global as any).manus = mcpClient;
      console.log('✅ HTTP MCP Client successfully initialized');
      return mcpClient;
    } else {
      // Use StdIO transport for development
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

      console.log('🖥️ Using StdIO transport for MCP');
      transport = new StdioClientTransport({
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env,
      });
    }

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

  } catch (error: any) {
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