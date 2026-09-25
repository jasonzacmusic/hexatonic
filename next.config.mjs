/** @type {import('next').NextConfig} */
const buildVersion = (
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  `local-${Date.now().toString(36)}`
).slice(0, 20);

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: { NEXT_PUBLIC_BUILD_VERSION: buildVersion },
  // /varisai was folded into Practice as "Routines".
  async redirects() {
    return [{ source: "/varisai", destination: "/practice#routines", permanent: true }];
  },
  async headers() {
    return [
      { source: "/audio/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};
export default nextConfig;
