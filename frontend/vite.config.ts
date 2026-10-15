import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const apiUrl = (env.VITE_API_URL || 'https://sender.q4iltd.com').replace(/\/+$/, '');

	return {
		plugins: [react()],
		resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
		server: {
			port: 5174,
			proxy: {
				'/q4-api': {
					target: apiUrl,
					changeOrigin: true,
					rewrite: (requestPath) => requestPath.replace(/^\/q4-api/, ''),
				},
			},
		},
	};
});
