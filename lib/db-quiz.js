// Quiz Results Database Operations
import { connectToDatabase } from './db-optimized';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';

const COLLECTION_NAME = 'quiz_results';
const RETENTION_DAYS = 365; // 12 months (seasonal + overlap)

/**
 * Initialize quiz results collection with indexes
 */
export async function initializeQuizCollection() {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    // Create indexes for performance
    await collection.createIndex({ 'customer.email': 1 }, { unique: false });
    await collection.createIndex({ createdAt: 1 });
    await collection.createIndex({ 'conversionStatus.purchased': 1 });
    
    // TTL index for automatic cleanup after retention period
    await collection.createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60 }
    );
    
    logger.info('Quiz results collection initialized with indexes');
    return { success: true };
  } catch (error) {
    console.error('Quiz collection initialization error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save quiz results to database
 */
export async function saveQuizResults({
  customer,
  answers,
  recommendations,
  matchScore = 0
}) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    const quizId = randomUUID();
    const now = new Date();
    
    const quizResult = {
      _id: quizId,
      customer: {
        name: customer.name,
        email: customer.email.toLowerCase().trim()
      },
      answers: {
        goal: answers.goal,
        texture: answers.texture,
        adventure: answers.adventure
      },
      recommendations: recommendations.map(r => ({
        id: r.id,
        name: r.name,
        price: r.price || r.priceCents,
        image: r.image,
        recommendationReason: r.recommendationReason,
        confidence: r.confidence,
        matchScore: r.matchScore
      })),
      matchScore,
      completedAt: now,
      emailsSent: {
        results: false,
        followUp3Day: false,
        followUp7Day: false
      },
      conversionStatus: {
        viewed: false,
        addedToCart: false,
        purchased: false,
        purchaseDate: null
      },
      createdAt: now,
      updatedAt: now
    };
    
    await collection.insertOne(quizResult);
    
    console.log('✅ Quiz results saved:', quizId);
    return {
      success: true,
      quizId,
      data: quizResult
    };
  } catch (error) {
    console.error('Save quiz results error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get quiz results by ID
 */
export async function getQuizResultsById(quizId) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    const result = await collection.findOne({ _id: quizId });
    
    if (!result) {
      return {
        success: false,
        error: 'Quiz results not found'
      };
    }
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Get quiz results error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get quiz results by email
 */
export async function getQuizResultsByEmail(email) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    const results = await collection
      .find({ 'customer.email': email.toLowerCase().trim() })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    return {
      success: true,
      data: results
    };
  } catch (error) {
    console.error('Get quiz results by email error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update email sent status
 */
export async function updateEmailSentStatus(quizId, emailType) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    const updateField = `emailsSent.${emailType}`;
    
    await collection.updateOne(
      { _id: quizId },
      { 
        $set: { 
          [updateField]: true,
          updatedAt: new Date()
        } 
      }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Update email status error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update conversion status
 */
export async function updateConversionStatus(quizId, status) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    const update = {
      updatedAt: new Date()
    };
    
    if (status === 'viewed') {
      update['conversionStatus.viewed'] = true;
    } else if (status === 'addedToCart') {
      update['conversionStatus.addedToCart'] = true;
    } else if (status === 'purchased') {
      update['conversionStatus.purchased'] = true;
      update['conversionStatus.purchaseDate'] = new Date();
    }
    
    await collection.updateOne(
      { _id: quizId },
      { $set: update }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Update conversion status error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get quiz analytics
 */
export async function getQuizAnalytics(days = 30) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const [totalQuizzes, conversionStats, goalDistribution] = await Promise.all([
      // Total quizzes
      collection.countDocuments({ createdAt: { $gte: cutoffDate } }),
      
      // Conversion stats
      collection.aggregate([
        { $match: { createdAt: { $gte: cutoffDate } } },
        {
          $group: {
            _id: null,
            viewed: { $sum: { $cond: ['$conversionStatus.viewed', 1, 0] } },
            addedToCart: { $sum: { $cond: ['$conversionStatus.addedToCart', 1, 0] } },
            purchased: { $sum: { $cond: ['$conversionStatus.purchased', 1, 0] } }
          }
        }
      ]).toArray(),
      
      // Goal distribution
      collection.aggregate([
        { $match: { createdAt: { $gte: cutoffDate } } },
        {
          $group: {
            _id: '$answers.goal',
            count: { $sum: 1 }
          }
        }
      ]).toArray()
    ]);
    
    return {
      success: true,
      data: {
        totalQuizzes,
        conversions: conversionStats[0] || { viewed: 0, addedToCart: 0, purchased: 0 },
        goalDistribution
      }
    };
  } catch (error) {
    console.error('Get quiz analytics error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
