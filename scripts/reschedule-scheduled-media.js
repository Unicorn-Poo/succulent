const DEFAULT_BASE_URL = "http://localhost:3000";

function getArgValue(flag) {
  const prefix = `--${flag}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function parseBool(value, fallback = false) {
  if (value == null) return fallback;
  return value === "true";
}

function toIsoDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isPlaceholderCandidate(variant) {
  if (!variant) return false;
  if (variant.mediaItemCount === 0) return false;
  if (!variant.mediaDetails || variant.mediaDetails.length === 0) {
    return variant.resolvedMediaUrls?.length === 0;
  }
  return variant.mediaDetails.some((detail) => {
    const hasMedia = detail.hasImage || detail.hasVideo;
    const hasUrl = Boolean(detail.url);
    const hasFileStream = Boolean(detail.fileStreamId);
    return hasMedia && !hasUrl && hasFileStream;
  });
}

async function main() {
  const accountGroupId =
    getArgValue("accountGroupId") || process.env.SUCCULENT_ACCOUNT_GROUP_ID;
  const baseUrl = getArgValue("baseUrl") || process.env.SUCCULENT_BASE_URL;
  const includePlatformVariants =
    getArgValue("includePlatformVariants") || "true";
  const onlyPlaceholder = parseBool(getArgValue("onlyPlaceholder"), true);
  const applyChanges = parseBool(getArgValue("apply"), false);
  const cancelExisting = parseBool(getArgValue("cancel"), false);
  const limit = Number(getArgValue("limit") || "0");
  const postId = getArgValue("postId");
  const apiKey = process.env.SUCCULENT_API_KEY;

  if (!accountGroupId) {
    console.error(
      "Missing accountGroupId. Use --accountGroupId=... or set SUCCULENT_ACCOUNT_GROUP_ID."
    );
    process.exit(1);
  }

  if (applyChanges && !apiKey) {
    console.error(
      "Missing SUCCULENT_API_KEY. Rescheduling requires a valid API key."
    );
    process.exit(1);
  }

  const targetBase = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
  const params = new URLSearchParams({
    accountGroupId,
    includePlatformVariants,
    includeAllStatuses: "true",
    includeMediaDetails: "true",
  });
  if (postId) {
    params.set("postId", postId);
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

  const posts = payload.data?.posts || [];
  const rescheduleTasks = [];

  for (const post of posts) {
    for (const variant of post.scheduledVariants || []) {
      const isScheduled =
        variant.status === "scheduled" || Boolean(variant.scheduledFor);
      if (!isScheduled) continue;

      if (onlyPlaceholder && !isPlaceholderCandidate(variant)) {
        continue;
      }

      const scheduledIso = toIsoDate(variant.scheduledFor);
      if (!scheduledIso) {
        rescheduleTasks.push({
          postId: post.id,
          platform: variant.platform,
          title: post.title,
          reason: "missing scheduledFor",
          scheduledFor: null,
        });
        continue;
      }

      if (variant.platform === "base") {
        rescheduleTasks.push({
          postId: post.id,
          platform: variant.platform,
          title: post.title,
          reason: "base platform not supported",
          scheduledFor: scheduledIso,
        });
        continue;
      }

      rescheduleTasks.push({
        postId: post.id,
        platform: variant.platform,
        title: post.title,
        scheduledFor: scheduledIso,
      });
    }
  }

  if (rescheduleTasks.length === 0) {
    console.log("No scheduled variants matched the reschedule criteria.");
    return;
  }

  console.log("Reschedule candidates:");
  for (const task of rescheduleTasks) {
    if (task.reason) {
      console.log(
        `- ${task.postId} | ${task.platform} | ${task.title} | skipped=${task.reason}`
      );
      continue;
    }
    console.log(
      `- ${task.postId} | ${task.platform} | ${task.title} | ${task.scheduledFor}`
    );
  }

  if (!applyChanges) {
    console.log(
      "\nDry run only. Re-run with --apply=true to reschedule these variants."
    );
    return;
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const task of rescheduleTasks) {
    if (limit > 0 && processed >= limit) break;
    if (task.reason) continue;

    const requestBody = {
      accountGroupId,
      postId: task.postId,
      platforms: [task.platform],
      scheduledDate: task.scheduledFor,
      publishImmediately: false,
      limitToPlatforms: true,
      deleteExistingScheduled: cancelExisting,
    };

    try {
      const res = await fetch(`${targetBase}/api/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      const resText = await res.text();
      if (!res.ok) {
        failed += 1;
        console.error(
          `❌ Failed to reschedule ${task.postId} | ${task.platform}: ${res.status} ${resText}`
        );
      } else {
        succeeded += 1;
        console.log(
          `✅ Rescheduled ${task.postId} | ${task.platform} at ${task.scheduledFor}`
        );
      }
    } catch (error) {
      failed += 1;
      console.error(
        `❌ Failed to reschedule ${task.postId} | ${task.platform}:`,
        error
      );
    } finally {
      processed += 1;
    }
  }

  console.log("\nReschedule summary:");
  console.log(`- attempted: ${processed}`);
  console.log(`- succeeded: ${succeeded}`);
  console.log(`- failed: ${failed}`);
}

main().catch((error) => {
  console.error("Reschedule script failed:", error);
  process.exit(1);
});
