'use client';

export default function Error({
  error,
  reset,
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f9fafb',
    }}>
      <div style={{
        maxWidth: '600px',
        textAlign: 'center',
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
        <h2 style={{
          margin: '0 0 16px',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#1f2937',
        }}>
          Oops! An error occurred
        </h2>
        <p style={{
          margin: '0 0 30px',
          fontSize: '14px',
          color: '#6b7280',
          lineHeight: '1.6',
        }}>
          We encountered an error while processing your request. Please try again.
        </p>
        <button
          onClick={() => reset()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background-color 0.3s',
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#047857'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#059669'}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
