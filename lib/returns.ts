/**
 * Returns and Refund Processing
 * Customer-facing returns portal functionality
 */

import { logger } from './logger';
import { connectToDatabase } from './db-optimized';
import { sendEmail } from './email';

// Return window in days (default: 30)
const RETURN_WINDOW_DAYS = parseInt(process.env.RETURNS_WINDOW_DAYS || '30');

export interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  reason: string;
  condition: 'unopened' | 'opened' | 'damaged';
  refundAmount: number;
  photos?: string[];
}

export interface ReturnRequest {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  items: ReturnItem[];
  refundMethod: 'original_payment' | 'store_credit';
  customerNotes?: string;
}

export interface ReturnStatus {
  status: 'requested' | 'approved' | 'rejected' | 'received' | 'inspected' | 'refunded' | 'closed';
  timestamp: Date;
  note?: string;
  actor?: string;
}

/**
 * Generate a unique return ID
 */
function generateReturnId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RET-${timestamp}-${random}`;
}

/**
 * Check if an order is eligible for return
 */
export async function checkReturnEligibility(orderId: string, email: string): Promise<{
  eligible: boolean;
  reason?: string;
  order?: any;
  daysSinceDelivery?: number;
}> {
  try {
    const { db } = await connectToDatabase();

    // Find the order
    const order = await db.collection('orders').findOne({
      $or: [{ id: orderId }, { orderNumber: orderId }],
      'customer.email': email
    });

    if (!order) {
      return { eligible: false, reason: 'Order not found' };
    }

    // Check if order is delivered
    if (order.status !== 'delivered' && order.status !== 'completed') {
      return { eligible: false, reason: 'Order has not been delivered yet', order };
    }

    // Check delivery date (if available)
    const deliveredAt = order.deliveredAt || order.updatedAt;
    if (deliveredAt) {
      const deliveredDate = new Date(deliveredAt);
      const now = new Date();
      const daysSinceDelivery = Math.floor((now.getTime() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceDelivery > RETURN_WINDOW_DAYS) {
        return { 
          eligible: false, 
          reason: `Return window expired (${daysSinceDelivery} days since delivery, limit is ${RETURN_WINDOW_DAYS} days)`,
          order,
          daysSinceDelivery
        };
      }

      return { eligible: true, order, daysSinceDelivery };
    }

    return { eligible: true, order };
  } catch (error) {
    logger.error('Returns', 'Error checking eligibility', { orderId, error });
    return { eligible: false, reason: 'Error checking eligibility' };
  }
}

/**
 * Create a return request
 */
export async function createReturnRequest(request: ReturnRequest): Promise<{
  success: boolean;
  returnId?: string;
  error?: string;
}> {
  try {
    const { db } = await connectToDatabase();

    // Check eligibility
    const eligibility = await checkReturnEligibility(request.orderId, request.customerEmail);
    if (!eligibility.eligible) {
      return { success: false, error: eligibility.reason };
    }

    // Check for existing return request
    const existingReturn = await db.collection('returns').findOne({
      orderId: request.orderId,
      status: { $nin: ['rejected', 'closed'] }
    });

    if (existingReturn) {
      return { 
        success: false, 
        error: 'A return request already exists for this order',
        returnId: existingReturn.returnId
      };
    }

    // Calculate total refund amount
    const totalRefundAmount = request.items.reduce((sum, item) => sum + item.refundAmount, 0);

    // Create return record
    const returnId = generateReturnId();
    const returnData = {
      returnId,
      orderId: request.orderId,
      orderNumber: request.orderNumber,
      customerEmail: request.customerEmail,
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      items: request.items,
      status: 'requested',
      totalRefundAmount,
      refundMethod: request.refundMethod,
      customerNotes: request.customerNotes,
      adminNotes: '',
      inspectionNotes: '',
      restockingFee: 0,
      requestedAt: new Date(),
      timeline: [{
        status: 'requested',
        timestamp: new Date(),
        note: 'Return request submitted',
        actor: 'customer'
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('returns').insertOne(returnData);

    // Send confirmation email to customer
    await sendEmail({
      to: request.customerEmail,
      from: process.env.RESEND_FROM_EMAIL || 'noreply@tasteofgratitude.shop',
      subject: `Return Request Received - ${returnId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1>Return Request Received</h1>
            <p>Return ID: ${returnId}</p>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>Hi ${request.customerName},</p>
            <p>We've received your return request for order ${request.orderNumber}. Our team will review it within 1-2 business days.</p>
            
            <h3>Items to Return:</h3>
            <ul>
              ${request.items.map(item => `
                <li>${item.productName} x${item.quantity} - $${item.refundAmount.toFixed(2)}</li>
              `).join('')}
            </ul>
            
            <p><strong>Total Refund Amount:</strong> $${totalRefundAmount.toFixed(2)}</p>
            <p><strong>Refund Method:</strong> ${request.refundMethod === 'original_payment' ? 'Original Payment Method' : 'Store Credit'}</p>
            
            <p>You can track your return status at any time by visiting:<br/>
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/returns/${returnId}" style="color: #059669;">Track Your Return</a></p>
            
            <p>With gratitude,<br/>The Taste of Gratitude Team 🌿</p>
          </div>
        </div>
      `,
      text: `Return Request Received - ${returnId}\n\nHi ${request.customerName},\n\nWe've received your return request for order ${request.orderNumber}. Our team will review it within 1-2 business days.\n\nTotal Refund Amount: $${totalRefundAmount.toFixed(2)}\nRefund Method: ${request.refundMethod === 'original_payment' ? 'Original Payment Method' : 'Store Credit'}\n\nTrack your return: ${process.env.NEXT_PUBLIC_BASE_URL}/returns/${returnId}\n\nWith gratitude,\nThe Taste of Gratitude Team`,
      listUnsubscribeUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/unsubscribe?email=${encodeURIComponent(request.customerEmail)}`
    });

    logger.info('Returns', 'Created return request', { 
      returnId, 
      orderId: request.orderId,
      email: request.customerEmail 
    });

    return { success: true, returnId };
  } catch (error) {
    logger.error('Returns', 'Error creating return request', { error });
    return { success: false, error: 'Failed to create return request' };
  }
}

/**
 * Get return status for customer
 */
export async function getReturnStatus(returnId: string, email?: string): Promise<any | null> {
  try {
    const { db } = await connectToDatabase();

    const query: any = { returnId };
    if (email) {
      query.customerEmail = email;
    }

    const returnRecord = await db.collection('returns').findOne(query);

    if (!returnRecord) {
      return null;
    }

    // Format response (remove sensitive fields)
    return {
      returnId: returnRecord.returnId,
      orderId: returnRecord.orderId,
      orderNumber: returnRecord.orderNumber,
      items: returnRecord.items,
      status: returnRecord.status,
      totalRefundAmount: returnRecord.totalRefundAmount,
      refundMethod: returnRecord.refundMethod,
      timeline: returnRecord.timeline,
      shippingLabel: returnRecord.shippingLabel,
      requestedAt: returnRecord.requestedAt,
      approvedAt: returnRecord.approvedAt,
      receivedAt: returnRecord.receivedAt,
      inspectedAt: returnRecord.inspectedAt,
      refundedAt: returnRecord.refundedAt
    };
  } catch (error) {
    logger.error('Returns', 'Error getting return status', { returnId, error });
    return null;
  }
}

/**
 * Admin: Approve return request
 */
export async function approveReturn(returnId: string, adminNotes?: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();

    const result = await db.collection('returns').updateOne(
      { returnId, status: 'requested' },
      {
        $set: {
          status: 'approved',
          approvedAt: new Date(),
          adminNotes: adminNotes || '',
          updatedAt: new Date()
        },
        $push: {
          timeline: {
            status: 'approved',
            timestamp: new Date(),
            note: adminNotes || 'Return request approved',
            actor: 'admin'
          }
        }
      }
    );

    if (result.modifiedCount > 0) {
      // Send approval notification
      const returnRecord = await db.collection('returns').findOne({ returnId });
      if (returnRecord) {
        await sendEmail({
          to: returnRecord.customerEmail,
          from: process.env.RESEND_FROM_EMAIL || 'noreply@tasteofgratitude.shop',
          subject: `Return Approved - ${returnId}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #059669;">Return Request Approved</h2>
              <p>Hi ${returnRecord.customerName},</p>
              <p>Great news! Your return request has been approved.</p>
              <p>Your shipping label will be sent to you shortly, or you can download it from your return status page.</p>
              <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/returns/${returnId}" style="color: #059669;">View Return Status</a></p>
            </div>
          `,
          text: `Return Request Approved\n\nHi ${returnRecord.customerName},\n\nGreat news! Your return request has been approved.\n\nYour shipping label will be sent to you shortly, or you can download it from your return status page:\n${process.env.NEXT_PUBLIC_BASE_URL}/returns/${returnId}`,
          listUnsubscribeUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/unsubscribe?email=${encodeURIComponent(returnRecord.customerEmail)}`
        });
      }

      logger.info('Returns', 'Approved return', { returnId });
    }

    return result.modifiedCount > 0;
  } catch (error) {
    logger.error('Returns', 'Error approving return', { returnId, error });
    return false;
  }
}

