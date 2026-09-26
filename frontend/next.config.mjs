/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // wagmi/viem are ESM-friendly; ensure transpilation for monorepo deps if added later.
  transpilePackages: ["wagmi", "viem"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
