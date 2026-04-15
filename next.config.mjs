/** @type {import("next").NextConfig} */

const nextConfig = {
  images: { unoptimized: true },
  transpilePackages: ["@synergycodes/overflow-ui"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
