/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure trailingSlash is false for proper routing on Netlify
  trailingSlash: false,
  // Enable experimental features for better Netlify compatibility
  experimental: {
    // Optimize for serverless deployment
    serverMinification: false,
  },
}

export default nextConfig

