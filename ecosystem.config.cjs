module.exports = {
	apps: [
		{
			name: 'web',
			script: 'build/index.js',
			instances: 1,
			autorestart: true,
			watch: false,
			max_memory_restart: '1G',
			env: {
				NODE_ENV: 'production',
				PORT: 3000
			}
		},
		{
			name: 'ring-listener',
			script: 'node',
			args: '--import tsx src/workers/ring-listener.ts',
			instances: 1,
			autorestart: true,
			watch: false,
			max_memory_restart: '512M',
			restart_delay: 5000,
			exp_backoff_restart_delay: 100,
			env: {
				NODE_ENV: 'production'
			}
		},
		{
			name: 'transcode-worker',
			script: 'node',
			args: '--import tsx src/workers/transcode-worker.ts',
			instances: 1,
			autorestart: true,
			watch: false,
			max_memory_restart: '1G',
			env: {
				NODE_ENV: 'production'
			}
		},
		{
			name: 'retention-worker',
			script: 'node',
			args: '--import tsx src/workers/retention-worker.ts',
			instances: 1,
			autorestart: true,
			watch: false,
			max_memory_restart: '256M',
			cron_restart: '0 3 * * *', // Restart daily at 3 AM
			env: {
				NODE_ENV: 'production'
			}
		}
	]
};
