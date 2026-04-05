/**
 * API Versioning Middleware
 * 
 * Provides version-aware routing and backward compatibility.
 * Current: v1
 * Future: v2
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// VERSION CONFIGURATION
// ============================================================================

export const API_VERSIONS = {
  CURRENT: 'v1',
  SUPPORTED: ['v1'],
  DEPRECATED: [],
} as const;

export type ApiVersion = typeof API_VERSIONS.SUPPORTED[number];

// ============================================================================
// VERSION DETECTION
// ============================================================================

/**
 * Extract API version from request
 * Priority: 1) Header, 2) URL path, 3) Query param, 4) Default
 */
export function detectApiVersion(request: NextRequest): ApiVersion {
  // Check header first
  const headerVersion = request.headers.get('api-version');
  if (headerVersion && isValidVersion(headerVersion)) {
    return headerVersion as ApiVersion;
  }
  
  // Check URL path (/api/v1/...)
  const pathMatch = request.nextUrl.pathname.match(/\/api\/(v\d+)\//);
  if (pathMatch && isValidVersion(pathMatch[1])) {
    return pathMatch[1] as ApiVersion;
  }
  
  // Check query param
  const queryVersion = request.nextUrl.searchParams.get('api-version');
  if (queryVersion && isValidVersion(queryVersion)) {
    return queryVersion as ApiVersion;
  }
  
  // Default to current version
  return API_VERSIONS.CURRENT as ApiVersion;
}

function isValidVersion(version: string): boolean {
  return API_VERSIONS.SUPPORTED.includes(version as ApiVersion);
}

// ============================================================================
// VERSIONED RESPONSE HELPERS
// ============================================================================

interface VersionedResponseOptions {
  version?: ApiVersion;
  deprecationDate?: string;
  sunsetDate?: string;
}

export function createVersionedResponse<T>(
  data: T,
  options: VersionedResponseOptions = {}
): NextResponse {
  const { version = API_VERSIONS.CURRENT, deprecationDate, sunsetDate } = options;
  
  const response = NextResponse.json({
    success: true,
    apiVersion: version,
    data,
  });
  
  // Add version headers
  response.headers.set('X-API-Version', version);
  
  if (API_VERSIONS.DEPRECATED.includes(version)) {
    response.headers.set('Deprecation', `true`);
    if (sunsetDate) {
      response.headers.set('Sunset', sunsetDate);
    }
  }
  
  return response;
}

// ============================================================================
// MIDDLEWARE WRAPPER
// ============================================================================

export interface VersionedRequest extends NextRequest {
  apiVersion: ApiVersion;
}

/**
 * Middleware wrapper that adds version detection
 */
export function withVersionedApi<T>(
  handler: (request: VersionedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const version = detectApiVersion(request);
    
    // Check if version is supported
    if (!API_VERSIONS.SUPPORTED.includes(version)) {
      return NextResponse.json(
        {
          success: false,
          error: `API version '${version}' is not supported`,
          supportedVersions: API_VERSIONS.SUPPORTED,
        },
        { status: 400 }
      );
    }
    
    // Attach version to request
    const versionedRequest = request as VersionedRequest;
    versionedRequest.apiVersion = version;
    
    const response = await handler(versionedRequest);
    
    // Add version header to response
    response.headers.set('X-API-Version', version);
    
    return response;
  };
}

// ============================================================================
// ROUTE VERSIONING
// ============================================================================

/**
 * Route handler that supports multiple versions
 * Routes requests to appropriate handler based on version
 */
export function versionedRoute(
  handlers: Record<ApiVersion, (request: NextRequest) => Promise<NextResponse>>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const version = detectApiVersion(request);
    
    const handler = handlers[version];
    
    if (!handler) {
      return NextResponse.json(
        {
          success: false,
          error: `No handler for API version '${version}'`,
          supportedVersions: Object.keys(handlers),
        },
        { status: 400 }
      );
    }
    
    const response = await handler(request);
    response.headers.set('X-API-Version', version);
    
    return response;
  };
}

// ============================================================================
// SCHEMA VERSIONING
// ============================================================================

interface VersionedSchema {
  [version: string]: {
    request?: unknown;
    response?: unknown;
  };
}

/**
 * Get schema for a specific version
 */
export function getVersionedSchema<T>(
  schemas: Record<ApiVersion, T>,
  version: ApiVersion
): T | null {
  return schemas[version] || schemas[API_VERSIONS.CURRENT] || null;
}
