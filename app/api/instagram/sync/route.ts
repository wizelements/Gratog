import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';

/**
 * Instagram Graph API Integration
 * Pulls latest Instagram posts and creates SEO-optimized pages
 * Part of Social → Web → SEO Amplification Flow
 */

interface InstagramPost {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  hashtags?: string[];
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const instagramBusinessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

    if (!accessToken || !instagramBusinessAccountId) {
      return NextResponse.json(
        {
          error: 'Instagram credentials not configured',
          message: 'Please set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID in .env',
          status: 'not_configured'
        },
        { status: 503 }
      );
    }

    // Fetch recent Instagram posts
    const fields = 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count';
    const instagramApiUrl = `https://graph.instagram.com/${instagramBusinessAccountId}/media?fields=${fields}&access_token=${accessToken}&limit=25`;

    console.log('Fetching Instagram posts...');
    const response = await fetch(instagramApiUrl);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Instagram API error:', errorData);
      return NextResponse.json(
        {
          error: 'Failed to fetch Instagram posts',
          details: errorData,
          status: 'api_error'
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const posts: InstagramPost[] = data.data || [];

    console.log(`✅ Fetched ${posts.length} Instagram posts`);

    // Extract hashtags from captions
    const processedPosts = posts.map(post => {
      const caption = post.caption || '';
      const hashtags = caption.match(/#\w+/g) || [];
      return {
        ...post,
        hashtags: hashtags.map(tag => tag.replace('#', ''))
      };
    });

    // Store posts in database
    const { db } = await connectToDatabase();
    const collection = db.collection('instagram_posts');

    let syncedCount = 0;
    let newPostsCount = 0;

    for (const post of processedPosts) {
      // Check if post already exists
      const existingPost = await collection.findOne({ instagramId: post.id });

      if (!existingPost) {
        // Create new post record with SEO data
        const postRecord = {
          instagramId: post.id,
          caption: post.caption,
          mediaType: post.media_type,
          mediaUrl: post.media_url,
          permalink: post.permalink,
          postedAt: new Date(post.timestamp),
          likeCount: post.like_count || 0,
          commentsCount: post.comments_count || 0,
          hashtags: post.hashtags,
          // SEO fields
          slug: generateSlug(post.caption, post.id),
          metaTitle: generateMetaTitle(post.caption),
          metaDescription: generateMetaDescription(post.caption),
          keywords: post.hashtags,
          // Tracking
          syncedAt: new Date(),
          pageGenerated: false,
          published: true
        };

        await collection.insertOne(postRecord);
        newPostsCount++;
        console.log(`✅ New post synced: ${post.id}`);
      } else {
        // Update existing post metrics
        await collection.updateOne(
          { instagramId: post.id },
          {
            $set: {
              likeCount: post.like_count || 0,
              commentsCount: post.comments_count || 0,
              syncedAt: new Date()
            }
          }
        );
      }
      syncedCount++;
    }

    // Trigger page generation for new posts (async)
    if (newPostsCount > 0) {
      console.log(`📄 Triggering page generation for ${newPostsCount} new posts...`);
      // This would trigger static page generation in production
      // For now, pages will be generated on-demand
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedCount} Instagram posts`,
      stats: {
        totalPosts: syncedCount,
        newPosts: newPostsCount,
        existingPosts: syncedCount - newPostsCount
      },
      posts: processedPosts.map(p => ({
        id: p.id,
        caption: p.caption?.substring(0, 100) + '...',
        hashtags: p.hashtags,
        mediaType: p.media_type,
        postedAt: p.timestamp
      }))
    });

  } catch (error: any) {
    console.error('Instagram sync error:', error);
    return NextResponse.json(
      {
        error: 'Instagram sync failed',
        message: error.message,
        status: 'error'
      },
      { status: 500 }
    );
  }
}

// Helper functions for SEO optimization
function generateSlug(caption: string = '', id: string): string {
  // Extract first meaningful words from caption
  const words = caption
    .replace(/#\w+/g, '') // Remove hashtags
    .replace(/[^\w\s]/g, '') // Remove special chars
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join('-')
    .toLowerCase();

  return words ? `${words}-${id.substring(0, 8)}` : `post-${id.substring(0, 8)}`;
}

function generateMetaTitle(caption: string = ''): string {
  const cleanCaption = caption.replace(/#\w+/g, '').trim();
  const title = cleanCaption.substring(0, 60) || 'Taste of Gratitude Post';
  return `${title} | Taste of Gratitude`;
}

function generateMetaDescription(caption: string = ''): string {
  const cleanCaption = caption
    .replace(/#\w+/g, '')
    .trim()
    .substring(0, 155);

  return cleanCaption || 'Discover our latest wellness journey updates, sea moss recipes, and community highlights from Taste of Gratitude.';
}

// Webhook handler for real-time Instagram updates
export async function POST(request: NextRequest) {
  try {
    // Instagram webhook verification
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
      console.log('✅ Instagram webhook verified');
      return new NextResponse(challenge);
    }

    // Handle webhook event
    const body = await request.json();
    console.log('Instagram webhook event:', body);

    // Trigger sync when new media is posted
    if (body.entry && body.entry[0]?.changes) {
      console.log('📸 New Instagram post detected, triggering sync...');
      // Trigger async sync
      // In production, this would be a background job
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Instagram webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
