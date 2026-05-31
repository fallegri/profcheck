# Error Handling Middleware Documentation

## Overview

The error handling middleware provides centralized error management for the Event Professional Wheel application. It handles all types of errors (validation, authentication, database, etc.), returns consistent error response formats, logs errors with appropriate severity levels, and provides error tracking for monitoring.

## Features

### 1. Centralized Error Management
- Single point of error handling for all API endpoints
- Consistent error response format across the application
- Support for different error types (validation, auth, database, etc.)

### 2. Error Logging
- Logs errors with appropriate severity levels (info, warn, error, debug)
- Includes context information (method, URL, user agent, IP address)
- Distinguishes between client errors (4xx) and server errors (5xx)
- Logs stack traces for debugging

### 3. Error Tracking & Monitoring
- Tracks all errors for monitoring and analysis
- Stores error metadata (timestamp, code, status, context)
- Provides error statistics (by code, by status)
- Maintains recent errors for quick analysis
- Ready for integration with monitoring services (Sentry, DataDog, etc.)

### 4. Security
- Sanitizes error messages to hide sensitive information
- Removes database connection strings
- Removes API keys and tokens
- Removes email addresses in sensitive contexts
- Never exposes stack traces to clients

### 5. Operational vs Programming Errors
- Distinguishes between operational errors (expected) and programming errors
- Allows marking errors as operational or non-operational
- Helps with error analysis and debugging

## Usage

### Basic Error Handling

```typescript
import { handleApiError, createApiError, withErrorHandler } from '@/middleware/errorHandler';

// In an API endpoint
export default withErrorHandler(async (req, res) => {
  try {
    // Your code here
  } catch (error) {
    handleApiError(error, res, req, 'POST /api/events/create');
  }
});
```

### Creating Custom Errors

```typescript
import { createApiError } from '@/middleware/errorHandler';

// Create a validation error
throw createApiError(
  'Invalid email format',
  400,
  'VALIDATION_ERROR',
  { field: 'email' }
);

// Create a not found error
throw createApiError(
  'Event not found',
  404,
  'NOT_FOUND'
);

// Create a server error
throw createApiError(
  'Database connection failed',
  500,
  'DB_ERROR',
  undefined,
  true // isOperational
);
```

### Wrapping Handlers

```typescript
import { withErrorHandler } from '@/middleware/errorHandler';

const handler = async (req, res) => {
  // Your handler code
};

export default withErrorHandler(handler);
```

### Combining Middleware

```typescript
import { withMiddleware, withErrorHandler } from '@/middleware/errorHandler';
import { withAuth } from '@/middleware/auth';
import { withValidation } from '@/middleware/validation';

const handler = async (req, res) => {
  // Your handler code
};

export default withMiddleware(
  handler,
  withErrorHandler,
  withAuth,
  withValidation
);
```

## Error Response Format

