import { NextResponse } from "next/server";

/**
 * Custom API Error class for handling application-specific errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Standard error response format
 */
interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
  code?: string;
}

/**
 * Handles API errors and returns a standardized NextResponse
 *
 * @param error - The error to handle
 * @returns NextResponse with error details
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  // Handle custom ApiError
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.details,
        code: error.code,
      },
      { status: error.statusCode },
    );
  }

  // Handle standard Error
  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  }

  // Handle unknown error types
  return NextResponse.json(
    {
      success: false,
      error: "Internal server error",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    },
    { status: 500 },
  );
}

/**
 * Common API error types
 */
export const API_ERRORS = {
  // 400 - Bad Request
  INVALID_INPUT: (details?: string) =>
    new ApiError("Invalid input", 400, "INVALID_INPUT", details),
  MISSING_FIELD: (field: string) =>
    new ApiError(`Missing required field: ${field}`, 400, "MISSING_FIELD"),

  // 401 - Unauthorized
  UNAUTHORIZED: (details?: string) =>
    new ApiError("Unauthorized", 401, "UNAUTHORIZED", details),
  INVALID_API_KEY: () =>
    new ApiError("Invalid API key", 401, "INVALID_API_KEY"),

  // 404 - Not Found
  NOT_FOUND: (resource: string) =>
    new ApiError(`${resource} not found`, 404, "NOT_FOUND"),

  // 500 - Internal Server Error
  DATABASE_ERROR: (details?: string) =>
    new ApiError("Database error", 500, "DATABASE_ERROR", details),
  CONFIGURATION_ERROR: (details?: string) =>
    new ApiError(
      "Server configuration error",
      500,
      "CONFIGURATION_ERROR",
      details,
    ),
} as const;
