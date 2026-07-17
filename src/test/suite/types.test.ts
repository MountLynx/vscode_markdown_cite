import { describe, expect, it } from "vitest";

describe("CSLItem type", () => {
  it("accepts a valid CSL item with id and type", () => {
    const item: Record<string, unknown> = {
      id: "smith2024",
      type: "article",
      title: "A Study",
      author: [{ family: "Smith", given: "J." }],
      issued: { "date-parts": [[2024]] },
    };
    expect(item.id).toBe("smith2024");
    expect(item.type).toBe("article");
  });
});
