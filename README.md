# AuthFlow — Authentication Application

A full-stack authentication application built with React, Vite, Express, and
MongoDB. It supports registration, login, logout, a protected welcome page, and
a secure, email-delivered password-reset flow.

> **Security notice:** password reset no longer changes a password from an email
> address alone. A reset requires a short-lived, single-use token delivered to
> the account's email address. If email delivery is not configured, password
> reset is disabled rather than falling back to an insecure flow.

## Features

- Register with name, email, password, and confirmation
- Bcryptjs password hashing with a unique, normalized email address
- JWT authentication stored in an HttpOnly cookie (never localStorage or
  sessionStorage)
- Protected `/api/auth/me` endpoint and `ProtectedRoute` component
- Secure password reset with a 32-byte random token
- Reset tokens are stored as SHA-256 hashes, expire after 15 minutes by default,
  and can be used only once
- Reset links are delivered by email through a configured SMTP provider
- Generic forgot-password responses so the endpoint does not reveal whether an
  account exists
- Password resets increment `tokenVersion`, invalidating existing JWTs
- Client-side and server-side validation with clear messages
- Rate limiting for registration, login, and password reset
- Responsive interface with password visibility toggles and loading states
- Production cookie/CORS handling for a Vercel frontend and Render backend
- Render blueprint (`render.yaml`) and Vercel SPA rewrite
  (`frontend/vercel.json`)

## Technology

**Frontend:** React 19, Vite, JavaScript, React Router, Axios, custom CSS

**Backend:** Node.js, Express 5, MongoDB/Mongoose, bcryptjs, jsonwebtoken,
dotenv, express-validator, express-rate-limit, Nodemailer

## Architecture

The backend keeps a Controller → Service → Repository separation:

- **Routes** wire paths, validation, rate limiters, and controllers.
- **Controllers** translate HTTP requests into service calls and responses.
- **Services** contain authentication and password-reset business logic.
- **Repositories** are the only layer that queries Mongoose models.
- **Models** define schema constraints and a bcrypt pre-save safety guard.

## Folder structure

```text
login-app/
├── backend/
│   ├── config/
│   │   ├── auth.js
│   │   ├── db.js
│   │   ├── runtime.js
│   │   └── urls.js
│   ├── controllers/
│   │   └── authController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── errorMiddleware.js
│   │   ├── rateLimiters.js
│   │   ├── validate.js
│   │   └── validators.js
│   ├── models/
│   │   └── User.js
│   ├── repositories/
│   │   └── userRepository.js
│   ├── routes/
│   │   └── authRoutes.js
│   ├── services/
│   │   └── authService.js
│   ├── tests/
│   │   ├── helpers/fakes.js
│   │   ├── integration/auth.integration.test.js
│   │   ├── apiValidation.test.js
│   │   ├── authService.test.js
│   │   ├── dbConfig.test.js
│   │   ├── deploymentConfig.test.js
│   │   ├── emailService.test.js
│   │   ├── password.test.js
│   │   └── tokens.test.js
│   ├── utils/
│   │   ├── ApiError.js
│   │   ├── asyncHandler.js
│   │   ├── cookies.js
│   │   ├── emailService.js
│   │   ├── password.js
│   │   └── tokens.js
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── Alert.jsx
│   │   │   ├── FormField.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── PasswordField.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── pages/
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── NotFound.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── ResetPassword.jsx
│   │   │   └── Welcome.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── utils/
│   │   │   └── validation.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── vercel.json
│   └── vite.config.js
├── .gitignore
├── README.md
└── render.yaml
```

## Local setup

Prerequisites: Node.js 20+, npm, MongoDB Atlas access, and (for password reset)
an SMTP account that can send email.

```powershell
cd backend
npm install

cd ..\frontend
npm install
```

## Environment configuration

### Backend

Copy `backend/.env.example` to `backend/.env` and replace the placeholders. Real
`.env` files are excluded by Git.

Minimum local configuration:

```dotenv
PORT=5000
HOST=0.0.0.0
MONGODB_URI=your-atlas-connection-string
JWT_SECRET=your-generated-secret
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
COOKIE_SAME_SITE=lax
PASSWORD_RESET_ENABLED=true
RESET_TOKEN_EXPIRY_MINUTES=15
```

