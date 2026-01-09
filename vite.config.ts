import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  return {
    server: {
      host: "::",
      port: 8080,
      https: {
        key: fs.readFileSync(path.resolve(__dirname, "server/certs/key.pem")),
        cert: fs.readFileSync(path.resolve(__dirname, "server/certs/cert.pem")),
      },
      proxy: {
        "/api": {
          target: "https://localhost:3011", // backend HTTPS
          changeOrigin: true,
          secure: false, // allow self-signed certs
          rejectUnauthorized: false, // ignore SSL certificate errors
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
