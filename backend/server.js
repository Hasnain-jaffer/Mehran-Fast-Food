/**
 * Mehran Backend Server — entry point.
 * Bootstraps env validation, DB connection, and the HTTP server. All actual
 * app configuration (middleware, routes) lives in app.js so the app can be
 * imported and tested (e.g. with supertest) without binding to a port.
 */

// Some local networks/ISPs/routers fail to resolve MongoDB Atlas's SRV
// (mongodb+srv://) DNS records correctly. Forcing a public DNS resolver
// fixes that locally. Production hosts like Render use their own working
// DNS setup, so this override is skipped there — no reason to add an
// external dependency on Google's DNS in production when it isn't needed.
if (process.env.NODE_ENV !== 'production') {
  const dns = require('dns');
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}

require('dotenv').config();

const { validateEnv } = require('./config/env');
validateEnv();

const { connectDB, disconnectDB } = require('./config/db');
const { createApp } = require('./app');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`🚀 Mehran server running on port ${PORT}`);
    console.log(`📡 API base: http://localhost:${PORT}/api`);
  });

  // Graceful shutdown — important for Docker/Kubernetes/any orchestrator
  // that sends SIGTERM before killing a container (e.g. during a rolling
  // deploy or `docker stop`). Without this, in-flight requests get cut off
  // mid-response and the Mongo connection is torn down uncleanly instead
  // of being closed. server.close() stops accepting NEW connections but
  // lets already-open ones finish first.
  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${signal} received — shutting down gracefully...`);

    const forceExitTimer = setTimeout(() => {
      console.error('Forced shutdown — some connections did not close in time');
      process.exit(1);
    }, 10_000);
    forceExitTimer.unref();

    server.close(async (err) => {
      if (err) {
        console.error('Error while closing HTTP server:', err);
      }
      try {
        await disconnectDB();
        console.log('MongoDB connection closed');
      } catch (dbErr) {
        console.error('Error while closing MongoDB connection:', dbErr);
      }
      clearTimeout(forceExitTimer);
      process.exit(err ? 1 : 0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // A genuinely unexpected error should still bring the process down
  // (better a container restart than a corrupted in-memory state), but
  // via the same clean shutdown path rather than crashing hard.
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
    shutdown('unhandledRejection');
  });
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    shutdown('uncaughtException');
  });
}

start();
