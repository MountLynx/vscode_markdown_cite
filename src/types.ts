/** A single CSL item as returned from database parsing. */
export type CSLItem = {
  id: string;
  type: string;
  [key: string]: unknown;
};

/** One citation key with optional locator/prefix/suffix modifiers. */
export type CiteItem = {
  id: string;
  locator?: string;
  label?: string;
  "suppress-author"?: boolean;
  "author-only"?: boolean;
  prefix?: string;
  suffix?: string;
};

/** Describes a loaded citation database. */
export type CitationDatabaseRecord = {
  path: string;
  type: "csl" | "bibtex" | "biblatex";
  cslData: Record<string, CSLItem>;
};

/** Flattened entry for sidebar display. */
export type CitationEntry = {
  key: string;
  title: string;
  authors: string;
  year: string;
  type: string;
  journal?: string;
  databasePath: string;
};

/** VS Code extension settings shape. */
export type CitationSettings = {
  enabled: boolean;
  bibliography: string;
  cslPath: string;
  pandocPath: string;
  referenceDocPath: string;
};
