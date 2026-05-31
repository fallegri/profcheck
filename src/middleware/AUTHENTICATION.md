# Authentication Middleware Documentation

## Overview

The authentication middleware provides centralized authentication management for the Event Professional Wheel application. It handles:

- Session validation using NextAuth.js
- User authentication verification
- Resource ownership verification
- Event admin authorization
- Secure token management
- Comprehensive logging and error handling

## Features

### 1. Session Validation
- Validates that user has an active session
- Checks for valid user email
- Returns session data for use in handlers
- Throws 401 Unauthorized if session is invalid

### 2. Resource Ownership Verification
- Verifies that user owns a resource
- Prevents unauthorized access to other users' resources
- Throws 403 Forbidden if user doesn't own resource

### 3. Event Admin Authorization
- Verifies that user is the admin of an event
- Prevents non-admins from modifying events
- Throws 403 Forbidden if user is not event admin

### 4. Secure Token Management
- Tokens are encrypted in NextAuth.js session
- Access tokens are available in session for API calls
- Refresh tokens are handled automatically
- Tokens are never exposed in logs

### 5. Logging and Monitoring
- Logs unauthorized access attempts
- Logs authentication errors with context
- Includes IP address and user agent in logs
- Helps identify security issues

## Usage

### Basic Authentication

```typescript
import { requireAuth } from '@/middleware/auth';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Require authentication
    const session = await requireAuth(req, res);
    
    // Use session data
    const userEmail = session.user?.email;
    
    // Your handler code
    res.status(200).json({ success: true });
  } catch (error) {
    // Error handling
    res.status(401).json({ error: 'Unauthorized' });
  }
}
```

### With Error Handler Middleware

```typescript
import { requireAuth } from '@/middleware/auth';
import { withErrorHandler } from '@/middleware/errorHandler';
import { NextApiRequest, NextApiResponse } from 'next';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Require authentication
  const session = await requireAuth(req, res);
  
  // Your handler code
  res.status(200).json({ success: true });
}

export default withErrorHandler(handler);
```

### Verify Resource Ownership

```typescript
import { requireAuth, verifyOwnership } from '@/middleware/auth';
import { withErrorHandler } from '@/middleware/errorHandler';
import { prisma } from '@/lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Require authentication
  const session = await requireAuth(req, res);
  
  // Get user
  const user = await prisma.user.findUnique({
    where: { email: session.user?.email || '' },
  });
  
  // Get resource
  const resource = await prisma.resource.findUnique({
    where: { id: req.query.id as string },
  });
  
  // Verify ownership
  await verifyOwnership(user!.id, resource!.ownerId);
  
  // Your handler code
  res.status(200).json({ success: true });
}

export default withErrorHandler(handler);
```

### Verify Event Admin

```typescript
import { requireAuth, verifyEventAdmin } from '@/middleware/auth';
import { withErrorHandler } from '@/middleware/errorHandler';
import { prisma } from '@/lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Require authentication
  const session = await requireAuth(req, res);
  
  // Get user
  const user = await prisma.user.findUnique({
    where: { email: session.user?.email || '' },
  });
  
  // Get event
  const event = await prisma.event.findUnique({
    where: { id: req.query.id as string },
  });
  
  // Verify user is event admin
  await verifyEventAdmin(user!.id, event!.adminId);
  
  // Your handler code
  res.status(200).json({ success: true });
}

export default withErrorHandler(handler);
```

### Using withAuth Wrapper

```typescript
import { withAuth } from '@/middleware/auth';
import { withErrorHandler } from '@/middleware/errorHandler';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  // Session is automatically passed
  const userEmail = session.user?.email;
  
  // Your handler code
  res.status(200).json({ success: true });
}

export default withErrorHandler(withAuth(handler));
```

## API Reference

### requireAuth(req, res)

Validates that user has an active session.

**Parameters:**
- `req` (NextApiRequest): The request object
- `res` (NextApiResponse): The response object

**Returns:**
- `Promise<any>`: The session object containing user data

**Throws:**
- `ApiError` with status 401 if session is invalid
- `ApiError` with status 500 if authentication fails

**Example:**
```typescript
const session = await requireAuth(req, res);
console.log(session.user?.email); // User's email
```

### withAuth(handler)

Wraps an async API route handler with authentication.

**Parameters:**
- `handler` (Function): Async handler function that receives (req, res, session)

**Returns:**
- `Function`: Wrapped handler function

