import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true
      },
      build: {
        rollupOptions: {
          input: {
            main: './index.html',
            'firebase-messaging-sw': './firebase-messaging-sw.js'
          },
          output: {
            entryFileNames: (chunkInfo) => {
              return chunkInfo.name === 'firebase-messaging-sw' ? 'firebase-messaging-sw.js' : 'assets/[name]-[hash].js';
            },
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash].[ext]'
          }
        },
        // 빌드 최적화
        target: 'es2015',
        minify: 'esbuild',
        sourcemap: false,
        // 청크 크기 경고 비활성화
        chunkSizeWarningLimit: 1000
      }
    };
});
