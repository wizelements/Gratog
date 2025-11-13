import { NextResponse } from 'next/server';
import { getAdminUsers } from '@/lib/db-admin';
import { verifyPassword, generateToken } from '@/lib/auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ADMIN_LOGIN');

export async function POST(request) {
  logger.info('Login attempt started');
  
  try {
    const { email, password } = await request.json();
    
    logger.debug('Credentials received', {
      email,
      passwordLength: password?.length,
      hasEmail: !!email,
      hasPassword: !!password
    });

    if (!email || !password) {
      logger.warn('Missing credentials', { email: !!email, password: !!password });
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    logger.info('Fetching admin users collection');
    const adminUsers = await getAdminUsers();
    
    logger.info('Searching for user', { 
      searchEmail: email.toLowerCase() 
    });
    const user = await adminUsers.findOne({ email: email.toLowerCase() });
    
    logger.debug('User lookup result', {
      found: !!user,
      userEmail: user?.email,
      hasPasswordHash: !!user?.passwordHash
    });

    if (!user) {
      logger.warn('User not found', { 
        attemptedEmail: email.toLowerCase(),
        collectionExists: !!adminUsers
      });
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    logger.info('Verifying password');
    const isValid = await verifyPassword(password, user.passwordHash);
    
    if (!isValid) {
      logger.warn('Invalid password', { 
        userEmail: user.email 
      });
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    logger.info('Generating JWT token', {
      userId: user._id.toString(),
      userEmail: user.email,
      role: user.role
    });
    
    const token = generateToken(user._id.toString(), user.email, user.role);
    
    logger.debug('Token generated', {
      tokenLength: token?.length,
      hasToken: !!token
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

    logger.info('Setting authentication cookie', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });
    
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    logger.info('Login successful', {
      userEmail: user.email,
      userId: user._id.toString(),
      role: user.role
    });

    return response;
  } catch (error) {
    logger.error('Login failed with exception', {
      error: error.message,
      errorType: error.constructor.name,
      mongoError: error.name === 'MongoError',
      jwtError: error.name === 'JsonWebTokenError'
    });
    
    // Return detailed error in development, generic in production
    return NextResponse.json(
      { 
        error: 'Login failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        hint: process.env.NODE_ENV === 'development' ? 
          'Check server logs for detailed error information' : undefined
      },
      { status: 500 }
    );
  }
}
