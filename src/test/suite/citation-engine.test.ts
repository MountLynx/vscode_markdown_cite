import { describe, expect, it, beforeAll } from "vitest";
import { CitationEngine } from "../../citation-engine";
import fs from "fs";
import path from "path";

const styleXml = fs.readFileSync(
  path.resolve(__dirname, "../../../assets/chicago-author-date.csl"),
  "utf-8"
);
const localeXml = fs.readFileSync(
  path.resolve(__dirname, "../../../assets/locales-en-US.xml"),
  "utf-8"
);

describe("CitationEngine", () => {
  let engine: CitationEngine;

  beforeAll(async () => {
    engine = new CitationEngine(styleXml, localeXml);
    await engine.init();
  });

  it("is not ready before loading a database", () => {
    expect(engine.isReady).toBe(false);
  });

  it("becomes ready after loading a CSL JSON database", async () => {
    await engine.loadDatabase(
      "test.json",
      JSON.stringify([
        {
          id: "smith2024",
          type: "article",
          title: "A Study on Citations",
          author: [{ family: "Smith", given: "John" }],
          issued: { "date-parts": [[2024]] },
        },
      ])
    );
    expect(engine.isReady).toBe(true);
  });

  it("renders a citation cluster", () => {
    const rendered = engine.renderCitation(["smith2024"]);
    expect(rendered).toBeDefined();
    expect(rendered!).toContain("Smith");
    expect(rendered!).toContain("2024");
  });

  it("returns undefined for unknown citekey (does not throw)", () => {
    const rendered = engine.renderCitation(["nonexistent"]);
    expect(rendered).toBeUndefined();
  });

  it("getEntries returns entries sorted by key", () => {
    const entries = engine.getEntries();
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].key).toBe("smith2024");
    expect(entries[0].title).toBe("A Study on Citations");
    expect(entries[0].authors).toContain("Smith");
    expect(entries[0].year).toBe("2024");
  });

  it("getCitationDetail returns plain text", () => {
    const detail = engine.getCitationDetail(["smith2024"]);
    expect(detail).toBeDefined();
    expect(typeof detail).toBe("string");
  });

  it("unloads a database and clears items", () => {
    engine.unloadDatabase("test.json");
    const entries = engine.getEntries();
    expect(entries.filter((e) => e.databasePath === "test.json")).toHaveLength(0);
  });
});
