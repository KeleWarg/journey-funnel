// Jest setup file for Journey Funnel Calculator tests

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock fetch for API tests
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock environment variables
process.env.NODE_ENV = 'test';

// Timeout for async operations
jest.setTimeout(30000);

// Mock MCP client for testing
jest.mock('../lib/mcp-server', () => ({
  initializeMCPOnServer: jest.fn().mockResolvedValue({
    callFunction: jest.fn().mockResolvedValue({
      type: 'text',
      text: JSON.stringify({ 
        baselineCR: 0.5,
        variants: [],
        metadata: { totalVariants: 0, averageUplift: 0 }
      })
    })
  })
}));

// Mock Next.js API request/response
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: jest.fn(() => ({
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  })),
})); 