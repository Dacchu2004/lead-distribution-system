# CSTech Infosolutions — MERN Stack Admin Dashboard

A full-stack admin application built with MongoDB, Express.js, React.js (Vite), and Node.js — submitted as part of the CSTech Infosolutions Full Stack Development Internship Machine Test.

## Features

- **Admin authentication** with JWT (7-day expiry), bcrypt password hashing, protected routes
- **Agent management** — create and view agents with name, email, mobile (country code), password
- **CSV / XLSX / XLS upload** — validates file type, validates columns, distributes rows equally among 5 agents
- **Automatic list distribution** — remainder items go to agents sequentially (oldest-first by creation date)
- **Live stats dashboard** — total agents, total list items, total upload batches
- **Protected routes** — all pages except `/login` require a valid JWT

---

## Tech Stack

| Layer | Technology |
|---|---|
| Database | MongoDB + Mongoose |
| Backend | Node.js + Express.js |
| Authentication | JSON Web Tokens (JWT) + bcryptjs |
| File Upload | Multer + csv-parser + xlsx |
| Frontend | React.js (Vite) |
| Styling | Tailwind CSS |
| Notifications | react-hot-toast |
| Phone Input | react-phone-input-2 |

---

## Prerequisites

- **Node.js** v18 or higher
- **MongoDB** — local installation (`mongod`) or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster
- **npm** v9 or higher

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repo-url>
cd cstch-mern-test
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `backend/.env` and set your values:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/cstch_mern_test
JWT_SECRET=your_long_random_secret_here
```

Start the backend dev server:

```bash
npm run dev
# Terminal should show:
# ✅ MongoDB Connected: localhost
# 🚀 Server running on http://localhost:5000
```

### 3. Seed the Admin User

Call this **once** after the backend is running. It creates the admin account in MongoDB:

```bash
curl -X POST http://localhost:5000/api/auth/seed-admin
```

Or use Postman / Thunder Client: `POST http://localhost:5000/api/auth/seed-admin`

Expected response:
```json
{ "message": "Admin seeded successfully.", "email": "admin@cstch.com" }
```

Calling it a second time safely returns `400 Admin already seeded` — it is idempotent.

### 4. Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
# Vite starts on http://localhost:5173
```

### 5. Open the app

Visit **http://localhost:5173** in your browser.

---

## Default Admin Credentials

| Field | Value |
|---|---|
| Email | `admin@cstch.com` |
| Password | `Admin@123` |

---

## Environment Variables (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `PORT` | Express server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/cstch_mern_test` |
| `JWT_SECRET` | Secret for signing JWTs — keep this private | Any long random string |

---

## API Endpoints

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/seed-admin` | No | Create the initial admin user (run once) |
| `POST` | `/api/auth/login` | No | Admin login → returns JWT |
| `GET` | `/api/agents` | Yes | List all agents (sorted by creation date) |
| `POST` | `/api/agents` | Yes | Create a new agent |
| `POST` | `/api/lists/upload` | Yes | Upload CSV/XLSX and distribute to agents |
| `GET` | `/api/lists` | Yes | Get all distributed list items grouped by agent |

All protected endpoints expect the header: `Authorization: Bearer <token>`

---

## CSV / Excel File Format

The uploaded file must contain exactly these three columns (case-insensitive):

| Column | Type | Required |
|---|---|---|
| `FirstName` | Text | Yes |
| `Phone` | Number / Text | Yes |
| `Notes` | Text | No (can be empty) |

**Example CSV:**
```
FirstName,Phone,Notes
Alice,9876543210,Follow up Monday
Bob,8765432109,
Charlie,7654321098,High priority
```

---

## Distribution Rules

Given **N** uploaded rows and **5 agents** (sorted by creation date, oldest first):

- Base items per agent = `Math.floor(N / 5)`
- Remainder = `N % 5`
- First `remainder` agents each receive one extra item

**Examples:**

| N | Distribution |
|---|---|
| 25 | [5, 5, 5, 5, 5] |
| 27 | [6, 6, 5, 5, 5] |
| 3 | [1, 1, 1, 0, 0] |

---

## Notes

- Exactly **5 agents** must exist before uploading a CSV. The API returns a descriptive error if fewer exist.
- Uploaded files are deleted from `/backend/uploads/` immediately after processing — no file accumulation.
- JWT tokens expire after 7 days. Log in again if you see a `401 Token invalid or expired` error.
- The `/api/auth/seed-admin` route has no authentication — it is only for initial setup.

---

## Project Structure

```
cstch-mern-test/
├── backend/
│   ├── .env                    ← Environment variables (not committed)
│   ├── .env.example            ← Template for setup
│   ├── server.js               ← Express app entry point
│   ├── config/db.js            ← MongoDB connection
│   ├── models/
│   │   ├── Admin.js
│   │   ├── Agent.js
│   │   └── ListItem.js
│   ├── middleware/
│   │   └── auth.middleware.js  ← JWT verifyToken
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── agent.controller.js
│   │   └── list.controller.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── agent.routes.js
│   │   └── list.routes.js
│   └── uploads/                ← Temp storage (auto-cleared after each upload)
└── frontend/
    ├── src/
    │   ├── api/axios.js         ← Axios instance + JWT interceptor
    │   ├── context/AuthContext.jsx
    │   ├── components/
    │   │   ├── PrivateRoute.jsx
    │   │   ├── Layout.jsx
    │   │   └── Sidebar.jsx
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Dashboard.jsx
    │       ├── Agents.jsx
    │       └── Lists.jsx
    ├── tailwind.config.js
    └── vite.config.js
```

---

*Built by Dharshan S — B.E. AI & ML, Don Bosco Institute of Technology, Bengaluru (2022–2026)*
