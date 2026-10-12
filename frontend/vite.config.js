import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.VITE_BACKEND_URL || "http://localhost:5000";

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
        },
        "/socket.io": {
          target: backendUrl,
          ws: true,
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: false,
      rollupOptions: {
        output: {
          // Split large vendor chunks for faster loads
          manualChunks: {
            react: ["react", "react-dom"],
            monaco: ["@monaco-editor/react"],
            socket: ["socket.io-client"],
          },
        },
      },
    },
    define: {
      // Make env vars available at build time
      __BACKEND_URL__: JSON.stringify(backendUrl),
    },
  };
});
