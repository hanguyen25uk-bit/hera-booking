import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

// Type for API route handlers
type RouteHandler = (
  req: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<Response>;

// Prisma error codes
const PRISMA_ERRORS = {
  P2002: { status: 409, message: "A record with this value already exists" },
  P2025: { status: 404, message: "Record not found" },
  P2003: { status: 400, message: "Invalid reference - related record not found" },
  P2014: { status: 400, message: "Invalid data provided" },
} as const;

/**
 * Wraps an API route handler with global error handling
 * - ZodError → 400 with validation message
 * - Prisma P2002 → 409 Conflict
 * - Prisma P2025 → 404 Not Found
 * - Unknown errors → 500 with generic message (no stack trace)
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    try {
      return await handler(req, context);
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const firstError = error.issues[0];
        const field = firstError.path.join(".");
        const message = field ? `${field}: ${firstError.message}` : firstError.message;

        return NextResponse.json(
          { error: message },
          { status: 400 }
        );
      }

      // Handle Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const code = error.code as keyof typeof PRISMA_ERRORS;
        const errorInfo = PRISMA_ERRORS[code];

        if (errorInfo) {
          // For P2002 (unique constraint), try to extract the field name
          if (code === "P2002" && error.meta?.target) {
            const fields = Array.isArray(error.meta.target)
              ? error.meta.target.join(", ")
              : String(error.meta.target);
            return NextResponse.json(
              { error: `${fields} already exists` },
              { status: 409 }
            );
          }

          return NextResponse.json(
            { error: errorInfo.message },
            { status: errorInfo.status }
          );
        }

        // Log unknown Prisma errors but return generic message
        console.error(`Prisma error ${error.code}:`, error.message);
        return NextResponse.json(
          { error: "Database operation failed" },
          { status: 500 }
        );
      }

      // Handle Prisma validation errors
      if (error instanceof Prisma.PrismaClientValidationError) {
        console.error("Prisma validation error:", error.message);
        return NextResponse.json(
          { error: "Invalid data provided" },
          { status: 400 }
        );
      }

      // Log unknown errors (never expose to client)
      console.error("Unhandled API error:", error instanceof Error ? error.message : "Unknown error");

      return NextResponse.json(
        { error: "An unexpected error occurred" },
        { status: 500 }
      );
    }
  };
}

/**
 * Creates wrapped handlers for all HTTP methods
 */
export function createHandlers(handlers: {
  GET?: RouteHandler;
  POST?: RouteHandler;
  PUT?: RouteHandler;
  PATCH?: RouteHandler;
  DELETE?: RouteHandler;
}) {
  const wrapped: Record<string, RouteHandler> = {};

  for (const [method, handler] of Object.entries(handlers)) {
    if (handler) {
      wrapped[method] = withErrorHandler(handler);
    }
  }

  return wrapped;
}
