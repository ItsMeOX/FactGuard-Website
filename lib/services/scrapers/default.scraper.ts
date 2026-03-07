import * as cheerio from "cheerio";
import type { ContentScraper, ScrapeResult } from "@/lib/types/scraper";
import { ScrapeError } from "@/lib/services/scraper.service";
import scraperConfig from "@/lib/config/scraper.config.json";

export class DefaultScraper implements ContentScraper {
  async scrape(url: string): Promise<ScrapeResult> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      scraperConfig.default.timeoutMs
    );

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "User-Agent": scraperConfig.shared.userAgent },
        signal: controller.signal,
        redirect: "follow",
      });
    } catch (error) {
      throw new ScrapeError(
        `Failed to fetch URL: ${error instanceof Error ? error.message : "Unknown error"}`,
        url
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new ScrapeError(
        `HTTP ${response.status}: ${response.statusText}`,
        url
      );
    }

    const html = await response.text();
    return this.extractContent(html);
  }

  private extractContent(html: string): ScrapeResult {
    const $ = cheerio.load(html);

    $(scraperConfig.default.stripElements).remove();

    const title =
      $("meta[property='og:title']").attr("content") ||
      $("title").text().trim() ||
      null;

    const description =
      $("meta[property='og:description']").attr("content") ||
      $("meta[name='description']").attr("content") ||
      null;

    const thumbnailUrl =
      $("meta[property='og:image']").attr("content") || null;

    const content = $(scraperConfig.default.contentSelectors)
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();

    const fallbackContent =
      content || $("body").text().replace(/\s+/g, " ").trim();

    return {
      title,
      description,
      content: fallbackContent.slice(0, scraperConfig.shared.maxContentLength),
      thumbnailUrl,
    };
  }
}
