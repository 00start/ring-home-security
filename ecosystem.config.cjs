/**
 * PM2 Ecosystem Configuration
 *
 * Manages all three processes:
 * 1. web - SvelteKit server (dashboard + API)
 * 2. ring-listener - Persistent Ring API connection
 * 3. transcode-worker - Video transcoding job processor
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 start ecosystem.config.cjs --only web
 *   pm2 logs
 *   pm2 monit
 */

module.exports = {
  apps: [
    {
      name: 'web',
      script: 'build/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'ring-listener',
      script: 'dist/workers/ring-listener.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      watch: false,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '300M',
      error_file: './logs/ring-listener-error.log',
      out_file: './logs/ring-listener-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'transcode-worker',
      script: 'dist/workers/transcode-worker.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        TRANSCODE_CONCURRENCY: '2'
      },
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/transcode-worker-error.log',
      out_file: './logs/transcode-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
