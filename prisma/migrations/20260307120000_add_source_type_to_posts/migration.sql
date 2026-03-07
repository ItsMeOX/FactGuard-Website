-- AlterTable: Add source_type column as nullable first
ALTER TABLE "posts" ADD COLUMN "source_type" VARCHAR(20);

-- Backfill existing rows based on source_url hostname
UPDATE "posts" SET "source_type" = CASE
  WHEN "source_url" ILIKE '%tiktok.com%' THEN 'TIKTOK'
  WHEN "source_url" ILIKE '%x.com%' OR "source_url" ILIKE '%twitter.com%' THEN 'X'
  WHEN "source_url" ILIKE '%facebook.com%' OR "source_url" ILIKE '%fb.com%' THEN 'FACEBOOK'
  WHEN "source_url" ILIKE '%reddit.com%' THEN 'REDDIT'
  WHEN "source_url" ILIKE '%instagram.com%' THEN 'INSTAGRAM'
  ELSE 'WEBPAGE'
END;

-- Make column NOT NULL after backfill
ALTER TABLE "posts" ALTER COLUMN "source_type" SET NOT NULL;
