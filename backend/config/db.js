const mongoose = require('mongoose');

const PLACEHOLDER_VALUES = [
  'YOUR_MONGODB_ATLAS_CONNECTION_URL',
  '<username>',
  '<password>',
  '<cluster-host>',
];

const SUPPORTED_SCHEMES = new Set(['mongodb:', 'mongodb+srv:']);

const looksLikePlaceholder = (uri) =>
  PLACEHOLDER_VALUES.some((placeholder) => uri.includes(placeholder));

/**
 * Validate the connection string and extract its database name without
 * exposing credentials. A missing database name is not fatal because the
 * MongoDB driver then uses the default "test" database, but it is almost
 * always a configuration mistake and is reported as a warning.
 */
const parseMongoUri = (uri) => {
  if (!uri || looksLikePlaceholder(uri)) {
    throw new Error(
      'MONGODB_URI is not configured. Set your MongoDB Atlas connection string in backend/.env.'
    );
  }

  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error(
      'MONGODB_URI is not a valid connection URL. Check that it starts with mongodb:// or mongodb+srv://.'
    );
  }

  if (!SUPPORTED_SCHEMES.has(parsed.protocol)) {
    throw new Error(
      'MONGODB_URI must use the mongodb:// or mongodb+srv:// scheme.'
    );
  }

  if (!parsed.hostname) {
    throw new Error('MONGODB_URI does not contain a database host.');
  }

  const databaseName = parsed.pathname.split('/').filter(Boolean)[0] || null;

  return { parsed, databaseName };
};

/**
 * Group common Mongoose/MongoDB failures into actionable categories. This
 * only reads the error message; it never logs the connection string.
 */
const classifyConnectionError = (error) => {
  const message = String(error?.message || '');

  if (
    error?.code === 18 ||
    /authentication failed|bad auth|invalid credentials/i.test(message)
  ) {
    return {
      category: 'AUTHENTICATION',
      hint: 'Check the Atlas database username/password. URL-encode special characters such as @ as %40 and : as %3A, and confirm the user exists under Database Access.',
    };
  }

  if (/ENOTFOUND|EAI_AGAIN|querySrv|_mongodb\._tcp|DNS/i.test(message)) {
    return {
      category: 'DNS',
      hint: 'The Atlas SRV/host record could not be resolved. Check your DNS, VPN, proxy, or firewall, and confirm the cluster hostname.',
    };
  }

  if (/SSL|TLS|certificate|self[- ]signed/i.test(message)) {
    return {
      category: 'TLS',
      hint: 'The TLS handshake failed. Check the network/firewall or any TLS-inspecting proxy between this machine and Atlas.',
    };
  }

  if (/whitelist|access list|not authorized|IP is not allowed/i.test(message)) {
    return {
      category: 'IP_ACCESS',
      hint: "Add this machine's current public IP under Atlas > Security > Network Access, then wait for the change to become active.",
    };
  }

  if (
    error?.name === 'MongooseServerSelectionError' ||
    /Could not connect to any servers|server selection timed out/i.test(message)
  ) {
    return {
      category: 'NETWORK_OR_IP_ACCESS',
      hint: 'The hosts resolved but no Atlas node accepted the connection. The most common cause is an Atlas Network Access IP allowlist, followed by a firewall/VPN blocking port 27017.',
    };
  }

  if (
    /ETIMEDOUT|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH|socket.*closed|connection.*closed/i.test(
      message
    )
  ) {
    return {
      category: 'NETWORK',
      hint: 'The database port could not be reached. Check the firewall, VPN, proxy, and Atlas cluster availability.',
    };
  }

  return {
    category: 'UNKNOWN',
    hint: 'Review the error above. Confirm the Atlas cluster is running, the hostname is correct, and Network Access allows this machine.',
  };
};

/**
 * Remove the URI and credentials from error text before logging it.
 */
const redactSecrets = (message, uri, parsed) => {
  let safeMessage = String(message || '');

  const secrets = new Set([uri, parsed?.username, parsed?.password]);

  for (const value of [parsed?.username, parsed?.password]) {
    if (value) {
      try {
        secrets.add(decodeURIComponent(value));
      } catch {
        // Ignore malformed percent encoding in a diagnostic-only redaction.
      }
    }
  }

  for (const secret of secrets) {
    if (secret && secret.length >= 3) {
      safeMessage = safeMessage.split(secret).join('[redacted]');
    }
  }

  return safeMessage;
};

/**
 * Connect to the configured MongoDB Atlas database using the single Mongoose
 * connection for this process.
 *
 * There is deliberately no in-memory or alternative database fallback: if the
 * configured Atlas connection cannot be established, startup fails loudly.
 */
const connectDB = async () => {
  const uri =
    typeof process.env.MONGODB_URI === 'string'
      ? process.env.MONGODB_URI.trim()
      : '';

  const { parsed, databaseName } = parseMongoUri(uri);

  if (!databaseName) {
    console.warn(
      '[db] MONGODB_URI has no database name. MongoDB will use the default "test" database. Append /<database> to select the intended database.'
    );
  }

  if (parsed.protocol === 'mongodb+srv:' && (!parsed.username || !parsed.password)) {
    console.warn(
      '[db] MONGODB_URI does not include both a username and password. Atlas clusters normally require database credentials.'
    );
  }

  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log(
      `MongoDB connected: ${connection.connection.host}/${connection.connection.name}`
    );

    return connection;
  } catch (error) {
    const { category, hint } = classifyConnectionError(error);
    const safeMessage = redactSecrets(error.message, uri, parsed);

    console.error(`MongoDB connection failed [${category}]: ${safeMessage}`);
    console.error(`[db] ${hint}`);

    error.safeMessage = safeMessage;
    throw error;
  }
};

module.exports = connectDB;
module.exports.parseMongoUri = parseMongoUri;
module.exports.classifyConnectionError = classifyConnectionError;
