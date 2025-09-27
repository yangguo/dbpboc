/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure trailingSlash is false for proper routing on Netlify
  trailingSlash: false,
}

export default nextConfig

