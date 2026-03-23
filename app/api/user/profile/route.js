import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { updateUser, findUserById } from '@/lib/db/users';

export async function PUT(request) {
  try {
    // Get auth token from cookie
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    const body = await request.json();
    const { name, phone } = body;

    // Validation
    const updates = {};
    if (name !== undefined) {
      if (name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }
    if (phone !== undefined) {
      updates.phone = phone.trim() || null;
    }

    // Update user
    const updatedUser = await updateUser(userId, updates);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    // Get auth token from cookie
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const user = await findUserById(decoded.userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
