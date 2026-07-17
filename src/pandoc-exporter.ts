/**
 * Pandoc DOCX export via child_process.
 *
 * Adapted from Markra feat/citation-system:
 * markra_plugin_try/apps/desktop/src-tauri/src/markdown_files/export.rs
 */
import * as cp from "child_process";
import * as path from "path";
import * as fs from "fs";

export type PandocExportOptions = {
  inputPath: string;
  outputPath: string;
  bibliographyPath?: string;
  cslPath?: string;
  referenceDocPath?: string;
  resourcePath: string;
  extraArgs: string;
  pandocPath?: string;
};

/** Build the pandoc CLI argument array. Public for testing. */
export function buildPandocArgs(options: PandocExportOptions): string[] {
  const args: string[] = [];

  args.push("--from", "markdown+tex_math_dollars");
  args.push("--to", "docx");

  args.push("--citeproc");
  args.push("--metadata=link-citations:true");

  if (options.bibliographyPath) {
    args.push(`--bibliography=${options.bibliographyPath}`);
  }
  if (options.cslPath) {
    args.push(`--csl=${options.cslPath}`);
  }
  if (options.referenceDocPath) {
    args.push(`--reference-doc=${options.referenceDocPath}`);
  }

  args.push(`--resource-path=${options.resourcePath}`);

  // Parse extra user args
  if (options.extraArgs.trim()) {
    args.push(...parseExtraArgs(options.extraArgs));
  }

  args.push("--output", options.outputPath);
  args.push(options.inputPath);

  return args;
}

function parseExtraArgs(raw: string): string[] {
  const result: string[] = [];
  let current = "";
  let quote: string | null = null;

  for (const ch of raw) {
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === " " || ch === "\t") {
      if (current) {
        result.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }
  if (current) result.push(current);
  return result;
}

function resolvePandocPath(settingPath: string): string {
  if (settingPath && fs.existsSync(settingPath)) {
    return settingPath;
  }
  // Auto-detect from PATH
  const isWin = process.platform === "win32";
  const executable = isWin ? "pandoc.exe" : "pandoc";
  const pathEnv = process.env.PATH ?? "";
  for (const dir of pathEnv.split(path.delimiter)) {
    const candidate = path.join(dir, executable);
    if (fs.existsSync(candidate)) return candidate;
  }
  // Windows: check ProgramFiles
  if (isWin) {
    for (const base of [
      process.env.ProgramFiles,
      process.env["ProgramFiles(x86)"],
    ]) {
      if (base) {
        const candidate = path.join(base, "Pandoc", "pandoc.exe");
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  }
  return "pandoc"; // fallback, let spawn fail with clear error
}

export async function exportDocx(options: PandocExportOptions): Promise<void> {
  const inputDir = path.dirname(options.inputPath);
  const pandocPath = resolvePandocPath(options.pandocPath ?? "");
  const args = buildPandocArgs(options);

  return new Promise((resolve, reject) => {
    const proc = cp.spawn(pandocPath, args, {
      cwd: inputDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        reject(
          new Error(
            "Pandoc not found. Install Pandoc or set citation.pandocPath in settings."
          )
        );
      } else {
        reject(err);
      }
    });

    proc.on("close", (code: number | null) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr.trim() || `Pandoc exited with code ${code}`));
      }
    });
  });
}
