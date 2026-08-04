
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react-swc';
  import path from 'path';

  export default defineConfig({
    plugins: [react()],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        'figma:asset/75d88e6ebbed3c5d3883e171899d73a54d97489c.png': path.resolve(__dirname, './src/assets/75d88e6ebbed3c5d3883e171899d73a54d97489c.png'),
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, './packages/shared'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
    },
    server: {
      port: 3000,
      open: true,
    },
  });