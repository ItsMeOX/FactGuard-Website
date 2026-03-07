import type { ContentScraper, ScrapeResult } from "@/lib/types/scraper";
import { ScrapeError } from "@/lib/services/scraper.service";
import scraperConfig from "@/lib/config/scraper.config.json";

export class RedditScraper implements ContentScraper {
  async scrape(url: string): Promise<ScrapeResult> {
    const jsonUrl = this.buildJsonUrl(url);

    let response: Response;
    try {
      response = await fetch(jsonUrl, {
        headers: { "User-Agent": scraperConfig.shared.userAgent },
        redirect: "follow",
      });
    } catch (error) {
      throw new ScrapeError(
        `Reddit JSON request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        url
      );
    }

    if (!response.ok) {
      throw new ScrapeError(
        `Reddit JSON HTTP ${response.status}: ${response.statusText}`,
        url
      );
    }

    const data = await response.json();
    const postData = this.extractPostData(data);

    if (!postData) {
      throw new ScrapeError("Could not extract post data from Reddit response", url);
    }

    const content = this.buildContent(postData);

    return {
      title: postData.title || null,
      description: postData.subreddit
        ? `Posted in r/${postData.subreddit} by u/${postData.author}`
        : `Posted by u/${postData.author}`,
      content: content.slice(0, scraperConfig.shared.maxContentLength),
      thumbnailUrl: this.extractThumbnail(postData),
    };
  }

  private buildJsonUrl(url: string): string {
    const parsed = new URL(url);
    const cleanPath = parsed.pathname.replace(/\/$/, "");
    return `${scraperConfig.reddit.baseUrl}${cleanPath}.json`;
  }

  private extractPostData(data: unknown): RedditPostData | null {
    if (!Array.isArray(data) || data.length === 0) return null;

    const listing = data[0]?.data?.children?.[0]?.data;
    if (!listing) return null;

    return {
      title: listing.title ?? null,
      selftext: listing.selftext ?? "",
      author: listing.author ?? "unknown",
      subreddit: listing.subreddit ?? null,
      thumbnail: listing.thumbnail ?? null,
      preview: listing.preview?.images?.[0]?.source?.url ?? null,
      url: listing.url ?? null,
    };
  }

  private buildContent(postData: RedditPostData): string {
    const parts: string[] = [];
    if (postData.title) parts.push(postData.title);
    if (postData.selftext) parts.push(postData.selftext);
    return parts.join("\n\n");
  }

  private extractThumbnail(postData: RedditPostData): string | null {
    if (postData.preview) {
      return postData.preview.replace(/&amp;/g, "&");
    }

    if (postData.thumbnail && postData.thumbnail.startsWith("http")) {
      return postData.thumbnail;
    }

    return null;
  }
}

type RedditPostData = {
  title: string | null;
  selftext: string;
  author: string;
  subreddit: string | null;
  thumbnail: string | null;
  preview: string | null;
  url: string | null;
};
