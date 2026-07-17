/**
 * Citation database loader.
 *
 * Ported from Markra feat/citation-system:
 * markra_plugin_try/packages/editor/src/citation-database.ts
 */
import { BibLatexParser, CSLExporter } from "biblatex-csl-converter";
import { parse as parseBibTex } from "astrocite-bibtex";
import yaml from "js-yaml";
import type { CitationDatabaseRecord, CSLItem } from "./types";

function extOf(filePath: string): string {
  const dot = filePath.lastIndexOf(".");
  return dot === -1 ? "" : filePath.slice(dot).toLowerCase();
}

function emptyRecord(
  path: string,
  type: CitationDatabaseRecord["type"]
): CitationDatabaseRecord {
  return { path, type, cslData: {} };
}

function loadJSON(path: string, content: string): CitationDatabaseRecord {
  const record = emptyRecord(path, "csl");
  const parsed: unknown = JSON.parse(content);
  if (!Array.isArray(parsed)) {
    throw new Error("CSL JSON database must be an array of items");
  }
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.id !== "string" || typeof candidate.type !== "string") continue;
    record.cslData[candidate.id] = candidate as CSLItem;
  }
  return record;
}

function loadYAML(path: string, content: string): CitationDatabaseRecord {
  const record = emptyRecord(path, "csl");
  const parsed: unknown = yaml.load(content);
  const items = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).references)
      ? (parsed as Record<string, unknown[]>).references
      : null;
  if (!items) {
    throw new Error("CSL YAML database must be an array or contain a references array");
  }
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.id !== "string") continue;
    record.cslData[candidate.id] = candidate as CSLItem;
  }
  return record;
}

async function loadBibLaTeX(
  path: string,
  content: string
): Promise<CitationDatabaseRecord> {
  const record = emptyRecord(path, "biblatex");
  const parser = new BibLatexParser(content, {
    processUnexpected: true,
    processUnknown: true,
  });
  const bib = await parser.parseAsync();
  const exporter = new CSLExporter(bib.entries, false);
  const cslOutput = exporter.parse() as Record<string, CSLItem>;

  // biblatex-csl-converter v2 indexes entries by number, not citekey.
  // Remap numeric keys to actual citekeys from entry_key.
  for (const [numericKey, item] of Object.entries(cslOutput)) {
    const bibEntry = bib.entries[Number(numericKey)];
    const citekey: string = bibEntry?.entry_key ?? String(item.id ?? numericKey);
    record.cslData[citekey] = item;
    item.id = citekey;
  }
  return record;
}

function loadBibTeX(path: string, content: string): CitationDatabaseRecord {
  const record = emptyRecord(path, "bibtex");
  for (const item of parseBibTex(content)) {
    if (typeof item.id === "string") record.cslData[item.id] = item as unknown as CSLItem;
  }
  return record;
}

export async function loadCitationDatabase(
  filePath: string,
  content: string
): Promise<CitationDatabaseRecord> {
  switch (extOf(filePath)) {
    case ".json":
      return loadJSON(filePath, content);
    case ".yaml":
    case ".yml":
      return loadYAML(filePath, content);
    case ".bib":
      try {
        return await loadBibLaTeX(filePath, content);
      } catch {
        return loadBibTeX(filePath, content);
      }
    default:
      throw new Error(`Could not load database "${filePath}": Unknown extension`);
  }
}
