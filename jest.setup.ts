import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test';
process.env.AWS_SECRET_ACCESS_KEY = 'test';
process.env.DYNAMODB_TABLE_NAME = 'test-table';
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.OPENAI_API_KEY = 'test-key';
process.env.ANTHROPIC_API_KEY = 'test-key';

// Polyfill fetch for Node.js test environment
if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: async () => ({}),
      text: async () => '',
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
    } as Response)
  );
}

// Polyfill ReadableStream for Node.js test environment
if (typeof globalThis.ReadableStream === 'undefined') {
  const { ReadableStream } = require('stream/web');
  globalThis.ReadableStream = ReadableStream;
}

// Polyfill TextEncoder/TextDecoder for Node.js test environment
if (typeof globalThis.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// Mock uuid to avoid ESM issues
let uuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => {
    // Generate a proper UUID v4 format for testing
    uuidCounter++;
    const hex = () => Math.floor(Math.random() * 16).toString(16);
    const segment = (length: number) => Array.from({ length }, hex).join('');
    return `${segment(8)}-${segment(4)}-4${segment(3)}-${['8', '9', 'a', 'b'][Math.floor(Math.random() * 4)]}${segment(3)}-${segment(12)}`;
  }),
}));

// Mock AWS SDK DynamoDB client for tests
const mockDynamoDBItems = new Map<string, any>();

jest.mock('@aws-sdk/lib-dynamodb', () => {
  const actual = jest.requireActual('@aws-sdk/lib-dynamodb');
  
  return {
    ...actual,
    DynamoDBDocumentClient: {
      from: jest.fn(() => ({
        send: jest.fn(async (command: any) => {
          const commandName = command.constructor.name;
          
          if (commandName === 'PutCommand') {
            const key = `${command.input.Item.PK}#${command.input.Item.SK}`;
            mockDynamoDBItems.set(key, command.input.Item);
            return {};
          }
          
          if (commandName === 'GetCommand') {
            const key = `${command.input.Key.PK}#${command.input.Key.SK}`;
            const item = mockDynamoDBItems.get(key);
            return { Item: item };
          }
          
          if (commandName === 'QueryCommand') {
            const items: any[] = [];
            const values = command.input.ExpressionAttributeValues || {};
            const pk = values[':pk'];
            const skPrefix = values[':sk'];
            const gsi1pk = values[':gsi1pk'];
            
            mockDynamoDBItems.forEach((item, key) => {
              // Check if this is a GSI query
              if (gsi1pk && item.GSI1PK === gsi1pk) {
                items.push(item);
              } else if (pk && item.PK === pk) {
                if (!skPrefix || item.SK.startsWith(skPrefix)) {
                  items.push(item);
                }
              }
            });
            
            // Sort by SK if needed
            if (command.input.ScanIndexForward === false) {
              items.sort((a, b) => b.SK.localeCompare(a.SK));
            } else {
              items.sort((a, b) => a.SK.localeCompare(b.SK));
            }
            
            // Apply limit
            const limit = command.input.Limit || items.length;
            return { Items: items.slice(0, limit) };
          }
          
          if (commandName === 'UpdateCommand') {
            const key = `${command.input.Key.PK}#${command.input.Key.SK}`;
            const item = mockDynamoDBItems.get(key) || { ...command.input.Key };
            
            // Parse the UpdateExpression to extract attribute names
            const updateExpr = command.input.UpdateExpression || '';
            const updates = command.input.ExpressionAttributeValues || {};
            const attrNames = command.input.ExpressionAttributeNames || {};
            
            // Simple SET expression parser
            if (updateExpr.includes('SET')) {
              const setClause = updateExpr.split('SET')[1].trim();
              const assignments = setClause.split(',').map(s => s.trim());
              
              assignments.forEach(assignment => {
                const [attrRef, valueRef] = assignment.split('=').map(s => s.trim());
                
                // Resolve attribute name (handle both #name and direct name)
                const attrName = attrRef.startsWith('#') 
                  ? attrNames[attrRef] 
                  : attrRef;
                
                // Resolve value
                const value = updates[valueRef];
                
                if (attrName && value !== undefined) {
                  item[attrName] = value;
                }
              });
            }
            
            mockDynamoDBItems.set(key, item);
            return {};
          }
          
          return {};
        }),
      })),
    },
  };
});

// Clear mock data before each test
beforeEach(() => {
  mockDynamoDBItems.clear();
  uuidCounter = 0;
});
