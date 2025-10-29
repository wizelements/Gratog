import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tag = searchParams.get('tag');
    const limit = parseInt(searchParams.get('limit') || '50');

    const { db } = await connectToDatabase();
    const collection = db.collection('instagram_posts');

    // Build query
    const query: any = { published: true };
    if (tag) {
      query.hashtags = tag;
    }

    // Fetch posts sorted by date (newest first)
    const posts = await collection
      .find(query)
      .sort({ postedAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      count: posts.length,
      posts: posts.map(post => ({
        id: post.instagramId,
        slug: post.slug,
        caption: post.caption,
        mediaType: post.mediaType,
        mediaUrl: post.mediaUrl,
        permalink: post.permalink,
        postedAt: post.postedAt,
        likeCount: post.likeCount,
        commentsCount: post.commentsCount,
        hashtags: post.hashtags
      }))
    });

  } catch (error: any) {
    console.error('Error fetching Instagram posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts', posts: [] },
      { status: 500 }
    );
  }
}
