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

/**
 * The function VS Code calls to extend the built-in markdown-it instance.
 * Re-exported from extension.ts.
 */
export function extendMarkdownIt(md: any): void {
  const defaultRender =
    md.renderer.rules.text ||
    function (tokens: any[], idx: number) {
      return md.utils.escapeHtml(tokens[idx].content);
    };

  md.renderer.rules.text = function (
    tokens: any[],
    idx: number,
    options: any,
    env: any,
    self: any
  ) {
    const content = tokens[idx].content;
    if (!citationEngine || !citationEngine.isReady) {
      return defaultRender(tokens, idx, options, env, self);
    }

    // Replace citation markers inline
    const pattern = new RegExp(CITATION_PATTERN.source, "g");
    const result = content.replace(pattern, (match: string) => {
      const keys = extractCitekeys(match);
      const rendered = citationEngine!.renderCitation(keys);
      return rendered ?? match;
    });

    tokens[idx].content = result;
    return defaultRender(tokens, idx, options, env, self);
  };
}
