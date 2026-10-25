const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getEmailConfig,
  buildPasswordResetEmail,
  createEmailService,
} = require('../utils/emailService');

test('email configuration requires a username and password', () => {
  assert.equal(getEmailConfig({}), null);
  assert.equal(getEmailConfig({ EMAIL_USER: 'user@example.com' }), null);
  assert.equal(
    getEmailConfig({ EMAIL_USER: 'user@example.com', EMAIL_PASS: 'secret' })
      .user,
    'user@example.com'
  );
});

test('reset email includes the reset URL and escapes the recipient name', () => {
  const resetUrl =
    'https://authflow.vercel.app/reset-password/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const message = buildPasswordResetEmail({
    name: '<Demo & User>',
    resetUrl,
    expiresInMinutes: 30,
  });

  assert.match(message.subject, /Reset your AuthFlow password/);
  assert.match(message.text, new RegExp(resetUrl));
  assert.match(message.text, /expires in 30 minutes/);
  assert.match(message.html, /&lt;Demo &amp; User&gt;/);
  assert.match(message.html, new RegExp(resetUrl));
  assert.match(message.html, /expires in 30 minutes/);
  assert.match(message.html, /target="_self"/);
  assert.doesNotMatch(message.html, /<Demo & User>/);
});

test('the email service sends through an injected transport', async () => {
  const sent = [];
  const service = createEmailService({
    env: {
      EMAIL_USER: 'mailer@example.com',
      EMAIL_PASS: 'app-password',
      EMAIL_FROM: 'AuthFlow <mailer@example.com>',
    },
    transport: {
      async sendMail(message) {
        sent.push(message);
      },
    },
  });

  const resetUrl =
    'https://authflow.vercel.app/reset-password/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

  assert.equal(service.isConfigured(), true);
  await service.sendPasswordResetEmail({
    to: 'demo@example.com',
    name: 'Demo User',
    resetUrl,
  });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'demo@example.com');
  assert.equal(sent[0].from, 'AuthFlow <mailer@example.com>');
  assert.match(sent[0].html, new RegExp(resetUrl));
});

test('an unconfigured email service cannot send', async () => {
  const service = createEmailService({ env: {} });

  assert.equal(service.isConfigured(), false);
  await assert.rejects(
    service.sendPasswordResetEmail({
      to: 'demo@example.com',
      name: 'Demo',
      resetUrl: 'https://example.com/reset-password/token',
    }),
    /not configured/
  );
});
