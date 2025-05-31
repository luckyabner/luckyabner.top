import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://example.com',
  integrations: [mdx(), sitemap()],

  markdown: {
      shikiConfig: {
          theme: 'dracula',
      },
	},

  image: {
      domains: ['unsplash.com', 'photos.luckyabner.top'],
	},

  vite: {
      plugins: [tailwindcss()],
	},

  adapter: vercel(),
});