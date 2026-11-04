module.exports = {
  apps: [
    {
      name: "eventcorp",
      script: "./node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 0.0.0.0",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        HOSTNAME: "0.0.0.0",
      },
    },
  ],
};