Password reset also needs an email transport:

```dotenv
# Gmail example. Use a Google app password, not the mailbox password.
EMAIL_SERVICE=gmail
EMAIL_USER=your-address@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="AuthFlow <your-address@gmail.com>"
```

For another provider, omit `EMAIL_SERVICE` and set:

```dotenv
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-smtp-user
EMAIL_PASS=your-smtp-password
EMAIL_FROM="AuthFlow <no-reply@example.com>"
```

If `EMAIL_USER` and `EMAIL_PASS` are missing, the API still starts, but
`POST /api/auth/forgot-password` returns `503 Password reset is currently
unavailable` and no reset link is created. Set `PASSWORD_RESET_ENABLED=false` to
disable both requesting and consuming reset links.

Generate a JWT secret:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Frontend

```powershell
cd frontend
Copy-Item .env.example .env
```

```dotenv
VITE_API_URL=http://localhost:5000/api
```

The production build requires `VITE_API_URL` to be set at build time. There is
no hardcoded localhost fallback in production; the fallback exists only in Vite
development mode.

### MongoDB Atlas

1. Create or open the existing Atlas cluster.
2. Create a database user with `readWrite` permission on the application
   database. Do not use an admin user for the deployed API.
3. Under **Network Access**, allow the deployed backend. For Render, use the
   platform's static outbound IPs where available. If your plan does not provide
   them, a temporary `0.0.0.0/0` rule is possible but is less restrictive; do not
   use it as a permanent production setting.
4. Copy the `mongodb+srv://...` connection string from **Connect → Drivers**.
5. URL-encode special characters in the password.
6. Put the completed string in `backend/.env` as `MONGODB_URI`.
7. Verify the connection without starting the API:

   ```powershell
   cd backend
   npm run db:check
   ```

The backend has no in-memory or alternate-database fallback. A failed Atlas
connection stops startup with a classified error and redacts credentials from the
output.

**Preserve the existing database.** The currently configured local URI has no
database name, so MongoDB uses the default `test` database. To keep existing
users, either leave the URI as-is or append `/test` explicitly. Do not switch to
a new empty database name without migrating the existing collections.

## Running locally

Terminal 1 — API:

```powershell
cd backend
npm run dev
```

Terminal 2 — frontend:

```powershell
cd frontend
npm run dev
```

Open <http://localhost:5173>.

Production-style frontend build:

```powershell
cd frontend
$env:VITE_API_URL = "http://localhost:5000/api"
npm run build
npm run preview
```

## Password-reset flow

1. On `/login`, click **Forgot password?**. The browser opens
   `/forgot-password`.
2. Enter the registered email address. The frontend sends
   `POST /api/auth/forgot-password` with `{ "email": "..." }`.
3. The backend always returns the same generic message:
   “If an account exists for that email, a password reset link has been sent.”
   This prevents account enumeration.
4. If an account exists, the backend generates a 32-byte random token, stores
   only its SHA-256 hash plus an expiry time, and emails a link to
   `FRONTEND_URL/reset-password/<token>`.
5. The link opens `/reset-password/:token`. The page asks for a new password and
   confirmation only; it does not ask for the email address.
6. The frontend sends `POST /api/auth/reset-password/:token` with
   `{ "password", "confirmPassword" }`.
7. The backend validates the token format, password length, and confirmation,
   hashes the new password with bcryptjs, and atomically consumes the token.
   The same token cannot be used twice, including under concurrent requests.
8. A successful reset increments `tokenVersion`, so existing JWTs stop working.
9. The page shows a success message and a **Back to log in** button.

Reset links expire after `RESET_TOKEN_EXPIRY_MINUTES` (default 15, bounded to
1–60). Password-reset requests are limited to 5 attempts per 15 minutes per IP.

There is deliberately no direct email-only reset endpoint and no authentication
bypass. If email delivery is unavailable, reset is disabled.

## API endpoints

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | No | Create an account |
| `POST` | `/api/auth/login` | No | Authenticate and set the HttpOnly cookie |
| `POST` | `/api/auth/forgot-password` | No | Request a reset link for an email |
| `POST` | `/api/auth/reset-password/:token` | No | Consume a reset token and set a new password |
| `GET` | `/api/auth/me` | Cookie | Return the safe profile of the current user |
| `POST` | `/api/auth/logout` | No | Clear the authentication cookie |
| `GET` | `/api/health` | No | API/database health status |

