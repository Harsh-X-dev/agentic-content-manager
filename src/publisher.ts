// src/publisher.ts
// Publishes a video to Instagram as a Reel using the Instagram Graph API.
// This is a 3-step process: create a container, wait for it to finish
// processing, then publish it.

const GRAPH_API_VERSION = "v25.0";
const GRAPH_API_HOST = "https://graph.instagram.com";

export interface PublishResult {
  mediaId: string;
}

export async function publishToInstagram(
  videoUrl: string,
  caption: string
): Promise<PublishResult> {
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!igUserId || !accessToken) {
    throw new Error(
      "Missing INSTAGRAM_BUSINESS_ACCOUNT_ID or META_ACCESS_TOKEN in .env"
    );
  }

  // STEP 1: Create a media container
  const containerId = await createContainer(igUserId, accessToken, videoUrl, caption);

  // STEP 2: Poll until the container is ready
  await waitForContainerReady(containerId, accessToken);

  // STEP 3: Publish the container
  const mediaId = await publishContainer(igUserId, accessToken, containerId);

  return { mediaId };
}

async function createContainer(
  igUserId: string,
  accessToken: string,
  videoUrl: string,
  caption: string
): Promise<string> {
  const url = `${GRAPH_API_HOST}/${GRAPH_API_VERSION}/${igUserId}/media`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: videoUrl,
      caption: caption,
      access_token: accessToken,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.id) {
    throw new Error(
      `Failed to create Instagram media container: ${JSON.stringify(data)}`
    );
  }

  console.log(`Instagram container created: ${data.id}`);
  return data.id;
}

async function waitForContainerReady(
  containerId: string,
  accessToken: string
): Promise<void> {
  const maxAttempts = 20; // roughly 5 minutes at 15s intervals
  const pollIntervalMs = 15000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Request status_code AND error_message so failures are diagnosable
    const url = `${GRAPH_API_HOST}/${GRAPH_API_VERSION}/${containerId}?fields=status_code,status,error_message&access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    console.log(
      `Polling Instagram container status (attempt ${attempt}/${maxAttempts}): ${data.status_code}`
    );

    if (data.status_code === "FINISHED") {
      return;
    }

    if (data.status_code === "ERROR" || data.status_code === "EXPIRED") {
      const detail = data.error_message ?? data.status ?? "(no error_message returned by API)";
      throw new Error(
        `Instagram container failed to process.\n` +
        `  status_code  : ${data.status_code}\n` +
        `  error_message: ${detail}\n` +
        `  Full response: ${JSON.stringify(data)}`
      );
    }

    // status_code is IN_PROGRESS or PUBLISHED — wait and try again
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(
    "Timed out waiting for Instagram container to finish processing (5 minutes)"
  );
}

async function publishContainer(
  igUserId: string,
  accessToken: string,
  containerId: string
): Promise<string> {
  const url = `${GRAPH_API_HOST}/${GRAPH_API_VERSION}/${igUserId}/media_publish`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: accessToken,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.id) {
    throw new Error(`Failed to publish Instagram container: ${JSON.stringify(data)}`);
  }

  console.log(`Published to Instagram! Media ID: ${data.id}`);
  return data.id;
}
