module.exports = {
  apps: [
    {
      name: "dna-monster-api",
      script: "src/server.js",
      cwd: ".",
      // Keep a single instance while workouts/library still use in-memory store.
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      listen_timeout: 10000,
      kill_timeout: 10000,
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
