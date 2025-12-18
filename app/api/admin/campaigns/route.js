import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { getCampaigns, createCampaign } from '@/lib/campaign-manager';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/campaigns - List all campaigns
 */
export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    const filters = {};
    if (status) filters.status = status;
    filters.limit = limit;

    const campaigns = await getCampaigns(filters);

    return NextResponse.json({
      success: true,
      campaigns,
      count: campaigns.length
    });

  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('API', 'Get campaigns error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/campaigns - Create new campaign
 */
export async function POST(request) {
  try {
    const admin = await requireAdmin(request);
    
    const body = await request.json();
    const { name, subject, preheader, body: emailBody, segmentCriteria, scheduledFor } = body;

    // Validation
    if (!name || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Name, subject, and body are required' },
        { status: 400 }
      );
    }

    const campaign = await createCampaign({
      name,
      subject,
      preheader,
      body: emailBody,
      segmentCriteria: segmentCriteria || {},
      scheduledFor,
      createdBy: admin.id
    });

    logger.info('API', `Campaign created by ${admin.email}: ${name}`);

    return NextResponse.json({
      success: true,
      campaign
    }, { status: 201 });

  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('API', 'Create campaign error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
