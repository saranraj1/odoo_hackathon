import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.test BEFORE any test module is imported so that prisma/db.ts
// picks up the correct DATABASE_URL at import time.
dotenv.config({ path: path.resolve(__dirname, '.env.test'), override: true });

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
    // Pass the env to the child worker so prisma uses the test database
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? '',
      JWT_SECRET:   process.env.JWT_SECRET   ?? '',
      PORT:         process.env.PORT         ?? '3002',
      NODE_ENV:     'test',
      FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001',
    },
  },
});
