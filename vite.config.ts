// @ts-nocheck
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import eslint from "vite-plugin-eslint";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import * as path from "path";
import electron from "vite-plugin-electron/simple";
//@ts-ignore
import pkg from "./package.json";
import { rmSync } from "node:fs";

// https://vitejs.dev/config/
export default ({ mode, command }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
  rmSync("dist-electron", { recursive: true, force: true });

  const isServe = command === "serve";
  const isBuild = command === "build";
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG;
  const isElectron = process.env.VITE_VAR_ELECTRON;

  return defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/tests/setup.js", // assuming the test folder is in the root of our project,
    },
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./node_modules"),
        "@": path.resolve(__dirname, "./src"),
        "@routes": path.resolve(__dirname, "./src/routes"),
        "@store": path.resolve(__dirname, "./src/store"),
        "@apiskybot": path.resolve(
          __dirname,
          "./src/core/api/handlers/skybot/"
        ),
        "@helpers": path.resolve(__dirname, "./src/helpers/"),
      },
    },
    define: {
      "process.env": process.env,
      APP_VERSION: JSON.stringify(process.env.npm_package_version),
    },
    plugins: [
      eslint({
        cache: false,
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["./vite.config.js"],
      }),
      react(),
      nodePolyfills(),
      isElectron &&
        electron({
          main: {
            // Shortcut of `build.lib.entry`
            entry: "electron/main/index.ts",
            onstart(args) {
              if (process.env.VSCODE_DEBUG) {
                console.log(
                  /* For `.vscode/.debug.script.mjs` */ "[startup] Electron App"
                );
              } else {
                args.startup();
              }
            },
            vite: {
              build: {
                sourcemap,
                minify: isBuild,
                outDir: "dist-electron/main",
                rollupOptions: {
                  external: Object.keys(
                    "dependencies" in pkg ? pkg.dependencies : {}
                  ),
                },
              },
            },
          },
          preload: {
            // Shortcut of `build.rollupOptions.input`.
            // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
            input: "electron/preload/index.ts",
            vite: {
              build: {
                sourcemap: sourcemap ? "inline" : undefined, // #332
                minify: isBuild,
                outDir: "dist-electron/preload",
                rollupOptions: {
                  external: Object.keys(
                    "dependencies" in pkg ? pkg.dependencies : {}
                  ),
                },
              },
            },
          },
          // Ployfill the Electron and Node.js API for Renderer process.
          // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
          // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
          renderer: {},
        }),
    ],
  });
};
