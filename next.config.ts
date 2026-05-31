import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Security headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: [
          // HSTS - HTTP Strict Transport Security
          // Forces browsers to use HTTPS for all future requests
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Prevent clickjacking by disallowing framing entirely
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Prevent MIME type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Referrer policy - send origin only on cross-origin requests
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Permissions policy - disable unused browser features
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Content Security Policy
          // Allows NextAuth callbacks and Google OAuth flows
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // NextAuth requires unsafe-eval for JWT; unsafe-inline for Next.js hydration
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https:",
              "font-src 'self' https://fonts.gstatic.com",
              // Allow NextAuth API calls and Google OAuth endpoints
              "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com",
              // Allow Google OAuth popup/redirect frames
              "frame-src 'self' https://accounts.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              // Allow form submissions to self and Google OAuth
              "form-action 'self' https://accounts.google.com",
              // Prevent this page from being framed (complements X-Frame-Options)
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // Environment variables
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },

  // Experimental features
  experimental: {
    optimizePackageImports: ["@prisma/client"],
  },
};

export default nextConfig;
