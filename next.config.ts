import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  trailingSlash: true,
  // Шрифты PDF читаются с диска в /api/quote-pdf — включаем их в бандл функции
  outputFileTracingIncludes: {
    "/api/quote-pdf": ["./assets/pdf-fonts/**"],
  },
  images: {
    // Реальные скриншоты кейсов отдаются в AVIF/WebP автоматически
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default config;
