// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "quantum-cloud",
      script: "index.js",
      cwd: "/var/www/quantum-cloud/backend", // path to hrms app folder
      watch: true,
      ignore_watch: ["node_modules", "logs"],
      watch_options: {
        followSymlinks: false,
      },
      autorestart: true,
    },
    {
      name: "quantum-cloud-staging",
      script: "index.js",
      cwd: "/var/www/quantum-cloud-staging/backend", // path to the folder containing the web app
      watch: true,
      ignore_watch: ["node_modules", "logs"],
      watch_options: {
        followSymlinks: false,
      },
      autorestart: true,
    },
  ],
};
