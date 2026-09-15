import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [react()],
    server: {
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5173,
      strictPort: true,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              console.error('[Vite Proxy] API server unreachable:', String((err as { code?: string }).code || (err as Error).message));
              const r = res as import('http').ServerResponse | undefined;
              if (r && !r.headersSent) {
                r.writeHead(502, { 'Content-Type': 'application/json' });
                r.end(JSON.stringify({
                  error: 'API server is not running on port 3001. Start it with: npm run dev',
                }));
              }
            });
          },
        },
      },
    },
  }
})
