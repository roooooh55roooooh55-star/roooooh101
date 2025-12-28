
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', 
  define: {
    // تضمن هذه الخطوة وصول المفاتيح من Netlify إلى الكود الأمامي
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env': JSON.stringify(process.env)
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    target: 'esnext'
  },
  server: {
    historyApiFallback: true,
  }
});
