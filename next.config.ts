// Load the Node 25+ Web Storage shim first. Next loads this config before
// any app code, so importing here is early enough — and unlike the previous
// NODE_OPTIONS='--require …' approach, this works on Windows.
import "./node-compat.cjs";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Pin the workspace root so a stray yarn.lock or package.json elsewhere
  // on the learner's machine can't hijack Turbopack's module resolution.
  turbopack: { root: process.cwd() },
  experimental: {
    // The dev-only segment explorer wraps every route segment, shifting
    // React's useId() counter between the SSR and hydration passes and
    // causing false-positive hydration mismatches (react-resizable-panels,
    // Radix UI). It's a devtools panel, not app behavior — safe to disable.
    devtoolSegmentExplorer: false,
  },
};

export default nextConfig;
