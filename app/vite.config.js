import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'prompt',
			manifest: {
				name: 'Hjernespil',
				short_name: 'Hjernespil',
				description: 'Træn din hjerne med sjove udfordringer',
				theme_color: '#0f0f23',
				background_color: '#0f0f23',
				display: 'standalone',
				scope: '/Puzzles/',
				start_url: '/Puzzles/',
				icons: [
					{
						src: '/Puzzles/icons/icon-192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/Puzzles/icons/icon-512.png',
						sizes: '512x512',
						type: 'image/png'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
			}
		})
	]
});
