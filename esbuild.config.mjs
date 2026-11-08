import esbuild from "esbuild";
import builtins from "builtin-modules";
const production = process.argv[2] === "production";
const context = await esbuild.context({banner:{js:"/* Visual Timeline: local Markdown-first historical visualization. */"},entryPoints:["src/main.ts"],bundle:true,external:["obsidian","electron","@codemirror/*","@lezer/*",...builtins],format:"cjs",target:"es2018",logLevel:"info",sourcemap:production?false:"inline",outfile:"main.js"});
if(production){await context.rebuild();await context.dispose();}else await context.watch();
