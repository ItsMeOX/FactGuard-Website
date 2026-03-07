export type ScrapeResult = {
  title: string | null;
  description: string | null;
  content: string;
  thumbnailUrl: string | null;
};

export interface ContentScraper {
  scrape(url: string): Promise<ScrapeResult>;
}