Example requests:

```json
POST /api/auth/register
{
  "name": "Demo User",
  "email": "demo@example.com",
  "password": "DemoPassword123"
}
```

```json
POST /api/auth/login
{
  "email": "demo@example.com",
  "password": "DemoPassword123"
}
```

```json
POST /api/auth/forgot-password
{
  "email": "demo@example.com"
}
```

```json
POST /api/auth/reset-password/<token-from-email>
{
  "password": "NewDemoPassword123",
  "confirmPassword": "NewDemoPassword123"
}
```

The login response never includes the JWT. The JWT is stored only in the
`auth_token` HttpOnly cookie.

## Cookies, CORS, and production behavior

- In development, the cookie uses `SameSite=Lax` and `Secure=false`.
- In production, the default is `SameSite=None; Secure` because a Vercel
  frontend and a Render backend normally use different sites.
- `COOKIE_SAME_SITE` can be `lax`, `strict`, or `none`. `SameSite=None` always
  requires `Secure`, so the API must be served over HTTPS.
- CORS allows only the comma-separated origins in `FRONTEND_URL` and enables
  credentialed requests. Axios uses `withCredentials: true`.
- In production, `trust proxy` is enabled so secure cookies and rate limiting
  work correctly behind Render's proxy.
- The backend binds to `HOST` (default `0.0.0.0`) and `PORT` (default `5000`).
  Render supplies `PORT` automatically.
- The health endpoint is `GET /api/health`.

### Cross-site cookie warning

Default `*.vercel.app` and `*.onrender.com` domains are different sites. A
`SameSite=None; Secure` cookie can work there, but some browsers block or
partition third-party cookies. For a more reliable production setup, attach
custom domains under one registrable domain, for example:

```text
Frontend: https://app.example.com
Backend:  https://api.example.com
```

Then set `COOKIE_SAME_SITE=lax` on the backend and `FRONTEND_URL` to the exact
frontend origin. This keeps the cookie same-site while still using credentialed
CORS between the two origins. If you keep separate Vercel/Render domains, test
the cookie behavior in the browsers you support.

Because `SameSite=None` weakens CSRF isolation, keep the CORS allowlist exact and
add a CSRF token if you later introduce sensitive cookie-authenticated mutation
endpoints. The current protected surface is read-only (`GET /api/auth/me`) plus
logout.

## Deployment

### Backend — Render

Recommended Render settings:

- **Root directory:** `backend`
- **Build command:** `npm ci`
- **Start command:** `npm start`
- **Health check path:** `/api/health`
- **Runtime:** Node 20+

`render.yaml` at the repository root contains the same configuration. It sets
`NODE_ENV=production`, `HOST=0.0.0.0`, `COOKIE_SAME_SITE=none`, and prompts for
the secret values.

Required backend environment variables:

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Existing Atlas connection string |
| `JWT_SECRET` | Long random secret (32+ characters) |
| `FRONTEND_URL` | Exact deployed Vercel origin, no trailing slash |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `COOKIE_SAME_SITE` | `none` for Vercel/Render; `lax` for same-site custom domains |
| `PASSWORD_RESET_ENABLED` | `true` |
| `RESET_TOKEN_EXPIRY_MINUTES` | `15` |
| `EMAIL_SERVICE` | `gmail`, or blank for custom SMTP |
| `EMAIL_HOST` | SMTP host when not using a service |
| `EMAIL_PORT` | `587` or `465` |
| `EMAIL_SECURE` | `false` for 587, `true` for 465 |
| `EMAIL_USER` | SMTP username |
| `EMAIL_PASS` | SMTP app password |
| `EMAIL_FROM` | Verified sender, e.g. `AuthFlow <no-reply@example.com>` |

Do not set `PORT` on Render; use the platform-assigned port.

### Frontend — Vercel

Recommended Vercel settings:

- **Root directory:** `frontend`
- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variable:** `VITE_API_URL=https://<your-render-service>.onrender.com/api`

`frontend/vercel.json` rewrites all client-side routes to `index.html`, so direct
navigation and refresh work for `/login`, `/register`, `/forgot-password`, and
`/reset-password/:token`.