All error responses follow a consistent format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {} // Optional, for validation errors
}
```

### Examples

**Validation Error (400)**
```json
{
  "success": false,
  "error": "Validation error",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "path": "name",
      "message": "String must contain at least 1 character(s)"
    }
  ]
}
```

**Not Found Error (404)**
```json
{
  "success": false,
  "error": "Event not found",
  "code": "NOT_FOUND"
}
```

**Server Error (500)**
```json
{
  "success": false,
  "error": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

## Error Types

### Validation Errors (400)
- Zod validation errors
- Invalid input format
- Missing required fields

```typescript
const error = createApiError(
  'Invalid input',
  400,
  'VALIDATION_ERROR',
  { field: 'email', reason: 'Invalid format' }
);
```

### Authentication Errors (401)
- Missing or invalid token
- Expired session
- Invalid credentials

```typescript
const error = createApiError(
  'Unauthorized',
  401,
  'UNAUTHORIZED'
);
```

### Authorization Errors (403)
- Insufficient permissions
- Access denied
- Resource not accessible

```typescript
const error = createApiError(
  'Forbidden',
  403,
  'FORBIDDEN'
);
```

### Not Found Errors (404)
- Resource not found
- Event doesn't exist
- User not found

```typescript
const error = createApiError(
  'Event not found',
  404,
  'NOT_FOUND'
);
```

### Server Errors (500)
- Database errors
- External service failures
- Unexpected errors

```typescript
const error = createApiError(
  'Database connection failed',
  500,
  'DB_ERROR'
);
```

## Error Tracking

### Getting Error Data

```typescript
import { getErrorTrackingData, getErrorStatistics } from '@/middleware/errorHandler';

// Get recent errors (last 100)
const recentErrors = getErrorTrackingData(100);

// Get error statistics
const stats = getErrorStatistics();
// {
//   total: 42,
//   byCode: { VALIDATION_ERROR: 20, NOT_FOUND: 15, DB_ERROR: 7 },
//   byStatus: { 400: 20, 404: 15, 500: 7 },
//   recent: [...]
// }
```

### Clearing Error Data

```typescript
import { clearErrorTrackingData } from '@/middleware/errorHandler';

clearErrorTrackingData();
```

## Logging

Errors are logged with appropriate severity levels:

- **INFO**: General information
- **WARN**: Client errors (4xx) and warnings
- **ERROR**: Server errors (5xx) and critical issues
- **DEBUG**: Debug information (development only)

### Log Format

```
[2024-01-15T10:30:45.123Z] [ERROR] Server error [POST /api/events/create]: Database connection failed
{
  statusCode: 500,
  code: 'DB_ERROR',
  stack: '...',
  isOperational: true,
  method: 'POST',
  url: '/api/events/create'
}
```

## Security Considerations

### Sensitive Information Sanitization

The middleware automatically sanitizes error messages to hide:

1. **Database Connection Strings**
   - Before: `postgresql://user:password@localhost/db`
   - After: `postgresql://***`

2. **API Keys and Tokens**
   - Before: `Bearer sk_live_abc123def456`
   - After: `Bearer ***`

3. **Email Addresses** (in database/connection contexts)
   - Before: `user@example.com`
   - After: `***@***.***`

### Stack Traces

Stack traces are:
- Logged on the server for debugging
- Never sent to clients
- Only visible in development logs

### Error Details

Error details are only included in responses when explicitly provided:
- Validation errors include field-level details
- Other errors don't expose internal details
- Details are sanitized before sending to client

## Integration with Monitoring Services

To integrate with monitoring services like Sentry or DataDog:

1. Uncomment the monitoring service call in `trackError()`:

```typescript
if (process.env.NODE_ENV === "production") {
  sendToMonitoringService(data);
}
```

2. Implement the `sendToMonitoringService()` function:

```typescript
async function sendToMonitoringService(data: ErrorTrackingData) {
  // Send to Sentry, DataDog, etc.
  await fetch('https://monitoring-service.com/api/errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
```

## Best Practices

### 1. Always Use withErrorHandler

```typescript
// ✅ Good
export default withErrorHandler(async (req, res) => {
  // Your code
});

// ❌ Bad
export default async (req, res) => {
  // Your code without error handling
};
```

### 2. Create Specific Error Codes

```typescript
// ✅ Good
throw createApiError('Event not found', 404, 'EVENT_NOT_FOUND');

// ❌ Bad
throw createApiError('Not found', 404);
```

### 3. Include Context

```typescript
// ✅ Good
handleApiError(error, res, req, 'POST /api/events/create');

// ❌ Bad
handleApiError(error, res);
```

### 4. Use Appropriate Status Codes

```typescript
// ✅ Good
throw createApiError('Invalid input', 400, 'VALIDATION_ERROR');
throw createApiError('Unauthorized', 401, 'UNAUTHORIZED');
throw createApiError('Not found', 404, 'NOT_FOUND');
throw createApiError('Server error', 500, 'INTERNAL_ERROR');

// ❌ Bad
throw createApiError('Error', 500, 'ERROR');
```

### 5. Mark Operational Errors

```typescript
// ✅ Good - Expected error
throw createApiError(
  'Event not found',
  404,
  'NOT_FOUND',
  undefined,
  true // isOperational
);

// ✅ Good - Programming error
throw createApiError(
  'Unexpected state',
  500,
  'INTERNAL_ERROR',
  undefined,
  false // isOperational
);
```

## Testing

The middleware includes comprehensive unit tests. Run tests with:

```bash
npm test -- errorHandler.test.ts
```

Tests cover:
- Validation error handling
- Custom API errors
- Server error logging
- Unknown error handling
- Sensitive information sanitization
- Error tracking
- Error response format
- Different error types

## Troubleshooting

### Errors Not Being Logged

Check that:
1. The logger is properly configured
2. The error handler is being called
3. The log level is appropriate for the error type

### Sensitive Information Leaking

Check that:
1. Error messages are being sanitized
2. Stack traces are not being sent to clients
3. Error details are not exposing internal information

### Error Tracking Not Working

Check that:
1. `handleApiError` is being called with the request object
2. Error tracking data is not being cleared unexpectedly
3. The tracking store is not exceeding the 1000 entry limit

## Future Enhancements

1. **Monitoring Service Integration**
   - Integrate with Sentry, DataDog, or similar services
   - Send errors to monitoring dashboard

2. **Error Recovery**
   - Implement automatic retry logic for transient errors
   - Add circuit breaker pattern for external services

3. **Error Analytics**
   - Track error trends over time
   - Identify most common errors
   - Alert on error spikes

4. **Custom Error Handlers**
   - Allow registering custom handlers for specific error types
   - Support error transformation and enrichment

5. **Error Context**
   - Add request context (user ID, session ID, etc.)
   - Include performance metrics
   - Track error impact on users
