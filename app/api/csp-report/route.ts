import { NextRequest, NextResponse } from 'next/server';

/**
 * CSP violation reporting endpoint
 * Add to CSP header: report-uri /api/csp-report
 */
export async function POST(request: NextRequest) {
  try {
    const report = await request.json();
    
    // Log CSP violation
    if (report['csp-report']) {
      console.warn('CSP Violation:', JSON.stringify({
        documentUri: report['csp-report']['document-uri'],
        violatedDirective: report['csp-report']['violated-directive'],
        blockedUri: report['csp-report']['blocked-uri'],
        sourceFile: report['csp-report']['source-file'],
        lineNumber: report['csp-report']['line-number'],
      }));
    }
    
    return NextResponse.json({ received: true }, { status: 204 });
  } catch (error) {
    console.error('CSP report parsing error:', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: 'Invalid report' }, { status: 400 });
  }
}
