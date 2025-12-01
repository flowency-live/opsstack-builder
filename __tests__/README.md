# Testing Guide

This directory contains all tests for the Specification Wizard application.

## Test Structure

- `__tests__/utils/` - Test utilities and factories
- `*.test.ts(x)` - Unit tests
- `*.property.test.ts` - Property-based tests using fast-check

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only property-based tests
npm run test:property

# Type check
npm run type-check
```

## Property-Based Testing

Property-based tests use the `fast-check` library to generate random test data and verify that properties hold across all inputs. Each property test:

- Runs a minimum of 100 iterations
- Is tagged with a comment referencing the design document property
- Uses smart generators that constrain to valid input spaces

Example:
```typescript
test('**Feature: spec-wizard, Property 1: Example Property**', () => {
  fc.assert(
    fc.property(
      arbitrarySessionState,
      async (sessionState) => {
        // Test implementation
        expect(result).toBe(expected);
      }
    ),
    { numRuns: 100 }
  );
});
```

## LocalStack Setup

For testing AWS services locally:

```bash
# Start LocalStack
npm run localstack:start

# Setup DynamoDB tables and S3 buckets
npm run localstack:setup

# Stop LocalStack
npm run localstack:stop
```

## Test Utilities

### Factories (`utils/factories.ts`)

Factory functions for creating test data:
- `createMessage()` - Create test messages
- `createSpecification()` - Create test specifications
- `createSessionState()` - Create test session states
- `arbitrary*` - fast-check arbitraries for property testing

### Test Helpers (`utils/test-helpers.ts`)

Helper functions for testing:
- `renderWithProviders()` - Render React components with providers
- `mockFetch()` - Mock fetch API
- `MockWebSocket` - Mock WebSocket for streaming tests
- `setupLocalStackEnv()` - Setup LocalStack environment variables

## Writing Tests

### Unit Tests

Focus on specific examples and edge cases:

```typescript
import { createMessage } from '../utils/factories';

describe('MessageComponent', () => {
  it('should render a user message', () => {
    const message = createMessage({ role: 'user', content: 'Hello' });
    // Test implementation
  });
});
```

### Property Tests

Verify universal properties across all inputs:

```typescript
import * as fc from 'fast-check';
import { arbitraryMessage } from '../utils/factories';

test('**Feature: spec-wizard, Property X: Message property**', () => {
  fc.assert(
    fc.property(arbitraryMessage, (message) => {
      // Property that should hold for all messages
      expect(message.content.length).toBeGreaterThan(0);
    }),
    { numRuns: 100 }
  );
});
```

## Best Practices

1. **Use factories** - Always use factory functions for creating test data
2. **Avoid mocking** - Test real behavior when possible
3. **Smart generators** - Constrain property test generators to valid input spaces
4. **Minimal tests** - Focus on core logic, avoid over-testing edge cases
5. **Clear names** - Use descriptive test names that explain what is being tested
6. **Tag property tests** - Always tag property tests with the design document reference
