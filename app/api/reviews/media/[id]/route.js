import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db-optimized';
import { RateLimit } from '@/lib/redis';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ReviewMediaAPI');
const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstHop = forwardedFor.split(',')[0]?.trim();
    if (firstHop) {
      return firstHop;
    }
  }

  return request.headers.get('x-real-ip') || 'unknown';
}

function normalizeBinaryData(value) {
  if (!value) {
    return null;
  }

  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }

  if (value?.buffer && Buffer.isBuffer(value.buffer)) {
    return value.buffer;
  }

  if (value?.buffer instanceof ArrayBuffer) {
    return Buffer.from(value.buffer);
  }

  return null;
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 });
    }

    const clientIp = getClientIp(request);
    if (!RateLimit.check(`review_media:${clientIp}`, 240, 60 * 60)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { db } = await connectToDatabase();
    const media = await db.collection('review_media').findOne(
      {
        _id: new ObjectId(id),
        deletedAt: { $exists: false },
      },
      {
        projection: {
          _id: 1,
          data: 1,
          contentType: 1,
          size: 1,
          sha256: 1,
        },
      }
    );

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    if (!ALLOWED_CONTENT_TYPES.has(media.contentType)) {
      logger.warn('Unexpected review media content type', {
        mediaId: id,
        contentType: media.contentType,
      });
      return NextResponse.json({ error: 'Unsupported media type' }, { status: 415 });
    }

    const binary = normalizeBinaryData(media.data);
    if (!binary || binary.length === 0) {
      logger.warn('Missing binary data for review media', { mediaId: id });
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    const etag = media.sha256
      ? `"sha256-${media.sha256}"`
      : `"${id}-${media.size || binary.length}"`;

    if (request.headers.get('if-none-match') === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    return new NextResponse(binary, {
      status: 200,
      headers: {
        'Content-Type': media.contentType,
        'Content-Length': String(binary.length),
        'Content-Disposition': `inline; filename="review-media-${id}"`,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
        ETag: etag,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    });
  } catch (error) {
    logger.error('Failed to serve review media', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json({ error: 'Failed to retrieve media' }, { status: 500 });
  }
}
