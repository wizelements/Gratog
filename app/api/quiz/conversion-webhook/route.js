import { NextResponse } from 'next/server';
import { cancelScheduledEmails } from '@/lib/email-queue';

/**
 * POST /api/quiz/conversion-webhook
 * Webhook to cancel scheduled emails when customer makes a purchase
 * Call this from order completion flow
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { quizId, customerEmail, action } = body;
    
    // Validation
    if (!quizId && !customerEmail) {
      return NextResponse.json(
        { success: false, error: 'quizId or customerEmail required' },
        { status: 400 }
      );
    }
    
    if (action === 'purchased') {
      // Cancel all pending follow-up emails for this customer
      let cancelResult;
      
      if (quizId) {
        cancelResult = await cancelScheduledEmails(quizId, 'customer_purchased');
      } else if (customerEmail) {
        // Find quiz by email and cancel
        const { getQuizResultsByEmail } = await import('@/lib/db-quiz');
        const quizzesResult = await getQuizResultsByEmail(customerEmail);
        
        if (quizzesResult.success && quizzesResult.data.length > 0) {
          // Cancel emails for most recent quiz
          const mostRecentQuiz = quizzesResult.data[0];
          cancelResult = await cancelScheduledEmails(mostRecentQuiz._id, 'customer_purchased');
        } else {
          return NextResponse.json({
            success: true,
            message: 'No quiz found for customer',
            cancelledCount: 0
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'Scheduled emails cancelled',
        cancelledCount: cancelResult?.cancelledCount || 0
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });
    
  } catch (error) {
    console.error('Conversion webhook error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process conversion webhook' },
      { status: 500 }
    );
  }
}
