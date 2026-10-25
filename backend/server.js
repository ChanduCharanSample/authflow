const path = require('node:path');

const explicitNodeEnv = process.env.NODE_ENV;

// Local project configuration takes precedence over unrelated machine-level
// variables, but production and test environments keep their explicit values.
require('dotenv').config({
  path: path.join(__dirname, '.env'),
  override: explicitNodeEnv !== 'production' && explicitNodeEnv !== 'test',
});

if (explicitNodeEnv === 'test') {
  process.env.NODE_ENV = 'test';
}

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const { getFrontendOrigins } = require('./config/urls');
const { validateRuntimeConfig } = require('./config/runtime');
const User = require('./models/User');
const authRoutes = require('./routes/authRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Surface errors that happen after the initial connection (for example, Atlas
// maintenance or a network drop) instead of leaving them unhandled.
mongoose.connection.on('error', (error) => {
  console.error(`[db] MongoDB connection error: ${error.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[db] MongoDB disconnected.');
});

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = String(process.env.HOST || '0.0.0.0').trim() || '0.0.0.0';

// Defer configuration failures to startServer so the process can print a
// clear error instead of crashing while the module is being imported. Tests
// import `app` directly and provide valid configuration.
let allowedOrigins = [];
try {
  allowedOrigins = getFrontendOrigins();
} catch (error) {
  console.error(`[config] ${error.message}`);
}

if (process.env.NODE_ENV === 'production') {
  // Required for secure cookies and client IP detection behind a proxy.
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (no Origin header) and configured frontends.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database:
      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use('/api/auth', authRoutes);

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  validateRuntimeConfig();

  await connectDB();

  // Make sure the unique email index exists before accepting requests.
  await User.init();

  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, HOST, () => {
      console.log(`API server listening on http://${HOST}:${PORT}`);
      resolve(server);
    });

    server.on('error', reject);
  });
};

const shutdown = (server, signal) => {
  console.log(`\n${signal} received. Shutting down...`);

  const forceExit = setTimeout(() => {
    console.error('Shutdown timed out; forcing exit.');
    process.exit(1);
  }, 10000);
  forceExit.unref();

  server.close(async () => {
    clearTimeout(forceExit);
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed.');
      process.exit(0);
    } catch (error) {
      console.error('Error while closing MongoDB connection:', error.message);
      process.exit(1);
    }
  });
};

if (require.main === module) {
  startServer()
    .then((server) => {
      process.on('SIGINT', () => shutdown(server, 'SIGINT'));
      process.on('SIGTERM', () => shutdown(server, 'SIGTERM'));
    })
    .catch((error) => {
      console.error(
        `[server] Startup failed: ${error.safeMessage || error.message}`
      );
      process.exit(1);
    });
}

module.exports = { app, startServer };
