import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 10;

function normalizeUrl(raw: string): string {
  const url = new URL(raw);
  url.hostname = url.hostname.toLowerCase();
  url.protocol = url.protocol.toLowerCase();
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString();
}

function getSourceType(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes("tiktok.com")) return "TIKTOK";
  if (hostname.includes("x.com") || hostname.includes("twitter.com")) return "X";
  if (hostname.includes("facebook.com") || hostname.includes("fb.com")) return "FACEBOOK";
  if (hostname.includes("reddit.com")) return "REDDIT";
  if (hostname.includes("instagram.com")) return "INSTAGRAM";
  return "WEBPAGE";
}

function buildReportCommentContent(payload: {
  headline: string;
  reportDescription: string;
  supportingEvidence: string | null;
}): string {
  return JSON.stringify({
    type: "report",
    headline: payload.headline,
    reportDescription: payload.reportDescription,
    supportingEvidence: payload.supportingEvidence,
  });
}

const CATEGORIES = [
  { name: "Health & Medicine", slug: "health-medicine", description: "Claims about health, medicine, treatments, and medical research" },
  { name: "Politics & Government", slug: "politics-government", description: "Claims about political figures, government policies, and elections" },
  { name: "Science & Technology", slug: "science-technology", description: "Claims about scientific discoveries, technology, and innovation" },
  { name: "Environment & Climate", slug: "environment-climate", description: "Claims about climate change, environmental policies, and natural disasters" },
  { name: "Finance & Economy", slug: "finance-economy", description: "Claims about financial markets, economic policies, and monetary issues" },
  { name: "Social Media & Viral", slug: "social-media-viral", description: "Viral claims, hoaxes, and misinformation spread through social media" },
  { name: "Education", slug: "education", description: "Claims about educational institutions, policies, and practices" },
  { name: "Entertainment", slug: "entertainment", description: "Claims about celebrities, media, and the entertainment industry" },
  { name: "International Affairs", slug: "international-affairs", description: "Claims about international relations, conflicts, and global events" },
  { name: "Consumer & Product", slug: "consumer-product", description: "Claims about consumer products, safety recalls, and scams" },
];

const SEED_USER = {
  email: "reporter@example.com",
  password: "password123",
  displayName: "Seed Reporter",
};

const FAKE_NEWS = [
  {
    sourceUrl: "https://example-news.com/2026/cure-for-common-cold-found",
    headline: "Scientists announce cure for common cold available next week",
    reportHeadline: "Viral claim about cold cure is false",
    reportDescription: "No such cure has been approved or announced. The article cites no peer-reviewed study or health authority.",
    supportingEvidence: "FDA and WHO have no record of such an approval.",
    platform: "Facebook",
  },
  {
    sourceUrl: "https://fake-tribune.org/politics/election-fraud-proof",
    headline: "Exclusive: Documents prove election fraud in 2024",
    reportHeadline: "Election fraud story is fabricated",
    reportDescription: "The documents referenced do not exist. Multiple fact-checkers have debunked this narrative.",
    supportingEvidence: "Snopes and AFP Fact Check have rated this false.",
    platform: "X",
  },
  {
    sourceUrl: "https://hoax-site.net/celebrity-death-hoax",
    headline: "Breaking: Celebrity X has died (confirmed)",
    reportHeadline: "Celebrity death report is a hoax",
    reportDescription: "The celebrity has publicly posted since the article was published. This is a recurring death hoax.",
    supportingEvidence: "Official social media accounts show recent activity.",
    platform: "Instagram",
  },
  {
    sourceUrl: "https://reddit.com/r/conspiracy/comments/abc123/they-are-hiding-the-truth",
    headline: "They are hiding the truth about [topic]",
    reportHeadline: "Conspiracy post with no credible sources",
    reportDescription: "The post makes sweeping claims with no citations. Key 'sources' are other social posts, not research.",
    supportingEvidence: null,
    platform: "Reddit",
  },
  {
    sourceUrl: "https://clickbait-news.io/miracle-product-weight-loss",
    headline: "One weird trick doctors don't want you to know — lose 30 lbs in a week",
    reportHeadline: "Miracle weight-loss claim is misleading",
    reportDescription: "The product has no FDA approval for weight loss. 'Doctor' quotes are unattributed. Typical clickbait.",
    supportingEvidence: "FDA warning letters exist for similar claims.",
    platform: "WEBPAGE",
  },
];

