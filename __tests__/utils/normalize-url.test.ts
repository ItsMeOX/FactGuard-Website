import { normalizeUrl } from "@/lib/utils/normalize-url";

describe("normalizeUrl", () => {
  it("lowercases the hostname", () => {
    expect(normalizeUrl("https://Example.COM/path")).toBe(
      "https://example.com/path"
    );
  });

  it("removes fragment identifiers", () => {
    expect(normalizeUrl("https://example.com/page#section")).toBe(
      "https://example.com/page"
    );
  });

  it("removes trailing slashes from the pathname", () => {
    expect(normalizeUrl("https://example.com/path/")).toBe(
      "https://example.com/path"
    );
  });

  it("preserves root path as single slash", () => {
    expect(normalizeUrl("https://example.com/")).toBe(
      "https://example.com/"
    );
  });

  it("strips utm tracking parameters", () => {
    const url =
      "https://example.com/article?utm_source=twitter&utm_medium=social&id=42";
    expect(normalizeUrl(url)).toBe("https://example.com/article?id=42");
  });

  it("strips fbclid parameter", () => {
    expect(
      normalizeUrl("https://example.com/post?fbclid=abc123&page=1")
    ).toBe("https://example.com/post?page=1");
  });

  it("strips gclid parameter", () => {
    expect(normalizeUrl("https://example.com/?gclid=xyz")).toBe(
      "https://example.com/"
    );
  });

  it("strips igshid parameter", () => {
    expect(normalizeUrl("https://example.com/reel?igshid=abc")).toBe(
      "https://example.com/reel"
    );
  });

  it("strips ref parameter", () => {
    expect(normalizeUrl("https://example.com/page?ref=homepage")).toBe(
      "https://example.com/page"
    );
  });

  it("sorts remaining query parameters alphabetically", () => {
    expect(normalizeUrl("https://example.com/?z=1&a=2&m=3")).toBe(
      "https://example.com/?a=2&m=3&z=1"
    );
  });

  it("removes query string entirely when only tracking params exist", () => {
    expect(
      normalizeUrl("https://example.com/path?utm_source=test&fbclid=abc")
    ).toBe("https://example.com/path");
  });

  it("handles URLs without query params or fragments", () => {
    expect(normalizeUrl("https://example.com/clean-path")).toBe(
      "https://example.com/clean-path"
    );
  });

  it("preserves port numbers", () => {
    expect(normalizeUrl("https://example.com:8080/api")).toBe(
      "https://example.com:8080/api"
    );
  });

  it("handles multiple trailing slashes", () => {
    expect(normalizeUrl("https://example.com/path///")).toBe(
      "https://example.com/path"
    );
  });

  it("throws for invalid URLs", () => {
    expect(() => normalizeUrl("not-a-url")).toThrow();
  });

  it("normalizes same page with different tracking params to identical result", () => {
    const url1 = "https://example.com/article?id=1&utm_source=twitter";
    const url2 = "https://Example.COM/article?utm_medium=social&id=1#comments";
    expect(normalizeUrl(url1)).toBe(normalizeUrl(url2));
  });
});
