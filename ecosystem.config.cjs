module.exports = {
  apps: [
    {
      name: "emulator-radar",
      script: "dist/index.js",
      cwd: "/var/www/emulator-update",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        PORT: 3030
      }
    }
  ]
};
