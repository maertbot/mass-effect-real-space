import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: [
            'three',
            'three/examples/jsm/controls/OrbitControls.js',
            'three/examples/jsm/postprocessing/EffectComposer.js',
            'three/examples/jsm/postprocessing/RenderPass.js',
            'three/examples/jsm/postprocessing/UnrealBloomPass.js',
          ],
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 4173,
  },
  preview: {
    host: '127.0.0.1',
    port: 4174,
  },
});
