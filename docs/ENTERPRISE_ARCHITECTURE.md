# HETTETY Enterprise Backend Architecture

## 1. Full Backend Architecture Explanation

**Overview:**
The HETTETY backend is designed as a **Modular Monolith** using **Node.js (Express)**, preparing for a seamless transition to microservices if required at scale. It leverages **PostgreSQL** as the primary relational database, enhanced with the `pgvector` extension for AI-driven vector similarity search. **Redis** is used as an in-memory datastore for caching frequent queries (like property listings) and managing session states.

**Core Components:**
*   **API Gateway / Routing Layer:** Express.js handles incoming HTTP requests, applying rate limiting, CORS, and security headers via Helmet.
*   **Authentication & Authorization:** JWT-based stateless authentication with short-lived access tokens and secure, HTTP-only refresh tokens. Role-Based Access Control (RBAC) ensures strict separation between Users, Agents, Admins, and Super Admins.
*   **Business Logic Layer (Services):** Controllers delegate complex operations to service classes, keeping routes clean and testable.
*   **Data Access Layer (ORM):** Prisma ORM provides type-safe database queries, schema migrations, and relationship management.
*   **AI Recommendation Engine:** Uses OpenAI embeddings stored in PostgreSQL via `pgvector`. When a user interacts with a property, their behavior is logged and embedded. The system performs cosine similarity searches (`<=>`) to recommend similar properties.
*   **Background Processing:** BullMQ (backed by Redis) handles asynchronous tasks like sending emails, processing image uploads to AWS S3, and generating AI embeddings without blocking the main event loop.

---

## 2. Database Schema (ERD Concept)

The database is highly normalized to ensure data integrity and optimized with indexes for read-heavy operations.

*   **Users:** Core identity table.
*   **AgentProfile:** 1-to-1 extension of Users for agents.
*   **Property:** Core entity. Links to Agent (User).
*   **PropertyLocation:** 1-to-1 with Property. Stores lat/lng for geospatial queries.
*   **PropertyImage:** 1-to-Many with Property. Stores S3 URLs.
*   **PriceHistory:** Tracks price changes over time.
*   **Favorite:** Many-to-Many join table between Users and Properties.
*   **Review:** User ratings for properties.
*   **ChatMessage:** User-to-Agent communication.
*   **Notification:** System alerts.
*   **AIRecommendationLog:** Tracks user behavior (views, searches) with vector embeddings to feed the recommendation ML model.

---

## 3. Prisma Schema

The complete, production-ready Prisma schema has been generated in `backend/prisma/schema.prisma`. It includes the `pgvector` extension for AI capabilities, proper indexing, and cascading deletes.

---

## 4. API Endpoint Structure

**Base URL:** `/api/v1`

### Auth (`/auth`)
*   `POST /register` - Register new user
*   `POST /login` - Authenticate and return JWT
*   `POST /logout` - Invalidate refresh token
*   `POST /refresh` - Get new access token
*   `POST /verify-email` - Verify email via token

### Users (`/users`)
*   `GET /me` - Get current user profile
*   `PUT /me` - Update profile settings
*   `PATCH /me/password` - Change password

### Properties (`/properties`)
*   `GET /` - Search properties (with pagination, filters, Redis cache)
*   `GET /:id` - Get property details
*   `POST /` - Create property (Agent/Admin only)
*   `PUT /:id` - Update property
*   `DELETE /:id` - Delete property
*   `GET /recommendations` - Get AI-driven recommendations

### Favorites (`/favorites`)
*   `GET /` - List user favorites
*   `POST /:propertyId` - Add to favorites
*   `DELETE /:propertyId` - Remove from favorites

### Chat (`/chat`)
*   `GET /conversations` - List active chats
*   `GET /:userId` - Get message history with specific user
*   `POST /:userId` - Send message

### Admin (`/admin`)
*   `GET /users` - List all users (paginated)
*   `PUT /users/:id/role` - Update user role (Super Admin only)
*   `GET /analytics` - Platform statistics

---

## 5. Security Implementation

