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
  /* Old addresses keep working. Class material is no longer on the site. */
  async redirects() {
    return [
      { source: "/scales", destination: "/sounds", permanent: true },
      { source: "/workout", destination: "/sounds", permanent: true },
      { source: "/live", destination: "/practice", permanent: true },
      { source: "/varisai", destination: "/practice#routines", permanent: true },
      { source: "/class", destination: "/", permanent: true },
      { source: "/guides/:path*", destination: "/", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/audio/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};
export default nextConfig;
