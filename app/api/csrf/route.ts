/**
 * CSRF Token Generation Endpoint
 * Requirements: 18.1 - CSRF protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken, getCSRFCookieOptions } from '@/lib/utils/csrf';

/**
 * GET /api/csrf
 * Generate and return a CSRF token
 */
export async function GET(request: NextRequest) {
  try {
    // Generate CSRF token
    const csrfToken = generateCSRFToken();
    
    // Create response with token
    const response = NextResponse.json({
      success: true,
      csrfToken,
    });
    
    // Set CSRF token in cookie
    response.cookies.set('csrf-token', csrfToken, getCSRFCookieOptions());
    
    return response;
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate CSRF token',
      },
      { status: 500 }
    );
  }
}
