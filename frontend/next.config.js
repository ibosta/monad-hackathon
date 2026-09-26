/** @type {import('next').NextConfig} */
const { IgnorePlugin } = require("webpack");

const ignoredModules = [
  "@coinbase/cdp-sdk",
  "@base-org/account",
  "@safe-global/protocol-kit",
  "@safe-global/safe-deployments",
  "@magic-sdk/supplemental-node",
  "@dynamic-labs/iconic",
  "@gnosis.pm/safe-core-sdk",
  "@x402/evm",
  "@x402/core",
  "@x402/svm",
];

const nextConfig = {
  reactStrictMode: true,
  // wagmi/viem are ESM-friendly; ensure transpilation for monorepo deps if added later.
  transpilePackages: ["wagmi", "viem"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  webpack: (config) => {
    // wagmi 2.x re-exports many connectors (Coinbase, Base, Safe, etc.) that pull in
    // heavy optional deps like @coinbase/cdp-sdk / @base-org/account / @x402/* which
    // are not installed. We only use the `injected()` connector, so we ignore these
    // optional modules to keep the build clean and fast.
    config.plugins = config.plugins || [];
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: new RegExp(`^(${ignoredModules.join("|")})(/.*)?$`),
      })
    );

    return config;
  },
};

module.exports = nextConfig;
