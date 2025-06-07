import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

interface MCPManusClient {
  callFunction: (functionName: string, args: any) => Promise<any>;
  isConnected: () => boolean;
  disconnect: () => Promise<void>;
}

class ManusClient implements MCPManusClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private connected = false;

  async connect(serverConfig: {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }): Promise<void> {
    try {
      // Create transport (this would connect to your MCP server)
      this.transport = new StdioClientTransport({
        command: serverConfig.command,
        args: serverConfig.args || [],
        env: serverConfig.env as Record<string, string>,
      });

      // Create client
      this.client = new Client(
        {
          name: "journey-funnel-client",
          version: "1.0.0",
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      // Connect
      await this.client.connect(this.transport);
      this.connected = true;
      
      console.log('✅ MCP Client connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect MCP client:', error);
      throw error;
    }
  }

  async callFunction(functionName: string, args: any): Promise<any> {
    if (!this.client || !this.connected) {
      throw new Error('MCP client not connected');
    }

    try {
      console.log(`🔄 MCP calling function: ${functionName}`, args);
      
      // Call the MCP tool
      const result = await this.client.callTool({
        name: functionName,
        arguments: args,
      });

      console.log(`✅ MCP function ${functionName} completed`);
      return (result as any).content[0];

    } catch (error) {
      console.error(`❌ MCP function ${functionName} failed:`, error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.connected = false;
      console.log('🔌 MCP Client disconnected');
    }
  }
}

// Global MCP client instance
let globalManusClient: ManusClient | null = null;

export async function initializeMCPClient(config?: {
  serverCommand?: string;
  serverArgs?: string[];
  serverUrl?: string;
  apiKey?: string;
}): Promise<MCPManusClient> {
  if (globalManusClient?.isConnected()) {
    return globalManusClient;
  }

  globalManusClient = new ManusClient();

  // Default configuration - adjust based on your MCP server setup
  const serverConfig = {
    command: config?.serverCommand || process.env.MCP_SERVER_COMMAND || 'python',
    args: config?.serverArgs || process.env.MCP_SERVER_ARGS?.split(' ') || ['-m', 'your_mcp_server'],
    env: {
      ...process.env,
      ...(config?.apiKey && { MCP_API_KEY: config.apiKey }),
      ...(config?.serverUrl && { MCP_SERVER_URL: config.serverUrl }),
    }
  };

  await globalManusClient.connect(serverConfig);
  
  // Make it globally available
  (global as any).manus = globalManusClient;
  
  return globalManusClient;
}

export function getMCPClient(): MCPManusClient | null {
  return globalManusClient;
}

export { ManusClient }; 