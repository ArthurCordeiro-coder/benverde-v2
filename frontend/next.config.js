/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['react-markdown'],
  // pdfjs-dist roda como dependência de runtime no servidor (extração de texto
  // de NF-e); empacotar quebra os requires opcionais dele (ex.: canvas).
  serverExternalPackages: ['pdfjs-dist'],

  // Cabeçalhos de segurança aplicados a todas as respostas. CSP não é incluído
  // aqui para não quebrar os scripts inline do Next sem testes dedicados.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
