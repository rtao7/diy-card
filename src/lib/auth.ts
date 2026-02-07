import { NextRequest } from "next/server";

/**
 * Validates API key from request headers
 *
 * The API key can be provided in two ways:
 * 1. Header: `Authorization: Bearer YOUR_API_KEY`
 * 2. Header: `X-API-Key: YOUR_API_KEY`
 *
 * @param request - The Next.js request object
 * @returns true if API key is valid, false otherwise
 */
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = process.env.API_KEY;

  // In production, API key is required
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("API_KEY must be configured in production");
    }
    // In development, log warning but allow requests for easier local development
    console.warn(
      "⚠️ Development mode: API_KEY not set - allowing all write requests",
    );
    return true;
  }

  // Method 1: Check Authorization header (Bearer token)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    return token === apiKey;
  }

  // Method 2: Check X-API-Key header
  const apiKeyHeader = request.headers.get("x-api-key");
  if (apiKeyHeader) {
    return apiKeyHeader === apiKey;
  }

  return false;
}

/**
 * Middleware to check API key and return error response if invalid
 *
 * @param request - The Next.js request object
 * @returns NextResponse with error if invalid, null if valid
 */
export function requireApiKey(request: NextRequest) {
  if (!validateApiKey(request)) {
    return {
      error: "Unauthorized",
      message:
        "API key required for write operations. Provide it via Authorization header (Bearer token) or X-API-Key header.",
      hint: "This endpoint is read-only for public users. Only authorized users can create or modify tasks.",
      status: 401,
    };
  }
  return null;
}
