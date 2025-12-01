# Specification Wizard - Project Setup

This document describes the project structure and setup completed for the Specification Wizard application.

## ✅ Completed Setup Tasks

### Task 1: Project Structure and Development Environment

#### 1.1 Next.js 14+ with TypeScript and App Router
- ✅ Next.js 16.0.6 initialized with TypeScript
- ✅ App Router configured (app directory structure)
- ✅ TypeScript strict mode enabled in tsconfig.json

#### 1.2 Tailwind CSS Configuration
- ✅ Tailwind CSS v4 installed and configured
- ✅ Custom theme created complementary to FlowencyBuild
  - Primary: Teal/Cyan (hsl(180 80% 50%)) - complements FlowencyBuild purple
  - Secondary: FlowencyBuild purple for brand connection
  - Background: Softer navy for distinct but harmonious feel
- ✅ Custom animations and utility classes defined
- ✅ Glass effect and gradient text utilities

#### 1.3 AWS SDK Configuration
- ✅ AWS SDK packages installed:
  - @aws-sdk/client-dynamodb
  - @aws-sdk/client-s3
  - @aws-sdk/client-ses
  - @aws-sdk/lib-dynamodb
- ✅ AWS client configuration files created:
  - `lib/aws/config.ts` - Central configuration
  - `lib/aws/dynamodb.ts` - DynamoDB client
  - `lib/aws/s3.ts` - S3 client
  - `lib/aws/ses.ts` - SES client
  - `lib/aws/index.ts` - Unified exports
- ✅ LocalStack support configured for local development

#### 1.4 Environment Variables
- ✅ `.env.example` created with all required variables:
  - AWS credentials and region
  - DynamoDB table configuration
  - S3 bucket configuration
  - SES email configuration
  - LLM API keys (OpenAI, Anthropic)
  - LocalStack endpoints for local development

#### 1.5 ESLint and Prettier
- ✅ ESLint configured with Next.js recommended rules
- ✅ Prettier installed and configured
- ✅ `.prettierrc.json` and `.prettierignore` created
- ✅ Format scripts added to package.json

