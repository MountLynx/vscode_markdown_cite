import { describe, expect, it } from "vitest";
import { buildPandocArgs } from "../../pandoc-exporter";

describe("buildPandocArgs", () => {
  it("builds minimal arguments for docx export", () => {
    const args = buildPandocArgs({
      inputPath: "/doc/draft.md",
      outputPath: "/doc/draft.docx",
      bibliographyPath: undefined,
      cslPath: undefined,
      referenceDocPath: undefined,
      resourcePath: "/doc",
      extraArgs: "",
    });

    expect(args).toContain("--from");
    expect(args).toContain("markdown+tex_math_dollars");
    expect(args).toContain("--to");
    expect(args).toContain("docx");
    expect(args).toContain("--output");
    expect(args).toContain("--citeproc");
    expect(args).toContain("--metadata=link-citations:true");
    expect(args).toContain("--resource-path=/doc");
  });

  it("includes bibliography and csl when provided", () => {
    const args = buildPandocArgs({
      inputPath: "/doc/draft.md",
      outputPath: "/doc/draft.docx",
      bibliographyPath: "/doc/refs.bib",
      cslPath: "/doc/apa.csl",
      referenceDocPath: undefined,
      resourcePath: "/doc",
      extraArgs: "",
    });

    expect(args).toContain("--bibliography=/doc/refs.bib");
    expect(args).toContain("--csl=/doc/apa.csl");
  });

  it("includes reference-doc when provided", () => {
    const args = buildPandocArgs({
      inputPath: "/doc/draft.md",
      outputPath: "/doc/draft.docx",
      bibliographyPath: undefined,
      cslPath: undefined,
      referenceDocPath: "/doc/template.docx",
      resourcePath: "/doc",
      extraArgs: "",
    });

    expect(args).toContain("--reference-doc=/doc/template.docx");
  });

  it("appends extra pandoc arguments", () => {
    const args = buildPandocArgs({
      inputPath: "/doc/draft.md",
      outputPath: "/doc/draft.docx",
      bibliographyPath: undefined,
      cslPath: undefined,
      referenceDocPath: undefined,
      resourcePath: "/doc",
      extraArgs: "--toc --metadata title=\"Draft\"",
    });

    expect(args).toContain("--toc");
    expect(args).toContain("title=Draft");
  });

  it("does not include --bibliography when path is empty", () => {
    const args = buildPandocArgs({
      inputPath: "/doc/draft.md",
      outputPath: "/doc/draft.docx",
      bibliographyPath: "",
      cslPath: "",
      referenceDocPath: "",
      resourcePath: "/doc",
      extraArgs: "",
    });

    expect(args.filter((a) => a === "--bibliography")).toHaveLength(0);
    expect(args.filter((a) => a === "--csl")).toHaveLength(0);
    expect(args.filter((a) => a === "--reference-doc")).toHaveLength(0);
  });
});
