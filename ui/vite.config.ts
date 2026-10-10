import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const external = process.env.APP_ACCESS_MODE === 'external';
const publicUrl = new URL(process.env.APP_ORIGIN || 'http://localhost:5300');
const authPaths = ['/api/v3', '/application', '/flows', '/if', '/static', '/media', '/ws', '/outpost.goauthentik.io'];

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', port: 5300, strictPort: true,
    allowedHosts: external ? [publicUrl.hostname] : [],
    hmr: external ? { protocol: 'wss', host: publicUrl.hostname, clientPort: Number(publicUrl.port || 443) } : undefined,
    proxy: {
      ...(external ? Object.fromEntries(authPaths.map(path => [path, {
        target: 'http://127.0.0.1:9010', changeOrigin: false, ws: true,
        headers: { 'X-Forwarded-Proto': 'https', 'X-Forwarded-Host': publicUrl.host },
      }])) : {}),
      ...Object.fromEntries(['/api', '/oauth2', '/login'].map(path => [path, {
      target: 'http://127.0.0.1:8300', changeOrigin: false,
      }])),
    },
  },
});
