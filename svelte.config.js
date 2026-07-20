import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const adapter = process.env.VERCEL
	? (await import('@sveltejs/adapter-vercel')).default()
	: (await import('@sveltejs/adapter-node')).default({
			out: 'build',
			precompress: false
		});

const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter
	}
};

export default config;
