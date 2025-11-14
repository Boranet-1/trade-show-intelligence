/**
 * List available Gemini models
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line: string) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;

async function listModels() {
  if (!GOOGLE_AI_API_KEY) {
    console.error('❌ GOOGLE_AI_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log('🔍 Fetching available Gemini models...\n');

  const genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY);

  try {
    // Try to list models
    const models = await genAI.listModels();

    console.log('Available models:');
    console.log('================\n');

    for await (const model of models) {
      console.log(`Model: ${model.name}`);
      console.log(`  Display Name: ${model.displayName}`);
      console.log(`  Supported Methods: ${model.supportedGenerationMethods?.join(', ')}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error listing models:', error);

    // Try common model names
    console.log('\n💡 Trying common model names...\n');

    const commonModels = [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash-8b',
      'gemini-pro',
      'models/gemini-1.5-flash',
      'models/gemini-1.5-pro',
    ];

    for (const modelName of commonModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Test');
        const response = await result.response;
        console.log(`✅ ${modelName} - WORKS`);
      } catch (err) {
        console.log(`❌ ${modelName} - ${err instanceof Error ? err.message.substring(0, 100) : 'Failed'}`);
      }
    }
  }
}

listModels();