**Example:**
```typescript
export default withAuth(async (req, res, session) => {
  // Session is automatically available
  res.status(200).json({ user: session.user });
});
```

### verifyOwnership(userId, resourceOwnerId)

Verifies that user owns a resource.

**Parameters:**
- `userId` (string): The user's ID
- `resourceOwnerId` (string): The resource owner's ID

**Returns:**
- `Promise<void>`: Resolves if ownership is verified

**Throws:**
- `ApiError` with status 403 if user doesn't own resource

**Example:**
```typescript
await verifyOwnership(user.id, resource.ownerId);
```

### verifyEventAdmin(userId, eventAdminId)

Verifies that user is the admin of an event.

**Parameters:**
- `userId` (string): The user's ID
- `eventAdminId` (string): The event admin's ID

**Returns:**
- `Promise<void>`: Resolves if user is event admin

**Throws:**
- `ApiError` with status 403 if user is not event admin

**Example:**
```typescript
await verifyEventAdmin(user.id, event.adminId);
```

## Session Structure

The session object returned by `requireAuth` has the following structure:

```typescript
{
  user: {
    email: string;
    name?: string;
    image?: string;
    accessToken?: string; // Encrypted Google access token
    refreshToken?: string; // Encrypted Google refresh token
  };
  expires: string; // ISO 8601 timestamp
}
```

## Error Responses

### Unauthorized (401)

Returned when user is not authenticated or session is invalid.

```json
{
  "success": false,
  "error": "Unauthorized",
  "code": "UNAUTHORIZED"
}
```

### Forbidden (403)

Returned when user doesn't have permission to access resource.

```json
{
  "success": false,
  "error": "Forbidden",
  "code": "FORBIDDEN"
}
```

### User Not Found (401)

Returned when user exists in session but not in database.

```json
{
  "success": false,
  "error": "User not found",
  "code": "USER_NOT_FOUND"
}
```

## Security Considerations

### 1. Token Encryption

- Access tokens are encrypted in NextAuth.js session
- Tokens are never stored in plain text
- Tokens are only available in server-side code

### 2. Session Validation

- Session is validated on every request
- Invalid sessions are rejected immediately
- Session expiration is enforced (30 days by default)

### 3. Ownership Verification

- All resource modifications require ownership verification
- Prevents users from modifying other users' resources
- Prevents users from accessing other users' data

### 4. Logging

- Unauthorized access attempts are logged
- Includes IP address and user agent
- Helps identify security issues and attacks

### 5. Error Messages

- Error messages don't reveal whether user exists
- Error messages don't reveal why authentication failed
- Prevents information leakage

## Best Practices

### 1. Always Require Authentication for Admin Endpoints

```typescript
// ✅ Good
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAuth(req, res);
  // Your code
}

// ❌ Bad
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // No authentication check
}
```

### 2. Verify Ownership for Resource Modifications

```typescript
// ✅ Good
const event = await prisma.event.findUnique({ where: { id } });
await verifyEventAdmin(user.id, event.adminId);

// ❌ Bad
const event = await prisma.event.findUnique({ where: { id } });
// No ownership verification
```

### 3. Use withErrorHandler with Authentication

```typescript
// ✅ Good
export default withErrorHandler(async (req, res) => {
  const session = await requireAuth(req, res);
  // Your code
});

// ❌ Bad
export default async (req, res) => {
  const session = await requireAuth(req, res);
  // No error handling
};
```

### 4. Get User from Database

```typescript
// ✅ Good
const user = await prisma.user.findUnique({
  where: { email: session.user?.email || '' },
});

// ❌ Bad
const userId = session.user?.id; // User ID not in session
```

### 5. Check for User Existence

```typescript
// ✅ Good
const user = await prisma.user.findUnique({
  where: { email: session.user?.email || '' },
});
if (!user) {
  throw createApiError('User not found', 401, 'USER_NOT_FOUND');
}

// ❌ Bad
const user = await prisma.user.findUnique({
  where: { email: session.user?.email || '' },
});
// No check for user existence
```

## Common Patterns

### Pattern 1: Admin Endpoint

