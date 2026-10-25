# AuthFlow — Full-Stack Authentication App 🔐

A full-stack authentication application built with React, Node.js, Express, and MongoDB Atlas. AuthFlow provides user registration, secure login, password hashing, protected routes, and logout functionality.

## 🌐 Live Demo

- **Frontend:** https://authflow-beige.vercel.app/login
- **Backend API:** https://authflow-backend-4kzm.onrender.com

## ✨ Features

- **User Registration** — Register with name, email, and password.
- **Secure Login** — Authenticate users using email and password.
- **Password Hashing** — Protect stored passwords using bcryptjs.
- **JWT Authentication** — Authenticate users using JSON Web Tokens.
- **HttpOnly Cookies** — Store authentication tokens in secure cookies.
- **Protected Routes** — Restrict access to authenticated users.
- **Welcome Page** — Display the logged-in user's name and email.
- **Logout** — End the authenticated session.
- **Form Validation** — Validate required fields and password confirmation.
- **MongoDB Atlas Integration** — Store user accounts in MongoDB.
- **Responsive UI** — Access the application on desktop and mobile devices.
- **Password Recovery** — Support can be enabled when a secure password-reset flow and email configuration are available.

## 🛠️ Tech Stack

### Frontend
- React
- Vite
- JavaScript
- React Router
- Axios
- CSS

### Backend
- Node.js
- Express.js
- Mongoose
- bcryptjs
- JSON Web Token (JWT)
- dotenv
- Nodemailer (for configured email delivery)

### Database and Deployment
- MongoDB Atlas
- Git and GitHub
- Render — Backend hosting
- Vercel — Frontend hosting

## 📁 Project Structure

```text
authflow/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

*The structure above describes the intended organization; actual files may vary slightly.*

## ⚙️ Prerequisites

Install the following before running the project locally:

- Node.js (version supported by the project)
- npm
- A MongoDB Atlas account
- Git

## 🚀 Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/ChanduCharanSample/authflow.git
cd authflow
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` directory:

```env
PORT=5000
MONGODB_URI=YOUR_MONGODB_ATLAS_CONNECTION_URL
JWT_SECRET=YOUR_LONG_RANDOM_SECRET
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
PASSWORD_RESET_ENABLED=false
```

Add any other variables required by your actual backend configuration.

Replace the placeholder values with your own configuration. Never commit the real `.env` file.

### 3. Start the backend

```bash
npm run dev
```

The backend should start on the configured port after connecting to MongoDB Atlas.

If your project does not define a `dev` script, use the available script from `backend/package.json`.

### 4. Configure the frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 5. Start the frontend

```bash
npm run dev
```

Open the local URL shown in the terminal, normally:

http://localhost:5173

## 🔑 Environment Variables

### Backend

| Variable | Description |
|---|---|
| `PORT` | Backend server port |
| `MONGODB_URI` | MongoDB Atlas connection URL |
| `JWT_SECRET` | Secret used to sign JWTs |
| `NODE_ENV` | Application environment |
| `FRONTEND_URL` | Allowed frontend origin |
| `PASSWORD_RESET_ENABLED` | Controls whether password recovery is enabled, if supported by the application |
| `EMAIL_USER` | SMTP email account, if required |
| `EMAIL_PASS` | SMTP app password, if required |

### Frontend

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API, including `/api` |

Only include variables that are supported by the actual application. Never put database credentials, JWT secrets, or email passwords in frontend environment variables.

## 🔌 API Endpoints

The following endpoints describe the intended authentication API. Verify the actual routes in the backend before relying on them.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check backend availability |
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate a user |
| `GET` | `/api/auth/me` | Retrieve the authenticated user's profile |
| `POST` | `/api/auth/logout` | Log out the current user |
| `POST` | `/api/auth/forgot-password` | Request password recovery, if enabled |
| `POST` | `/api/auth/reset-password` | Reset password, if supported by the implementation |

## 🔐 Security

- Passwords should be hashed before being stored.
- Authentication cookies should use `HttpOnly` and appropriate production security settings.
- Validate incoming data on both the frontend and backend.
- Keep environment files out of version control.
- Use a strong, randomly generated JWT secret.
- Restrict MongoDB Atlas network access to trusted sources where possible.
- Do not expose sensitive authentication data in API responses or logs.
- Do not enable password recovery that allows password changes using only an email address without verifying account ownership.

## ☁️ Deployment

### Backend — Render

1. Connect the GitHub repository to Render.
2. Select the `backend` directory as the root directory.
3. Configure the build and start commands based on `backend/package.json`.
4. Add the required backend environment variables.
5. Configure MongoDB Atlas network access.
6. Deploy and check the backend logs.
7. Verify the health endpoint if available.

### Frontend — Vercel

1. Import the GitHub repository into Vercel.
2. Select `frontend` as the root directory.
3. Choose Vite as the framework preset.
4. Set the build command to `npm run build`.
5. Set the output directory to `dist`.
6. Configure `VITE_API_URL` with the deployed Render API URL.
7. Deploy the frontend.

After deployment, update the backend's `FRONTEND_URL` to the actual Vercel origin. Verify CORS and cookie settings, then test registration, login, protected routes, and logout on the live site.

## 🧪 Testing Checklist

- [ ] Registration succeeds with valid input.
- [ ] Duplicate email registration is rejected.
- [ ] Passwords are stored as hashes.
- [ ] Login succeeds with valid credentials.
- [ ] Invalid credentials are rejected.
- [ ] Unauthenticated users cannot access protected routes.
- [ ] The welcome page displays the authenticated user's information.
- [ ] Logout clears the authentication session.
- [ ] Password recovery is secure or disabled.
- [ ] The deployed frontend communicates with the backend successfully.

## 👩‍💻 Author

**Chandrika Rani Pothina**

GitHub: [ChanduCharanSample](https://github.com/ChanduCharanSample)

## 📄 License

This project is intended for learning and demonstration. Add a `LICENSE` file if you intend to distribute it under a specific open-source license.
