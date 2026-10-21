import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

import { rehypeCodeTools } from './src/plugins/rehype-code-tools.mjs';
import { rehypeNormalizeHeadings } from './src/plugins/rehype-normalize-headings.mjs';
import responsiveImages from './src/integrations/responsive-images.mjs';
import photoLocator from './src/integrations/photo-locator.mjs';

// https://astro.build/config
export default defineConfig({
	site: 'https://luckyabner.top',
	integrations: [mdx(), sitemap(), responsiveImages(), photoLocator()],

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
		// PhotoSwipe is already ESM; avoid stale dev pre-bundle URLs on first click.
		optimizeDeps: { exclude: ['photoswipe'] },
		server: {
			watch: {
				// The development-only photo locator rewrites these two files on every
				// save. Watching them invalidates an SSR-only module, which makes Astro
				// send a full page reload and throw away the editor state mid-edit.
				ignored: ['**/src/data/photos.json', '**/src/data/photos.meta.json'],
			},
		},
	},

	adapter: vercel(),
});
