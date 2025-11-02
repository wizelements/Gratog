import { NextResponse } from 'next/server';

// Mock Instagram posts data
// In production, this would fetch from Instagram Graph API
const MOCK_INSTAGRAM_POSTS = [
  {
    id: '1',
    caption: 'Start your wellness journey with our premium sea moss gels! 🌿✨ #TasteOfGratitude #SeaMoss #Wellness',
    imageUrl: 'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=500&h=500&fit=crop',
    permalink: 'https://instagram.com/p/example1',
    timestamp: '2025-01-25T10:00:00Z',
    likes: 142,
    comments: 23,
  },
  {
    id: '2',
    caption: 'Wildcrafted with love 💚 Visit us at Serenbe Farmers Market this Saturday! #LocalWellness #AtlantaMarkets',
    imageUrl: 'https://images.unsplash.com/photo-1598254962341-81f77c05e7a1?w=500&h=500&fit=crop',
    permalink: 'https://instagram.com/p/example2',
    timestamp: '2025-01-24T14:30:00Z',
    likes: 98,
    comments: 15,
  },
  {
    id: '3',
    caption: 'Golden Glow Gel - our most popular flavor! 🍯✨ Have you tried it yet? #GoldenGlow #SeaMossGel',
    imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784670?w=500&h=500&fit=crop',
    permalink: 'https://instagram.com/p/example3',
    timestamp: '2025-01-23T16:45:00Z',
    likes: 205,
    comments: 31,
  },
  {
    id: '4',
    caption: 'Join the Spicy Bloom Challenge! 🌶️🎥 Tag us for a chance to win! #SpicyBloomChallenge #ViralChallenge',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&h=500&fit=crop',
    permalink: 'https://instagram.com/p/example4',
    timestamp: '2025-01-22T11:20:00Z',
    likes: 178,
    comments: 42,
  },
  {
    id: '5',
    caption: 'Customer love! 💛 Thank you for choosing wellness with us. #CustomerReview #TasteOfGratitude',
    imageUrl: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=500&h=500&fit=crop',
    permalink: 'https://instagram.com/p/example5',
    timestamp: '2025-01-21T09:00:00Z',
    likes: 134,
    comments: 19,
  },
  {
    id: '6',
    caption: 'Small batch, big heart ❤️ Every jar made with gratitude. #Handcrafted #SmallBatch',
    imageUrl: 'https://images.unsplash.com/photo-1505935428862-770b6f24f629?w=500&h=500&fit=crop',
    permalink: 'https://instagram.com/p/example6',
    timestamp: '2025-01-20T13:15:00Z',
    likes: 167,
    comments: 28,
  },
];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12');

    // In production, check if Instagram API credentials are configured
    const hasInstagramAPI = process.env.INSTAGRAM_ACCESS_TOKEN;

    if (hasInstagramAPI) {
      // TODO: Implement real Instagram Graph API fetch
      // const response = await fetch(
      //   `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,timestamp&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}&limit=${limit}`
      // );
      // const data = await response.json();
      // return NextResponse.json({ posts: data.data, source: 'instagram' });
    }

    // Return mock data
    return NextResponse.json({
      posts: MOCK_INSTAGRAM_POSTS.slice(0, limit),
      source: 'mock',
      message: 'Using mock data. Configure INSTAGRAM_ACCESS_TOKEN for real posts.',
    });
  } catch (error) {
    console.error('Failed to fetch Instagram posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}
