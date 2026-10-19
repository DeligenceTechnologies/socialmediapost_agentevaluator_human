// pages/api/schedule.js
import {
  schedulePost,
  getScheduledPosts,
  validatePost,
} from "../../utils/scheduler";

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const post = req.body;

      // Validate the post
      validatePost(post);

      // Schedule the post
      const scheduledPost = await schedulePost(post);

      return res.status(200).json(scheduledPost);
    } catch (error) {
      console.error("Schedule API Error:", error);
      return res.status(400).json({ error: error.message });
    }
  } else if (req.method === "GET") {
    try {
      const posts = await getScheduledPosts();
      return res.status(200).json(posts);
    } catch (error) {
      console.error("Schedule API Error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
