-- AlterTable: Rename scrape_status to processed_status
ALTER TABLE "posts" RENAME COLUMN "scrape_status" TO "processed_status";
