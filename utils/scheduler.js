// scheduler.js

import { Pool } from "pg";
import fetch from "node-fetch";

// Initialize PostgreSQL pool using DATABASE_URL from the environment.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Function to check for scheduled posts that are due to be posted.
async function checkScheduledPosts() {
  try {
    const now = new Date();
    const query = `
      SELECT * FROM scheduled_posts
      WHERE schedule_time <= $1
      AND status = 'scheduled'
    `;
    const res = await pool.query(query, [now.toISOString()]);
    if (res.rows.length === 0) {
      console.log(`${now.toLocaleString()}: No posts scheduled at this time.`);
    } else {
      for (const post of res.rows) {
        console.log(`${now.toLocaleString()}: Found scheduled post ${post.id}. Posting now...`);
        // Trigger the post by calling your post API endpoint (adjust the endpoint URL as needed)
        const response = await fetch("http://localhost:3000/api/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: post.id,
            content: post.content,
            imageUrl: post.image_url,
            platforms: post.platforms,
          }),
        });
        if (response.ok) {
          console.log(`Post ${post.id} has been posted successfully.`);
          // Update the status to 'posted'
          const updateQuery = `
            UPDATE scheduled_posts
            SET status = 'posted', updated_at = NOW()
            WHERE id = $1
          `;
          await pool.query(updateQuery, [post.id]);
        } else {
          console.error(`Failed to post ${post.id}.`);
        }
      }
    }
  } catch (err) {
    console.error("Error in scheduler:", err);
  }
}

// Check every minute (60000 ms)
setInterval(checkScheduledPosts, 60000);

// Optionally, immediately check on startup.
checkScheduledPosts();
