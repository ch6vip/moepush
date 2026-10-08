import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev"
import type { NextConfig } from "next"

async function setupPlatform() {
  if (process.env.NODE_ENV === "development") {
    await setupDevPlatform()
  }
}

setupPlatform()

const nextConfig: NextConfig = {
  // Cloudflare Pages does not provide the Next.js image optimizer runtime.
  // Serving source images directly also keeps the AVIF optimization endpoint disabled.
  images: {
    unoptimized: true,
  },
}

export default nextConfig
