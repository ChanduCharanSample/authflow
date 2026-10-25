const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseMongoUri,
  classifyConnectionError,
} = require('../config/db');

test('parseMongoUri extracts the database name from an Atlas URI', () => {
  const { parsed, databaseName } = parseMongoUri(
    'mongodb+srv://user:pass@cluster.example.mongodb.net/authflow?retryWrites=true&w=majority'
  );

  assert.equal(parsed.protocol, 'mongodb+srv:');
  assert.equal(parsed.hostname, 'cluster.example.mongodb.net');
  assert.equal(databaseName, 'authflow');
});

test('parseMongoUri accepts a local mongodb URI', () => {
  const { parsed, databaseName } = parseMongoUri(
    'mongodb://127.0.0.1:27017/authflow'
  );

  assert.equal(parsed.protocol, 'mongodb:');
  assert.equal(databaseName, 'authflow');
});

test('parseMongoUri reports a missing database name as null', () => {
  const { databaseName } = parseMongoUri(
    'mongodb+srv://user:pass@cluster.example.mongodb.net/?appName=test'
  );

  assert.equal(databaseName, null);
});

test('parseMongoUri rejects placeholder configuration', () => {
  assert.throws(
    () => parseMongoUri('YOUR_MONGODB_ATLAS_CONNECTION_URL'),
    /not configured/
  );
});

test('parseMongoUri rejects unsupported schemes', () => {
  assert.throws(
    () => parseMongoUri('https://cluster.example.mongodb.net/authflow'),
    /mongodb:\/\/ or mongodb\+srv:\/\//
  );
});

test('classifyConnectionError identifies authentication failures', () => {
  assert.equal(
    classifyConnectionError({
      code: 18,
      message: 'Authentication failed.',
    }).category,
    'AUTHENTICATION'
  );
});

test('classifyConnectionError identifies DNS failures', () => {
  assert.equal(
    classifyConnectionError({
      message: 'querySrv ENOTFOUND _mongodb._tcp.cluster.example',
    }).category,
    'DNS'
  );
});

test('classifyConnectionError identifies server selection failures', () => {
  assert.equal(
    classifyConnectionError({
      name: 'MongooseServerSelectionError',
      message: 'Could not connect to any servers in your MongoDB Atlas cluster.',
    }).category,
    'NETWORK_OR_IP_ACCESS'
  );
});

test('classifyConnectionError identifies network failures', () => {
  assert.equal(
    classifyConnectionError({
      message: 'connect ETIMEDOUT 203.0.113.10:27017',
    }).category,
    'NETWORK'
  );
});

test('classifyConnectionError identifies TLS failures', () => {
  assert.equal(
    classifyConnectionError({
      message: 'SSL routines:ssl3_get_record:wrong version number',
    }).category,
    'TLS'
  );
});

test('classifyConnectionError falls back to UNKNOWN', () => {
  assert.equal(
    classifyConnectionError({ message: 'something unexpected' }).category,
    'UNKNOWN'
  );
});