#### 1.6 TypeScript Strict Mode
- ✅ Strict mode enabled in tsconfig.json
- ✅ Path aliases configured (@/* for root imports)
- ✅ Type checking script added

### Task 1.1: Testing Infrastructure

#### 1.1.1 Jest and React Testing Library
- ✅ Jest installed and configured
- ✅ React Testing Library installed
- ✅ @testing-library/jest-dom for DOM assertions
- ✅ @testing-library/user-event for user interactions
- ✅ jest-environment-jsdom for React component testing
- ✅ ts-node for TypeScript config support
- ✅ `jest.config.ts` created with Next.js integration
- ✅ `jest.setup.ts` created with environment variables

#### 1.1.2 fast-check for Property-Based Testing
- ✅ fast-check installed
- ✅ Custom arbitraries created for domain objects
- ✅ Property test examples in setup.test.ts
- ✅ Test script for running property tests specifically

#### 1.1.3 LocalStack for AWS Service Emulation
- ✅ LocalStack package installed
- ✅ docker-compose.yml created for LocalStack container
- ✅ Setup script created: `scripts/setup-localstack.sh`
- ✅ LocalStack configuration in AWS clients
- ✅ npm scripts for LocalStack management

#### 1.1.4 Test Utilities and Factories
- ✅ `__tests__/utils/factories.ts` created with:
  - Factory functions for all domain objects
  - fast-check arbitraries for property testing
  - Type-safe test data generation
- ✅ `__tests__/utils/test-helpers.ts` created with:
  - Custom render function
  - Mock utilities (fetch, WebSocket)
  - LocalStack environment setup
  - Test ID generators
- ✅ `__tests__/README.md` with testing guide
- ✅ `__tests__/setup.test.ts` to verify infrastructure

## Project Structure

```
spec-wizard/
├── app/                          # Next.js App Router
│   ├── globals.css              # Global styles (imports tailwind.css)
│   ├── tailwind.css             # Custom Tailwind theme
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── lib/                         # Shared libraries
│   └── aws/                     # AWS SDK configuration
│       ├── config.ts            # AWS configuration
│       ├── dynamodb.ts          # DynamoDB client
│       ├── s3.ts                # S3 client
│       ├── ses.ts               # SES client
│       └── index.ts             # Exports
├── __tests__/                   # Test files
│   ├── utils/                   # Test utilities
│   │   ├── factories.ts         # Test data factories
│   │   └── test-helpers.ts      # Test helper functions
│   ├── README.md                # Testing guide
│   └── setup.test.ts            # Infrastructure verification
├── scripts/                     # Utility scripts
│   └── setup-localstack.sh      # LocalStack setup script
├── .env.example                 # Environment variable template
├── .prettierrc.json             # Prettier configuration
├── .prettierignore              # Prettier ignore patterns
├── docker-compose.yml           # LocalStack container config
├── jest.config.ts               # Jest configuration
├── jest.setup.ts                # Jest setup file
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
├── eslint.config.mjs            # ESLint configuration
├── package.json                 # Dependencies and scripts
└── PROJECT_SETUP.md             # This file
```

## Available Scripts

```bash
# Development
npm run dev                      # Start development server
npm run build                    # Build for production
npm run start                    # Start production server

# Code Quality
npm run lint                     # Run ESLint
npm run format                   # Format code with Prettier
npm run format:check             # Check code formatting
npm run type-check               # TypeScript type checking

# Testing
npm test                         # Run all tests
npm run test:watch               # Run tests in watch mode
npm run test:coverage            # Run tests with coverage
npm run test:property            # Run only property-based tests

# LocalStack (AWS Local Development)
npm run localstack:start         # Start LocalStack container
npm run localstack:stop          # Stop LocalStack container
npm run localstack:setup         # Setup DynamoDB tables and S3 buckets
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

### 3. Start LocalStack (for local development)

```bash
# Start LocalStack container
npm run localstack:start

# Setup AWS resources
npm run localstack:setup
```

### 4. Run Tests

```bash
npm test
```

### 5. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Technology Stack

- **Framework:** Next.js 16.0.6 (App Router)
- **Language:** TypeScript 5.x (strict mode)
- **Styling:** Tailwind CSS v4
- **Testing:** Jest + React Testing Library + fast-check
- **AWS Services:** DynamoDB, S3, SES
- **Local Development:** LocalStack
- **Code Quality:** ESLint + Prettier

## Design System

### Color Palette

The Specification Wizard uses a teal/cyan color scheme that complements FlowencyBuild's purple branding while maintaining a distinct identity:

- **Primary:** Teal/Cyan (hsl(180 80% 50%))
- **Secondary:** FlowencyBuild Purple (hsl(262 83% 58%))
- **Accent:** Warm Yellow (hsl(45 95% 55%))
- **Background:** Soft Navy (hsl(220 40% 12%))
- **Surface:** Lighter Navy (hsl(220 35% 18%))

### Key Features

- Softer, more approachable feel than FlowencyBuild
- Maintains brand connection through purple accents
- Teal primary color provides visual distinction
- Glass morphism effects for modern UI
- Smooth animations and transitions

## Next Steps

The project structure and development environment are now complete. You can proceed with:

1. **Task 2:** Implement data models and DynamoDB schema
2. **Task 3:** Build SessionManager service
3. **Task 4:** Implement LLM integration layer

Refer to `SpecBuild/.kiro/specs/spec-wizard/tasks.md` for the complete implementation plan.

## Requirements Validated

This setup satisfies:
- ✅ Requirements 20.1: Distinct but complementary branding to FlowencyBuild
- ✅ Requirements 20.2: Visual design that complements FlowencyBuild brand
- ✅ All testing foundation requirements for property-based testing

## Notes

- **Node.js Version:** This project requires Node.js >=20.9.0 for Next.js 16
- **LocalStack:** Required for local AWS service testing
- **Environment Variables:** Never commit `.env.local` - use `.env.example` as template
- **Testing:** Property tests run 100 iterations minimum as per design spec