*   **Authentication:** JWT with RS256 signing. Access tokens expire in 15m; Refresh tokens (stored in HTTP-only, secure cookies) expire in 7d.
*   **Password Hashing:** `bcrypt` with a salt round of 12.
*   **Rate Limiting:** `express-rate-limit` applied globally (e.g., 100 req/15min) and strictly on auth routes (e.g., 5 req/15min for login).
*   **SQL Injection:** Prevented by Prisma ORM's parameterized queries.
*   **XSS Protection:** Input sanitization using `xss-clean` and strict Content Security Policy (CSP) via `helmet`.
*   **CSRF Protection:** Implemented using `csurf` middleware for state-changing requests.
*   **Validation:** `zod` or `express-validator` ensures all incoming request bodies match expected schemas before processing.
*   **Environment Security:** `.env` files are never committed. Secrets are managed via AWS Secrets Manager or Vercel Environment Variables.

---

## 6. Folder Structure

```text
/backend
├── /src
│   ├── /config          # Environment variables, DB connection, Redis setup
│   ├── /controllers     # Request handlers (req, res)
│   ├── /routes          # Express router definitions
│   ├── /services        # Business logic and database calls
│   ├── /middleware      # Auth, error handling, rate limiting, validation
│   ├── /utils           # Helper functions (jwt, hash, logger)
│   ├── /jobs            # BullMQ worker processors (emails, AI embeddings)
│   ├── /security        # Helmet config, CORS config, CSRF setup
│   └── app.ts           # Express app initialization
├── /prisma
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Auto-generated SQL migrations
├── Dockerfile           # Container configuration
├── docker-compose.yml   # Local dev environment (Postgres, Redis)
├── package.json
└── .env.example
```

---

## 7. Example Backend Code

### `src/app.ts` (Entry Point)
```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes';
import propertyRoutes from './routes/propertyRoutes';
import { errorHandler } from './middleware/errorMiddleware';

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10kb' })); // Prevent large payload attacks

// Rate Limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api', limiter);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/properties', propertyRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
```

### `src/services/aiService.ts` (AI Recommendation Logic)
```typescript
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getRecommendations(userId: string) {
  // 1. Get user's recent interactions
  const recentLogs = await prisma.aIRecommendationLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  // 2. Generate an embedding representing the user's current interest
  const contextText = recentLogs.map(l => l.searchQuery || l.actionType).join(' ');
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: contextText,
  });
  const vector = embeddingResponse.data[0].embedding;

  // 3. Perform Vector Similarity Search using pgvector
  // <=> is the cosine distance operator in pgvector
  const recommendations = await prisma.$queryRaw`
    SELECT id, title, price, 1 - (embedding <=> ${vector}::vector) as similarity
    FROM "Property"
    WHERE status = 'AVAILABLE'
    ORDER BY similarity DESC
    LIMIT 10;
  `;

  return recommendations;
}
```

---

## 8. DevOps & Deployment

### Docker Configuration (`Dockerfile`)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
EXPOSE 8080
CMD ["npm", "start"]
```

### CI/CD Pipeline (GitHub Actions)
1.  **On Push to `main`**: Trigger workflow.
2.  **Test Stage**: Run Jest unit and integration tests. Run ESLint.
3.  **Build Stage**: Build Docker image.
4.  **Push Stage**: Push image to AWS ECR or Docker Hub.
5.  **Deploy Stage**: Trigger deployment webhook or update ECS task definition.

### Deployment Recommendations
*   **Compute**: **AWS ECS (Fargate)** or **DigitalOcean App Platform**. Both offer auto-scaling container management without managing underlying EC2 instances.
*   **Database**: **AWS RDS (PostgreSQL)** or **Supabase**. Supabase is highly recommended for startups as it comes with `pgvector` pre-configured.
*   **Caching**: **Upstash (Serverless Redis)** or **AWS ElastiCache**.
*   **Storage**: **AWS S3** with CloudFront CDN for serving property images lightning fast.

### Observability
*   **Logging**: Use `Winston` or `Pino` in Node.js. Stream logs to **Datadog** or **AWS CloudWatch**.
*   **Monitoring**: **Sentry** for real-time error tracking and performance monitoring (APM) to detect slow database queries.
