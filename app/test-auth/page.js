'use client';

import { useState } from 'react';

export default function TestAuthPage() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testRegistration = async () => {
    setLoading(true);
    setResult('Testing...');
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: `test${Date.now()}@example.com`,
          password: 'test123456'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult('✅ Registration SUCCESS! Token: ' + data.token.substring(0, 20) + '...');
      } else {
        setResult('❌ Registration failed: ' + data.error);
      }
    } catch (error) {
      setResult('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>Auth API Test Page</h1>
      
      <button 
        onClick={testRegistration}
        disabled={loading}
        style={{
          padding: '12px 24px',
          background: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px'
        }}
      >
        {loading ? 'Testing...' : 'Test Registration API'}
      </button>
      
      {result && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: result.includes('SUCCESS') ? '#d1fae5' : '#fee2e2',
          borderRadius: '6px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all'
        }}>
          {result}
        </div>
      )}
      
      <div style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
        <p>This page tests if:</p>
        <ul>
          <li>✓ React client components work</li>
          <li>✓ useState hook works</li>
          <li>✓ Fetch API works</li>
          <li>✓ Registration API responds correctly</li>
        </ul>
      </div>
    </div>
  );
}
