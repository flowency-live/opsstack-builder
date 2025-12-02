import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Expose environment variables to server-side runtime (API routes)
  // These are embedded at build time from Amplify environment variables
  env: {
    API_GATEWAY_URL: process.env.API_GATEWAY_URL,
    FBUILDER_AWS_ACCESS_KEY_ID: process.env.FBUILDER_AWS_ACCESS_KEY_ID,
    FBUILDER_AWS_SECRET_ACCESS_KEY: process.env.FBUILDER_AWS_SECRET_ACCESS_KEY,
    DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME,
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
