import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    experimental: {
        // Migration data is independently capped at 8 MiB before submission.
        serverActions: { bodySizeLimit: "10mb" },
    },
};

export default nextConfig;
