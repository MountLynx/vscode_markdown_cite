/**
 * Standalone markdown-it plugin for VS Code.
 * Loaded via markdown.markdownItPlugins contribution.
 * 
 * This is NOT bundled by esbuild — VS Code loads it directly.
 * Shares state with the extension via globalThis.__citationEngine.
 */
const CITATION_PATTERN = /\[-?@[A-Za-z][\w:.\-+]*(?:\s*;\s*-?@[A-Za-z][\w:.\-+]*)*[^\]]*\]|-?@[A-Za-z][\w:.\-+]*/g;

function extractCitekeys(text) {
  const keys = new Set();
  const pattern = new RegExp(CITATION_PATTERN.source, "g");
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const inner = match[0].startsWith("[") ? match[0].slice(1, -1) : match[0];
    for (const part of inner.split(";")) {
      const m = part.match(/@([A-Za-z][\w:.\-+]*)/);
      if (m) keys.add(m[1]);
    }
  }
  return [...keys];
}

function replaceMarkers(text, engine) {
  if (!engine || !engine.isReady) return text;
  const pattern = new RegExp(CITATION_PATTERN.source, "g");
  return text.replace(pattern, (match) => {
    const keys = extractCitekeys(match);
    const rendered = engine.renderCitation(keys);
    return rendered ?? match;
  });
}

function extendMarkdownIt(md) {
  console.log("[citation] extendMarkdownIt called (standalone)");

  md.core.ruler.after("inline", "citation-render", (state) => {
    const engine = globalThis.__citationEngine;
    if (!engine || !engine.isReady) return false;

    for (const token of state.tokens) {
      if (token.type === "inline" && token.children) {
        for (const child of token.children) {
          if (child.type === "text") {
            child.content = replaceMarkers(child.content, engine);
          }
        }
      }
    }
    return false;
  });
}

module.exports = { extendMarkdownIt };
