import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Expose environment variables to server-side runtime (API routes)
  // These are embedded at build time from Amplify environment variables
  env: {
    API_GATEWAY_URL: process.env.API_GATEWAY_URL,
    OPSTACK_AWS_ACCESS_KEY_ID: process.env.OPSTACK_AWS_ACCESS_KEY_ID,
    OPSTACK_AWS_SECRET_ACCESS_KEY: process.env.OPSTACK_AWS_SECRET_ACCESS_KEY,
    DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
    REGION: process.env.REGION,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
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
