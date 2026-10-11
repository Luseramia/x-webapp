// Publish the same tested calculation/provider code into the separately deployed API repository.
import ts from "typescript";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backend = resolve(root, process.argv[2] || "../../bun-sso");
if (JSON.parse(readFileSync(resolve(backend, "package.json"), "utf8")).name !== "bun-sso") {
  throw new Error("Target must be the bun-sso backend repository");
}
const destination = resolve(backend, "services/quant/core");
mkdirSync(destination, { recursive: true });
const files = ["quant-analysis.ts", "twelve-data.ts"].map((file) => resolve(root, "src/services", file));
const program = ts.createProgram(files, {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler, declaration: true,
  rewriteRelativeImportExtensions: true, strict: true, skipLibCheck: true,
  outDir: destination, noEmitOnError: true,
});
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: (file) => file, getCurrentDirectory: () => root, getNewLine: () => "\n",
}));
program.emit(undefined, (file, content) => {
  writeFileSync(file, `// Generated from x-webapp/src/services/${basename(file).replace(/\.d\.ts$|\.js$/, ".ts")} by npm run sync:quant-backend.\n// Edit the source and regenerate; do not edit this deployment artifact.\n${content}`);
});
console.log("Published quant calculation engine and provider to " + destination);
