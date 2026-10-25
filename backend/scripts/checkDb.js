const path = require('node:path');

const explicitNodeEnv = process.env.NODE_ENV;

require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
  override: explicitNodeEnv !== 'production',
});

const mongoose = require('mongoose');
const connectDB = require('../config/db');

(async () => {
  let failed = false;

  try {
    const connection = await connectDB();
    console.log(
      `[db] Connection check passed: ${connection.connection.host}/${connection.connection.name}`
    );
  } catch {
    failed = true;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }

  if (failed) {
    process.exitCode = 1;
  }
})();
