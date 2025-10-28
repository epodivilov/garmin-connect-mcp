# Testing Guide

This project uses Vitest for comprehensive testing of the MCP server components.

## Test Structure

```
tests/
├── unit/                          # Unit tests for individual components
│   ├── sleep-tools.test.ts        # Sleep functionality tests (14 tests)
│   ├── overview-tools.test.ts     # Daily overview tests (12 tests)
│   ├── data-transforms.test.ts    # Utility function tests (18 tests)
│   ├── logger.test.ts             # Logger functionality tests (2 tests)
│   └── error-handling-validation.test.ts # Error handling validation (4 tests)
└── mocks/                         # Mock data and utilities
    ├── garmin-data.ts             # Realistic test data
    └── garmin-client-mock.ts      # Garmin API client mocks
```

## Running Tests

```bash
# Run tests in watch mode
pnpm test

# Run tests once
pnpm test:run

# Run tests with coverage report
pnpm test:coverage
```

## Test Coverage

Current test coverage:
- **50 tests** across 5 test files
- **Tools**: 81.98% coverage (high coverage for core functionality)
- **Utils**: 62.76% coverage (data transforms 100% covered)
- **Mocks**: 99.11% coverage (comprehensive mock implementation)

## Test Categories

### 1. Unit Tests
- **Sleep Tools**: Test sleep data retrieval, duration calculation, error handling
- **Overview Tools**: Test daily overview aggregation, graceful degradation
- **Data Transforms**: Test utility functions for data conversion and cleaning

### 2. Error Handling Tests
- **Graceful Degradation**: Overview tools handle individual service failures
- **Error Propagation**: Sleep tools properly return errors to user
- **Mock Validation**: Verify mock behavior matches expectations

### 3. Integration Validation
- **Response Format**: Validate all responses follow MCP protocol
- **Data Validation**: Ensure data transformations are correct
- **Edge Cases**: Test boundary conditions and error scenarios

## Key Test Features

### Silent Logging in Tests
The project uses a smart logger that:
- **Production**: Logs errors to console for debugging
- **Tests**: Silent to avoid noise in test output
- **Configurable**: Via `NODE_ENV` environment variable

### Comprehensive Mocking
- **Realistic Data**: Mock responses mirror actual Garmin API data
- **Failing Scenarios**: Test error conditions with failing mocks
- **Date-based Logic**: Different responses based on test dates

### Error Scenarios Tested
- ✅ API service failures
- ✅ Missing data graceful handling
- ✅ Invalid parameters
- ✅ Network errors
- ✅ Data size validation
- ✅ Response format validation

## Test Data

Mock data includes:
- **Sleep Data**: Complete sleep analysis with stages, scores, vitals
- **Activities**: Running activities with splits, metrics, training effects
- **Health Metrics**: Steps, heart rate, body composition, stress levels
- **Error Scenarios**: Predictable failures for testing error handling

## Best Practices

1. **Isolated Tests**: Each test is independent with fresh mocks
2. **Realistic Data**: Mock data matches real API response structures
3. **Error Coverage**: Both success and failure paths tested
4. **Type Safety**: All tests are fully typed with TypeScript
5. **Fast Execution**: Tests complete in <1 second for rapid development

## Continuous Integration

Tests are designed to run in CI environments:
- No external dependencies required
- Deterministic results
- Silent logging in test mode
- Comprehensive coverage reporting