# AI Social Media Post Generator

**Research-backed content and AI-generated visuals, with a human making the final call at every review stage.**

This Next.js application helps a user turn a topic into a social media post and matching image. It researches the topic, drafts copy, pauses for feedback, generates an image, and pauses again. Both review steps can repeat until the user approves. LangGraph coordinates the process; PostgreSQL stores checkpoints so an interrupted workflow can resume in a later API request.

> **Project status:** Working prototype / development project. The workflow currently produces a **scheduled-post result**, but the `scheduleAgent` in the supplied code does **not** insert it into `scheduled_posts`. The `/api/post` route simulates social-platform posting; it does not publish real posts. See [Known limitations](#known-limitations-and-next-steps) before production use.

## What can you do with it?

- Generate draft posts for **LinkedIn, Facebook, Instagram, and Twitter/X**.
- Enrich drafts with web research using Tavily and article extraction using Cheerio.
- Review the generated text and request revisions in natural language.
- Generate a contextual image using OpenAI DALL·E 3.
- View the actual image, request changes, and regenerate it until approved.
- Select a target platform and planned date/time.
- Resume paused human-review workflows using PostgreSQL-backed LangGraph checkpoints.

## How it works

```mermaid
flowchart TD
    A[Enter topic, platforms and schedule time] --> B[Manager]
    B --> C[Research with Tavily]
    C --> D[Scrape and summarize sources]
    D --> E[Generate content with GPT-4]
    E --> F{Human reviews content}
    F -->|Request changes| E
    F -->|Approve| G[Generate image prompt]
    G --> H[Generate image with DALL-E 3]
    H --> I{Human reviews image}
    I -->|Request changes| G
    I -->|Approve| J[Build scheduled-post result]
    J --> K[Finish]
```

### Meet the agents

**1. Manager agent — starts the process.** Receives the user's topic, selected platforms, and desired schedule time, then initiates the research stage.

**2. Research agent — finds relevant background material.** Searches with Tavily, scores the results, and keeps sources meeting a configured quality threshold (`0.5`). If research fails, the code attempts to obtain fallback URLs. Research is best-effort; source quality should still be reviewed.

**3. Scrape agent — turns articles into useful context.** Uses Cheerio to extract webpage text and asks GPT-4 to summarize it. If no valid URLs are available, the workflow can still draft content based on the topic alone.

**4. Content agent — writes the post.** Generates a draft using the topic, available research summary, selected platform(s), and any revision feedback from earlier rounds.

**5. Human content reviewer — waits for your decision.** LangGraph's `interrupt()` pauses execution and sends the draft to the UI. A short approval response continues to the image prompt. Revision instructions are saved as feedback and sent back to the content agent; the next draft is presented for another review.

**6. Image prompt agent — translates the approved copy into visual direction.** Uses the approved content and, on revision rounds, the user's image feedback to create a new image-generation prompt.

**7. Image agent — makes the visual.** Calls `utils/imageGeneration.js`, which requests a `1024 × 1024` image from DALL·E 3 and returns an image URL.

**8. Human image reviewer — lets you refine the result.** Pauses for image review. Enter **`yes`** to approve, or describe the change you want. Requested changes go back to the image prompt agent and a new image is generated for another review.

**9. Schedule agent — assembles the approved post.** Packages the content, image URL, platforms, and requested schedule time into a `scheduledPost` object and finishes the workflow. **As currently implemented, this step does not write to the database or schedule a real social media publication.**

### Example review conversation

1. **User:** “Employees are assets—value them” → the app researches the topic and drafts a LinkedIn post.
2. **User feedback:** “Highlight practical ways leaders can value their employees.” → the content agent rewrites the post; the original feedback is not used as the finished copy.
3. **User:** “ok” → the app creates a prompt and generates an image based on the approved post.
4. **User feedback:** “Use a modern office scene with a small collaborative team.” → a revised image prompt and image are generated.
5. **User:** “yes” → the workflow returns the assembled scheduled-post result.

## Technology stack

| Area | Technology | Purpose |
| --- | --- | --- |
| UI | Next.js 15, React 19 | User input, progress display, content/image review |
| Styling | Tailwind CSS 4, JSX/CSS | Responsive UI and visual feedback |
| Backend | Next.js Pages API Routes | Start and resume workflow through HTTP |
| Orchestration | LangGraph (`StateGraph`, `Command`, `interrupt`) | Agent sequencing and human-review loops |
| Text AI | LangChain `ChatOpenAI`, GPT-4 | Summaries, social copy, image prompts |
| Web research | Tavily search | Discover topic-specific sources |
| Content extraction | Cheerio web loader | Read source-page text |
| Image AI | OpenAI DALL·E 3 | Generate post imagery |
| Database | PostgreSQL, `pg` | Database connectivity and application storage |
| Persistence | `@langchain/langgraph-checkpoint-postgres` | Checkpoint interrupted LangGraph threads |

## Project structure

```text
.
├── app/
│   ├── page.js                    # Main UI and review forms
│   ├── layout.js                  # Root layout and metadata
│   └── globals.css                # Global styles
├── pages/api/
│   ├── agent.js                   # LangGraph nodes, edges, initial run
│   ├── agent/resume.js            # Resume a paused graph with human feedback
│   ├── schedule.js                # Separate scheduling API
│   └── post.js                    # Mock social posting API
├── utils/
│   ├── imageGeneration.js         # DALL-E 3 integration
│   ├── db.js                      # PostgreSQL pool helper
│   └── scheduler.js               # Scheduling utility (see limitations)
├── public/                       # Static assets
├── package.json
└── README.md
```

## Getting started locally

### Prerequisites

- A supported Node.js release for Next.js 15 (**Node.js 20+ recommended**).
- npm.
- A running PostgreSQL database and a database account permitted to create LangGraph checkpoint tables.
- An OpenAI API key with access to the configured text and image models.
- A Tavily API key for research.

### 1. Clone and install

```bash
git clone <YOUR_ORGANIZATION_REPOSITORY_URL>
cd socialmediapost_agentevaluator_human
npm ci
```

Replace the repository URL and directory name with the actual values used by your organization.

### 2. Configure environment variables

Create `.env.local` in the project root. **Do not commit real credentials.**

```dotenv
OPENAI_API_KEY=your_openai_api_key
TAVILY_API_KEY=your_tavily_api_key
DATABASE_URL=postgresql://username:password@localhost:5432/posts
```

The repository also includes an `.env.example`, but it currently omits `TAVILY_API_KEY` and `DATABASE_URL`. Add placeholder entries for them when maintaining the project template. Variables such as `NEXTAUTH_SECRET` and Google OAuth credentials in that template relate to authentication scaffolding and are not required by the core generation workflow shown here.

### 3. Prepare PostgreSQL

Create the database if it does not exist and ensure the configured user can create tables. The app calls the Postgres checkpointer's `setup()` method before its initial graph invocation; this should initialize the library's checkpoint schema.

**Do not manually invent the checkpoint table structure.** The schema must match the installed checkpointer version. Existing databases with manually created or partially migrated checkpoint tables may need inspection or a controlled migration. Preserve any data you need before resetting development tables.

### 4. Start the development server

```bash
npm run dev
```

Open **http://localhost:3000** and enter a topic, choose a platform, and generate a draft.

Other commands:

```bash
npm run build    # Create a production build
npm run start    # Start the built application
```

> `package.json` also defines `npm run lint` as `next lint`; this may require adjustment for Next.js 15, because the command is not available in all Next.js versions/configurations. No automated test suite is included in the uploaded project.

## Using the app

The user enters a **topic**, selects one or more platforms, and optionally chooses a date/time. The app shows progress while researching and drafting. At **content review**, the user reads the draft and replies with an approval such as `ok`, or with specific instructions such as “Make the opening more compelling.” The revised copy is presented again. After content approval, the system generates an image, displays it, and accepts approval (`yes`) or visual-change instructions such as “Use warmer lighting.” Once the image is approved, the current implementation displays the assembled result.

**Approval wording currently differs between stages:** content recognizes `ok`, `it is okay`, `looks good`, or an empty response; image review recognizes **`yes`**. Use those terms when testing the current code.

## API overview

| Method | Endpoint | What it does |
| --- | --- | --- |
| `POST` | `/api/agent` | Starts a new graph run and pauses at content review |
| `POST` | `/api/agent/resume` | Resumes the same graph thread with user feedback |
| `GET`, `POST` | `/api/schedule` | Separate scheduling utility API |
| `POST` | `/api/post` | Simulates posting or scheduling; not a live integration |

**Start a workflow**

```bash
curl -X POST http://localhost:3000/api/agent \
  -H 'Content-Type: application/json' \
  -d '{
    "topic": "How to value employees",
    "platforms": ["LinkedIn"],
    "scheduleTime": "2026-11-01T10:00:00",
    "threadId": "example-run-001"
  }'
```

**Resume after review** (using the exact same `threadId`):

```bash
curl -X POST http://localhost:3000/api/agent/resume \
  -H 'Content-Type: application/json' \
  -d '{
    "threadId": "example-run-001",
    "resumeValue": "Please emphasize employee recognition."
  }'
```

To accept the content, send `"resumeValue": "ok"`. To accept an image, send `"resumeValue": "yes"`. The backend checkpoints the workflow between calls. The current UI reads the returned `next` field to determine which review to show.

**Thread management:** use a **new, unique thread ID for each new topic/run**, and keep that same ID for every review/resume request belonging to that run. Reusing a completed thread ID can mix old checkpoint state with new requests.

## Persistence and review loops

LangGraph's shared `Annotation` state carries the topic, research output, draft content, image prompt, generated image URL, user feedback, and final post result. Review nodes call `interrupt()` and wait for a later request to `/api/agent/resume`. That route submits `new Command({ resume: ... })` under the matching `thread_id`. `Command({ goto, update })` then selects the next agent and, when needed, stores feedback in graph state.

The checkpoint database retains intermediate states; it is **not** the same thing as a published-post queue. The separately named `scheduled_posts` table is not currently written by `scheduleAgent`.

## Known limitations and next steps

- **Scheduling is not end-to-end:** `scheduleAgent` currently constructs an in-memory `scheduledPost` result without inserting it into PostgreSQL; the `/api/post` platform handlers are mocks.
- **The separate scheduler utility needs integration work:** its polling mechanism, database status expectations, and `/api/post` payload conventions should be aligned before enabling real posting.
- **Image links are temporary:** DALL·E image URLs may expire. Store approved images in durable object storage before using them for future scheduled posts.
- **Content revisions require a state fix:** the `contentAgent` and human-review node use `state.feedback`, but **`feedback` is missing from the current `AgentState` annotation**. Add this field before relying on repeated content revisions. Likewise, `researchRetries` is referenced but not declared.
- **Graph routing needs verification:** `humanReviewContent` can route to `content` on revision, but its node's declared `ends` currently lists only `prompt`. Add `content` to that declaration.
- **Checkpoint initialization needs consistent handling:** the initial API route awaits `setupPromise`, while the resume route imports `compiledGraph` directly. Ensure checkpoint setup has completed before serving resume requests on independently initialized processes.
- **Security before deployment:** `next.config.mjs` currently exposes `OPENAI_API_KEY` through `env`, which is inappropriate for a server-only secret. Remove that mapping. API routes should also have authentication, authorization, input validation, and rate limiting before public exposure.
- **Research quality:** article scraping can fail or return incomplete material; generated claims need review, especially for news and quantitative assertions.
- **Operational maturity:** add automated tests, structured logs, error recovery, observability, and a deliberate deployment strategy for scheduled background jobs.

These items describe the **uploaded code as inspected**, not features already completed.

## Before pushing to the organization's GitHub

- [ ] **Check that `.env` and `.env.local` are not tracked.** They were present in the uploaded archive. `.gitignore` excludes `.env*`, but ignored files may still be tracked from earlier commits; audit Git history and rotate any exposed credentials.
- [ ] **Remove the `OPENAI_API_KEY` entry from `next.config.mjs`'s `env` object** so it remains server-side.
- [ ] Keep `node_modules/`, `.next/`, `.DS_Store`, and development output outside version control.
- [ ] Update `.env.example` with placeholder-only values for `OPENAI_API_KEY`, `TAVILY_API_KEY`, and `DATABASE_URL`.
- [ ] Test a fresh run, content-feedback loop, image-feedback loop, and approval/completion path with a new thread ID.
- [ ] Confirm database privileges, checkpointer version, and migrations in the deployment environment.
- [ ] Decide whether the product is a **draft-and-review prototype** or a **fully functioning scheduler**, and implement the missing persistence/posting functionality before claiming the latter.
- [ ] Review organizational access controls, branch protections, and dependency/license policies.

Useful local checks:

```bash
git status --short
git ls-files | grep -E '(^|/)(\.env(\..*)?|node_modules|\.next)(/|$)' || true
git diff --cached --name-only
```

If secrets were **ever committed**, removing them from the latest commit is not sufficient: revoke/rotate affected keys and follow the organization's secret-remediation process.

## Contributing

Contributions should follow your organization's repository and review policies. For a code change, describe the behavior, note affected graph nodes or routes, explain how you tested both approval and revision paths, and avoid placing real API keys, user content, or expiring image URLs in logs or pull requests.

## References

- [LangGraph JavaScript](https://langchain-ai.github.io/langgraphjs/)
- [LangChain JavaScript](https://js.langchain.com/)
- [Next.js](https://nextjs.org/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [PostgreSQL](https://www.postgresql.org/docs/)

---

**Guiding principle:** AI drafts and revises; a human reviews and decides when to continue.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
