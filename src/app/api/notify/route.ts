import { NextResponse } from "next/server";
import {
  SendNotificationRequest,
  sendNotificationResponseSchema,
} from "@farcaster/frame-sdk";
import { z } from "zod";
import { getNotificationDetails } from "~/lib/firestore";
import { logAnalyticsEvent } from "~/lib/analytics";

// Constants for request validation
const MAX_NOTIFICATION_ID_LENGTH = 128;
const MAX_TITLE_LENGTH = 32;
const MAX_BODY_LENGTH = 128;
const MAX_TARGET_URL_LENGTH = 256;

// Custom error types
type NotificationError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

// Enhanced request schema with validation
const requestSchema = z.object({
  fid: z.number().int().positive(),
  title: z.string().min(1).max(MAX_TITLE_LENGTH),
  body: z.string().min(1).max(MAX_BODY_LENGTH),
  targetUrl: z.string().url().max(MAX_TARGET_URL_LENGTH).optional().default("https://qg-frames.vercel.app")
}).strict();

// Helper function to create error responses
function createErrorResponse(error: NotificationError, status: number) {
  return NextResponse.json(
    { success: false, error: error.code, message: error.message, details: error.details },
    { status }
  );
}

export async function POST(request: Request) {
  try {
    // Validate content type
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return createErrorResponse(
        { code: "invalid_content_type", message: "Content-Type must be application/json" },
        400
      );
    }

    // Parse and validate request body
    const requestJson = await request.json().catch(() => null);
    if (!requestJson) {
      return createErrorResponse(
        { code: "invalid_json", message: "Invalid JSON payload" },
        400
      );
    }

    const requestBody = requestSchema.safeParse(requestJson);
    if (!requestBody.success) {
      return createErrorResponse(
        { 
          code: "validation_error", 
          message: "Invalid request data",
          details: {
            errors: requestBody.error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message
            }))
          }
        },
        400
      );
    }

    // Get notification details
    const notificationDetails = await getNotificationDetails(requestBody.data.fid);
    if (!notificationDetails?.token || !notificationDetails?.url) {
      return createErrorResponse(
        { 
          code: "no_notification_details", 
          message: "Notification details not found for user",
          details: { fid: requestBody.data.fid }
        },
        404
      );
    }

    // Generate notification ID for idempotency
    const notificationId = crypto.randomUUID().slice(0, MAX_NOTIFICATION_ID_LENGTH);

    // Log notification attempt
    logAnalyticsEvent('notification_attempt', {
      fid: requestBody.data.fid,
      notificationId,
      title_length: requestBody.data.title.length,
      body_length: requestBody.data.body.length
    });

    // Send notification
    const response = await fetch(notificationDetails.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notificationId,
        title: requestBody.data.title,
        body: requestBody.data.body,
        targetUrl: requestBody.data.targetUrl,
        tokens: [notificationDetails.token],
      } satisfies SendNotificationRequest),
    });

    const responseJson = await response.json();

    // Handle successful response
    if (response.status === 200) {
      const responseBody = sendNotificationResponseSchema.safeParse(responseJson);
      
      // Validate response format
      if (!responseBody.success) {
        logAnalyticsEvent('notification_error', {
          fid: requestBody.data.fid,
          notificationId,
          error_type: 'invalid_response_format',
          details: JSON.stringify(responseBody.error.errors)
        });
        
        return createErrorResponse(
          { 
            code: "invalid_response", 
            message: "Invalid response from notification service",
            details: {
              errors: responseBody.error.errors.map(e => ({
                path: e.path.join('.'),
                message: e.message
              }))
            }
          },
          500
        );
      }

      const result = responseBody.data.result;

      // Check for invalid tokens
      if (result.invalidTokens.length > 0) {
        logAnalyticsEvent('notification_invalid_token', {
          fid: requestBody.data.fid,
          notificationId
        });
        
        // Remove the invalid token from storage
        // TODO: Implement token removal logic
      }

      // Check rate limiting
      if (result.rateLimitedTokens.length > 0) {
        logAnalyticsEvent('notification_rate_limited', {
          fid: requestBody.data.fid,
          notificationId
        });
        
        return createErrorResponse(
          { 
            code: "rate_limited", 
            message: "Notification rate limit exceeded. Try again in 30 seconds.",
            details: {
              retryAfter: 30 // seconds
            }
          },
          429
        );
      }

      // Log success if any tokens were successful
      if (result.successfulTokens.length > 0) {
        logAnalyticsEvent('notification_sent', {
          fid: requestBody.data.fid,
          notificationId
        });
      }

      // Return the full result
      return NextResponse.json({ 
        success: true,
        data: {
          notificationId,
          result: {
            successfulTokens: result.successfulTokens,
            invalidTokens: result.invalidTokens,
            rateLimitedTokens: result.rateLimitedTokens
          }
        }
      });
    }

    // Handle error response
    logAnalyticsEvent('notification_error', {
      fid: requestBody.data.fid,
      notificationId,
      error_type: 'service_error',
      status: response.status,
      details: JSON.stringify(responseJson)
    });

    return createErrorResponse(
      { 
        code: "service_error", 
        message: "Notification service error",
        details: { response: responseJson }
      },
      500
    );

  } catch (error) {
    // Log unexpected errors
    console.error('Unexpected error in notification endpoint:', error);
    logAnalyticsEvent('notification_error', {
      error_type: 'unexpected',
      message: error instanceof Error ? error.message : 'Unknown error'
    });

    return createErrorResponse(
      { 
        code: "internal_error", 
        message: "An unexpected error occurred"
      },
      500
    );
  }
} 
