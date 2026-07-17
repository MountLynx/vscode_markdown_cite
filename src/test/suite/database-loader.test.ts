import { describe, expect, it, vi } from "vitest";

vi.mock("biblatex-csl-converter", () => {
  class MockBibLatexParser {
    parseAsync = vi.fn().mockResolvedValue({
      entries: { smith2024: { unexpected_fields: {}, id: "smith2024" } },
      errors: [],
    });
  }
  class MockCSLExporter {
    parse = () => ({ smith2024: { id: "smith2024", type: "article", title: "A Study" } });
  }
  return { BibLatexParser: MockBibLatexParser, CSLExporter: MockCSLExporter };
});

vi.mock("astrocite-bibtex", () => ({
  parse: vi.fn(() => [{ id: "doe99", type: "book", title: "Book" }]),
}));

import { loadCitationDatabase } from "../../database-loader";

describe("loadCitationDatabase", () => {
  it("parses CSL JSON files", async () => {
    const record = await loadCitationDatabase(
      "lib.json",
      JSON.stringify([{ id: "smith2024", type: "article", title: "A Study" }])
    );
    expect(record.type).toBe("csl");
    expect(record.cslData["smith2024"]).toEqual({
      id: "smith2024", type: "article", title: "A Study",
    });
  });

  it("parses CSL YAML files with a references field", async () => {
    const record = await loadCitationDatabase(
      "lib.yaml",
      "references:\n  - id: jones2020\n    type: book\n    title: A Book"
    );
    expect(record.type).toBe("csl");
    expect(record.cslData["jones2020"].id).toBe("jones2020");
  });

  it("skips JSON items missing a string id or type", async () => {
    const record = await loadCitationDatabase(
      "lib.json",
      JSON.stringify([
        { id: "ok", type: "article" },
        { id: 5, type: "article" },
        { id: "bad" },
      ])
    );
    expect(Object.keys(record.cslData)).toEqual(["ok"]);
  });

  it("parses .bib via BibLaTeX", async () => {
    const record = await loadCitationDatabase("lib.bib", "@article{smith2024, title={A Study}}");
    expect(record.type).toBe("biblatex");
    expect(record.cslData["smith2024"].id).toBe("smith2024");
  });

  it("throws on unknown extension", async () => {
    await expect(loadCitationDatabase("lib.txt", "x")).rejects.toThrow(/Unknown extension/u);
  });
});
