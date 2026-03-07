import { getSourceType } from "@/lib/utils/get-source-type";

describe("getSourceType", () => {
  it("returns TIKTOK for tiktok.com URLs", () => {
    expect(getSourceType("https://www.tiktok.com/@user/video/123")).toBe("TIKTOK");
  });

  it("returns TIKTOK for vm.tiktok.com short links", () => {
    expect(getSourceType("https://vm.tiktok.com/abc123")).toBe("TIKTOK");
  });

  it("returns X for x.com URLs", () => {
    expect(getSourceType("https://x.com/user/status/123456")).toBe("X");
  });

  it("returns X for twitter.com URLs", () => {
    expect(getSourceType("https://twitter.com/user/status/123456")).toBe("X");
  });

  it("returns X for mobile.twitter.com URLs", () => {
    expect(getSourceType("https://mobile.twitter.com/user/status/123")).toBe("X");
  });

  it("returns FACEBOOK for facebook.com URLs", () => {
    expect(getSourceType("https://www.facebook.com/user/posts/123")).toBe("FACEBOOK");
  });

  it("returns FACEBOOK for fb.com URLs", () => {
    expect(getSourceType("https://fb.com/user/posts/123")).toBe("FACEBOOK");
  });

  it("returns FACEBOOK for m.facebook.com URLs", () => {
    expect(getSourceType("https://m.facebook.com/story/123")).toBe("FACEBOOK");
  });

  it("returns REDDIT for reddit.com URLs", () => {
    expect(getSourceType("https://www.reddit.com/r/science/comments/abc123/")).toBe("REDDIT");
  });

  it("returns REDDIT for old.reddit.com URLs", () => {
    expect(getSourceType("https://old.reddit.com/r/news/comments/xyz/")).toBe("REDDIT");
  });

  it("returns INSTAGRAM for instagram.com URLs", () => {
    expect(getSourceType("https://www.instagram.com/p/ABC123/")).toBe("INSTAGRAM");
  });

  it("returns INSTAGRAM for instagram.com reel URLs", () => {
    expect(getSourceType("https://www.instagram.com/reel/XYZ789/")).toBe("INSTAGRAM");
  });

  it("returns WEBPAGE for generic news sites", () => {
    expect(getSourceType("https://www.bbc.com/news/article-123")).toBe("WEBPAGE");
  });

  it("returns WEBPAGE for unknown domains", () => {
    expect(getSourceType("https://randomsite.org/page")).toBe("WEBPAGE");
  });

  it("handles uppercase hostnames correctly", () => {
    expect(getSourceType("https://WWW.TIKTOK.COM/@user/video/1")).toBe("TIKTOK");
  });

  it("handles URLs with paths and query params", () => {
    expect(
      getSourceType("https://www.reddit.com/r/test/comments/abc?ref=share")
    ).toBe("REDDIT");
  });
});
