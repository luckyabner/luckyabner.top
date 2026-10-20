import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

import { rehypeCodeTools } from './src/plugins/rehype-code-tools.mjs';
import { rehypeNormalizeHeadings } from './src/plugins/rehype-normalize-headings.mjs';
import responsiveImages from './src/integrations/responsive-images.mjs';

// https://astro.build/config
export default defineConfig({
	site: 'https://luckyabner.top',
	integrations: [mdx(), sitemap(), responsiveImages()],

	markdown: {
		rehypePlugins: [
			rehypeNormalizeHeadings,
			[rehypeCodeTools, { collapseAfter: 24 }],
		],
		shikiConfig: {
			theme: 'vitesse-dark',
		},
	},

	image: {
		domains: ['blog-images.luckyabner.top'],
	},

	vite: {
		plugins: [tailwindcss()],
	},

	adapter: vercel(),
});
