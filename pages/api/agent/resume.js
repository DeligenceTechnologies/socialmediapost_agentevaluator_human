// pages/api/agent/resume.js
import { Command } from "@langchain/langgraph";
import { compiledGraph } from "../agent"; // adjust path if needed

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ error: "Method not allowed, use POST" });
  }

  const { threadId, resumeValue } = req.body;
  if (!threadId) {
    return res.status(400).json({ error: "threadId is required" });
  }

  try {
    // Resume the graph using the provided thread ID
    const config = { configurable: { thread_id: threadId } };
    const result = await compiledGraph.invoke(
        new Command({ resume: resumeValue }),
        { configurable: { thread_id: threadId } }
);


    console.log("[resume] result:", result);
    return res.status(200).json(result);
  } catch (err) {
    console.error("[resume] error:", err);
    return res.status(500).json({ error: err.message });
  }
}
