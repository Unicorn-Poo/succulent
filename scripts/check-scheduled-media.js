const DEFAULT_BASE_URL = "http://localhost:3000";

function getArgValue(flag) {
  const prefix = `--${flag}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

async function main() {
  const accountGroupId =
    getArgValue("accountGroupId") || process.env.SUCCULENT_ACCOUNT_GROUP_ID;
  const baseUrl = getArgValue("baseUrl") || process.env.SUCCULENT_BASE_URL;
  const includePlatformVariants =
    getArgValue("includePlatformVariants") || "true";
  const includeUrls = getArgValue("includeUrls") === "true";
  const limit = Number(getArgValue("limit") || "0");
  const postId = getArgValue("postId");
  const includeAllStatuses = getArgValue("includeAllStatuses") === "true";
  const includeMediaDetails = getArgValue("includeMediaDetails") === "true";
  const apiKey = process.env.SUCCULENT_API_KEY;

  if (!accountGroupId) {
    console.error(
      "Missing accountGroupId. Use --accountGroupId=... or set SUCCULENT_ACCOUNT_GROUP_ID."
    );
    process.exit(1);
  }

  const targetBase = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
  const params = new URLSearchParams({
    accountGroupId,
    includePlatformVariants,
  });
  if (postId) {
    params.set("postId", postId);
  }
  if (includeAllStatuses) {
    params.set("includeAllStatuses", "true");
  }
  if (includeMediaDetails) {
    params.set("includeMediaDetails", "true");
  }

  const url = `${targetBase}/api/audit-scheduled-media?${params.toString()}`;

  const headers = apiKey ? { "X-API-Key": apiKey } : undefined;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Request failed (${response.status}): ${text}`);
    process.exit(1);
  }

  const payload = await response.json();
  if (!payload?.success) {
    console.error("Audit failed:", payload?.error || "Unknown error");
    process.exit(1);
  }

  const { summary, posts } = payload.data;
  console.log("Scheduled media audit summary:");
  console.log(`- totalPosts: ${summary.totalPosts}`);
  console.log(`- scheduledVariants: ${summary.scheduledVariants}`);
  console.log(`- variantsWithMedia: ${summary.variantsWithMedia}`);
  console.log(`- variantsWithResolvedMedia: ${summary.variantsWithResolvedMedia}`);
  console.log(
    `- variantsMissingResolvedMedia: ${summary.variantsMissingResolvedMedia}`
  );

  const offenders = [];
  let printed = 0;
  for (const post of posts) {
    for (const variant of post.scheduledVariants) {
      if (variant.mediaItemCount > 0 && variant.resolvedMediaUrls.length === 0) {
        offenders.push({
          postId: post.id,
          title: post.title,
          platform: variant.platform,
          mediaItemCount: variant.mediaItemCount,
          fileStreamIds: variant.fileStreamIds,
        });
      }
      if (includeUrls && variant.resolvedMediaUrls.length > 0) {
        if (limit > 0 && printed >= limit) continue;
        console.log(
          `\nResolved media URLs for ${post.id} | ${variant.platform} | ${post.title}`
        );
        for (const mediaUrl of variant.resolvedMediaUrls) {
          console.log(`- ${mediaUrl}`);
        }
        printed += 1;
      }
      if (includeMediaDetails && variant.mediaDetails) {
        console.log(
          `\nMedia details for ${post.id} | ${variant.platform} | ${post.title}`
        );
        for (const detail of variant.mediaDetails) {
          console.log(
            `- type=${detail.type} url=${detail.url || "none"} image=${
              detail.hasImage
            } video=${detail.hasVideo} fileStreamId=${
              detail.fileStreamId || "none"
            }`
          );
        }
      }
    }
  }

  if (offenders.length > 0) {
    console.log("\nScheduled variants missing resolved media URLs:");
    for (const item of offenders) {
      console.log(
        `- ${item.postId} | ${item.platform} | ${item.title} | mediaItems=${item.mediaItemCount} | fileStreams=${item.fileStreamIds.join(
          ","
        ) || "none"}`
      );
    }
  } else {
    console.log("\nNo scheduled variants missing resolved media URLs.");
  }
}

main().catch((error) => {
  console.error("Audit script failed:", error);
  process.exit(1);
});