```typescript
import { requireAuth, verifyEventAdmin } from '@/middleware/auth';
import { withErrorHandler } from '@/middleware/errorHandler';
import { prisma } from '@/lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Require authentication
  const session = await requireAuth(req, res);
  
  // Get user
  const user = await prisma.user.findUnique({
    where: { email: session.user?.email || '' },
  });
  
  if (!user) {
    throw createApiError('User not found', 401, 'USER_NOT_FOUND');
  }
  
  // Get event
  const event = await prisma.event.findUnique({
    where: { id: req.query.id as string },
  });
  
  if (!event) {
    throw createApiError('Event not found', 404, 'NOT_FOUND');
  }
  
  // Verify user is event admin
  await verifyEventAdmin(user.id, event.adminId);
  
  // Your handler code
  res.status(200).json({ success: true });
}

export default withErrorHandler(handler);
```

### Pattern 2: Public Endpoint with Optional Auth

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { withErrorHandler } from '@/middleware/errorHandler';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get session (optional)
  const session = await getServerSession(req, res, authOptions);
  
  if (session) {
    // User is authenticated
    const userEmail = session.user?.email;
  } else {
    // User is not authenticated
  }
  
  // Your handler code
  res.status(200).json({ success: true });
}

export default withErrorHandler(handler);
```

### Pattern 3: Visitor Endpoint (No Auth Required)

```typescript
import { withErrorHandler } from '@/middleware/errorHandler';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // No authentication required
  
  // Your handler code
  res.status(200).json({ success: true });
}

export default withErrorHandler(handler);
```

## Testing

### Unit Tests

```typescript
import { requireAuth, verifyOwnership, verifyEventAdmin } from '@/middleware/auth';
import { createApiError } from '@/middleware/errorHandler';

describe('Authentication Middleware', () => {
  describe('requireAuth', () => {
    it('should return session if authenticated', async () => {
      // Mock session
      const mockSession = {
        user: { email: 'user@example.com' },
      };
      
      // Mock getServerSession
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(mockSession),
      }));
      
      // Test
      const session = await requireAuth(req, res);
      expect(session).toEqual(mockSession);
    });
    
    it('should throw 401 if not authenticated', async () => {
      // Mock getServerSession to return null
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(null),
      }));
      
      // Test
      await expect(requireAuth(req, res)).rejects.toThrow();
    });
  });
  
  describe('verifyOwnership', () => {
    it('should pass if user owns resource', async () => {
      await expect(
        verifyOwnership('user-1', 'user-1')
      ).resolves.toBeUndefined();
    });
    
    it('should throw 403 if user does not own resource', async () => {
      await expect(
        verifyOwnership('user-1', 'user-2')
      ).rejects.toThrow();
    });
  });
});
```

## Troubleshooting

### Session is null

**Problem:** `requireAuth` throws "Unauthorized" even though user is logged in.

**Solutions:**
1. Check that NextAuth.js is properly configured
2. Check that `NEXTAUTH_SECRET` is set in environment variables
3. Check that session strategy is set to 'jwt'
4. Check that user is actually logged in (check cookies)

### User not found in database

**Problem:** Session exists but user is not in database.

**Solutions:**
1. Check that user was created during OAuth callback
2. Check that PrismaAdapter is properly configured
3. Check that database connection is working
4. Check that user email is correct

### Ownership verification fails

**Problem:** `verifyOwnership` throws 403 even though user should own resource.

**Solutions:**
1. Check that user ID is correct
2. Check that resource owner ID is correct
3. Check that resource exists in database
4. Check that user ID and owner ID match exactly

### Tokens not available in session

**Problem:** `session.user?.accessToken` is undefined.

**Solutions:**
1. Check that Google OAuth is properly configured
2. Check that JWT callback is storing tokens
3. Check that session callback is passing tokens
4. Check that tokens are being encrypted/decrypted correctly

## Future Enhancements

1. **Role-Based Access Control (RBAC)**
   - Add role field to User model
   - Implement role verification middleware
   - Support multiple roles per user

2. **Permission-Based Access Control (PBAC)**
   - Define granular permissions
   - Check permissions in middleware
   - Support permission inheritance

3. **Multi-Factor Authentication (MFA)**
   - Add MFA support to NextAuth.js
   - Verify MFA status in middleware
   - Require MFA for sensitive operations

4. **Session Management**
   - Track active sessions
   - Allow session revocation
   - Implement session timeout

5. **Audit Logging**
   - Log all authentication events
   - Track who accessed what and when
   - Generate audit reports

6. **Rate Limiting**
   - Implement rate limiting per user
   - Prevent brute force attacks
   - Track failed authentication attempts

</content>
