import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Docker/devcontainer-friendly Vite config with polling + explicit host/port
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 0.0.0.0
    port: 5173,
    strictPort: true,
    watch: {
      // Some bind mounts (Dev Containers, WSL, network FS) don't emit FS events reliably
      usePolling: true,
      interval: 300,
    },
    hmr: {
      // When using port forwarding, ensure the client connects back to the forwarded port
      clientPort: 5173,
    },
  },
})
