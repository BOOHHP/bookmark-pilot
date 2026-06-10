import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';

// 构建后把 manifest.json 和 icons 拷贝进 dist
function copyAssets() {
  return {
    name: 'copy-assets',
    closeBundle() {
      copyFileSync('manifest.json', 'dist/manifest.json');
      if (existsSync('icons')) {
        mkdirSync('dist/icons', { recursive: true });
        cpSync('icons', 'dist/icons', { recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyAssets()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: 'sidepanel.html',
        options: 'options.html',
        background: 'src/background/index.ts',
      },
      output: {
        // background SW 必须保持固定路径，与 manifest.json 对应
        entryFileNames: (chunk) =>
          chunk.name === 'background' ? 'src/background/index.js' : 'assets/[name]-[hash].js',
      },
    },
  },
});
