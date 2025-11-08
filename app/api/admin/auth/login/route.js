import { NextResponse } from 'next/server';
import { getAdminUsers } from '@/lib/db-admin';
import { verifyPassword, generateToken } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(request) {
  logger.info('ADMIN_LOGIN', 'Login attempt started');
  
  try {
    // Check environment variables
    logger.checkEnv(['JWT_SECRET', 'MONGODB_URI']);
    
    const { email, password } = await request.json();
    
    logger.debug('ADMIN_LOGIN', 'Credentials received', {
      email,
      passwordLength: password?.length,
      hasEmail: !!email,
      hasPassword: !!password
    });

    if (!email || !password) {
      logger.warn('ADMIN_LOGIN', 'Missing credentials', { email: !!email, password: !!password });
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    logger.info('ADMIN_LOGIN', 'Fetching admin users collection');
    const adminUsers = await getAdminUsers();
    
    logger.info('ADMIN_LOGIN', 'Searching for user', { 
      searchEmail: email.toLowerCase() 
    });
    const user = await adminUsers.findOne({ email: email.toLowerCase() });
    
    logger.debug('ADMIN_LOGIN', 'User lookup result', {
      found: !!user,
      userEmail: user?.email,
      hasPasswordHash: !!user?.passwordHash
    });

    if (!user) {
      logger.warn('ADMIN_LOGIN', 'User not found', { 
        attemptedEmail: email.toLowerCase(),
        collectionExists: !!adminUsers
      });
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    logger.info('ADMIN_LOGIN', 'Verifying password');
    const isValid = await verifyPassword(password, user.passwordHash);
    
    if (!isValid) {
      logger.warn('ADMIN_LOGIN', 'Invalid password', { 
        userEmail: user.email 
      });
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    logger.info('ADMIN_LOGIN', 'Generating JWT token', {
      userId: user._id.toString(),
      userEmail: user.email,
      role: user.role
    });
    
    const token = generateToken(user._id.toString(), user.email, user.role);
    
    logger.debug('ADMIN_LOGIN', 'Token generated', {
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

    logger.info('ADMIN_LOGIN', 'Setting authentication cookie', {
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

    logger.success('ADMIN_LOGIN', 'Login successful', {
      userEmail: user.email,
      userId: user._id.toString(),
      role: user.role
    });

    return response;
  } catch (error) {
    logger.authError('Login failed with exception', error, {
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
