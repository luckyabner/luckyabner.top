import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

import { rehypeCodeTools } from './src/plugins/rehype-code-tools.mjs';

// https://astro.build/config
export default defineConfig({
	site: 'https://luckyabner.top',
	// server: {
	// 	port: 3000,
	// 	host: true,
	// },
	integrations: [mdx(), sitemap()],

	markdown: {
		rehypePlugins: [[rehypeCodeTools, { collapseAfter: 24 }]],
		shikiConfig: {
			theme: 'dracula',
		},
	},

	image: {
		domains: ['unsplash.com', 'astro.build', 'blog-images.luckyabner.top'],
	},

	vite: {
		plugins: [tailwindcss()],
	},

	adapter: vercel(),
});
