-- AlterTable: Remove ai_credibility_label from posts
ALTER TABLE "posts" DROP COLUMN "ai_credibility_label";

-- AlterTable: Remove category_id from reports and drop FK
ALTER TABLE "reports" DROP CONSTRAINT "reports_category_id_fkey";
ALTER TABLE "reports" DROP COLUMN "category_id";

-- RenameTable: post_categories -> ai_post_categories
ALTER TABLE "post_categories" RENAME TO "ai_post_categories";

-- RenameIndex: update index name for the renamed table
ALTER INDEX "idx_post_categories_category_id" RENAME TO "idx_ai_post_categories_category_id";

-- RenameForeignKey: update FK constraint names for the renamed table
ALTER TABLE "ai_post_categories" RENAME CONSTRAINT "post_categories_post_id_fkey" TO "ai_post_categories_post_id_fkey";
ALTER TABLE "ai_post_categories" RENAME CONSTRAINT "post_categories_category_id_fkey" TO "ai_post_categories_category_id_fkey";

-- RenamePrimaryKey: moved from 20260307085302
ALTER TABLE "ai_post_categories" RENAME CONSTRAINT "post_categories_pkey" TO "ai_post_categories_pkey";
