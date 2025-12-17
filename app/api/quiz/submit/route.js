const DEBUG = process.env.DEBUG === "true";
const debug = (...args) => { if (DEBUG) debug(...args); };

import { NextResponse } from 'next/server';
import { saveQuizResults, updateEmailSentStatus, initializeQuizCollection } from '@/lib/db-quiz';
import { sendQuizResultsEmail } from '@/lib/quiz-emails';
import { queueEmail, initializeEmailQueue } from '@/lib/email-queue';

/**
 * POST /api/quiz/submit
 * Save quiz results and send personalized email
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { customer, answers, recommendations } = body;
    
    // Validation
    if (!customer || !customer.name || !customer.email) {
      return NextResponse.json(
        { success: false, error: 'Customer name and email are required' },
        { status: 400 }
      );
    }
    
    if (!answers || !answers.goal) {
      return NextResponse.json(
        { success: false, error: 'Quiz answers are required' },
        { status: 400 }
      );
    }
    
    if (!recommendations || recommendations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Recommendations are required' },
        { status: 400 }
      );
    }
    
    // Ensure collection exists with indexes
    await initializeQuizCollection();
    
    // Calculate match score from recommendations
    const matchScore = recommendations[0]?.matchScore || 0;
    
    // Save to database
    const saveResult = await saveQuizResults({
      customer: {
        name: customer.name.trim(),
        email: customer.email.toLowerCase().trim()
      },
      answers,
      recommendations,
      matchScore
    });
    
    if (!saveResult.success) {
      console.error('Failed to save quiz results:', saveResult.error);
      return NextResponse.json(
        { success: false, error: 'Failed to save quiz results' },
        { status: 500 }
      );
    }
    
    const quizId = saveResult.quizId;
    
    // Initialize email queue
    await initializeEmailQueue();
    
    // Schedule follow-up emails
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    const sevenDaysLater = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    try {
      // Schedule 3-day follow-up email
      await queueEmail({
        quizId,
        recipient: {
          name: customer.name,
          email: customer.email
        },
        emailType: 'followUp3Day',
        scheduledFor: threeDaysLater,
        emailData: {
          topProduct: recommendations[0] // Pass top recommendation
        }
      });
      
      // Schedule 7-day follow-up email
      await queueEmail({
        quizId,
        recipient: {
          name: customer.name,
          email: customer.email
        },
        emailType: 'followUp7Day',
        scheduledFor: sevenDaysLater,
        emailData: {}
      });
      
      debug('✅ Scheduled follow-up emails for quiz:', quizId);
    } catch (scheduleError) {
      console.error('Error scheduling follow-up emails:', scheduleError);
      // Continue even if scheduling fails
    }
    
    // Send email with recommendations
    let emailSent = false;
    try {
      const emailResult = await sendQuizResultsEmail({
        email: customer.email,
        name: customer.name,
        quizId,
        recommendations,
        goal: answers.goal
      });
      
      emailSent = emailResult.success;
      
      if (emailSent) {
        // Update email sent status
        await updateEmailSentStatus(quizId, 'results');
        debug('✅ Quiz results email sent to:', customer.email);
      } else {
        console.warn('⚠️ Quiz results email failed:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Continue even if email fails
    }
    
    return NextResponse.json({
      success: true,
      quizId,
      recommendations,
      emailSent,
      message: emailSent 
        ? 'Quiz results saved! Check your email for personalized recommendations.' 
        : 'Quiz results saved! View your recommendations below.'
    });
    
  } catch (error) {
    console.error('Quiz submit error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while processing your quiz' },
      { status: 500 }
    );
  }
}
