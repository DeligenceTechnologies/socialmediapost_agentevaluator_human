// app/scheduler/page.js
"use client";

import { useState, useEffect } from "react";

export default function Home() {
  // Basic form and process state.
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentResult, setAgentResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [scheduleTime, setScheduleTime] = useState("");

  // Workflow stage and progress states.
  const [workflowStage, setWorkflowStage] = useState(null);
  const [progress, setProgress] = useState(0);
  const [showFinalResult, setShowFinalResult] = useState(false);

  // Human review states.
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewStage, setReviewStage] = useState(null);
  const [threadId, setThreadId] = useState("");

  // app/scheduler/page.js (or wherever you define it)
const generateThreadId = () => {
  // no localStorage, just a fresh one every time
  return `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
};

  // Workflow stages with labels, progress, durations, and emojis.
  const workflowStages = {
    content: { label: "Creating Content", progress: 20, duration: 9000, emoji: "📝" },
    contentReview: { label: "Reviewing Content", progress: 40, duration: 30000, emoji: "🔍" },
    prompt: { label: "Creating Image Prompt", progress: 50, duration: 3000, emoji: "🎨" },
    image: { label: "Generating Image", progress: 70, duration: 20000, emoji: "🖼️" },
    imageReview: { label: "Reviewing Image", progress: 90, duration: 25000, emoji: "✅" },
    schedule: { label: "Scheduling Post", progress: 100, duration: 2000, emoji: "📅" },
  };

  // Animate progress for the current workflow stage.
  useEffect(() => {
    if (!workflowStage) return;
    const stage = workflowStages[workflowStage];
    const startTime = performance.now();
    const startProg = stage.progress - 15;
    const endProg = stage.progress;
    const duration = stage.label.includes("Review") ? 1500 : 800;

    const animate = (time) => {
      const elapsed = time - startTime;
      const pct = Math.min(elapsed / duration, 1);
      setProgress(startProg + (endProg - startProg) * pct);
      if (pct < 1 && !agentResult?.scheduledPost) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [workflowStage, agentResult]);

  // Automatically animate through workflow stages when processing.
  useEffect(() => {
    if (!isLoading) return;
    const stages = Object.keys(workflowStages);
    let index = 0;
    const timers = [];
    const nextStage = () => {
      if (index < stages.length && !agentResult?.scheduledPost) {
        setWorkflowStage(stages[index]);
        timers.push(
          setTimeout(() => {
            index++;
            nextStage();
          }, workflowStages[stages[index]].duration)
        );
      }
    };
    nextStage();
    return () => timers.forEach(clearTimeout);
  }, [isLoading, agentResult]);

  // Define platforms (with icons/colors).
  const platforms = [
    {
      name: "Twitter",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
        </svg>
      ),
      color: "text-blue-400",
      hoverColor: "hover:bg-blue-100",
      activeColor: "bg-blue-100",
    },
    {
      name: "Facebook",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      color: "text-blue-600",
      hoverColor: "hover:bg-blue-50",
      activeColor: "bg-blue-50",
    },
    {
      name: "Instagram",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.849.07 1.17.056 1.804.247 2.227.415a4.588 4.588 0 011.675 1.111 4.588 4.588 0 011.111 1.675c.168.423.359 1.057.415 2.227.058 1.265.07 1.645.07 4.849s-.012 3.584-.07 4.849c-.056 1.17-.247 1.804-.415 2.227a4.625 4.625 0 01-1.111 1.675 4.625 4.625 0 01-1.675 1.111c-.423.168-1.057.359-2.227.415-1.265.058-1.645.07-4.849.07s-3.584-.012-4.849-.07c-1.17-.056-1.804-.247-2.227-.415a4.588 4.588 0 01-1.675-1.111 4.588 4.588 0 01-1.111-1.675c-.168-.423-.359-1.057-.415-2.227C2.175 15.747 2.163 15.367 2.163 12s.012-3.584.07-4.849c.056-1.17.247-1.804.415-2.227a4.588 4.588 0 011.111-1.675 4.588 4.588 0 011.675-1.111c.423-.168 1.057-.359 2.227-.415C8.416 2.175 8.796 2.163 12 2.163zm0 5.838a4 4 0 110 8 4 4 0 010-8zm4.406-3.45a.92.92 0 11-1.84 0 .92.92 0 011.84 0z" />
        </svg>
      ),
      color: "text-pink-500",
      hoverColor: "hover:bg-pink-50",
      activeColor: "bg-pink-50",
    },
    {
      name: "LinkedIn",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
      color: "text-blue-700",
      hoverColor: "hover:bg-blue-50",
      activeColor: "bg-blue-50",
    },
  ];

  // Initiate the agent workflow.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setWorkflowStage("content");
    setShowFinalResult(false);
    setAgentResult(null);

    const tid = generateThreadId();
    setThreadId(tid);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          platforms: selectedPlatforms,
          scheduleTime:
            scheduleTime ||
            new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          threadId: tid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate");
      setAgentResult(data);
      if (!data.scheduledPost) {
        if (data.next === "humanReviewContent") setReviewStage("content");
        else if (data.next === "humanReviewImage") setReviewStage("image");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle submission of human review feedback.
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          resumeValue: reviewFeedback,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resume");
      setAgentResult(data);
      setReviewFeedback("");
      if (data.scheduledPost) {
        setReviewStage(null);
        setShowFinalResult(true);
      } else {
        if (data.next === "humanReviewContent") setReviewStage("content");
        else if (data.next === "humanReviewImage") setReviewStage("image");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-100 via-white to-blue-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Initial form */}
        {!showFinalResult && !agentResult && (
          <form onSubmit={handleSubmit} className="mb-8 bg-white p-6 rounded-xl shadow-lg">
            {/* Topic */}
            <div className="mb-4">
              <label className="block mb-2 font-medium">Topic:</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              />
            </div>
            {/* Platforms */}
            <div className="mb-4">
              <label className="block mb-2 font-medium">Platforms:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {platforms.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() =>
                      setSelectedPlatforms((prev) =>
                        prev.includes(p.name)
                          ? prev.filter((x) => x !== p.name)
                          : [...prev, p.name]
                      )
                    }
                    className={`flex items-center justify-center space-x-2 p-4 rounded-lg border-2 transition-all duration-300 ${
                      selectedPlatforms.includes(p.name)
                        ? `${p.activeColor} border-${p.color.split("-")[1]}-400`
                        : "border-gray-200 " + p.hoverColor
                    }`}
                  >
                    <span className={p.color}>{p.icon}</span>
                    <span
                      className={`font-medium ${
                        selectedPlatforms.includes(p.name) ? p.color : "text-gray-600"
                      }`}
                    >
                      {p.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {/* Schedule Time */}
            <div className="mb-6">
              <label className="block mb-2 font-medium">Schedule Time:</label>
              <input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full p-4 pl-12 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white hover:bg-purple-50 cursor-pointer"
              />
              <p className="mt-2 text-sm text-gray-500">
                Select a future date and time for your post
              </p>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating Magic..." : "Generate & Schedule Post"}
            </button>
          </form>
        )}

        {/* Loading & Progress */}
        {isLoading && (
          <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
              Creating Your Post
            </h2>
            <div className="relative pt-1 mb-6">
              <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-purple-100">
                <div
                  style={{ width: `${progress}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 ease-out"
                />
              </div>
              <div className="text-center text-sm text-gray-600">
                {Math.round(progress)}% Complete
              </div>
            </div>
            <div className="space-y-6">
              {Object.entries(workflowStages).map(([stage, { label, emoji }]) => (
                <div key={stage} className="flex items-center space-x-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      workflowStage === stage
                        ? stage.includes("Review")
                          ? "animate-pulse text-yellow-500"
                          : "animate-spin-slow text-purple-600"
                        : workflowStage &&
                          Object.keys(workflowStages).indexOf(stage) <
                            Object.keys(workflowStages).indexOf(workflowStage)
                        ? "bg-green-500"
                        : "bg-gray-200"
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                  </div>
                  <div className="flex-1">
                    <span
                      className={`font-medium transition-all duration-300 ${
                        workflowStage === stage ? "text-purple-600" : "text-gray-600"
                      }`}
                    >
                      {label}
                    </span>
                    {workflowStage === stage && (
                      <div className="text-sm text-gray-500 animate-pulse">
                        {stage.includes("Review") ? "Waiting for your review..." : "Processing..."}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Human Review Section */}
        {agentResult && reviewStage && (
          <div className="mt-8 bg-white p-6 rounded shadow-md">
            <h2 className="text-2xl font-bold mb-4">
              {reviewStage === "content" ? "Review Generated Content" : "Review Generated Image"}
            </h2>
            {reviewStage === "content" && (
              <form onSubmit={handleReviewSubmit}>
                <p className="mb-2">Generated Content:</p>
                <div className="p-4 border rounded bg-gray-50 mb-4">
                  {agentResult.finalContent}
                </div>
                <label className="block mb-2 font-medium">
                  Edit or Confirm the content below:
                </label>
                <textarea
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  rows={6}
                  className="w-full p-3 border rounded mb-4"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-600 text-white p-3 rounded"
                >
                  {isLoading ? "Submitting Review..." : "Submit Review & Continue"}
                </button>
              </form>
            )}
            {reviewStage === "image" && (
  <form onSubmit={handleReviewSubmit}>
    <p className="mb-2">Generated Image Prompt:</p>
    <div className="p-3 mb-4 bg-gray-50 rounded border">
      <em>{agentResult.imagePrompt}</em>
    </div>

    <p className="mb-2">Here’s the image we generated:</p>
    <div className="mb-4">
      <img src={agentResult.imageUrl} alt="Generated" className="w-full rounded shadow" />
    </div>

    <label className="block mb-2 font-medium">
      Type “yes” to keep, or describe what you’d like to change so we can tweak the prompt:
    </label>
    <textarea
      value={reviewFeedback}
      onChange={(e) => setReviewFeedback(e.target.value)}
      rows={4}
      placeholder="e.g. ‘Make the sky more dramatic and golden.’"
      className="w-full p-3 border rounded mb-4"
      required
    />
    <button
      type="submit"
      disabled={isLoading}
      className="w-full bg-green-600 text-white p-3 rounded"
    >
      {isLoading ? "Submitting Review..." : "Submit Review & Continue"}
    </button>
  </form>
)}

          </div>
        )}

        {/* Final Result Section */}
        {agentResult && !reviewStage && showFinalResult && (
          <div className="bg-white p-8 rounded-xl shadow-md animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Your Post is Ready!</h2>
              <p className="text-gray-600 text-lg">Topic: {topic}</p>
            </div>
            {agentResult.scheduledPost && (
              <div className="mb-8">
                <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 p-1 rounded-xl shadow-lg">
                  <div className="bg-white p-6 rounded-lg">
                    <div className="flex items-center justify-center space-x-3 mb-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <h3 className="text-2xl font-bold text-gray-800">Post Scheduled Successfully!</h3>
                    </div>
                    <div className="text-center text-sm text-gray-600">
                      Scheduled for:{" "}
                      <span className="text-purple-600 font-semibold">
                        {new Date(agentResult.scheduledPost.scheduleTime).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-center text-sm text-gray-600">
                      Platforms:{" "}
                      <span className="text-blue-600 font-semibold">
                        {agentResult.scheduledPost.platforms.join(", ")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-8">
              {/* Content Card */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300">
                <h3 className="font-bold text-xl text-gray-700 mb-4 text-center">Content</h3>
                <div className="bg-white p-6 rounded-lg shadow-inner border-2 border-gradient-animate">
                  <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-lg">
                    {agentResult.finalContent}
                  </p>
                </div>
              </div>
              {/* Image Card */}
              {agentResult.imageUrl ? (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300">
                  <h3 className="font-bold text-xl text-gray-700 mb-4 text-center">Generated Image</h3>
                  <div className="bg-white p-4 rounded-lg shadow-inner border-2 border-gradient-animate">
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg shadow-rainbow">
                      <img
                        src={agentResult.imageUrl}
                        alt="Generated content"
                        className="absolute inset-0 w-full h-full object-contain hover:scale-105 transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow text-center">
                  <p className="text-gray-700">No valid image available.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-lg">
            Error: {error}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin-slow { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 3s linear infinite; }
        @keyframes pulse-rainbow {
          0% { box-shadow: 0 0 0 0 rgba(139,92,246,0.4), 0 0 0 0 rgba(236,72,153,0.4), 0 0 0 0 rgba(59,130,246,0.4); }
          50% { box-shadow: 0 0 20px 0 rgba(139,92,246,0.6), 0 0 20px 0 rgba(236,72,153,0.6), 0 0 20px 0 rgba(59,130,246,0.6); }
          100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.4), 0 0 0 0 rgba(236,72,153,0.4), 0 0 0 0 rgba(59,130,246,0.4); }
        }
        .animate-pulse-rainbow { animation: pulse-rainbow 2s infinite; }
        @keyframes gradient-shift {
          0% { transform: translateX(-50%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-gradient-shift {
          animation: gradient-shift 8s linear infinite;
          background-size: 200% 100%;
        }
        .border-gradient-animate {
          position: relative;
          border: none;
        }
        .border-gradient-animate::before {
          content: "";
          position: absolute;
          inset: -2px;
          background: linear-gradient(90deg, #9333ea, #ec4899, #3b82f6, #9333ea);
          background-size: 400% 100%;
          animation: moveGradient 4s linear infinite;
          border-radius: 0.5rem;
          z-index: -1;
        }
        @keyframes moveGradient { 0% { background-position: 0% 0%; } 100% { background-position: 200% 0%; } }
        .shadow-rainbow {
          box-shadow: 0 0 10px rgba(147,51,234,0.3), 0 0 20px rgba(236,72,153,0.3), 0 0 30px rgba(59,130,246,0.3);
          transition: box-shadow 0.3s ease;
        }
        .shadow-rainbow:hover {
          box-shadow: 0 0 15px rgba(147,51,234,0.5), 0 0 30px rgba(236,72,153,0.5), 0 0 45px rgba(59,130,246,0.5);
        }
      `}</style>
    </main>
  );
}
