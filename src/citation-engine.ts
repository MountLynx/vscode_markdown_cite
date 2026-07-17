/**
 * Citation engine wrapping citeproc-js.
 *
 * Ported from Markra feat/citation-system:
 * markra_plugin_try/packages/app/src/lib/citation-engine.ts
 */
import { Engine } from "citeproc";
import { loadCitationDatabase } from "./database-loader";
import type { CitationDatabaseRecord, CitationEntry, CSLItem } from "./types";

function formatAuthors(item: CSLItem): string {
  const author = item.author;
  if (!Array.isArray(author)) return "";
  return author
    .map((a: Record<string, unknown>) => [a.family, a.given].filter(Boolean).join(", "))
    .join("; ");
}

function extractJournal(item: CSLItem): string {
  return String(
    item["container-title"] ?? item.journalName ?? item.publicationTitle ?? ""
  ).trim();
}

function extractYear(dateValue: unknown): string {
  if (!dateValue) return "";
  if (typeof dateValue === "string") return dateValue;
  if (typeof dateValue === "number") return String(dateValue);
  if (typeof dateValue === "object") {
    const obj = dateValue as Record<string, unknown>;
    const dateParts = obj["date-parts"];
    if (Array.isArray(dateParts) && dateParts.length > 0) {
      const first = dateParts[0];
      if (Array.isArray(first) && first.length > 0) {
        return String(first[0]);
      }
    }
    if (typeof obj.literal === "string") return obj.literal;
  }
  return "";
}

export class CitationEngine {
  private items: Record<string, CSLItem> = {};
  private databases = new Map<string, CitationDatabaseRecord>();
  private engine: Engine | null = null;

  constructor(
    private readonly styleXml: string,
    private readonly localeXml: string,
    private readonly lang = "en-US"
  ) {}

  private rebuild(): void {
    const sys = {
      retrieveLocale: () => this.localeXml,
      retrieveItem: (id: string) => this.items[id],
    };
    try {
      this.engine = new Engine(sys, this.styleXml, this.lang, true);
      this.engine.opt.development_extensions.wrap_url_and_doi = true;
      this.engine.updateItems(Object.keys(this.items));
    } catch {
      this.engine = null;
    }
  }

  async loadDatabase(filePath: string, content: string): Promise<void> {
    const record = await loadCitationDatabase(filePath, content);
    this.databases.set(filePath, record);
    for (const [key, item] of Object.entries(record.cslData)) {
      this.items[key] = item;
    }
    this.rebuild();
  }

  unloadDatabase(filePath: string): void {
    const record = this.databases.get(filePath);
    if (!record) return;
    for (const key of Object.keys(record.cslData)) {
      delete this.items[key];
    }
    this.databases.delete(filePath);
    this.rebuild();
  }

  get isReady(): boolean {
    return this.engine !== null;
  }

  renderCitation(citekeys: string[]): string | undefined {
    if (!this.engine) return undefined;
    try {
      const result = this.engine.makeCitationCluster(citekeys.map((id) => ({ id })));
      // citeproc returns "[NO_PRINTED_FORM]" when the CSL style has no citation layout
      if (!result || result === "[NO_PRINTED_FORM]") return undefined;
      return result;
    } catch {
      return undefined;
    }
  }

  getCitationDetail(citekeys: string[]): string | undefined {
    if (!this.engine) return undefined;
    try {
      this.engine.updateItems(citekeys);
      const [, entries] = this.engine.makeBibliography();
      return entries
        .map((entry: string) => entry.replace(/<[^>]+>/g, "").trim())
        .join("\n");
    } catch {
      return undefined;
    }
  }

  getEntries(): CitationEntry[] {
    const entries: CitationEntry[] = [];
    for (const [dbPath, record] of this.databases) {
      for (const [key, item] of Object.entries(record.cslData)) {
        entries.push({
          key,
          title: String(item.title ?? ""),
          authors: formatAuthors(item),
          year: extractYear(item.issued ?? item.year),
          type: String(item.type ?? ""),
          journal: extractJournal(item),
          databasePath: dbPath,
        });
      }
    }
    return entries.sort((a, b) => a.key.localeCompare(b.key));
  }

  dispose(): void {
    this.engine = null;
    this.items = {};
    this.databases.clear();
  }
}
