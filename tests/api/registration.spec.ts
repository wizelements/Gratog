import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Registration API', () => {
  const baseUrl = 'http://localhost:3000';
  
  it('should validate confirmPassword is required', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
        // Missing confirmPassword
        phone: '(404) 555-0123'
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.errors?.confirmPassword).toBeDefined();
  });

  it('should require password to match confirmPassword', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'DifferentPass123!',
        phone: '(404) 555-0123'
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  it('should successfully register with valid data', async () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: testEmail,
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        phone: '(404) 555-0123'
      })
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(testEmail);
  });

  it('should reject duplicate email', async () => {
    const testEmail = `duplicate-${Date.now()}@example.com`;
    
    // First registration
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: testEmail,
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        phone: '(404) 555-0123'
      })
    });

    // Try duplicate
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another User',
        email: testEmail,
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        phone: '(404) 555-0124'
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
  });
});
