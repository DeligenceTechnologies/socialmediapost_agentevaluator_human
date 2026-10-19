
async function postToTwitter({ content, imageUrl }) {
  console.log("Posting to Twitter:", content, imageUrl);
  return { success: true, platform: "twitter", postId: "tw123" };
}

async function postToFacebook({ content, imageUrl }) {
  console.log("Posting to Facebook:", content, imageUrl);
  return { success: true, platform: "facebook", postId: "fb123" };
}

async function postToInstagram({ content, imageUrl }) {
  console.log("Posting to Instagram:", content, imageUrl);
  return { success: true, platform: "instagram", postId: "ig123" };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { platform, content, imageUrl, scheduledTime } = req.body;
    if (!platform || !content) {
      return res.status(400).json({ error: "Platform and content are required" });
    }
    let postResult;

    // If scheduledTime is provided, simulate scheduling.
    if (scheduledTime) {
      postResult = {
        success: true,
        platform,
        scheduledTime,
        message: "Post scheduled successfully",
      };
    } else {
      if (platform === "twitter") {
        postResult = await postToTwitter({ content, imageUrl });
      } else if (platform === "facebook") {
        postResult = await postToFacebook({ content, imageUrl });
      } else if (platform === "instagram") {
        postResult = await postToInstagram({ content, imageUrl });
      } else {
        return res.status(400).json({ error: "Unsupported platform" });
      }
    }
    return res.status(200).json(postResult);
  } catch (error) {
    console.error("Post API Error:", error);
    return res.status(500).json({
      error: "Error posting content",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}
