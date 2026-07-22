const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');

const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFound } = require('./middleware/notFound');
const { errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  // Trust the first proxy hop (e.g. Nginx, a load balancer, or a PaaS
  // like Render/Railway) so req.ip reflects the real client IP from
  // X-Forwarded-For, rather than the proxy's own address. This matters
  // for accurate login-history/session IP logging and for rate limiting
  // to key on the actual client rather than one shared proxy IP.
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet());

  // CORS — restrict to known origins, methods, and headers in production.
  // In development, if ALLOWED_ORIGINS is unset, allow all origins so
  // local dev isn't blocked. `credentials: true` is required for the
  // optional httpOnly-cookie refresh-token flow (see utils/cookies.js) to
  // work cross-origin at all.
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(cors({
    origin: allowedOrigins.length === 0
      ? true
      : (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
          return callback(new Error('Not allowed by CORS'));
        },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Request logging — concise in production, verbose in development
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // Stripe webhook — MUST be mounted with a raw body parser, and BEFORE the
  // global express.json() below, because Stripe's signature verification
  // (see payment.controller.js) needs the exact raw request bytes. Any
  // JSON.parse/re-stringify in between would change the bytes and make
  // every webhook call fail signature verification.
  app.post(
    '/api/payments/webhook',
    express.raw({ type: 'application/json' }),
    require('./controllers/payment.controller').webhook
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // Strip any keys starting with '$' or containing '.' from req.body/query/params
  // to prevent NoSQL (MongoDB operator) injection.
  app.use(mongoSanitize());

  // Guard against HTTP Parameter Pollution — e.g. ?role=customer&role=admin
  // being interpreted as an array and confusing a naive equality check
  // downstream. Applied after body parsing since it also covers req.query.
  app.use(hpp());

  // Health check — deliberately mounted before the rate limiter and outside
  // /api, so Docker/Nginx/an orchestrator's health probe is never rate
  // limited or affected by an API-level outage that isn't a real process
  // problem. Reports DB connectivity since "the process is alive" and "the
  // app can actually serve requests" are different questions — a probe
  // that only checked the former would say "healthy" while every real
  // request 500s on a dropped DB connection.
  app.get('/health', (req, res) => {
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState; // 1 = connected
    const healthy = dbState === 1;
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      uptime: process.uptime(),
      db: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown',
      timestamp: new Date().toISOString()
    });
  });

  // General rate limiting across the whole API
  app.use('/api', apiLimiter);

  app.use('/api', routes);

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
