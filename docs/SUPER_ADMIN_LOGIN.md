# Secure Super Admin Login System Design

## 1. Super Admin Credentials Strategy

**WARNING**: The password `A3#(80Mss$@kK*` must **NEVER** be stored in plain text in the database or source code.

### Hashing Strategy
We will use **bcrypt** (with a salt round of 10 or 12) to hash the password before storing it.

*   **Email**: `marwaneltaweel0@gmail.com`
*   **Plain Password**: `A3#(80Mss$@kK*`
*   **Target Role**: `super_admin`

## 2. Database Schema (Users Table)

```sql
CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL, -- Stores the bcrypt hash
    role user_role NOT NULL DEFAULT 'user',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);
```

## 3. Implementation Logic

### A. Seeding the Super Admin (Initial Setup)

You must run a seed script to insert the Super Admin into the database. Do not manually insert the plain text password.

**Pseudo-code for Seed Script:**

```javascript
const bcrypt = require('bcrypt');
const { db } = require('./db'); // Database connection

async function seedSuperAdmin() {
    const email = 'marwaneltaweel0@gmail.com';
    const plainPassword = 'A3#(80Mss$@kK*';
    const saltRounds = 12;

    // 1. Hash the password
    const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

    // 2. Insert into DB
    // Note: We explicitly set the role to 'super_admin'
    await db.query(`
        INSERT INTO users (full_name, email, password_hash, role, is_verified)
        VALUES ($1, $2, $3, 'super_admin', true)
        ON CONFLICT (email) DO UPDATE 
        SET role = 'super_admin', password_hash = $3;
    `, ['Super Admin', email, passwordHash]);

    console.log('Super Admin seeded successfully.');
}
```

### B. Login API Logic (`POST /api/auth/login`)

This logic handles authentication and JWT generation.

```javascript
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

async function login(req, res) {
    const { email, password } = req.body;

    // 1. Find user by email
    const user = await db.findUserByEmail(email);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 2. Validate Password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3. Update Last Login
    await db.updateLastLogin(user.id);

    // 4. Generate JWT
    // payload includes role for frontend routing and backend middleware checks
    const token = jwt.sign(
        { 
            userId: user.id, 
            email: user.email, 
            role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );

    // 5. Return Response
    res.json({
        token,
        user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role // Frontend uses this to show/hide Dashboard link
        }
    });
}
```

### C. Middleware Protection (`authMiddleware.js`)

This ensures only the Super Admin can access critical endpoints.

```javascript
const requireSuperAdmin = (req, res, next) => {
    // req.user is populated by previous JWT verification middleware
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // 1. Check Role from Token
    if (req.user.role === 'super_admin') {
        return next();
    }

    // 2. Hardcoded Failsafe (Optional but recommended)
    // Even if DB role is wrong, this email always gets access
    if (req.user.email === 'marwaneltaweel0@gmail.com') {
        return next();
    }

    return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
};
```

## 4. Protected Routes Structure

```javascript
// Admin Routes
router.use('/admin', verifyToken); // Apply JWT check to all /admin routes

// Dashboard Access (Admin + Super Admin)
router.get('/admin/dashboard', requireRole(['admin', 'super_admin']), dashboardController.stats);

// Critical Actions (Super Admin Only)
router.delete('/admin/users/:id', requireSuperAdmin, userController.deleteUser);
router.put('/admin/roles', requireSuperAdmin, userController.changeRole);
router.post('/admin/approve-listing', requireSuperAdmin, listingController.approve);
```

## 5. Security Checklist

1.  [ ] **HTTPS**: Ensure all login requests occur over HTTPS.
2.  [ ] **Rate Limiting**: Apply rate limiting to `/api/auth/login` to prevent brute-force attacks on the Super Admin account.
3.  [ ] **JWT Secret**: Use a long, complex random string for `JWT_SECRET` in `.env`.
4.  [ ] **No Plain Text**: Verify `A3#(80Mss$@kK*` is never logged to console or stored in DB.
