import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const isTestEnv = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';

function resolveSessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (isTestEnv) return crypto.randomBytes(32).toString('hex');

  try {
    const secretPath = path.resolve(process.cwd(), 'data', '.session_secret');
    if (fs.existsSync(secretPath)) {
      const stored = fs.readFileSync(secretPath, 'utf8').trim();
      if (stored.length >= 32) return stored;
    }
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    const created = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretPath, created, { mode: 0o600 });
    return created;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: isTestEnv,
  port: Number(process.env.PORT || 3000),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  corsOrigin: process.env.CORS_ORIGIN || process.env.APP_URL || 'http://localhost:3000',
  sessionSecret: resolveSessionSecret(),
  hasExplicitSessionSecret: Boolean(process.env.SESSION_SECRET),
  mongodbUri: process.env.MONGODB_URI?.trim() || '',
  emailProvider: process.env.EMAIL_PROVIDER || 'brevo',
  brevoApiKey: process.env.BREVO_API_KEY?.trim() || '',
  emailFrom: process.env.EMAIL_FROM?.trim() || '',
  emailFromName: process.env.EMAIL_FROM_NAME?.trim() || 'Bloom',
};
