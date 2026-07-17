import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { CitationEngine } from "./citation-engine";
import { CitationPanelProvider } from "./panel";
import { CitationDecorator } from "./decorations";
import { exportDocx } from "./pandoc-exporter";
import { extractCitekeys, CITATION_PATTERN } from "./citation-pattern";
import type { CitationSettings } from "./types";

let engine: CitationEngine | null = null;
let panelProvider: CitationPanelProvider | null = null;
let decorator: CitationDecorator | null = null;
let extensionContext: vscode.ExtensionContext | null = null;

function getSettings(): CitationSettings {
  const cfg = vscode.workspace.getConfiguration("citation");
  return {
    enabled: cfg.get<boolean>("enabled", true),
    bibliography: cfg.get<string>("bibliography", ""),
    cslPath: cfg.get<string>("cslPath", ""),
    pandocPath: cfg.get<string>("pandocPath", ""),
    referenceDocPath: cfg.get<string>("referenceDocPath", ""),
  };
}

function resolveCslPath(settings: CitationSettings, context: vscode.ExtensionContext): string {
  if (settings.cslPath && fs.existsSync(settings.cslPath)) {
    return settings.cslPath;
  }
  return vscode.Uri.joinPath(context.extensionUri, "assets", "chicago-author-date.csl").fsPath;
}

function resolveLocalePath(context: vscode.ExtensionContext): string {
  return vscode.Uri.joinPath(context.extensionUri, "assets", "locales-en-US.xml").fsPath;
}

async function loadEngine(
  settings: CitationSettings,
  context: vscode.ExtensionContext
): Promise<CitationEngine> {
  const stylePath = resolveCslPath(settings, context);
  const localePath = resolveLocalePath(context);
  const styleXml = fs.readFileSync(stylePath, "utf-8");
  const localeXml = fs.readFileSync(localePath, "utf-8");
  const eng = new CitationEngine(styleXml, localeXml, "en-US", context.globalStorageUri.fsPath);
  await eng.init();

  if (settings.bibliography && fs.existsSync(settings.bibliography)) {
    const content = fs.readFileSync(settings.bibliography, "utf-8");
    await eng.loadDatabase(settings.bibliography, content);
  }

  return eng;
}

async function refreshEngine(context: vscode.ExtensionContext): Promise<void> {
  const settings = getSettings();
  if (!settings.enabled) return;

  engine?.dispose();
  engine = await loadEngine(settings, context);
}

async function pushPanelState(): Promise<void> {
  if (!panelProvider || !engine) return;

  const editor = vscode.window.activeTextEditor;
  let documentCitekeys: string[] = [];
  if (editor && editor.document.languageId === "markdown") {
    documentCitekeys = extractCitekeys(editor.document.getText());
  }

  panelProvider.setEntries(engine.getEntries(), documentCitekeys);
}

async function onInsertCitation(citekey: string, locator: string): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const insertion = locator
    ? `[@${citekey}, ${locator}]`
    : `[@${citekey}]`;

  await editor.edit((eb) => {
    eb.insert(editor.selection.active, insertion);
  });

  await pushPanelState();
  decorator?.updateDecorations(vscode.window.activeTextEditor);
}

async function onExportDocx(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No document open for export.");
    panelProvider?.exportDone(false);
    return;
  }

  const settings = getSettings();
  const documentPath = editor.document.uri.fsPath;
  const defaultName =
    path.basename(documentPath, path.extname(documentPath)) + ".docx";

  const saveUri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.joinPath(
      vscode.Uri.file(path.dirname(documentPath)),
      defaultName
    ),
    filters: { DOCX: ["docx"] },
  });

  if (!saveUri) {
    panelProvider?.exportDone(false);
    return;
  }

  try {
    const cslPath = resolveCslPath(settings, extensionContext!);

    await exportDocx({
      inputPath: documentPath,
      outputPath: saveUri.fsPath,
      bibliographyPath: settings.bibliography || undefined,
      cslPath,
      referenceDocPath: settings.referenceDocPath || undefined,
      resourcePath: path.dirname(documentPath),
      extraArgs: "",
      pandocPath: settings.pandocPath,
    });

    vscode.window.showInformationMessage("DOCX exported: " + saveUri.fsPath);
    panelProvider?.exportDone(true);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage("Pandoc export failed: " + message);
    panelProvider?.exportDone(false);
  }
}

/** markdown-it plugin: replaces Pandoc citation markers with formatted text. */
function citationPlugin(md: any) {
  md.core.ruler.after("inline", "citation-render", (state: any) => {
    if (!engine || !engine.isReady) return false;
    const pattern = new RegExp(CITATION_PATTERN.source, "g");

    for (const token of state.tokens) {
      if (token.type === "inline" && token.children) {
        for (const child of token.children) {
          if (child.type === "text") {
            child.content = child.content.replace(pattern, (match: string) => {
              const keys = extractCitekeys(match);
              const rendered = engine!.renderCitation(keys);
              return rendered ?? match;
            });
          }
        }
      }
    }
    return false;
  });
}

export function activate(context: vscode.ExtensionContext) {
  console.log("citation: activating");
  extensionContext = context;

  panelProvider = new CitationPanelProvider(
    context.extensionUri,
    onInsertCitation,
    onExportDocx
  );

  const panelRegistration = vscode.window.registerWebviewViewProvider(
    "citation.panel",
    panelProvider,
    { webviewOptions: { retainContextWhenHidden: true } }
  );
  context.subscriptions.push(panelRegistration);

  context.subscriptions.push(
    vscode.commands.registerCommand("citation.openPanel", async () => {
      await refreshEngine(context);
      await pushPanelState();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("citation.exportDocx", onExportDocx)
  );

  refreshEngine(context).then(async () => {
    decorator = new CitationDecorator(engine!);
    context.subscriptions.push(decorator.installHoverProvider());

    // Refresh preview now that engine is ready
    try {
      await vscode.commands.executeCommand("markdown.preview.refresh");
      console.log("[citation] preview refreshed after engine load");
    } catch (e) {
      console.warn("[citation] preview refresh failed:", (e as Error).message);
    }

    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(async (editor) => {
        if (editor && editor.document.languageId === "markdown") {
          decorator?.updateDecorations(editor);
          await pushPanelState();
        }
      })
    );

    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(async (event) => {
        const editor = vscode.window.activeTextEditor;
        if (
          editor &&
          event.document === editor.document &&
          editor.document.languageId === "markdown"
        ) {
          decorator?.updateDecorations(editor);
        }
      })
    );

    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(async (event) => {
        if (event.affectsConfiguration("citation")) {
          await refreshEngine(context);
          decorator = engine ? new CitationDecorator(engine) : null;
          decorator?.installHoverProvider();
          await pushPanelState();
        }
      })
    );

    if (
      vscode.window.activeTextEditor?.document.languageId === "markdown"
    ) {
      decorator?.updateDecorations(vscode.window.activeTextEditor);
    }

    pushPanelState();
  });

  context.subscriptions.push({
    dispose: () => {
      decorator?.dispose();
      engine?.dispose();
    },
  });

  console.log("citation: activated");

  return {
    extendMarkdownIt(md: any) {
      return md.use(citationPlugin);
    },
  };
}

export function deactivate() {
  engine?.dispose();
  engine = null;
  decorator?.dispose();
  decorator = null;
}
