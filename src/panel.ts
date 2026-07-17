import * as vscode from "vscode";
import * as fs from "fs";
import type { CitationEntry } from "./types";

export class CitationPanelProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private pendingEntries: CitationEntry[] = [];
  private pendingCitekeys: string[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly onInsert: (citekey: string, locator: string) => void,
    private readonly onExport: () => void
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, "src", "webview"),
      ],
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((msg) => {
      switch (msg.command) {
        case "ready":
          // Push any pending entries when WebView signals ready
          this.push();
          break;
        case "insert":
          this.onInsert(msg.citekey, msg.locator);
          break;
        case "export-docx":
          this.onExport();
          break;
      }
    });
  }

  setEntries(entries: CitationEntry[], documentCitekeys: string[]): void {
    this.pendingEntries = entries;
    this.pendingCitekeys = documentCitekeys;
    this.push();
  }

  exportDone(success: boolean): void {
    this._view?.webview.postMessage({
      command: success ? "exportDone" : "exportError",
    });
  }

  private push(): void {
    this._view?.webview.postMessage({
      command: "setEntries",
      entries: this.pendingEntries,
      documentCitekeys: this.pendingCitekeys,
    });
  }

  private getHtml(webview: vscode.Webview): string {
    const htmlPath = vscode.Uri.joinPath(this.extensionUri, "src", "webview", "panel.html");
    const cssPath = vscode.Uri.joinPath(this.extensionUri, "src", "webview", "panel.css");
    const jsPath = vscode.Uri.joinPath(this.extensionUri, "src", "webview", "panel.js");

    const cssUri = webview.asWebviewUri(cssPath);
    const jsUri = webview.asWebviewUri(jsPath);

    let html = fs.readFileSync(htmlPath.fsPath, "utf-8");
    html = html.replace("panel.css", cssUri.toString());
    html = html.replace("panel.js", jsUri.toString());

    return html;
  }
}
