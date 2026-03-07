import type { ContentScraper, ScrapeResult } from "@/lib/types/scraper";
import { ScrapeError } from "@/lib/services/scraper.service";
import scraperConfig from "@/lib/config/scraper.config.json";

export class XScraper implements ContentScraper {
  async scrape(url: string): Promise<ScrapeResult> {
    const tweetId = this.extractTweetId(url);
    if (!tweetId) {
      throw new ScrapeError(`Could not extract tweet ID from URL`, url);
    }

    const apiUrl = `${scraperConfig.x.syndicationUrl}?id=${tweetId}&token=x`;

    let response: Response;
    try {
      response = await fetch(apiUrl);
    } catch (error) {
      throw new ScrapeError(
        `X syndication request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        url
      );
    }

    if (!response.ok) {
      throw new ScrapeError(
        `X syndication HTTP ${response.status}: ${response.statusText}`,
        url
      );
    }

    const data = await response.json();
    const text: string = data.text || "";
    const userName: string = data.user?.name || "Unknown";

    const maxLen = scraperConfig.x.titleMaxLength;
    const truncatedText = text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
    const title = `${userName}: ${truncatedText}`;

    const thumbnailUrl =
      data.mediaDetails?.[0]?.media_url_https ||
      data.photos?.[0]?.url ||
      null;

    return {
      title,
      description: `Post by ${userName} on X`,
      content: text,
      thumbnailUrl,
    };
  }

  private extractTweetId(url: string): string | null {
    const match = url.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
  }
}
