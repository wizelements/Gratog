import { NextResponse } from 'next/server';
import { getQuizResultsById, updateConversionStatus } from '@/lib/db-quiz';

/**
 * GET /api/quiz/results/:id
 * Retrieve saved quiz results by ID
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Quiz ID is required' },
        { status: 400 }
      );
    }
    
    // Get quiz results from database
    const result = await getQuizResultsById(id);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Quiz results not found' },
        { status: 404 }
      );
    }
    
    // Update viewed status
    await updateConversionStatus(id, 'viewed');
    
    return NextResponse.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('Get quiz results error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve quiz results' },
      { status: 500 }
    );
  }
}
