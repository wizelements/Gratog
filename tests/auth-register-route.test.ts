import { beforeEach, describe, expect, it, vi } from 'vitest';

const createUserMock = vi.fn();
const initializeUserRewardsMock = vi.fn();
const initializeUserChallengeMock = vi.fn();
const hashPasswordMock = vi.fn();
const generateTokenMock = vi.fn();
const sendWelcomeEmailMock = vi.fn();
const validateRegistrationMock = vi.fn();
const connectToDatabaseMock = vi.fn();

vi.mock('@/lib/db/users', () => ({
  createUser: createUserMock,
  initializeUserRewards: initializeUserRewardsMock,
  initializeUserChallenge: initializeUserChallengeMock,
}));

vi.mock('@/lib/auth/jwt', () => ({
  hashPassword: hashPasswordMock,
  generateToken: generateTokenMock,
}));

vi.mock('@/lib/email/service', () => ({
  sendWelcomeEmail: sendWelcomeEmailMock,
}));

vi.mock('@/lib/auth/validation', () => ({
  validateRegistration: validateRegistrationMock,
}));

vi.mock('@/lib/db-optimized', () => ({
  connectToDatabase: connectToDatabaseMock,
}));

function createRequest(body: unknown) {
  return {
    async json() {
      return body;
    },
  };
}

describe('Auth Register Route Pending Customer Reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    validateRegistrationMock.mockReturnValue({ valid: true, errors: {} });
    hashPasswordMock.mockResolvedValue('hashed-password');
    generateTokenMock.mockReturnValue('jwt-token');
    sendWelcomeEmailMock.mockResolvedValue(undefined);
    initializeUserRewardsMock.mockResolvedValue({});
    initializeUserChallengeMock.mockResolvedValue({});
    createUserMock.mockResolvedValue({
      id: 'user-123',
      name: 'Review User',
      email: 'reviewer@example.com',
      phone: null,
      joinedAt: new Date('2026-03-08T00:00:00.000Z'),
    });
  });

  it('marks matching pending customer as converted after successful registration', async () => {
    const updateOneMock = vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const collectionMock = vi.fn().mockReturnValue({ updateOne: updateOneMock });
    connectToDatabaseMock.mockResolvedValue({
      db: {
        collection: collectionMock,
      },
    });

    const registerRoute = await import('@/app/api/auth/register/route');

    const response = await registerRoute.POST(
      createRequest({
        name: 'Review User',
        email: 'Reviewer@Example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        phone: '',
      }) as never
    );

    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(collectionMock).toHaveBeenCalledWith('pending_customers');
    expect(updateOneMock).toHaveBeenCalledWith(
      { email: 'reviewer@example.com' },
      {
        $set: expect.objectContaining({
          status: 'converted',
          convertedUserId: 'user-123',
          convertedName: 'Review User',
          convertedSource: 'auth_register',
        }),
      }
    );
  });

  it('does not fail registration if pending customer reconciliation errors', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    connectToDatabaseMock.mockRejectedValue(new Error('db unavailable'));

    const registerRoute = await import('@/app/api/auth/register/route');

    const response = await registerRoute.POST(
      createRequest({
        name: 'Review User',
        email: 'reviewer@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }) as never
    );

    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