/**
 * Admin: Reject return request
 */
export async function rejectReturn(returnId: string, reason: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();

    const result = await db.collection('returns').updateOne(
      { returnId, status: { $in: ['requested', 'approved'] } },
      {
        $set: {
          status: 'rejected',
          rejectionReason: reason,
          closedAt: new Date(),
          updatedAt: new Date()
        },
        $push: {
          timeline: {
            status: 'rejected',
            timestamp: new Date(),
            note: reason,
            actor: 'admin'
          }
        }
      }
    );

    if (result.modifiedCount > 0) {
      // Send rejection notification
      const returnRecord = await db.collection('returns').findOne({ returnId });
      if (returnRecord) {
        await sendEmail({
          to: returnRecord.customerEmail,
          from: process.env.RESEND_FROM_EMAIL || 'noreply@tasteofgratitude.shop',
          subject: `Return Request Update - ${returnId}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Return Request Update</h2>
              <p>Hi ${returnRecord.customerName},</p>
              <p>We reviewed your return request and unfortunately cannot process it at this time.</p>
              <p><strong>Reason:</strong> ${reason}</p>
              <p>If you have questions, please contact our support team.</p>
            </div>
          `,
          text: `Return Request Update - ${returnId}\n\nHi ${returnRecord.customerName},\n\nWe reviewed your return request and unfortunately cannot process it at this time.\n\nReason: ${reason}\n\nIf you have questions, please contact our support team.`,
          listUnsubscribeUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/unsubscribe?email=${encodeURIComponent(returnRecord.customerEmail)}`
        });
      }

      logger.info('Returns', 'Rejected return', { returnId, reason });
    }

    return result.modifiedCount > 0;
  } catch (error) {
    logger.error('Returns', 'Error rejecting return', { returnId, error });
    return false;
  }
}

/**
 * Admin: Mark items received
 */
export async function markReturnReceived(returnId: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();

    const result = await db.collection('returns').updateOne(
      { returnId, status: 'approved' },
      {
        $set: {
          status: 'received',
          receivedAt: new Date(),
          updatedAt: new Date()
        },
        $push: {
          timeline: {
            status: 'received',
            timestamp: new Date(),
            note: 'Items received',
            actor: 'admin'
          }
        }
      }
    );

    if (result.modifiedCount > 0) {
      logger.info('Returns', 'Marked return as received', { returnId });
    }

    return result.modifiedCount > 0;
  } catch (error) {
    logger.error('Returns', 'Error marking return received', { returnId, error });
    return false;
  }
}

/**
 * Admin: Complete inspection
 */
export async function completeInspection(
  returnId: string, 
  inspectionNotes: string,
  restockingFee: number = 0
): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();

    const result = await db.collection('returns').updateOne(
      { returnId, status: 'received' },
      {
        $set: {
          status: 'inspected',
          inspectedAt: new Date(),
          inspectionNotes,
          restockingFee,
          finalRefundAmount: { $subtract: ['$totalRefundAmount', restockingFee] },
          updatedAt: new Date()
        },
        $push: {
          timeline: {
            status: 'inspected',
            timestamp: new Date(),
            note: inspectionNotes,
            actor: 'admin'
          }
        }
      }
    );

    if (result.modifiedCount > 0) {
      logger.info('Returns', 'Completed inspection', { returnId, restockingFee });
    }

    return result.modifiedCount > 0;
  } catch (error) {
    logger.error('Returns', 'Error completing inspection', { returnId, error });
    return false;
  }
}

/**
 * Admin: Process refund
 */
export async function processRefund(returnId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { db } = await connectToDatabase();

    const returnRecord = await db.collection('returns').findOne({ 
      returnId, 
      status: { $in: ['inspected', 'approved'] }
    });

    if (!returnRecord) {
      return { success: false, error: 'Return not found or not ready for refund' };
    }

    // Calculate final refund amount
    const finalRefundAmount = returnRecord.totalRefundAmount - (returnRecord.restockingFee || 0);

    // Process refund based on method
    if (returnRecord.refundMethod === 'original_payment') {
      // TODO: Integrate with Square/Stripe for refund
      // For now, mark as refunded and let admin handle via payment provider
      logger.info('Returns', 'Refund to original payment requested', { 
        returnId, 
        amount: finalRefundAmount 
      });
    } else {
      // Add store credit
      await db.collection('customers').updateOne(
        { email: returnRecord.customerEmail },
        {
          $inc: { storeCredit: finalRefundAmount },
          $push: {
            storeCreditHistory: {
              amount: finalRefundAmount,
              reason: `Return ${returnId}`,
              date: new Date()
            }
          }
        },
        { upsert: true }
      );
    }

    // Update return status
    await db.collection('returns').updateOne(
      { returnId },
      {
        $set: {
          status: 'refunded',
          refundedAt: new Date(),
          finalRefundAmount,
          updatedAt: new Date()
        },
        $push: {
          timeline: {
            status: 'refunded',
            timestamp: new Date(),
            note: `Refund processed: $${finalRefundAmount.toFixed(2)}`,
            actor: 'admin'
          }
        }
      }
    );

    // Restock inventory
    for (const item of returnRecord.items) {
      if (item.condition !== 'damaged') {
        await db.collection('inventory').updateOne(
          { productId: item.productId },
          {
            $inc: { currentStock: item.quantity },
            $push: {
              stockHistory: {
                type: 'return',
                quantity: item.quantity,
                returnId,
                timestamp: new Date()
              }
            }
          }
        );
      }
    }

    // Send refund notification
    await sendEmail({
      to: returnRecord.customerEmail,
      from: process.env.RESEND_FROM_EMAIL || 'noreply@tasteofgratitude.shop',
      subject: `Refund Processed - ${returnId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Refund Processed</h2>
          <p>Hi ${returnRecord.customerName},</p>
          <p>Your return has been processed and your refund is on its way!</p>
          <p><strong>Refund Amount:</strong> $${finalRefundAmount.toFixed(2)}</p>
          <p><strong>Refund Method:</strong> ${returnRecord.refundMethod === 'original_payment' ? 'Original Payment (5-10 business days)' : 'Store Credit (available now)'}</p>
          <p>Thank you for shopping with us!</p>
        </div>
      `,
      text: `Refund Processed - ${returnId}\n\nHi ${returnRecord.customerName},\n\nYour return has been processed and your refund is on its way!\n\nRefund Amount: $${finalRefundAmount.toFixed(2)}\nRefund Method: ${returnRecord.refundMethod === 'original_payment' ? 'Original Payment (5-10 business days)' : 'Store Credit (available now)'}\n\nThank you for shopping with us!`,
      listUnsubscribeUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/unsubscribe?email=${encodeURIComponent(returnRecord.customerEmail)}`
    });

    logger.info('Returns', 'Processed refund', { 
      returnId, 
      amount: finalRefundAmount,
      method: returnRecord.refundMethod
    });

    return { success: true };
  } catch (error) {
    logger.error('Returns', 'Error processing refund', { returnId, error });
    return { success: false, error: 'Failed to process refund' };
  }
}

// Default export
export default {
  checkReturnEligibility,
  createReturnRequest,
  getReturnStatus,
  approveReturn,
  rejectReturn,
  markReturnReceived,
  completeInspection,
  processRefund
};
