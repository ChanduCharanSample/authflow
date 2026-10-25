const nodemailer = require('nodemailer');

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const getEmailConfig = (env = process.env) => {
  const user = String(env.EMAIL_USER || '').trim();
  const pass = String(env.EMAIL_PASS || '').trim();

  if (!user || !pass) return null;

  const service = String(env.EMAIL_SERVICE || '').trim();
  const host = String(env.EMAIL_HOST || '').trim();
  const parsedPort = Number.parseInt(env.EMAIL_PORT, 10);
  const port = Number.isFinite(parsedPort) ? parsedPort : 587;
  const secure = String(env.EMAIL_SECURE || '').toLowerCase() === 'true' || port === 465;
  const from = String(env.EMAIL_FROM || '').trim() || `AuthFlow <${user}>`;

  return { user, pass, service, host, port, secure, from };
};

const buildPasswordResetEmail = ({
  name,
  resetUrl,
  expiresInMinutes = 15,
}) => {
  const safeName = escapeHtml(name || 'there');
  const safeUrl = escapeHtml(resetUrl);
  const expiryText = `${expiresInMinutes} minute${
    expiresInMinutes === 1 ? '' : 's'
  }`;

  return {
    subject: 'Reset your AuthFlow password',
    text: [
      `Hi ${name || 'there'},`,
      '',
      `Use the link below to choose a new password. It expires in ${expiryText} and can be used only once.`,
      resetUrl,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <p>Hi ${safeName},</p>
        <p>Use the button below to choose a new password. It expires in ${expiryText} and can be used only once.</p>
        <p>
          <a href="${safeUrl}" target="_self" rel="noopener noreferrer"
             style="display: inline-block; padding: 12px 18px; border-radius: 8px; background: #0f766e; color: #ffffff; text-decoration: none; font-weight: 700;">
            Reset password
          </a>
        </p>
        <p>If the button does not work, copy this link into your browser:</p>
        <p style="overflow-wrap: anywhere;">${safeUrl}</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  };
};

const createEmailService = ({ env = process.env, transport } = {}) => {
  const config = getEmailConfig(env);
  let activeTransport = transport || null;

  const isConfigured = () => Boolean(config);

  const getTransport = () => {
    if (!config) {
      throw new Error('Email service is not configured.');
    }

    if (!activeTransport) {
      const transportOptions = config.service
        ? {
            service: config.service,
            auth: { user: config.user, pass: config.pass },
          }
        : {
            host: config.host || 'smtp.gmail.com',
            port: config.port,
            secure: config.secure,
            auth: { user: config.user, pass: config.pass },
          };

      activeTransport = nodemailer.createTransport(transportOptions);
    }

    return activeTransport;
  };

  const sendPasswordResetEmail = async ({
    to,
    name,
    resetUrl,
    expiresInMinutes,
  }) => {
    if (!config) {
      throw new Error('Email service is not configured.');
    }

    const message = buildPasswordResetEmail({
      name,
      resetUrl,
      expiresInMinutes,
    });

    await getTransport().sendMail({
      from: config.from,
      to,
      ...message,
    });
  };

  return {
    isConfigured,
    sendPasswordResetEmail,
    getConfig: () => config,
  };
};

const emailService = createEmailService();

module.exports = emailService;
module.exports.createEmailService = createEmailService;
module.exports.buildPasswordResetEmail = buildPasswordResetEmail;
module.exports.getEmailConfig = getEmailConfig;
