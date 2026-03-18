import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/db-optimized';
import { RateLimit } from '@/lib/redis';

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const MAX_FILES = 3;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

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

function hasAllowedOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) {
    return true;
  }

  try {
    const originHost = new URL(origin).host;
    const requestHost = request.headers.get('host');
    const siteHost = process.env.NEXT_PUBLIC_BASE_URL
      ? new URL(process.env.NEXT_PUBLIC_BASE_URL).host
      : null;

    return originHost === requestHost || (siteHost && originHost === siteHost);
  } catch {
    return false;
  }
}

function detectImageMime(buffer) {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }

  // GIF
  const gifHeader = buffer.subarray(0, 6).toString('ascii');
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
    return 'image/gif';
  }

  // WebP (RIFF....WEBP)
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);
    if (!RateLimit.check(`review_upload:${clientIp}`, 20, 60 * 60)) {
      return NextResponse.json(
        { error: 'Upload rate limit exceeded' },
        { status: 429 }
      );
    }

    if (!hasAllowedOrigin(request)) {
      return NextResponse.json(
        { error: 'Upload origin is not allowed' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('images');

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} images allowed` },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    const uploadedUrls = [];
    const errors = [];

    for (const file of files) {
      if (!(file instanceof File)) {
        errors.push('Invalid file format');
        continue;
      }

      // Validate file type
      if (!ALLOWED_TYPES.has(file.type)) {
        errors.push(`${file.name}: Invalid file type. Allowed: JPEG, PNG, WebP, GIF`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large. Maximum size is 4MB`);
        continue;
      }

      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const detectedMime = detectImageMime(buffer);

        if (!detectedMime || !ALLOWED_TYPES.has(detectedMime)) {
          errors.push(`${file.name}: File signature is not a supported image`);
          continue;
        }

        if (detectedMime !== file.type) {
          errors.push(`${file.name}: MIME type mismatch detected`);
          continue;
        }

        const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
        const existingMedia = await db.collection('review_media').findOne(
          {
            sha256,
            size: buffer.length,
            contentType: detectedMime,
            deletedAt: { $exists: false },
          },
          { projection: { _id: 1 } }
        );

        if (existingMedia?._id) {
          uploadedUrls.push(`/api/reviews/media/${existingMedia._id.toString()}`);
          continue;
        }

        const insertResult = await db.collection('review_media').insertOne({
          originalName: String(file.name || 'review-image').slice(0, 200),
          size: buffer.length,
          contentType: detectedMime,
          sha256,
          data: buffer,
          uploadedByIp: clientIp,
          uploadedByOrigin: request.headers.get('origin') || null,
          uploadedByUserAgent: request.headers.get('user-agent') || null,
          createdAt: new Date(),
        });

        uploadedUrls.push(`/api/reviews/media/${insertResult.insertedId.toString()}`);
      } catch (fileError) {
        console.error(`Error uploading ${file.name}:`, { error: fileError.message, stack: fileError.stack });
        errors.push(`${file.name}: Upload failed`);
      }
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json(
        { error: 'No files were uploaded', details: errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      count: uploadedUrls.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Upload error:', { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: 'Failed to upload images' },
      { status: 500 }
    );
  }
}
