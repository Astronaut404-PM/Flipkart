// Utilities for environment variables and defaults
import dotenv from 'dotenv';
dotenv.config();

export const env = {
  BASE_URL: process.env.BASE_URL || 'https://www.flipkart.com',
  HEADLESS: process.env.HEADLESS ? process.env.HEADLESS === 'true' : true,
  USER_EMAIL: process.env.USER_EMAIL || '',
  USER_PASSWORD: process.env.USER_PASSWORD || '',
  // Langfuse configuration
  LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY || '',
  LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY || '',
  LANGFUSE_BASE_URL: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
  LANGFUSE_DEBUG: process.env.LANGFUSE_DEBUG ? process.env.LANGFUSE_DEBUG === 'true' : false,

  // OpenAI configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || undefined,
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  // LLM test behavior
  LLM_STRICT_ASSERT: process.env.LLM_STRICT_ASSERT ? process.env.LLM_STRICT_ASSERT === 'true' : false,
};
