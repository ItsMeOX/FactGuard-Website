import type { ContentScraper, ScrapeResult } from "@/lib/types/scraper";
import { ScrapeError } from "@/lib/services/scraper.service";
import scraperConfig from "@/lib/config/scraper.config.json";

export class TikTokScraper implements ContentScraper {
  async scrape(url: string): Promise<ScrapeResult> {
    const oembedUrl = `${scraperConfig.tiktok.oembedUrl}?url=${encodeURIComponent(url)}`;

    let response: Response;
    try {
      response = await fetch(oembedUrl);
    } catch (error) {
      throw new ScrapeError(
        `TikTok oEmbed request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        url
      );
    }

    if (!response.ok) {
      throw new ScrapeError(
        `TikTok oEmbed HTTP ${response.status}: ${response.statusText}`,
        url
      );
    }

    const data = await response.json();

    return {
      title: data.title || null,
      description: data.author_name ? `TikTok by ${data.author_name}` : null,
      content: data.title || "",
      thumbnailUrl: data.thumbnail_url || null,
    };
  }
}
