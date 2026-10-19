
// pages/api/agent.js
import { ChatOpenAI } from "@langchain/openai";
import {
  StateGraph,
  START,
  END,
  Annotation,
  interrupt,
  Command,
} from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
console.log("PostgresSaver statics:", Object.keys(PostgresSaver));

import { generateImage } from "../../utils/imageGeneration";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import OpenAI from "openai";
import { Pool } from "pg";

// Initialize Postgres connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Instantiate the PostgresSaver
const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL);
// Kick off setup exactly once
//    wrap in try/catch so you can surface any errors in your logs
const setupPromise = checkpointer.setup();
/*const setupPromise = (async () => {
  try {
    console.log("[checkpointer] creating checkpoints table…");
    await checkpointer.setup();
    console.log("[checkpointer] setup complete");
  } catch (err) {
    console.error("[checkpointer] setup failed:", err);
    throw err;
  }
})();*/

// Constants and LLM clients
const QUALITY_THRESHOLD = 0.5;
const MAX_RESEARCH_RETRIES = 3;
const llm = new ChatOpenAI({ modelName: "gpt-4", temperature: 0.7, openAIApiKey: process.env.OPENAI_API_KEY });

// Shared Graph State
const AgentState = Annotation.Root({
  messages: Annotation({ reducer: (x, y) => x.concat(y), default: () => [] }),
  next: Annotation({ reducer: (x, y) => y ?? x, default: () => "manager" }),
  topic: Annotation({ reducer: (x, y) => y }),
  platforms: Annotation({ reducer: (x, y) => y, default: () => [] }),
  scheduleTime: Annotation({ reducer: (x, y) => y, default: () => null }),
  finalContent: Annotation({ reducer: (x, y) => y, default: () => null }),
  imagePrompt: Annotation({ reducer: (x, y) => y, default: () => null }),
  imageUrl: Annotation({ reducer: (x, y) => y, default: () => null }),
  imageFeedback:  Annotation({ reducer: (x, y) => y, default: () => null }),  // NEW
  researchData: Annotation({ reducer: (x, y) => y, default: () => null }),
  scrapedContent: Annotation({ reducer: (x, y) => y, default: () => null }),
  scheduledPost: Annotation({ reducer: (x, y) => y, default: () => null }),
});

function branchOrDefault(state, allowed, def) {
  const dest = state.next;
  return dest && allowed.includes(dest) ? dest : def;
}

const managerAgent = async (state) => ({ messages: [{ role: 'system', content: 'Starting workflow' }], next: 'research' });

const researchAgent = async (state) => {
  try {
    const tavily = new TavilySearchResults({ apiKey: process.env.TAVILY_API_KEY, maxResults: 5 });
    const raw = await tavily.invoke({ input: `Find 3 articles on ${state.topic}` });
    let data = JSON.parse(raw || '[]');
    const good = data.filter((i) => i.score >= QUALITY_THRESHOLD);
    if (good.length) {
      return { messages: [{ role: 'assistant', content: JSON.stringify(good) }], next: 'scrape', researchData: JSON.stringify(good) };
    }
    throw new Error("no good");
  } catch (e) {
    if (state.researchRetries < MAX_RESEARCH_RETRIES) {
      const res = await llm.invoke([{ role: 'system', content: `Fallback URLs for ${state.topic}` }]);
      let urls = [];
      try { urls = JSON.parse(res.content); } catch {}
      return { next: 'scrape', researchRetries: state.researchRetries + 1, researchData: JSON.stringify(urls) };
    }
    return { next: 'scrape', researchData: JSON.stringify([]) };
  }
};

const scrapeAgent = async (state) => {
  let urls = [];
  try {
    const arr = JSON.parse(state.researchData || '[]');
    if (Array.isArray(arr)) urls = arr.map((o) => o.url).filter((u) => typeof u === 'string');
  } catch {}
  if (!urls.length) return { messages: [{ role: 'assistant', content: 'No URLs' }], next: 'content', scrapedContent: '' };
  const pages = await Promise.all(
    urls.map((u) => new CheerioWebBaseLoader(u).load()
      .then((docs) => docs.map((d) => d.pageContent).join('\n')).catch(() => '')
    )
  );
  const summary = await llm.invoke([
    { role: 'system', content: 'Summarize' },
    { role: 'user', content: pages.join('\n').slice(0, 15000) }
  ]);
  return { messages: [{ role: 'assistant', content: 'Scraped' }], next: 'content', scrapedContent: summary.content };
};

