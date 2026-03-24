# HETTETY System Architecture

## 1. System Architecture
**Overview**: A decoupled full-stack application designed for scalability and security.

*   **Frontend (Client)**: React (Vite) SPA.
    *   Handles UI rendering, form validation, and user interactions.
    *   Communicates with the backend via RESTful API calls.
    *   Stores session tokens (JWT) securely (e.g., HTTP-only cookies or local storage).

*   **Backend (Server)**: Node.js with Express.
    *   **API Layer**: REST endpoints for auth and resources.
    *   **Logic Layer**: Business logic for user verification, property management, and AI recommendations.
    *   **Data Layer**: ORM (like Prisma or Drizzle) or raw SQL query builder.

*   **Database**: PostgreSQL.
    *   Chosen for its reliability, relational integrity, and support for complex queries (essential for real estate filtering).

## 2. Database Structure

### Table: `users`

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('buyer', 'seller', 'investor')) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);
```

*Indexes recommended on `email` and `role` for performance.*

## 3. API Structure

**Base URL**: `/api/v1`

### Authentication Endpoints

| Endpoint | Method | Access | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| `/auth/signup` | `POST` | Public | `{ fullName, email, phone, password, role }` | `{ token, user: { id, email, role } }` |
| `/auth/login` | `POST` | Public | `{ email, password }` | `{ token, user: { id, email, role } }` |
| `/auth/me` | `GET` | Private | N/A (Header: `Authorization: Bearer <token>`) | `{ id, full_name, email, role, ... }` |

## 4. Security Implementation

1.  **Password Security**:
    *   Algorithm: `bcrypt` or `Argon2`.
    *   Policy: Never store plain-text passwords.

2.  **Authentication**:
    *   Mechanism: JSON Web Tokens (JWT).
    *   Flow: Server issues a signed token upon login; Client sends token in `Authorization` header for subsequent requests.

3.  **Input Validation**:
    *   Sanitize all inputs to prevent SQL injection (handled by ORM/Parameterization).
    *   Validate email format and password strength on both client and server.

## 5. Hosting Recommendations

*   **Frontend**: **Vercel**
    *   *Why*: Best-in-class performance for React, global CDN, automated CI/CD.

*   **Database**: **Supabase** (PostgreSQL)
    *   *Why*: Fully managed, scalable, includes built-in Auth features (optional), and provides a generous free tier.

*   **Backend API**: **Render** or **Railway**
    *   *Why*: Simple deployment for Node.js containers, auto-scaling capabilities, and easy environment variable management.
