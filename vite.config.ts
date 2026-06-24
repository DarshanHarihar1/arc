import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png", "favicon.ico"],
      manifest: {
        name: "Arc — Fitness & Consistency",
        short_name: "Arc",
        description: "Stay consistent with workouts, food, medicine, and steps.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0b0f17",
        theme_color: "#0b0f17",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        // Custom push / notificationclick handlers folded into the generated SW.
        importScripts: ["/push-sw.js"],
        runtimeCaching: [
          {
            // Cache GET data reads stale-while-revalidate; never auth/storage writes.
            urlPattern: ({ url, request }) =>
              request.method === "GET" && url.pathname.startsWith("/rest/v1/"),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "supabase-rest" },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
