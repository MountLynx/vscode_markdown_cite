/**
 * markdown-it plugin for VS Code's built-in Markdown preview.
 * Replaces Pandoc citation markers with citeproc-rendered text.
 *
 * Registered via "markdown.markdownItPlugins": true in package.json.
 * The extendMarkdownIt function is re-exported from extension.ts.
 */
import type { CitationEngine } from "./citation-engine";
import { CITATION_PATTERN, extractCitekeys } from "./citation-pattern";

// Module-level engine reference, set by extension.ts on activation
let citationEngine: CitationEngine | null = null;

export function setCitationEngineForPreview(engine: CitationEngine | null): void {
  citationEngine = engine;
}

function replaceMarkers(text: string): string {
  if (!citationEngine || !citationEngine.isReady) return text;
  const pattern = new RegExp(CITATION_PATTERN.source, "g");
  return text.replace(pattern, (match: string) => {
    const keys = extractCitekeys(match);
    const rendered = citationEngine!.renderCitation(keys);
    return rendered ?? match;
  });
}

/**
 * The function VS Code calls to extend the built-in markdown-it instance.
 * Re-exported from extension.ts.
 *
 * Uses the core ruler to walk all tokens and replace citation markers
 * in inline text content after full parsing is complete.
 */
export function extendMarkdownIt(md: any): void {
  console.log("[citation] extendMarkdownIt called, engine ready:", citationEngine?.isReady ?? false);

  md.core.ruler.after("inline", "citation-render", (state: any) => {
    if (!citationEngine || !citationEngine.isReady) return false;

    for (const token of state.tokens) {
      if (token.type === "inline" && token.children) {
        for (const child of token.children) {
          if (child.type === "text") {
            child.content = replaceMarkers(child.content);
          }
        }
      }
    }
    return false;
  });
}
