/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produção: pula checagem de tipos e lint no build para iniciar mais rápido.
  // A verificação de tipos continua ativa em desenvolvimento.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "louveira.sp.gov.br",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
