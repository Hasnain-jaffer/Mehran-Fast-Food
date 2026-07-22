/**
 * Environment validation.
 *
 * WHY: previously the app would happily boot with `process.env.JWT_SECRET`
 * being `undefined`, and only blow up later, confusingly, the first time
 * someone tried to log in. Validating at startup turns a silent runtime
 * bug into a loud, immediate, obvious one — fail on deploy, not in
 * production traffic.
 */

const REQUIRED_VARS = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET'
];

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key] || process.env[key].trim() === '');

  if (missing.length > 0) {
    // Intentionally use console.error + process.exit rather than throwing —
    // this runs before the logger/error-handling middleware exist, and we
    // want a hard stop, not an unhandled promise rejection.
    console.error('❌ Missing required environment variables:');
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error('\nCopy .env.example to .env and fill in real values before starting the server.');
    process.exit(1);
  }

  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    console.error('❌ JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values.');
    process.exit(1);
  }

  if (process.env.JWT_ACCESS_SECRET.length < 32 || process.env.JWT_REFRESH_SECRET.length < 32) {
    console.warn('⚠️  JWT secrets are shorter than 32 characters. Use long, random, high-entropy secrets in production (e.g. `openssl rand -hex 32`).');
  }

  if (!process.env.NODE_ENV) {
    console.warn('⚠️  NODE_ENV is not set. Defaulting behavior to development.');
  }

  if (process.env.NODE_ENV === 'production' && (!process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS.trim() === '')) {
    console.warn('⚠️  ALLOWED_ORIGINS is not set in production. CORS will allow all origins — set this before going live.');
  }
}

module.exports = { validateEnv };