const contentAgent = async (state) => {
  // base context
  let promptInput = state.topic;
  if (state.scrapedContent) promptInput += '. ' + state.scrapedContent;

  // if there's feedback, ask the model to incorporate it
  if (state.feedback) {
    promptInput += `\n\nUser feedback: "${state.feedback}".\nPlease regenerate your post, incorporating that feedback.`;
  }

  const res = await llm.invoke([
    { role: 'system', content: `Write for ${state.platforms}` },
    { role: 'user',    content: promptInput }
  ]);

  return {
    messages:      [{ role: 'assistant', content: res.content }],
    next:          'humanReviewContent',
    finalContent:  res.content,
    feedback:      null,    // clear feedback for next cycle
  };
};

// before: you always goto "prompt" (skipping contentAgent)
// return new Command({ update: { finalContent: edited }, goto: 'prompt' })

const humanReviewContentAgent = async (state) => {
  const edited = interrupt({
    question: 'Review or tweak this copy before we generate an image prompt:',
    generatedContent: state.finalContent,
  });
  const norm = edited.trim().toLowerCase();
  const isConfirm = ['', 'it is okay', 'ok', 'looks good'].includes(norm);

  if (isConfirm) {
    // user is happy → move on
    return new Command({ goto: 'prompt' });
  } else {
    // user wants changes → stash feedback, re‑run content
    return new Command({
      update: { feedback: edited },   // save feedback
      goto: 'content',                // go back and regenerate
    });
  }
};


const promptAgent = async (state) => {
  let base = state.finalContent;
  // if they’ve already given image feedback, fold it in:
  if (state.imageFeedback) {
    base += `\n\nUser said: “${state.imageFeedback}”. Please regenerate an image prompt that addresses that.`;
  }
  const res = await llm.invoke([
    { role: "system", content: "Make image prompt"     },
    { role: "user",   content: base                    },
  ]);
  return {
    messages:   [{ role: "assistant", content: res.content }],
    next:       "image",
    imagePrompt: res.content,
    imageFeedback: null,         // clear old feedback once re‑prompted
  };
};

const imageAgent = async (state) => {
  const url = await generateImage(state.imagePrompt);
  return { messages: [{ role: 'assistant', content: 'Image done' }], next: 'humanReviewImage', imageUrl: url };
};

// Human review image: yes/no or tweak prompt
const humanReviewImageAgent = async (state) => {
  const feedback = interrupt({
    question: "Does this image look good? Reply “yes” to keep it, or tell me what to change:",
    generatedImageUrl: state.imageUrl,
  });

  if (feedback.trim().toLowerCase() === "yes") {
    return new Command({ goto: "schedule" });
  } else {
    // stash their feedback, then go back to promptAgent
    return new Command({
      update: { imageFeedback: feedback },
      goto:   "prompt",    // <— loop back
    });
  }
};

const scheduleAgent = async (state) => {
  const post = {
    id: Date.now().toString(),
    platforms: state.platforms,
    content: state.finalContent,
    imageUrl: state.imageUrl,
    scheduleTime: state.scheduleTime
  };
  return { messages: [{ role: 'assistant', content: 'Scheduled' }], next: END, scheduledPost: post };
};

// Build graph with explicit ends only
const graph = new StateGraph(AgentState)
  .addNode('manager', managerAgent)
  .addNode('research', researchAgent)
  .addNode('scrape', scrapeAgent)
  .addNode('content', contentAgent)
  .addNode('humanReviewContent', humanReviewContentAgent, { ends: ['prompt'] })
  .addNode('prompt', promptAgent, { ends: ['image'] })
  .addNode('image', imageAgent)
  .addNode('humanReviewImage', humanReviewImageAgent, { ends: ['schedule', 'prompt'] })
  .addNode('schedule', scheduleAgent, { ends: [END] })
  .addEdge(START, 'manager')
  .addEdge('manager', 'research')
  .addConditionalEdges('research', (st) => branchOrDefault(st, ['scrape'], 'scrape'), { scrape: 'scrape' })
  .addEdge('scrape', 'content')
  .addEdge('content', 'humanReviewContent')
  .addEdge('prompt', 'image')
  .addEdge('image', 'humanReviewImage')
  .addEdge('schedule', END);

export const compiledGraph = graph.compile({ checkpointer });

export default async function handler(req, res) {
  await setupPromise;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { topic, platforms, scheduleTime, threadId } = req.body;
    const initial = { topic, platforms, scheduleTime, messages: [], next: 'manager' };
    const result = await compiledGraph.invoke(initial, { configurable: { thread_id: threadId }});
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
