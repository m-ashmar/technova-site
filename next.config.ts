import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    // three.js warns with cyclic objects during WebGL init; Next's dev-mode
    // browser->terminal forwarder JSON.stringifies console args and crashes
    // on them (observed as "cannot serialize cyclic structures" in the hero).
    browserToTerminal: false,
  },
};

export default nextConfig;
