module.exports = {
  apps: [
    {
      name: 'taste-of-gratitude-prod',
      script: 'yarn start',
      cwd: '/var/www/tasteofgratitude',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NODE_OPTIONS: '--max-old-space-size=1024'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      max_restarts: 5,
      min_uptime: '10s',
      kill_timeout: 5000,
      restart_delay: 4000
    }
  ],
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/taste-of-gratitude.git',
      path: '/var/www/tasteofgratitude',
      'post-deploy': 'yarn install --production && yarn build && pm2 reload ecosystem.config.js --env production'
    }
  }
};