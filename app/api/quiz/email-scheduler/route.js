import { NextResponse } from 'next/server';
import { getPendingEmails, updateEmailStatus, initializeEmailQueue, cancelScheduledEmails } from '@/lib/email-queue';
import { getQuizResultsById, updateEmailSentStatus } from '@/lib/db-quiz';
import { sendQuizFollowUp3Days, sendQuizFollowUp7Days } from '@/lib/quiz-emails';

/**
 * POST /api/quiz/email-scheduler
 * Process pending scheduled emails
 * This should be called periodically (e.g., via cron or manual trigger)
 */
export async function POST(request) {
  try {
    // Optional: Add authorization header check for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Initialize queue collection if needed
    await initializeEmailQueue();
    
    // Get pending emails
    const pendingResult = await getPendingEmails(10);
    
    if (!pendingResult.success || pendingResult.count === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending emails to process',
        processed: 0
      });
    }
    
    const pendingEmails = pendingResult.data;
    const results = [];
    
    // Process each pending email
    for (const email of pendingEmails) {
      try {
        // Get quiz results to check conversion status
        const quizResult = await getQuizResultsById(email.quizId);
        
        if (!quizResult.success) {
          // Quiz not found, mark as failed
          await updateEmailStatus(email._id, 'failed', 'Quiz not found');
          results.push({
            emailId: email._id,
            status: 'failed',
            reason: 'Quiz not found'
          });
          continue;
        }
        
        const quiz = quizResult.data;
        
        // Check if customer has purchased - if yes, cancel remaining emails
        if (quiz.conversionStatus?.purchased) {
          await updateEmailStatus(email._id, 'cancelled', 'Customer already purchased');
          await cancelScheduledEmails(email.quizId, 'customer_purchased');
          results.push({
            emailId: email._id,
            status: 'cancelled',
            reason: 'Customer already purchased'
          });
          continue;
        }
        
        // Check if email was already sent (shouldn't happen, but safety check)
        if (email.emailType === 'followUp3Day' && quiz.emailsSent?.followUp3Day) {
          await updateEmailStatus(email._id, 'cancelled', 'Already sent');
          results.push({
            emailId: email._id,
            status: 'cancelled',
            reason: 'Already sent'
          });
          continue;
        }
        
        if (email.emailType === 'followUp7Day' && quiz.emailsSent?.followUp7Day) {
          await updateEmailStatus(email._id, 'cancelled', 'Already sent');
          results.push({
            emailId: email._id,
            status: 'cancelled',
            reason: 'Already sent'
          });
          continue;
        }
        
        // Send the email
        let emailResult;
        
        if (email.emailType === 'followUp3Day') {
          emailResult = await sendQuizFollowUp3Days({
            email: email.recipient.email,
            name: email.recipient.name,
            quizId: email.quizId,
            topProduct: email.emailData?.topProduct
          });
        } else if (email.emailType === 'followUp7Day') {
          emailResult = await sendQuizFollowUp7Days({
            email: email.recipient.email,
            name: email.recipient.name,
            quizId: email.quizId
          });
        } else {
          throw new Error(`Unknown email type: ${email.emailType}`);
        }
        
        if (emailResult.success) {
          // Update email queue status
          await updateEmailStatus(email._id, 'sent');
          
          // Update quiz emailsSent status
          await updateEmailSentStatus(email.quizId, email.emailType);
          
          results.push({
            emailId: email._id,
            status: 'sent',
            recipient: email.recipient.email,
            type: email.emailType
          });
        } else {
          // Mark as failed
          await updateEmailStatus(email._id, 'failed', emailResult.error || 'Email send failed');
          results.push({
            emailId: email._id,
            status: 'failed',
            error: emailResult.error
          });
        }
        
      } catch (error) {
        console.error(`Error processing email ${email._id}:`, error);
        await updateEmailStatus(email._id, 'failed', error.message);
        results.push({
          emailId: email._id,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    const sentCount = results.filter(r => r.status === 'sent').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const cancelledCount = results.filter(r => r.status === 'cancelled').length;
    
    return NextResponse.json({
      success: true,
      processed: results.length,
      sent: sentCount,
      failed: failedCount,
      cancelled: cancelledCount,
      results
    });
    
  } catch (error) {
    console.error('Email scheduler error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process email queue' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/quiz/email-scheduler
 * Get email queue statistics
 */
export async function GET(request) {
  try {
    const { getEmailQueueStats } = await import('@/lib/email-queue');
    const stats = await getEmailQueueStats();
    
    return NextResponse.json({
      success: true,
      stats: stats.data
    });
  } catch (error) {
    console.error('Get email queue stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get email queue stats' },
      { status: 500 }
    );
  }
}
