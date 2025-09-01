// Utilities for environment variables and defaults
import dotenv from 'dotenv';
dotenv.config();

export const env = {
  BASE_URL: process.env.BASE_URL || 'https://www.flipkart.com',
  HEADLESS: process.env.HEADLESS ? process.env.HEADLESS === 'true' : true,
  USER_EMAIL: process.env.USER_EMAIL || '',
  USER_PASSWORD: process.env.USER_PASSWORD || '',
};
