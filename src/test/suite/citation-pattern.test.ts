import { describe, expect, it } from "vitest";
import { CITATION_PATTERN, extractCitekeys } from "../../citation-pattern";

describe("extractCitekeys", () => {
  it("extracts keys from bracketed and bare citations", () => {
    const keys = extractCitekeys("See [@smith2024] and -@jones2020 and @doe99");
    expect(keys).toEqual(["smith2024", "jones2020", "doe99"]);
  });

  it("extracts multiple keys from a cluster", () => {
    expect(extractCitekeys("[@smith2024; @jones2020]")).toEqual(["smith2024", "jones2020"]);
  });

  it("keeps a locator from breaking key extraction", () => {
    expect(extractCitekeys("[@smith2024, p. 12]")).toEqual(["smith2024"]);
  });

  it("returns empty array for plain text", () => {
    expect(extractCitekeys("no citations here")).toEqual([]);
  });

  it("ignores bracketed text without an @ marker", () => {
    expect(extractCitekeys("[not a citation]")).toEqual([]);
  });
});

describe("CITATION_PATTERN", () => {
  it("matches bracketed, bare, and suppress-author forms", () => {
    const matches = "x [@a] -@b @c [d]".match(CITATION_PATTERN) ?? [];
    expect(matches).toEqual(["[@a]", "-@b", "@c"]);
  });
});