Do not hardcode the Render URL in source. Set it in Vercel and redeploy the
frontend after the backend URL is known.

### Deployment order

1. Deploy the backend to Render with a temporary or final `FRONTEND_URL`.
2. Confirm `GET https://<backend>/api/health` returns
   `{"status":"ok","database":"connected"}`.
3. Deploy the frontend to Vercel with `VITE_API_URL` pointing at the backend.
4. Set the backend's `FRONTEND_URL` to the exact Vercel origin and redeploy the
   backend.
5. Re-test registration, login, protected access, logout, and password reset.

If Vercel or Render requires account authorization, complete those dashboard
steps manually. Do not commit deployment tokens or claim a service is live until
the platform confirms it.

### Atlas checks for deployment

- Confirm the database user has `readWrite` on the existing database.
- Confirm Network Access allows Render egress (or use Render's static outbound
  IPs).
- Preserve the existing database and collections; do not run a reset or drop
  command against it.
- Confirm the deployed backend health response reports `"database": "connected"`.
- Keep the connection string only in Render environment variables and
  `backend/.env`; never put it in frontend code, README, or Git.

## Security notes

- Passwords are hashed with bcryptjs (cost 12) in the service and by a pre-save
  model guard. Plaintext passwords are never stored.
- Password hashes, reset-token hashes, and `tokenVersion` are not returned in API
  responses.
- Reset tokens are random, stored only as SHA-256 hashes, expire, and are
  consumed atomically.
- Forgot-password responses are generic for both existing and unknown emails.
- Login errors are generic for both an unknown email and a wrong password.
- The old direct email-only reset endpoint has been removed. Requests to
  `POST /api/auth/reset-password` (without a token) return `404`.
- The JWT is read only from the HttpOnly cookie. The frontend does not use
  `localStorage` or `sessionStorage` for authentication.
- A successful reset increments `tokenVersion`, invalidating existing JWTs.
- CORS is restricted to configured origins and permits credentials.
- Production requires HTTPS, `Secure` cookies, and a non-localhost
  `FRONTEND_URL`.
- Unexpected server errors are logged without request bodies; development stack
  traces redact MongoDB URIs and token-like values.
- Login is limited to 10 attempts per 15 minutes per IP; password reset is
  limited to 5 attempts per 15 minutes. Registration is limited to 20 per hour.
- Rate limiters are skipped only when `NODE_ENV=test`.

### Secret handling and rotation

- `.env` files are ignored by Git. `.env.example` contains placeholders only.
- The repository history contained only the initial README before this
  application was added; no real credentials were found in tracked files.
- If a credential is ever committed, rotate it immediately:
  - Atlas: create/rotate the database user password and update Render.
  - JWT: generate a new `JWT_SECRET`; this invalidates existing sessions.
  - Email: revoke the SMTP app password and create a new one.
  - Deployment: revoke any exposed Vercel/Render tokens.
- Remove the secret from Git history with `git filter-repo` or BFG, force-push
  only after coordinating with all collaborators, and verify the old value is
  no longer accessible.

## Testing

### Automated tests

Backend unit/API-validation tests:

```powershell
cd backend
npm test
```

Result in this environment: **51 tests passed, 0 failed**. The full-flow
integration suite is skipped unless `TEST_MONGODB_URI` is provided.

Full-flow integration tests against a disposable local MongoDB database:

```powershell
cd backend
$env:TEST_MONGODB_URI = "mongodb://127.0.0.1:27017/authflow_integration_test"
npm run test:integration
```

Result in this environment: **10 integration tests passed**. The suite drops
only the database named in `TEST_MONGODB_URI` and refuses to run unless the name
contains `test`.

The integration suite verifies registration, duplicate registration, bcrypt
hashing, invalid login, login cookie behavior, protected access, generic
forgot-password responses, invalid/expired reset tokens, successful reset,
single-use token consumption, old/new password login, session invalidation, and
logout.

Frontend checks:

```powershell
cd frontend
npm run lint
$env:VITE_API_URL = "https://example.invalid/api"
npm run build
```

Lint and build pass. The build command above is only a syntax/bundle check; use
the real Render API URL in Vercel.

### Manual test plan

Use a real Atlas database and a real test email inbox.

