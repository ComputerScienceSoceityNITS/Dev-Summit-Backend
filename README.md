# Dev Summit 2026 — Backend API

Backend REST API for **Dev Summit 2026**, organised by the **Computer Science Society (CSS)**, Department of Computer Science & Engineering, NIT Silchar in collaboration with **IEEE Silchar Subsection**, **IEEE Kolkata Section**, and **IEEE Computer Society**.

Built on **Node.js + Express + MongoDB/Mongoose**, engineered with production patterns adapted from the TownHall reference architecture.

---

## 📁 Project Structure

```
server/
├── config/
│   └── db.js                       # MongoDB connection lifecycle & error handling
├── controllers/
│   ├── admin.controller.js         # Participants management, CSV export, stats
│   ├── auth.controller.js          # Signup, login, session, and logout
│   ├── event.controller.js         # Workshop, talk, and hackathon CRUD
│   ├── registration.controller.js  # User event participation
├── middleware/
│   ├── admin.middleware.js         # Role authorization (adminOnly)
│   ├── auth.middleware.js          # JWT Bearer token validation (protect)
│   ├── error.middleware.js         # Central 404 & Mongoose/JWT error handlers
├── models/
│   ├── event.model.js              # Event schema
│   ├── participant.model.js        # User-event participation schema
│   └── user.model.js               # Admin / user schema (bcrypt)
├── routes/
│   ├── admin.routes.js             # /api/admin/*
│   ├── auth.routes.js              # /api/auth/*
│   ├── event.routes.js             # /api/events/*
│   ├── registration.routes.js      # /api/registrations/*
├── tests/
│   └── verify.test.js              # Native Node.js test suite
├── utils/
│   ├── asyncHandler.js             # Async controller error wrapper
│   ├── responseHandler.js          # Standard { success, message, data, errors }
│   └── seedData.js                 # Creates the initial admin account
├── .env.example
├── package.json
└── server.js                       # Express app entry point
```

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/dev_summit_2026
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
ADMIN_EMAIL=admin@cse.nits.ac.in
ADMIN_PASSWORD=replace_with_a_strong_password
ADMIN_SCHOLAR_ID=ADMIN
```

### 3. Seed Database

Creates the initial admin account using `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and
`ADMIN_SCHOLAR_ID`. Set a unique password before running the seeder:

```bash
npm run seed
```

### 4. Run Development Server

```bash
npm run dev
# or for production:
npm start
```

### 5. Run Tests

```bash
npm test
```

---

## 📡 API Endpoints Overview

All responses adhere to the standard JSON format:

```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... }
}
```

### 1. Public Content & Info

- `GET /api/health` — API health check and environment status.
- `GET /api/events` — List events (filterable by `?wing=` and `?status=`).
- `GET /api/events/:id` — Get event details by MongoDB ObjectId.
- `POST /api/events` — Create an event (admin only).
- `PUT /api/events/:id` — Update an event (admin only).
- `DELETE /api/events/:id` — Delete an event (admin only).

### 2. Participant (Authenticated Participation)

- `POST /api/registrations/solo` — Register the authenticated user for an open event. Send `{ "eventId": "<event-id>" }`.
- `GET /api/registrations/mine` — Get the authenticated user's active registrations and event details.

### 3. Authentication & Admin (Protected)

- `POST /api/auth/signup` — Create a user account and set an authentication cookie.
- `POST /api/auth/login` — Authenticate a user and set an authentication cookie.
- `POST /api/auth/google` — Verify a Google Identity Services credential and sign in or create a user account.
- `POST /api/auth/logout` — Clear the authentication cookie.
- `GET /api/auth/me` — Current authenticated session and account details.
- `GET /api/admin/registrations` — Paginated participant records with event, status, and user search filters.
- `GET /api/admin/registrations/export` — Download participant data as CSV.
- `PATCH /api/admin/registrations/:id/status` — Set participant status to `registered` or `unregistered`.
- `GET /api/admin/stats` — Participant status and event totals.

Authentication uses an HttpOnly JWT cookie named `dev_summit_token`. The token is not included in the signup or login response. The cookie uses `SameSite=Lax` and is marked `Secure` in production. Configure `CLIENT_URL` with the frontend origin; browser clients making cross-origin requests must include credentials.

Password-based signup requires `name`, `email`, `password`, and `scholarId`; the email must use an NIT Silchar subdomain. Public signup always creates a regular user account, regardless of any `role` value in the request.

Google sign-in requires `GOOGLE_CLIENT_ID` in the backend environment and the same value as `VITE_GOOGLE_CLIENT_ID` in the frontend environment. Configure the OAuth client as a Web application and allow the frontend's origin in its authorized JavaScript origins. Only verified `*.nits.ac.in` Google accounts can sign in. Google-created accounts may have an empty Scholar ID; users can still complete their profile with that field marked as not provided.

Event participation is stored as a `Participant` record linking the authenticated user and event. Each user can have one record per event; registering again reactivates an `unregistered` record. Team registrations and ticket verification are not supported by this participant model.

Authenticated requests validate the `Origin` against `CLIENT_URL` (with local development origins allowed outside production). Browser clients must send the authentication cookie with credentials.
"# Dev-Summit-Backend" 
