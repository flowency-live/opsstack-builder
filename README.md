# Flowency Builder

**Conversational AI assistant that transforms product ideas into build-ready specifications.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.0.6-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-blue.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

---

## Quick Links

- **[System Bible](docs/SYSTEM_BIBLE.md)** - Complete architecture documentation (single source of truth)
- **[Change Log](docs/SYSTEM_BIBLE.md#change-log)** - Version history and major changes
- **[Deployment Guide](infrastructure/DEPLOYMENT_GUIDE.md)** - AWS Amplify deployment instructions

---

## What is Flowency Builder?

Flowency Builder helps users create comprehensive product specifications (PRDs) through natural conversation. The system uses a two-LLM architecture to deliver both:
- **Fast conversational responses** (< 3 seconds)
- **Comprehensive specification quality** (build-ready PRDs)

### Key Features

✅ **Gap-Driven Conversation** - AI asks only about missing sections, no redundant questions
✅ **Incremental Refinement** - Specification builds gradually, never regenerates from scratch
✅ **Living PRD** - Exportable at any point (PDF, Markdown, Email)
✅ **Magic Link Recovery** - Resume sessions across devices
✅ **Production-Ready** - No quick fixes, enterprise-grade architecture

---

## Tech Stack

```
Frontend:  Next.js 16.0.6 (App Router), React 19.2.0, Zustand
Backend:   Next.js API Routes (serverless on AWS Amplify)
Database:  DynamoDB (on-demand billing)
Storage:   S3 (PDFs, exports)
Email:     AWS SES (magic links, sharing)
AI:        OpenAI (gpt-4o-mini), Anthropic (claude-3-5-haiku-20241022)
PDF:       @sparticuz/chromium + puppeteer-core
```

---

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- AWS Account (DynamoDB, S3, SES)
- OpenAI API Key
- Anthropic API Key

### Installation

```bash
# Clone repository
git clone https://github.com/flowency-live/builder.git
cd builder/spec-wizard

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys and AWS config

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DYNAMODB_TABLE_NAME=spec-wizard-sessions
AWS_REGION=eu-west-2
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional (for email features)
AWS_SES_FROM_EMAIL=noreply@flowency.build
```

See [infrastructure/DEPLOYMENT_GUIDE.md](infrastructure/DEPLOYMENT_GUIDE.md) for production setup.

---

## Architecture Overview

### Two-LLM Design

Flowency Builder uses **two separate LLM instances** for different responsibilities:

| Component | Purpose | Context | Performance |
|-----------|---------|---------|-------------|
| **Chat AI** | Conversational experience | Last 10 messages + spec state | < 3 seconds |
| **PRD Engine** | Specification synthesis | Last 6 messages + current spec | 5-10 seconds (async) |

**Why two LLMs?**
- Fast chat requires minimal context
- Quality spec requires comprehensive analysis
- Can't optimize a single LLM for both conflicting goals

### The Feedback Loop

```
User Message
    ↓
Conversation Engine (sees spec + missingSections)
    ↓
Chat AI asks about GAPS ONLY
    ↓
Every 3 messages → PRD Engine (async)
    ↓
PRESERVES existing + ADDS new info
    ↓
Returns updated spec + new missingSections
    ↓
Next message sees UPDATED state
```

**Result**: Specification builds incrementally, exportable at any point.

See [docs/SYSTEM_BIBLE.md](docs/SYSTEM_BIBLE.md) for complete architecture documentation.

---

## Project Structure

```
spec-wizard/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes (serverless functions)
│   │   ├── sessions/             # Session management
│   │   │   ├── route.ts          # Create session
│   │   │   └── [id]/
│   │   │       ├── messages/     # Message handling (main conversation loop)
│   │   │       ├── state/        # Get session state
│   │   │       └── abandon/      # Abandon session
│   │   ├── export/               # PDF/Markdown export
│   │   └── submit/               # Submit completed spec
│   ├── page.tsx                  # Landing page
│   ├── chat/[id]/page.tsx        # Chat interface
│   └── presentation/[id]/page.tsx # Spec presentation view
│
├── lib/                          # Core business logic
│   ├── services/                 # Service layer
│   │   ├── llm-router.ts         # AI provider selection & fallback
│   │   ├── conversation-engine.ts # Conversation orchestration
│   │   ├── prd-engine.ts         # Spec synthesis
│   │   ├── session-manager.ts    # DynamoDB persistence
│   │   ├── prompt-manager.ts     # Stage-specific prompts
│   │   └── export-service.ts     # PDF/Markdown generation
│   ├── models/                   # TypeScript types
│   │   └── types.ts              # Core interfaces
│   ├── store/                    # Client-side state (Zustand)
│   │   ├── session-store.ts      # Session state
│   │   ├── sync-service.ts       # Server sync
│   │   └── use-session.ts        # React hooks
│   └── utils/                    # Utilities
│
├── docs/                         # Documentation
│   └── SYSTEM_BIBLE.md           # ⭐ Single source of truth
│
├── infrastructure/               # AWS deployment
│   ├── DEPLOYMENT_GUIDE.md       # Amplify setup
│   └── QUICK_REFERENCE.md        # Common commands
│
└── __tests__/                    # Tests (Jest)
```

---

## Key Concepts

### Specification (The Living PRD)

The specification is the **source of truth** for conversation flow. It contains:

- **Plain English Summary**: Overview, target users, key features, flows, rules, non-functional requirements, MVP definition
- **Formal PRD**: User stories, acceptance criteria, glossary, requirements

The spec is **always exportable** at any stage (PDF, Markdown, Email).

### Completeness State

Tracks specification progress:

```typescript
{
  missingSections: ["overview", "flows", "constraints"],
  readyForHandoff: false,
  lastEvaluated: "2025-12-04T10:30:00Z"
}
```

**missingSections** drives conversation - AI asks about gaps only.

### Conversation Stages

```typescript
'initial'      // 0 messages (welcome)
'discovery'    // > 3 missing sections (who, what, why)
'refinement'   // 1-3 missing sections (details, edge cases)
'validation'   // 0 missing sections OR < 20 messages (confirm, finalize)
'completion'   // readyForHandoff = true AND 20+ messages
```

Stages determine AI personality and question style.

---

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server (localhost:3000)

# Production
npm run build            # Build for production
npm run start            # Start production server

# Quality
npm run type-check       # TypeScript type checking (0 errors required)
npm run lint             # ESLint
npm run format           # Prettier format
npm run format:check     # Prettier check

# Testing
npm run test             # Jest tests
npm run test:watch       # Jest watch mode
npm run test:coverage    # Coverage report
```

### Build Requirements

**Zero tolerance for TypeScript errors**:
```bash
npm run type-check
# Must output: No errors
```

All code must pass type checking before commit.

### Git Workflow

```bash
git add .
git commit -m "Clear description of what changed

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

AWS Amplify auto-deploys on push to main (enabled).

---

## Critical Design Decisions

### 1. Spec-First Architecture

**Decision**: Specification drives conversation, not conversation history.

**Why**: Ensures conversation stays focused, prevents redundancy, makes spec always exportable.

### 2. Incremental Refinement

**Decision**: Spec builds gradually; never regenerates from scratch.

**Why**: Preserves initial info dumps, prevents data loss, intuitive UX (spec improves over time).

### 3. Gap-Driven Conversation

**Decision**: AI only asks about missing sections.

**Why**: Efficient, focused conversations. No redundant questions.

### 4. 20-Message Minimum

**Decision**: Conversation cannot end before 20 messages.

**Why**: Prevents premature completion from large initial dumps. Ensures thorough refinement.

### 5. No Quick Fixes Policy

**Decision**: Always implement production-grade solutions.

**Why**: Technical debt compounds. Quality over speed for long-term maintainability.

See [docs/SYSTEM_BIBLE.md#critical-design-decisions](docs/SYSTEM_BIBLE.md#critical-design-decisions) for full rationale.

---

## Common Issues

### TypeScript Build Errors

**Problem**: `npm run build` fails with type errors

**Solution**:
```bash
npm run type-check
# Read errors, fix them
# Repeat until: "No errors"
```

### PDF Export 500 Error

**Problem**: PDF generation fails on serverless

**Solution**: Ensure @sparticuz/chromium is installed (serverless-compatible):
```bash
npm install @sparticuz/chromium puppeteer-core
```

### Conversation Ending Prematurely

**Problem**: AI says "Your specification is complete" after 8 messages

**Check**:
1. Is `MIN_MESSAGES_FOR_COMPLETION` set to 20? ([conversation-engine.ts:228](lib/services/conversation-engine.ts#L228))
2. Is stage determination using `missingSections` logic? ([conversation-engine.ts:222-243](lib/services/conversation-engine.ts#L222-L243))

### Spec Losing Information

**Problem**: Initial info dump disappears after a few messages

**Check**:
1. Is PRD engine receiving last 6 messages (not 3)? ([messages/route.ts:181-183](app/api/sessions/[id]/messages/route.ts#L181-L183))
2. Does PRD engine prompt have preservation rules? ([prd-engine.ts:119-172](lib/services/prd-engine.ts#L119-L172))

---

## Deployment

### AWS Amplify Setup

1. **Connect Repository**: Link GitHub repo to Amplify
2. **Configure Build**:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm install
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
   ```
3. **Environment Variables**: Add in Amplify Console
4. **Deploy**: Push to main branch

See [infrastructure/DEPLOYMENT_GUIDE.md](infrastructure/DEPLOYMENT_GUIDE.md) for detailed instructions.

### Production Checklist

- [ ] Environment variables configured
- [ ] DynamoDB table created (`spec-wizard-sessions`)
- [ ] S3 bucket created (for PDFs)
- [ ] SES email verified (for magic links)
- [ ] `npm run build` succeeds with 0 errors
- [ ] `npm run type-check` succeeds with 0 errors
- [ ] API keys valid (OpenAI, Anthropic)
- [ ] AWS credentials configured (Amplify service role)

---

## Monitoring

### CloudWatch Logs

```bash
# View logs (replace with your function name)
aws logs tail /aws/lambda/spec-wizard-api --follow --region eu-west-2
```

### Key Metrics

- **Chat AI Response Time**: Should be < 3 seconds
- **PRD Engine Response Time**: 5-10 seconds (async, not user-facing)
- **Conversation Length**: Average 20-30 messages per session
- **Specification Quality**: 95%+ completion rate before handoff

### Error Tracking

Watch for:
- `[LLM] OpenAI/Anthropic timeout` - Provider issues
- `[PRD] Async update failed` - Spec synthesis errors
- `[SESSION] DynamoDB error` - Persistence issues

---

## Contributing

### Code Style

- **No emojis** in code, comments, or console.log statements
- **UK English** in all user-facing text
- **One-line commit messages** (clear, concise)
- **No quick fixes** - production-grade solutions only

### Before Submitting PR

1. Run `npm run type-check` (must pass)
2. Run `npm run lint` (must pass)
3. Test locally with `npm run dev`
4. Update [docs/SYSTEM_BIBLE.md](docs/SYSTEM_BIBLE.md) if architecture changed
5. Add entry to Change Log if significant

---

## Support

- **Documentation**: [docs/SYSTEM_BIBLE.md](docs/SYSTEM_BIBLE.md)
- **Issues**: [GitHub Issues](https://github.com/flowency-live/builder/issues)
- **Email**: support@flowency.build

---

## License

Copyright © 2025 Flowency Ltd. All rights reserved.

This is proprietary software. Unauthorized copying, distribution, or modification is strictly prohibited.

---

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [OpenAI](https://openai.com/) - GPT-4o-mini
- [Anthropic](https://anthropic.com/) - Claude 3.5 Haiku
- [AWS Amplify](https://aws.amazon.com/amplify/) - Serverless hosting
- [DynamoDB](https://aws.amazon.com/dynamodb/) - NoSQL database
- [@sparticuz/chromium](https://github.com/Sparticuz/chromium) - Serverless Chromium

---

**Current Version**: v0.3.1 (Dec 4, 2025)

See [docs/SYSTEM_BIBLE.md#change-log](docs/SYSTEM_BIBLE.md#change-log) for version history.
