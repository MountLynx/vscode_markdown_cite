declare module "citeproc" {
  type BibliographyOptions = {
    maxoffset: number;
    entryspacing: number;
    linespacing: number;
    hangingindent: boolean;
    "second-field-align": "flush" | "margin" | false;
    bibstart: string;
    bibend: string;
  };

  type CSLKernelSys = {
    retrieveLocale: (lang: string) => string | false;
    retrieveItem: (id: string) => unknown;
  };

  export class Engine {
    constructor(sys: CSLKernelSys, style: string, lang: string, forceLang?: boolean);
    opt: { development_extensions: { wrap_url_and_doi: boolean } };
    updateItems(ids: string[]): void;
    updateUncitedItems(ids: string[]): void;
    makeCitationCluster(citations: { id: string }[]): string;
    makeBibliography(filter?: unknown): [BibliographyOptions, string[]];
    previewCitationCluster(citations: { id: string }[], ...rest: unknown[]): string;
  }
}