async function main() {
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description },
      create: category,
    });
  }
  console.log(`Seeded ${CATEGORIES.length} categories`);

  const passwordHash = await bcrypt.hash(SEED_USER.password, SALT_ROUNDS);
  const user = await prisma.user.upsert({
    where: { email: SEED_USER.email },
    update: { displayName: SEED_USER.displayName, passwordHash },
    create: {
      email: SEED_USER.email,
      passwordHash,
      displayName: SEED_USER.displayName,
    },
  });
  console.log(`Seeded user: ${user.email} (use password "${SEED_USER.password}" for login)`);

  const categoryIds = await prisma.category.findMany({ select: { id: true, slug: true } });
  const slugToId = new Map(categoryIds.map((c) => [c.slug, c.id]));

  for (const item of FAKE_NEWS) {
    const normalizedUrl = normalizeUrl(item.sourceUrl);
    const sourceType = getSourceType(item.sourceUrl);

    const post = await prisma.post.upsert({
      where: { normalizedUrl },
      update: {},
      create: {
        sourceUrl: item.sourceUrl,
        normalizedUrl,
        sourceType,
        headline: item.headline,
        processedStatus: "pending",
        reportCount: 0,
      },
    });

    const existingReport = await prisma.report.findUnique({
      where: { postId_userId: { postId: post.id, userId: user.id } },
    });

    if (!existingReport) {
      await prisma.$transaction([
        prisma.report.create({
          data: {
            postId: post.id,
            userId: user.id,
            headline: item.reportHeadline,
            platform: item.platform,
            reportDescription: item.reportDescription,
            supportingEvidence: item.supportingEvidence,
          },
        }),
        prisma.post.update({
          where: { id: post.id },
          data: { reportCount: { increment: 1 } },
        }),
        prisma.comment.create({
          data: {
            postId: post.id,
            userId: user.id,
            content: buildReportCommentContent({
              headline: item.reportHeadline,
              reportDescription: item.reportDescription,
              supportingEvidence: item.supportingEvidence,
            }),
          },
        }),
      ]);
    }
  }

  const postsWithReports = await prisma.post.findMany({
    where: { normalizedUrl: { in: FAKE_NEWS.map((n) => normalizeUrl(n.sourceUrl)) } },
    select: { id: true },
  });

  const healthId = slugToId.get("health-medicine");
  const politicsId = slugToId.get("politics-government");
  const viralId = slugToId.get("social-media-viral");
  const categoryIdsToAssign = [healthId, politicsId, viralId].filter((id): id is number => id != null);

  for (const post of postsWithReports) {
    for (const categoryId of categoryIdsToAssign.slice(0, 2)) {
      await prisma.aiPostCategory.upsert({
        where: { postId_categoryId: { postId: post.id, categoryId } },
        update: {},
        create: { postId: post.id, categoryId, confidence: 0.8 },
      });
    }
    await prisma.post.update({
      where: { id: post.id },
      data: {
        processedStatus: "completed",
        aiSummary: "This claim has been assessed based on the source URL and user reports. Limited context was available.",
        aiCredibilityScore: 25,
        aiTransparencyNotes: "Assessment relied on user-submitted reports only. No page content or external fact-checks were fetched.",
        thumbnailUrl: "https://via.placeholder.com/400x200?text=Fake+News",
      },
    });
  }

  console.log(`Seeded ${FAKE_NEWS.length} fake-news posts with reports and comments`);
  console.log("Run your process-posts cron (or wait for it) to re-process pending posts with AI.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
