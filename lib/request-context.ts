/**
 * Request Context for Payment Operations
 * Tracks trace IDs and request duration for debugging and monitoring
 */

import { randomUUID } from 'crypto';

export class RequestContext {
  readonly traceId: string;
  private readonly startTime: number;

  constructor(traceId?: string) {
    // Generate a unique trace ID for this request
    // Used to correlate logs across microservices
    this.traceId = traceId || `trace_${randomUUID().substring(0, 8)}`;
    this.startTime = Date.now();
  }

  /**
   * Get elapsed time in milliseconds
   */
  duration(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get elapsed time as formatted string (e.g., "1234ms")
   */
  durationMs(): string {
    return `${this.duration()}ms`;
  }

  /**
   * Get elapsed time as formatted string (e.g., "1.234s")
   */
  durationSeconds(): string {
    const ms = this.duration();
    return `${(ms / 1000).toFixed(3)}s`;
  }

  /**
   * Log context to use with logger
   */
  toLog(): Record<string, unknown> {
    return {
      traceId: this.traceId,
      duration: this.durationMs(),
      durationSeconds: this.durationSeconds()
    };
  }
}

/**
 * Usage Example:
 * 
 * export async function POST(request: NextRequest) {
 *   const ctx = new RequestContext();
 *   
 *   try {
 *     logger.debug('API', 'Processing payment request', {
 *       ...ctx.toLog(),
 *       orderId: body.orderId
 *     });
 *     
 *     const result = await processPayment(...);
 *     
 *     logger.debug('API', 'Payment processed successfully', {
 *       ...ctx.toLog(),
 *       paymentId: result.id
 *     });
 *     
 *     return NextResponse.json({
 *       success: true,
 *       ...result,
 *       traceId: ctx.traceId  // Return to user for support reference
 *     });
 *     
 *   } catch (error) {
 *     logger.error('API', 'Payment processing failed', {
 *       ...ctx.toLog(),
 *       error: error instanceof Error ? error.message : String(error)
 *     });
 *     
 *     return NextResponse.json({
 *       success: false,
 *       error: 'Payment processing failed',
 *       traceId: ctx.traceId  // Return to user for support reference
 *     }, { status: 500 });
 *   }
 * }
 */
