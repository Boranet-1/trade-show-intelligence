# Trade Show Intelligence Platform - Setup Guide

## API Keys Integration

The platform uses **Multi-LLM Consensus** for zero-hallucination enrichment, requiring 4 LLM providers:

### Configured Providers

1. **Anthropic Claude** - Primary reasoning and company research
2. **OpenAI GPT-4** - Secondary validation and enrichment
3. **Google Gemini** - Consensus verification
4. **OpenRouter** - Fourth provider for consensus (replaces Perplexity)

### Why OpenRouter?

OpenRouter provides access to multiple LLM models through a single API, offering:
- Unified interface for various models
- Better rate limiting and reliability
- Cost-effective alternative to Perplexity
- Access to models like Claude, GPT-4, Gemini, and others through one API

### Environment Variables

All API keys are configured in `.env.local` (gitignored for security):

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
GOOGLE_AI_API_KEY=AIza...
OPENROUTER_API_KEY=sk-or-v1-...
CONTEXT7_APIKEY=ctx7sk-... (optional)
```

### Configuration Validation

The system validates all API keys on startup using `lib/config.ts`. If any keys are missing, the application will:

1. Throw a clear error message indicating which keys are missing
2. Support graceful degradation (3/4 consensus instead of 4/4 if one provider is unavailable)
3. Log which providers are active

### Testing Configuration

Run this command to verify your configuration:

```bash
npm run dev
```

If all API keys are valid, you should see the Next.js dev server start without errors.

### Checking Provider Status

The `checkLLMProviders()` function in `lib/config.ts` can be used to verify provider availability:

```typescript
import { checkLLMProviders } from '@/lib/config'

const status = checkLLMProviders()
console.log('All configured:', status.allConfigured)
console.log('Available providers:', status.availableProviders)
console.log('Missing providers:', status.missingProviders)
```

## Next Steps

1. Verify API keys are working by testing individual provider connections
2. Proceed with Phase 2 implementation (Foundational infrastructure)
3. Begin building storage adapters and enrichment orchestration

## Storage Configuration

Currently configured for **Local Storage** (file-based JSON):
- No database setup required for MVP
- Data stored in `./data/` directory (gitignored)
- Easy to switch to MySQL or HubSpot later

To use MySQL or HubSpot, update `STORAGE_ADAPTER` in `.env.local` and provide the required connection details.

## Security Notes

- `.env.local` is gitignored and never committed to version control
- API keys are encrypted at rest when stored in database using AES-256
- Encryption key defined in `ENCRYPTION_KEY` environment variable
- For production, use secure key management service (AWS Secrets Manager, etc.)
