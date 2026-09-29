const path = require("path");
const esbuild = require("esbuild");
const fs = require("fs");

// Function to retrieve mode from command-line arguments
const getMode = () => {
  const modeArg = process.argv.find((arg) => arg.startsWith("--mode=")); // Find --mode=<value>
  return modeArg ? modeArg.split("=")[1] : "local"; // Default to 'local' if no argument is provided
};

const mode = getMode(); // Retrieve mode (e.g., "staging", "release", "check", or "local")

// Set output directory and esbuild mode based on the mode argument
const outputDir =
  mode === "staging" ? "debug" : mode === "release" ? "release" : "local";

const esbuildMode = mode === "release" ? "production" : "development";

// Determine the correct .env file based on the mode
const envFileName =
  mode === "release"
    ? ".env.production"
    : mode === "staging"
    ? ".env.staging"
    : ".env";
const sourceEnv = path.resolve(__dirname, envFileName); // Resolve the correct .env file
const destinationEnv = path.resolve(__dirname, "build", outputDir, ".env"); // Destination path for .env file

// Start the esbuild process
const startTime = Date.now();

// Set the write flag based on mode
const writeToDisk = mode !== "check"; // If mode is "check", we don't write the output

esbuild
  .build({
    entryPoints: [path.resolve(__dirname, "src/index.ts")], // Entry file
    outfile: path.resolve(__dirname, "build", outputDir, "index.js"), // Output file path
    bundle: true, // Bundle the files
    target: "node14", // Target Node.js 14 for compatibility
    platform: "node", // Set platform to Node.js
    sourcemap: false, // Disable sourcemap (can enable based on need)
    minify: esbuildMode === "production", // Minify in production mode
    resolveExtensions: [".ts", ".tsx", ".js", ".json"], // Resolve TS, JS, and JSON extensions
    loader: {
      ".ts": "ts", // Use esbuild's TypeScript loader for .ts files
      ".tsx": "tsx", // Use esbuild's TypeScript (with JSX) loader for .tsx files
    },
    external: [
      "kerberos",
      "@mongodb-js/zstd",
      "@aws-sdk/credential-providers",
      "gcp-metadata",
      "snappy",
      "socks",
      "aws4",
      "mongodb-client-encryption",
    ], // Ignore these modules (like in Webpack's IgnorePlugin)
    logLevel: "info", // Log level to control verbosity
    write: writeToDisk, // Only write files if the mode is not 'check'
  })
  .then(() => {
    // If mode is not "check", copy the correct .env file to the build folder
    if (writeToDisk) {
      if (fs.existsSync(sourceEnv)) {
        fs.copyFileSync(sourceEnv, destinationEnv);
        console.log(
          `.env file (${envFileName}) has been copied to the build folder.`
        );
      } else {
        console.warn(`No ${envFileName} file found to copy.`);
      }
    }

    // Calculate and log the build time
    const endTime = Date.now();
    const buildTime = ((endTime - startTime) / 1000).toFixed(2); // in seconds
    console.log(`Build completed in ${buildTime} seconds.`);
  })
  .catch((error) => {
    console.error("Build failed with errors:", error);
    process.exit(1);
  });
