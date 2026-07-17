const esbuild = require("esbuild");
const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const config = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  target: "node18",
  outdir: "dist",
  sourcemap: !production,
  minify: production,
};

async function main() {
  if (watch) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
    console.log("[watch] build started");
  } else {
    await esbuild.build(config);
    console.log("[build] complete");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
