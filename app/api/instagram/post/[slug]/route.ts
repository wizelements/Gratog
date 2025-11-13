import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const { db } = await connectToDatabase();
    const collection = db.collection('instagram_posts');

    // Find post by slug
    const post = await collection.findOne({ slug });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      post: {
        id: post.instagramId,
        slug: post.slug,
        caption: post.caption,
        mediaType: post.mediaType,
        mediaUrl: post.mediaUrl,
        permalink: post.permalink,
        postedAt: post.postedAt,
        likeCount: post.likeCount,
        commentsCount: post.commentsCount,
        hashtags: post.hashtags,
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription
      }
    });

  } catch (error: any) {
    console.error('Error fetching Instagram post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}
