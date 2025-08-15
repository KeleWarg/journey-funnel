// Enhanced Jest setup file for comprehensive testing
import '@testing-library/jest-dom';

// Mock console methods to reduce noise in tests (but allow errors through)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging test failures
};

// Enhanced fetch mock with better error handling
const createMockResponse = (data: any, ok = true, status = 200) => ({
  ok,
  status,
  statusText: ok ? 'OK' : 'Error',
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
  headers: new Map([
    ['content-type', 'application/json'],
    ['cache-control', 'public, max-age=300']
  ])
});

global.fetch = jest.fn((url: string, options?: RequestInit) => {
  // Default successful responses for different endpoints
  if (url.includes('/api/calculate')) {
    return Promise.resolve(createMockResponse({
      per_step_metrics: [
        {
          step: 1,
          SC_s: 2.5,
          F_s: 1.2,
          PS_s: 2.1,
          M_s: 3.8,
          delta_s: -1.7,
          p_exit_s: 0.15,
          CR_s: 0.85,
          cumulative_CR_s: 0.85,
          U_s_pred: 850
        }
      ],
      overall_predicted_CR: 0.85
    }));
  }
  
  if (url.includes('/api/backsolve')) {
    return Promise.resolve(createMockResponse({
      bestParams: {
        best_k: 0.24,
        best_gamma_exit: 1.04,
        best_mse: 0.001,
        overall_predicted_CR_best: 0.82,
        overall_observed_CR: 0.8
      }
    }));
  }
  
  if (url.includes('/api/optimize')) {
    return Promise.resolve(createMockResponse({
      algorithm: 'exhaustive',
      optimalOrder: [0, 1],
      optimalCRTotal: 0.87,
      allSamples: []
    }));
  }

  // Default response
  return Promise.resolve(createMockResponse({ success: true }));
});

// Enhanced localStorage mock
const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    length: 0,
    key: jest.fn()
  };
};

const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

// Mock environment variables for testing
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  OPENAI_API_KEY: 'test-key-for-testing',
  REDIS_URL: 'redis://localhost:6379'
};

// Extended timeout for integration tests
jest.setTimeout(45000);

// Mock external services
jest.mock('../lib/mcp-server', () => ({
  initializeMCPOnServer: jest.fn().mockResolvedValue({
    callFunction: jest.fn().mockResolvedValue({
      type: 'text',
      text: JSON.stringify({ 
        baselineCR: 0.5,
        variants: [
          { framework: 'PAS', uplift_pp: 0.05, confidence: 0.85 },
          { framework: 'AIDA', uplift_pp: 0.03, confidence: 0.75 }
        ],
        metadata: { totalVariants: 2, averageUplift: 0.04 }
      })
    })
  })
}));

// Mock OpenAI
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                assessments: [
                  {
                    questionIndex: 0,
                    PAS: { score: 8.0, reasoning: 'Strong problem-agitation-solution flow' },
                    Fogg: { score: 7.5, reasoning: 'Good motivation and ability balance' },
                    Nielsen: { score: 8.2, reasoning: 'Excellent usability principles' },
                    AIDA: { score: 7.8, reasoning: 'Effective attention and interest generation' },
                    Cialdini: { score: 7.0, reasoning: 'Moderate persuasion principles' }
                  }
                ]
              })
            }
          }]
        })
      }
    }
  }))
}));

// Mock Redis for testing
jest.mock('../lib/redis', () => ({
  cache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    getStats: jest.fn().mockReturnValue({
      hits: 0,
      misses: 0,
      total: 0,
      hitRate: '0.00%',
      redisConnected: true
    }),
    isConnected: jest.fn().mockReturnValue(true)
  }
}));

// Mock Vercel Analytics
jest.mock('@vercel/analytics/next', () => ({
  Analytics: () => null
}));

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    }
  })
}));

// Mock file operations for spreadsheet upload tests
global.FileReader = class MockFileReader {
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  readAsArrayBuffer = jest.fn();
  readAsText = jest.fn();
  result: string | ArrayBuffer | null = null;
  
  // Simulate successful file read
  mockSuccess(data: string) {
    this.result = data;
    if (this.onload) {
      this.onload({ target: this } as ProgressEvent<FileReader>);
    }
  }
  
  // Simulate file read error
  mockError() {
    if (this.onerror) {
      this.onerror({ target: this } as ProgressEvent<FileReader>);
    }
  }
} as any;

// Performance measurement helpers for tests
global.performance = {
  ...global.performance,
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn().mockReturnValue([]),
  now: jest.fn(() => Date.now())
}; 