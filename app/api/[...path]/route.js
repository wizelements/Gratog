import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.shop')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return response
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// Route handler function
async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`

  try {
    // Root endpoint - GET /api/root (since /api/ is not accessible with catch-all)
    if (route === '/root' && request.method === 'GET') {
      return handleCORS(NextResponse.json({ message: "Hello World" }))
    }
    // Root endpoint - GET /api/root (since /api/ is not accessible with catch-all)
    if (route === '/' && request.method === 'GET') {
      return handleCORS(NextResponse.json({ message: "Hello World" }))
    }

    // ISS-011 FIX: /api/status removed — was unauthenticated DB read/write endpoint

    // Route not found - return 404 for all undefined routes
    return handleCORS(NextResponse.json(
      { error: `Route ${route} not found` }, 
      { status: 404 }
    ))

  } catch (error) {
    logger.error('API', 'API Error', error)
    return handleCORS(NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    ))
  }
}

// Export all HTTP methods
export const GET = handleRoute
export const POST = handleRoute
