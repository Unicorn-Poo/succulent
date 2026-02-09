const DEFAULT_AYRSHARE_API_BASE =
  process.env.AYRSHARE_API_URL ||
  process.env.NEXT_PUBLIC_AYRSHARE_API_URL ||
  "https://api.ayrshare.com/api";

const deleteEndpoint = `${DEFAULT_AYRSHARE_API_BASE.replace(/\/$/, "")}/post`;

function getAyrshareApiKey(): string | undefined {
  return process.env.AYRSHARE_API_KEY || process.env.NEXT_PUBLIC_AYRSHARE_API_KEY;
}

async function parseResponseError(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text || `Status ${response.status}`;
  } catch (err) {
    return `Status ${response.status}`;
  }
}

/**
 * Delete a scheduled Ayrshare post using its Ayrshare ID and profile key.
 */
export async function deleteAyrsharePostById(
  postId: string,
  profileKey: string
): Promise<void> {
  const apiKey = getAyrshareApiKey();
  if (!apiKey) {
    throw new Error("Missing AYRSHARE_API_KEY for delete operation");
  }
  if (!profileKey) {
    throw new Error("Missing Profile-Key for delete operation");
  }
  if (!postId) {
    throw new Error("Missing Ayrshare post ID");
  }

  const response = await fetch(deleteEndpoint, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Profile-Key": profileKey,
    },
    body: JSON.stringify({ id: postId }),
  });

  if (!response.ok) {
    const errorMessage = await parseResponseError(response);
    throw new Error(
      `Ayrshare delete failed (${response.status}): ${errorMessage}`
    );
  }
}
