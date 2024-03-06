import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/singing-synthesis",
  optimizeDeps: {
    noDiscovery: true,
  },
  build: {
    minify: false,
    terserOptions: {
      keep_classnames: true,
      keep_fnames: true,
      compress: false,
      mangle: false,
      format: {
        preserve_annotations: true,
      },
    },
  },
});
