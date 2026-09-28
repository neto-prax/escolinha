import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api/asaas': {
        target: 'https://api.asaas.com/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/asaas/, ''),
        secure: true,
      },
      '/api/cora': {
        target: 'https://api.cora.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cora/, ''),
        secure: true,
      },
      '/api/cora-stage': {
        target: 'https://api-stage.cora.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cora-stage/, ''),
        secure: true,
      },
      '/api/sicoob': {
        target: 'https://api.sicoob.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sicoob/, ''),
        secure: true,
      },
      '/api/sicoob-sandbox': {
        target: 'https://sandbox.sicoob.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sicoob-sandbox/, ''),
        secure: true,
      },
      '/api/bradesco': {
        target: 'https://api.bradesco.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bradesco/, ''),
        secure: true,
      },
      '/api/bradesco-sandbox': {
        target: 'https://homolog.api.bradesco.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bradesco-sandbox/, ''),
        secure: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
