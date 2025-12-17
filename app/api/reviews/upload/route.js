import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 3;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'reviews');

export async function POST(request) {
  try {
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

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const uploadedUrls = [];
    const errors = [];

    for (const file of files) {
      if (!(file instanceof File)) {
        errors.push('Invalid file format');
        continue;
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type. Allowed: JPEG, PNG, WebP, GIF`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large. Maximum size is 5MB`);
        continue;
      }

      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate unique filename
        const ext = path.extname(file.name) || `.${file.type.split('/')[1]}`;
        const filename = `${uuidv4()}${ext}`;
        const filepath = path.join(UPLOAD_DIR, filename);

        await writeFile(filepath, buffer);

        uploadedUrls.push(`/uploads/reviews/${filename}`);
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

export const config = {
  api: {
    bodyParser: false,
  },
};
