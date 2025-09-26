/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // For Netlify deployment, keep server-side rendering for API routes
  // output: 'standalone', // This would be for Docker deployments
}

export default nextConfig

