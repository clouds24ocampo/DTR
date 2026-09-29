import react from "@vitejs/plugin-react";
import path from "path";
import {defineConfig, loadEnv} from "vite";

export default defineConfig(({mode}) => {
  // Load environment variables based on the mode
  const env = loadEnv(mode, process.cwd()) as Record<string, string>;

  console.log(`Running Vite in ${mode} mode`);
  return {
    plugins: [react()],
    server: {
      port: Number(env.VITE_PORT) || 9000,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: "build/local",
      sourcemap: false,
      minify: mode === "production" ? "esbuild" : false,
      chunkSizeWarningLimit: 6000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("phaser")) {
                return "vendor-phaser";
              }
              return "vendor";
            }
          },
        },
      },
      assetsInlineLimit: 4096,
      cssCodeSplit: true,
    },
    esbuild: {
      target: "es2020",
      treeShaking: true,
    },
    optimizeDeps: {
      include: ["react", "react-dom"],
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode === "production" ? "production" : "development"),
      "process.env": {
        NODE_ENV: mode === "production" ? "production" : "development",
        ...Object.keys(env)
          .filter((key) => key.startsWith("VITE_"))
          .reduce((acc: Record<string, string>, key: string) => {
            acc[key] = env[key];
            return acc;
          }, {}),
      },
    },
  };
});
