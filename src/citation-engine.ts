/**
 * Citation engine wrapping citeproc-js.
 *
 * Ported from Markra feat/citation-system:
 * markra_plugin_try/packages/app/src/lib/citation-engine.ts
 */
import { Engine } from "citeproc";
import * as fs from "fs";
import * as path from "path";
import { loadCitationDatabase } from "./database-loader";
import type { CitationDatabaseRecord, CitationEntry, CSLItem } from "./types";

/** In-memory cache for dependent CSL parent styles. */
const memCache = new Map<string, string>();

/**
 * Resolve a dependent CSL style by fetching its independent parent.
 * Returns the parent style XML, or the original if not dependent.
 * Caches downloaded styles to disk under cacheDir.
 */
async function resolveDependentStyle(xml: string, cacheDir?: string): Promise<string> {
  const parentMatch = xml.match(/rel="independent-parent"[^>]*href="([^"]+)"|href="([^"]+)"[^>]*rel="independent-parent"/);
  if (!parentMatch) return xml;

  const parentUrl = parentMatch[1] || parentMatch[2];

  // Check memory cache first
  if (memCache.has(parentUrl)) return memCache.get(parentUrl)!;

  const nameMatch = parentUrl.match(/\/([^\/]+?)(?:\.csl)?$/);
  if (!nameMatch) return xml;
  const styleName = nameMatch[1];

  // Check disk cache
  if (cacheDir) {
    const cachePath = path.join(cacheDir, styleName + ".csl");
    try {
      if (fs.existsSync(cachePath)) {
        const cached = fs.readFileSync(cachePath, "utf-8");
        if (cached.includes("<style") && cached.includes("</style>")) {
          memCache.set(parentUrl, cached);
          console.log("[citation] loaded cached style:", styleName);
          return cached;
        }
      }
    } catch { /* disk cache miss */ }
  }

  // Fetch from GitHub
  const rawUrl = `https://raw.githubusercontent.com/citation-style-language/styles/master/${styleName}.csl`;
  try {
    const content = await httpGet(rawUrl);
    if (content && content.includes("<style") && content.includes("</style>")) {
      memCache.set(parentUrl, content);

      // Save to disk cache
      if (cacheDir) {
        try {
          if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
          fs.writeFileSync(path.join(cacheDir, styleName + ".csl"), content, "utf-8");
        } catch { /* disk write failed, non-critical */ }
      }

      console.log("[citation] downloaded dependent style:", styleName);
      return content;
    }
  } catch (e) {
    console.warn("[citation] failed to fetch parent style:", styleName, (e as Error).message);
  }
  return xml;
}

async function httpGet(url: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(5000),
    headers: { "User-Agent": "pandoc-cite" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

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

/** Extract a year string from a CSL date value (object or literal). */
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
  private resolvedXml: string;

  constructor(
    private readonly styleXml: string,
    private readonly localeXml: string,
    private readonly lang = "en-US",
    private readonly cacheDir?: string
  ) {
    this.resolvedXml = styleXml;
  }

  /** Must be called after constructor to resolve dependent styles. */
  async init(): Promise<void> {
    this.resolvedXml = await resolveDependentStyle(this.styleXml, this.cacheDir);
    this.rebuild();
  }

  private rebuild(): void {
    const sys = {
      retrieveLocale: () => this.localeXml,
      retrieveItem: (id: string) => this.items[id],
    };
    try {
      this.engine = new Engine(sys, this.resolvedXml, this.lang, true);
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
