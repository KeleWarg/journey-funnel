# Test Suite Documentation

This directory contains a comprehensive test suite for the Journey Funnel Optimizer application.

## Overview

The test suite covers:
- ✅ API endpoint testing (calculate, backsolve, optimize)
- ✅ React component testing with user interactions
- ✅ Custom hooks testing with SWR integration
- ✅ Context state management testing
- ✅ Integration workflow testing
- ✅ Mathematical algorithm validation
- ✅ Performance and edge case testing

## Test Structure

```
tests/
├── setup.ts                           # Test configuration and global mocks
├── unit/                              # Unit tests
│   ├── api/                          # API endpoint tests
│   │   ├── calculate.test.ts         # Core calculation API tests
│   │   ├── backsolve.test.ts         # Parameter optimization tests
│   │   ├── optimize.test.ts          # Funnel ordering optimization tests
│   │   └── spreadsheet-upload.test.ts # File upload functionality tests
│   ├── components/                   # React component tests
│   │   └── FunnelSettingsSection.test.tsx # Main settings component tests
│   ├── hooks/                        # Custom hook tests
│   │   └── use-api.test.tsx          # API hook with SWR testing
│   ├── contexts/                     # Context provider tests
│   │   └── FunnelAnalysisContext.test.tsx # State management tests
│   ├── lib/                          # Library and utility tests
│   │   └── redis.test.ts             # Cache operations tests
│   ├── calculateFunnel.test.ts       # Core business logic tests
│   └── backsolve.test.ts             # Mathematical optimization tests
└── integration/                      # Integration tests
    └── complete-analysis-workflow.test.ts # End-to-end workflow tests
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### CI Mode
```bash
npm run test:ci
```

### Individual Test Files
```bash
npm test tests/unit/api/calculate.test.ts
npm test tests/unit/components/FunnelSettingsSection.test.tsx
npm test tests/integration/complete-analysis-workflow.test.ts
```

## Current Coverage

The test suite achieves strong coverage of critical business logic:

### API Endpoints
- **calculate.ts**: 87% lines, 70% branches - Core conversion rate calculations
- **backsolve.ts**: 94% lines, 70% branches - Parameter optimization
- **optimize.ts**: 71% lines, 59% branches - Funnel ordering optimization

### React Components & Hooks
- **FunnelAnalysisContext**: 100% coverage - State management
- **Custom hooks**: Comprehensive SWR integration testing
- **UI components**: User interaction and accessibility testing

## Test Features

### Mathematical Validation
- Fogg B=MAT model implementation
- Genetic algorithm optimization
- Grid search parameter fitting
- Conversion rate calculations
- Statistical analysis validation

### API Testing
- Request/response validation
- Error handling and edge cases
- Parameter override testing
- Cache behavior verification
- Performance benchmarking

### Integration Testing
- Complete analysis workflows
- API dependency chains
- Error recovery scenarios
- Performance under load
- Data consistency validation

### Component Testing
- User interactions with Testing Library
- State updates and prop handling
- Accessibility compliance
- Form validation and submission
- Loading states and error boundaries

## Mock Strategy

Tests use comprehensive mocking for:
- **External APIs**: OpenAI, Firecrawl, Redis
- **File Operations**: CSV/Excel processing
- **HTTP Requests**: Fetch API with realistic responses
- **Browser APIs**: LocalStorage, SessionStorage
- **Next.js**: Router, Image components

## Test Quality Standards

- **AAA Pattern**: Arrange, Act, Assert structure
- **Descriptive Names**: Clear test descriptions
- **Independent Tests**: No test dependencies
- **Realistic Data**: Production-like test scenarios
- **Edge Cases**: Boundary conditions and error states
- **Performance**: Timeout limits and benchmarking

## Contributing

When adding new tests:

1. Follow existing patterns and structure
2. Use descriptive test names
3. Test both happy path and edge cases
4. Include performance considerations
5. Mock external dependencies appropriately
6. Maintain high coverage standards

## Troubleshooting

### Common Issues

**Module not found errors**
- Check that all dependencies are installed: `npm install`
- Verify import paths match actual file structure

**Timeout errors**
- Increase timeout in jest.config.js if needed
- Check for infinite loops or hanging promises

**Mock issues**
- Clear mocks in beforeEach hooks
- Verify mock implementations match expected API

### Getting Help

- Check test logs for specific error messages
- Review Jest documentation for advanced features
- Examine existing working tests for patterns
- Validate that all required dependencies are installed

## Future Enhancements

Potential improvements:
- Visual regression testing
- E2E testing with Playwright
- Performance testing with larger datasets
- Snapshot testing for UI components
- API contract testing
- Load testing for optimization algorithms