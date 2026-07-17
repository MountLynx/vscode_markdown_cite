import * as vscode from "vscode";
import { CITATION_PATTERN, extractCitekeys } from "./citation-pattern";
import type { CitationEngine } from "./citation-engine";

const citationDecoration = vscode.window.createTextEditorDecorationType({
  borderBottom: "1.5px dashed",
  borderColor: new vscode.ThemeColor("textLink.foreground"),
  color: new vscode.ThemeColor("textLink.foreground"),
} as vscode.DecorationRenderOptions);

export class CitationDecorator {
  private engine: CitationEngine;
  private hoverProvider: vscode.Disposable | null = null;

  constructor(engine: CitationEngine) {
    this.engine = engine;
  }

  /** Update decorations for the active editor. */
  updateDecorations(editor: vscode.TextEditor | undefined): void {
    if (!editor) return;

    const text = editor.document.getText();
    const decorations: vscode.DecorationOptions[] = [];
    const pattern = new RegExp(CITATION_PATTERN.source, "g");
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const startPos = editor.document.positionAt(match.index);
      const endPos = editor.document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(startPos, endPos);
      decorations.push({ range });
    }

    editor.setDecorations(citationDecoration, decorations);
  }

  /** Install hover provider for citation markers. */
  installHoverProvider(): vscode.Disposable {
    this.hoverProvider = vscode.languages.registerHoverProvider(
      { scheme: "file", language: "markdown" },
      {
        provideHover: (document, position) => {
          if (!this.engine.isReady) return null;

          const line = document.lineAt(position.line);
          const lineText = line.text;
          const pattern = new RegExp(CITATION_PATTERN.source, "g");
          let match: RegExpExecArray | null;

          while ((match = pattern.exec(lineText)) !== null) {
            const start = match.index;
            const end = match.index + match[0].length;
            if (position.character >= start && position.character <= end) {
              const keys = extractCitekeys(match[0]);
              const detail = this.engine.getCitationDetail(keys);
              if (detail) {
                return new vscode.Hover(
                  new vscode.MarkdownString("```\n" + detail + "\n```")
                );
              }
            }
          }
          return null;
        },
      }
    );
    return this.hoverProvider;
  }

  dispose(): void {
    this.hoverProvider?.dispose();
    citationDecoration.dispose();
  }
}
