import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });

if (!process.env.DATABASE_URL?.includes('assetflow_test')) {
  throw new Error(
    'Refusing to run tests: DATABASE_URL must point at the assetflow_test database. ' +
      'Check that .env.test exists at the repo root and points at assetflow_test.'
  );
}
