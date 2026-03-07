import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

/**
 * Deletes all data from the database in FK-safe order.
 * Keeps the schema and migrations intact; only table rows are removed.
 * Categories are kept so the app can still use them after you register and add posts.
 */
async function main() {
  console.log("Clearing database...");

  await prisma.reportVote.deleteMany({});
  await prisma.commentVote.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.aiPostCategory.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("Done. Users, posts, reports, comments, and votes are cleared.");
  console.log("Categories are kept. You can register and add data manually.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
