/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export — required for Cloudflare Pages (no Node.js runtime)
  output: 'export',
  // Disable image optimisation (not supported in static export)
  images: {
    unoptimized: true,
  },
  // Disable output file tracing (not needed for static export)
  outputFileTracing: false,
};

module.exports = nextConfig;
