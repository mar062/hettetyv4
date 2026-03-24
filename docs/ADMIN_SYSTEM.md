# HETTETY Admin & Super Admin System Design

## 1. Role-Based Access Control (RBAC) System

### Roles Hierarchy
The system implements a strict hierarchy with three distinct roles:

1.  **User** (`user`)
    *   **Access**: Public Website, Personal Profile.
    *   **Permissions**: Browse properties, save favorites, contact owners, get AI recommendations.
    *   **Dashboard Access**: Denied.

2.  **Admin** (`admin`)
    *   **Access**: Admin Dashboard (Limited).
    *   **Permissions**:
        *   Manage properties (Approve/Reject listings).
        *   View platform analytics.
        *   Manage users (View list, basic moderation).
    *   **Restrictions**: Cannot add/remove other admins. Cannot delete users permanently (soft delete only).

3.  **Super Admin** (`super_admin`)
    *   **Access**: Admin Dashboard (Full Control).
    *   **Permissions**:
        *   **All Admin permissions.**
        *   **Manage Admins**: Add new admins, remove admins, change user roles.
        *   **Database Control**: Direct edit/delete capability for any record.
        *   **System Config**: Global settings.
    *   **Hardcoded Rule**: The email `marwaneltaweel0@gmail.com` is **always** recognized as `super_admin` by the backend logic, regardless of the database state (failsafe).

## 2. Database Schema Updates

### Table: `users`
Updated to support the new role system and security requirements.

```sql
CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields for admin actions
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE
);
```

*Note: The previous business roles (Buyer/Seller) can be handled via a separate `profile_type` column or within a `profiles` table linked to `users`.*

## 3. Middleware Logic & Security

### Authentication Middleware (`authMiddleware`)
1.  Verify JWT token from `Authorization` header.
2.  Decode user ID and Role.
3.  Attach `req.user` to the request object.

### Role Validation Middleware (`requireRole`)
A higher-order function to enforce access rights.

```javascript
// Pseudo-code for middleware
const requireRole = (allowedRoles) => (req, res, next) => {
    const userRole = req.user.role;
    const userEmail = req.user.email;

    // 1. Hardcoded Super Admin Override
    if (userEmail === 'marwaneltaweel0@gmail.com') {
        req.user.role = 'super_admin'; // Enforce super_admin privileges
        return next();
    }

    // 2. Role Check
    if (allowedRoles.includes(userRole)) {
        return next();
    }

    // 3. Unauthorized
    return res.status(403).json({ error: 'Access Denied: Insufficient Permissions' });
};
```

### Dashboard Access Control
*   **Route**: `/admin/*`
*   **Middleware**: `requireRole(['admin', 'super_admin'])`

### Critical Actions Control (Database/Role Changes)
*   **Route**: `/admin/system/*`
*   **Middleware**: `requireRole(['super_admin'])`

## 4. API Structure for Admin System

**Base URL**: `/api/v1/admin`

| Endpoint | Method | Access (Role) | Description |
| :--- | :--- | :--- | :--- |
| `/dashboard/stats` | `GET` | Admin, Super Admin | View platform analytics (users, listings count). |
| `/users` | `GET` | Admin, Super Admin | List all users with pagination and filtering. |
| `/users/:id` | `PATCH` | Super Admin | Edit user details (including Role). |
| `/users/:id` | `DELETE` | Super Admin | Permanently delete a user. |
| `/admins` | `POST` | Super Admin | Promote a user to Admin. |
| `/admins/:id` | `DELETE` | Super Admin | Demote an Admin to User. |
| `/properties/approve` | `POST` | Admin, Super Admin | Approve a pending property listing. |
| `/properties/:id` | `PUT` | Super Admin | Force update property data (fix ownership). |

## 5. Security Implementation Details

1.  **JWT Claims**: Token payload includes `{ id, email, role }`.
2.  **Token Expiry**: Short-lived access tokens (e.g., 15 mins) + Refresh tokens for security.
3.  **Audit Logging**: All Super Admin actions (especially role changes and deletions) should be logged to an `audit_logs` table.
4.  **Frontend Protection**:
    *   The Admin Dashboard route (`/dashboard`) is protected by a React Context/Hook that checks the user's role.
    *   If a `user` tries to access it, they are redirected to the home page (`/`).

## 6. Super Admin Failsafe Logic

In the backend `User` model or login handler:

```javascript
function getUserRole(user) {
    const SUPER_ADMIN_EMAIL = 'marwaneltaweel0@gmail.com';
    
    if (user.email === SUPER_ADMIN_EMAIL) {
        return 'super_admin';
    }
    return user.role;
}
```
*This ensures that even if the database is compromised or roles are accidentally changed, the owner retains full control.*
