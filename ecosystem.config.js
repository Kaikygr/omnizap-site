module.exports = {
  apps: [
    {
      name: "omnizap-site",
      script: "./server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      log_file: "./logs/combined.log",
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      watch: false,
      ignore_watch: ["node_modules", "logs", "database"],
      max_memory_restart: "500M",

      instance_var: "INSTANCE_ID",

      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",

      merge_logs: true,

      kill_timeout: 5000,

      listen_timeout: 8000,

      env_vars: "NODE_APP_INSTANCE",
    },
  ],

  deploy: {
    production: {
      user: "node",
      host: "localhost",
      ref: "origin/main",
      repo: "git@github.com:Kaikygr/omnizap.git",
      path: "/var/www/omnizap-site",
      "pre-deploy-local": "",
      "post-deploy":
        "npm install && pm2 reload ecosystem.config.js --env production",
      "pre-setup": "",
    },
  },
};
