import type { NextConfig } from "next"
import type { RemotePattern } from "next/dist/shared/lib/image-config"

const DEFAULT_REMOTE_PATTERNS: RemotePattern[] = [
  {
    protocol: "https",
    hostname: "*.googleusercontent.com",
  },
  {
    protocol: "https",
    hostname: "drive.google.com",
  },
  {
    protocol: "https",
    hostname: "*.ggpht.com",
  },
  {
    protocol: "https",
    hostname: "images.unsplash.com",
  },
  {
    protocol: "https",
    hostname: "res.cloudinary.com",
  },
  {
    protocol: "https",
    hostname: "i.imgur.com",
  },
] as const

const extraHosts =
  process.env.NEXT_PUBLIC_IMAGE_HOSTS?.split(/[,|\s]+/)
    .map((raw) => raw.trim())
    .filter(Boolean) ?? []

const extraRemotePatterns: RemotePattern[] = extraHosts.map((entry) => {
  const cleaned = entry.replace(/^https?:\/\//, "").replace(/\/.*/, "")
  return {
    protocol: "https",
    hostname: cleaned,
  }
})

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [...DEFAULT_REMOTE_PATTERNS, ...extraRemotePatterns],
  },
}

export default nextConfig
