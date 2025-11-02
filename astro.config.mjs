import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
	site: 'https://luckyabner.top',
	// server: {
	// 	port: 3000,
	// 	host: true,
	// },
	integrations: [mdx(), sitemap()],

	markdown: {
		shikiConfig: {
			theme: 'dracula',
		},
	},

	image: {
		domains: ['unsplash.com', 'photos.luckyabner.top', 'astro.build', 'blog-images.luckyabner.top'],
	},

	vite: {
		plugins: [tailwindcss()],
	},

	adapter: vercel(),
});
