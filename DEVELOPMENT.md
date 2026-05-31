# Development Guide - Event Professional Wheel

## Project Structure

```
src/
├── app/                     # Next.js App Router
│   ├── api/                 # API routes
│   │   └── auth/            # NextAuth configuration
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── pages/                   # Legacy API routes (if needed)
│   └── api/
│       ├── auth/            # Authentication endpoints
│       ├── events/          # Event management endpoints
│       ├── sessions/        # Session management endpoints
│       ├── selections/      # Selection recording endpoints
│       └── professions/     # Profession management endpoints
├── components/              # React components
│   ├── LoginButton.tsx      # Login/logout button
│   ├── ProfessionWheel.tsx  # Interactive profession wheel
│   └── ProfessionPanel.tsx  # Profession details panel
├── hooks/                   # Custom React hooks
│   ├── useAuth.ts           # Authentication hook
│   └── useVisitorSession.ts # Visitor session hook
├── services/                # Business logic services
│   ├── googleDrive.ts       # Google Drive integration
│   └── events.ts            # Event management service
├── utils/                   # Utility functions
│   ├── encryption.ts        # Encryption/decryption
│   ├── sessionId.ts         # Session ID generation
│   ├── logger.ts            # Logging utility
│   └── wheelGeometry.ts     # Wheel geometry calculations
├── middleware/              # API middleware
│   ├── auth.ts              # Authentication middleware
│   ├── validation.ts        # Input validation middleware
│   └── errorHandler.ts      # Error handling middleware
├── schemas/                 # Zod validation schemas
│   ├── event.ts             # Event schemas
│   ├── profession.ts        # Profession schemas
│   └── selection.ts         # Selection schemas
├── types/                   # TypeScript type definitions
│   └── index.ts             # Common types
├── lib/                     # Library initialization
│   └── prisma.ts            # Prisma client
└── __tests__/               # Test files
```

## Development Workflow

### 1. Setup

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Setup database
npx prisma migrate dev --name init
```

### 2. Running Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 3. Database Management

```bash
# Create a new migration
npx prisma migrate dev --name <migration_name>

# View database in Prisma Studio
npm run prisma:studio

# Generate Prisma client
npm run prisma:generate
```

### 4. Code Style

- Use TypeScript for all code
- Follow ESLint rules
- Use Prettier for formatting
- Write descriptive variable and function names
- Add JSDoc comments for public functions

### 5. Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in with Google
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get current session

### Events
- `POST /api/events/create` - Create new event
- `GET /api/events` - List user's events
- `GET /api/events/[id]` - Get event details
- `PUT /api/events/[id]` - Update event
- `DELETE /api/events/[id]` - Delete event

### Professions
- `GET /api/events/[id]/professions` - Get event professions
- `POST /api/events/[id]/professions/configure` - Configure professions
- `POST /api/professions/upload-image` - Upload profession image

### Selections
- `POST /api/selections/record` - Record visitor selection
- `GET /api/events/[id]/selections` - Get event selections
- `GET /api/events/[id]/selections/export` - Export selections as CSV

### Sessions
- `POST /api/sessions/create` - Create visitor session
- `GET /api/sessions/[sessionId]` - Get session info

## Common Tasks

### Adding a New API Endpoint

1. Create the route file in `src/pages/api/`
2. Define Zod schema in `src/schemas/`
3. Implement the handler with error handling
4. Add tests in `src/__tests__/`

Example:
```typescript
// src/pages/api/example.ts
import { NextApiRequest, NextApiResponse } from "next";
import { withErrorHandler } from "@/middleware/errorHandler";
import { withAuth } from "@/middleware/auth";

const handler = withAuth(async (req, res, session) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Your logic here
  res.status(200).json({ success: true });
});

export default withErrorHandler(handler);
```

### Adding a New Component

1. Create component in `src/components/`
2. Use TypeScript for props
3. Add JSDoc comments
4. Create tests in `src/__tests__/components/`

Example:
```typescript
// src/components/Example.tsx
"use client";

import { ReactNode } from "react";

interface ExampleProps {
  children: ReactNode;
  title: string;
}

/**
 * Example component
 */
export function Example({ children, title }: ExampleProps) {
  return (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
```

### Adding a New Hook

1. Create hook in `src/hooks/`
2. Use "use" prefix
3. Add JSDoc comments
4. Create tests in `src/__tests__/hooks/`

Example:
```typescript
// src/hooks/useExample.ts
"use client";

import { useState, useCallback } from "react";

export function useExample() {
  const [state, setState] = useState(false);

  const toggle = useCallback(() => {
    setState((prev) => !prev);
  }, []);

  return { state, toggle };
}
```

## Debugging

### Enable Debug Logging

Set `DEBUG=*` environment variable:
```bash
DEBUG=* npm run dev
```

### Use Prisma Studio

```bash
npm run prisma:studio
```

This opens a visual editor for your database at `http://localhost:5555`

### Browser DevTools

- Use React DevTools extension for component debugging
- Use Network tab to inspect API calls
- Use Console for JavaScript errors

## Performance Tips

1. Use Next.js Image component for images
2. Implement code splitting with `next/dynamic`
3. Use React.memo for expensive components
4. Optimize database queries with Prisma
5. Enable caching where appropriate

## Security Checklist

- [ ] All environment variables are set
- [ ] HTTPS is enabled in production
- [ ] CORS is properly configured
- [ ] Input validation is implemented
- [ ] Authentication is required for protected routes
- [ ] Sensitive data is encrypted
- [ ] Rate limiting is implemented
- [ ] Security headers are set

## Troubleshooting

### Database Connection Issues

```bash
# Check DATABASE_URL in .env.local
# Verify PostgreSQL is running
# Test connection with Prisma Studio
npm run prisma:studio
```

### NextAuth Issues

- Ensure NEXTAUTH_URL matches your domain
- Verify NEXTAUTH_SECRET is set
- Check Google OAuth credentials
- Clear browser cookies and try again

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
