import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // @ts-ignore
      "react-dom/client": path.resolve(
        __dirname,
        "node_modules/react-dom/profiling",
      ),
    },
  },
});
