import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Explicitly set port to avoid redirect_uri_mismatch
    strictPort: false, // Allow fallback to next available port if 5173 is taken
    // NOTE: COOP header removed - it blocks OAuth popups from communicating with parent window
    // If WASM requires these headers, consider adding them only in production or for specific routes
    headers: {
      // Removed COOP header to allow OAuth popups to work
      // 'Cross-Origin-Embedder-Policy': 'require-corp',
      // 'Cross-Origin-Opener-Policy': 'same-origin',
    },
    fs: {
      // Allow serving files from node_modules for WASM
      allow: ['..'],
    },
  },
  optimizeDeps: {
    // Exclude WASM from optimization to avoid bundling issues
    exclude: ['@mysten/walrus-wasm'],
  },
  assetsInclude: ['**/*.wasm'],
})

