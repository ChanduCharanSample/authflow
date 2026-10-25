const DEFAULT_DEV_FRONTEND_URL = 'http://localhost:5173';

const normalizeOrigin = (origin) => String(origin).trim().replace(/\/+$/, '');

/**
 * FRONTEND_URL may contain one or more comma-separated browser origins. In
 * development a localhost fallback is allowed; production must configure an
 * explicit HTTPS origin.
 */
const getFrontendOrigins = (env = process.env) => {
  const raw =
    typeof env.FRONTEND_URL === 'string' ? env.FRONTEND_URL.trim() : '';

  if (!raw) {
    if (env.NODE_ENV === 'production') {
      throw new Error(
        'FRONTEND_URL is required in production. Set it to the deployed frontend origin, for example https://your-app.vercel.app.'
      );
    }
    return [DEFAULT_DEV_FRONTEND_URL];
  }

  const origins = raw.split(',').map(normalizeOrigin).filter(Boolean);

  if (origins.length === 0) {
    throw new Error('FRONTEND_URL must contain at least one browser origin.');
  }

  for (const origin of origins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(
        'FRONTEND_URL contains an invalid origin. Use a full URL such as https://your-app.vercel.app.'
      );
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('FRONTEND_URL origins must use http:// or https://.');
    }
  }

  if (env.NODE_ENV === 'production') {
    const insecure = origins.find(
      (origin) =>
        origin.startsWith('http://') ||
        /localhost|127\.0\.0\.1/i.test(origin)
    );

    if (insecure) {
      throw new Error(
        'FRONTEND_URL must use HTTPS and must not point to localhost in production.'
      );
    }
  }

  return origins;
};

const getFrontendUrl = (env = process.env) => getFrontendOrigins(env)[0];

module.exports = {
  DEFAULT_DEV_FRONTEND_URL,
  getFrontendOrigins,
  getFrontendUrl,
};
