/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ytyhhmwnnlkhhpvsurlm.supabase.co",
      },
    ],
  },
};

module.exports = nextConfig;