1. **Atlas connection:** start the backend. Confirm
   `GET /api/health` reports `"database": "connected"`.
2. **Registration:** create a user with a valid name, email, and password of at
   least 8 characters.
3. **Duplicate registration:** register the same email again; expect `409`.
4. **Password hashing:** inspect the user document. `password` starts with
   `$2a$`/`$2b$` and is not plaintext.
5. **Login:** log in. The response sets `auth_token` with `HttpOnly` and the
   configured `SameSite`; the JWT is absent from JSON and browser storage.
6. **Invalid login:** use a wrong password and an unknown email; both return the
   same generic message.
7. **Protected page:** open `/welcome` without a cookie (redirected to login),
   then log in and confirm it shows the real name and email.
8. **Forgot password:** request a reset for the registered email. Confirm a
   generic response and that an email arrives.
9. **Unknown email:** request a reset for an unregistered email. Confirm the
   response is identical and no email is sent.
10. **Reset page:** open the emailed link. Confirm it asks only for the new
    password and confirmation, with visibility toggles.
11. **Validation:** submit empty, short, and mismatched passwords; each is
    rejected before the API call.
12. **Successful reset:** set a new password. Confirm the success state and
    **Back to log in**.
13. **Single use:** open the same link again; expect an invalid/expired message.
14. **Expiry:** wait for the configured lifetime or create a short-lived test
    token; confirm an expired token is rejected.
15. **New password:** log in with the new password.
16. **Old password:** confirm it fails with the generic invalid-credentials
    message.
17. **Session invalidation:** an existing session in another tab is rejected on
    its next protected request.
18. **Logout:** log out, confirm the cookie is cleared, and confirm `/welcome`
    redirects to login and `/api/auth/me` returns `401`.
19. **Refresh/direct navigation:** refresh `/welcome`, `/forgot-password`, and a
    reset URL. Vercel must serve the SPA for each route.
20. **Production cookies:** with deployed Vercel and Render domains, confirm
    credentialed CORS and the login cookie work in the browsers you support.

## Troubleshooting

- **`EADDRINUSE` on port 5000:** stop the conflicting process or change `PORT`
  and update the frontend API URL together.
- **CORS errors:** `FRONTEND_URL` must exactly match the browser origin,
  including scheme and port, with no trailing slash. Multiple origins must be
  comma-separated.
- **Cookies not sent:** use HTTPS, `withCredentials: true` (already configured),
  and the correct `COOKIE_SAME_SITE`. For Vercel/Render default domains, use
  `none`; for same-site custom domains, use `lax`. Some browsers block
  third-party cookies; custom domains are more reliable.
- **Forgot password returns 503:** configure `EMAIL_USER`/`EMAIL_PASS` and the
  SMTP settings, or set `PASSWORD_RESET_ENABLED=false` to disable the feature
  intentionally.
- **Reset email not received:** check spam, the sender address, SMTP app
  password, provider restrictions, and the 5-attempt rate limit.
- **Reset link invalid:** links expire and are single-use. Request a new one.
- **Atlas connection fails:** run `npm run db:check`. The backend classifies the
  failure as authentication, DNS, TLS, IP access, or network without printing
  credentials. Check the database user, password encoding, Network Access, and
  cluster state.
- **`MONGODB_URI has no database name` warning:** the connection works using the
  default `test` database. To preserve existing data, leave it as-is or append
  `/test`; do not switch to an empty database without migrating data.
- **Vercel refresh returns 404:** confirm the project root is `frontend` and
  `frontend/vercel.json` is deployed with the SPA rewrite.
- **Render health check fails:** confirm the root directory is `backend`, the
  start command is `npm start`, and the health path is `/api/health`.

## Known limitations

- Registration does not verify email ownership; the reset flow does verify
  ownership through the emailed token.
- Requesting a password reset requires a configured SMTP provider. No reset link
  is created when email is not configured, rather than falling back to an
  insecure flow.
- The application does not include OTP, social login, roles, or admin features.
- The current local Atlas URI uses the default `test` database. It was not
  changed automatically because doing so could point the application at a
  different, empty database.
- Default Vercel/Render domains are cross-site. `SameSite=None; Secure` is
  configured for that case, but third-party cookie blocking can still affect
  some browsers. Same-registrable-domain custom domains are recommended.
