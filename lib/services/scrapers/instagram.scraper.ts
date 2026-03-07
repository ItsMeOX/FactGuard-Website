import type { ContentScraper, ScrapeResult } from "@/lib/types/scraper";
import { ScrapeError } from "@/lib/services/scraper.service";
import scraperConfig from "@/lib/config/scraper.config.json";

export class InstagramScraper implements ContentScraper {
  async scrape(url: string): Promise<ScrapeResult> {
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!accessToken) {
      throw new ScrapeError(
        "FACEBOOK_ACCESS_TOKEN environment variable is not set",
        url
      );
    }

    const oembedUrl = `${scraperConfig.instagram.oembedUrl}?url=${encodeURIComponent(url)}&access_token=${accessToken}`;

    let response: Response;
    try {
      response = await fetch(oembedUrl);
    } catch (error) {
      throw new ScrapeError(
        `Instagram oEmbed request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        url
      );
    }

    if (!response.ok) {
      throw new ScrapeError(
        `Instagram oEmbed HTTP ${response.status}: ${response.statusText}`,
        url
      );
    }

    const data = await response.json();
    const authorName: string = data.author_name || "Unknown";
    const title: string | null = data.title || null;

    let content = "";
    if (title) {
      content = title;
    }

    return {
      title: title ? `${authorName}: ${title}` : `Instagram post by ${authorName}`,
      description: `Post by ${authorName} on Instagram`,
      content,
      thumbnailUrl: data.thumbnail_url || null,
    };
  }
}
