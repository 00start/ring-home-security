import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['tests/unit/**/*.test.ts'],
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/tests/e2e/**',
			'**/tests/setup/**',
			'**/*.spec.ts'
		],
		globals: true
	}
});
