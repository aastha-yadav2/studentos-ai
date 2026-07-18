import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/framer-motion")) return "motion"
          if (id.includes("node_modules/@supabase")) return "supabase"
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) return "react"
        },
      },
    },
  },
})
