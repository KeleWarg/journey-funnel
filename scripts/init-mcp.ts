import { initializeMCPClient } from '../lib/mcp-client';

export async function startMCPClient() {
  try {
    console.log('🚀 Starting MCP client initialization...');
    
    // Get configuration from environment variables
    const config = {
      serverCommand: process.env.MCP_SERVER_COMMAND,
      serverArgs: process.env.MCP_SERVER_ARGS?.split(' '),
      serverUrl: process.env.MCP_SERVER_URL,
      apiKey: process.env.MCP_API_KEY,
    };

    console.log('📋 MCP Configuration:', {
      serverCommand: config.serverCommand || 'default: python',
      serverArgs: config.serverArgs || 'default: ["-m", "your_mcp_server"]',
      serverUrl: config.serverUrl || 'not set',
      apiKey: config.apiKey ? '***configured***' : 'not set'
    });

    const client = await initializeMCPClient(config);
    
    if (client.isConnected()) {
      console.log('✅ MCP Client successfully initialized and connected');
      return client;
    } else {
      throw new Error('MCP Client initialization failed - not connected');
    }

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

4. Restart the Next.js development server after configuration
    `);
    
    // Don't throw the error - let the app start without MCP
    console.warn('⚠️  Application will continue without MCP functionality');
    return null;
  }
}

// Auto-initialize when this module is imported
let mcpInitPromise: Promise<any> | null = null;

export function ensureMCPInitialized() {
  if (!mcpInitPromise) {
    mcpInitPromise = startMCPClient();
  }
  return mcpInitPromise;
} 