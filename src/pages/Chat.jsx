import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import client from "../api/client";
import { motion } from "framer-motion";
import MessageBubble from "../components/chat/MessageBubble";
import AgentActionState from "../components/chat/AgentActionState";
import TopAppBar from "../components/layout/TopAppBar";
import BottomNav from "../components/layout/BottomNav";
import { AuthContext } from "../context/AuthContext";
import { ArrowLeft } from "lucide-react";

const Chat = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [agentState, setAgentState] = useState(null);
  const [debugMode, setDebugMode] = useState(false);

  const messagesEndRef = useRef(null);
  const isResumingRef = useRef(false);

  const suggestedQuestions = [
    "What have I eaten today?",
    "Analyze my macros for yesterday",
    "Am I on track for my protein goals?",
  ];

  const quickReplies = [
    "More suggestions",
    "Log this meal",
    "Check my macros",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, agentState, loading]);

  const resumeAgentLoopFromTool = async (initialPayload, activeSessionId) => {
    setLoading(true);
    try {
      let currentPayload = initialPayload;
      let aiDone = false;

      while (!aiDone) {
        // Send message/tool result to get AI response
        const { data: aiResponse } = await client.post(
          "/api/chat/message",
          currentPayload,
        );

        console.log("AI Response Received during resume:", aiResponse);

        // Add message to UI
        setMessages((prev) => [...prev, aiResponse]);

        if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
          const toolCall = aiResponse.toolCalls[0];
          const toolArgs = typeof toolCall.function.arguments === "string"
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments || {};

          // Show Agent Action State
          setAgentState({
            toolName: toolCall.function.name,
            toolArgs: toolArgs,
            isExecuting: true,
            result: null,
          });

          // Execute Tool
          const { data: toolData } = await client.post(
            "/api/chat/execute-tool",
            {
              toolName: toolCall.function.name,
              toolArgs: toolArgs,
              sessionId: activeSessionId,
              toolCallId: toolCall.id,
            },
          );

          // Update Action State
          setAgentState((prev) => ({
            ...prev,
            isExecuting: false,
            result: toolData.result,
          }));

          // Prepare next iteration
          currentPayload = {
            sessionId: activeSessionId,
            role: "tool",
            content: toolData.result,
            toolCallId: toolCall.id,
            name: toolCall.function.name,
          };
        } else {
          // Final text response
          aiDone = true;
          setAgentState(null); // Clear agent state when done
          setLoading(false);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          _id: Date.now().toString(),
          role: "assistant",
          content:
            "Sorry, I encountered an error communicating with the AI during tool resumption. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Initialize Session
  useEffect(() => {
    isResumingRef.current = false;
    const initSession = async (attemptId = null) => {
      try {
        setLoading(true);
        // 1. Try provided ID, then URL param, then localStorage
        const targetId = attemptId || id || localStorage.getItem("lastSessionId");

        try {
          const { data } = await client.post("/api/chat/session", {
            sessionId: targetId,
          });
          setSessionId(data._id);
          localStorage.setItem("lastSessionId", data._id);

          // 2. Load existing messages if this is a resumed session
          const { data: history } = await client.get(
            `/api/chat/session/${data._id}/messages`,
          );
          if (history && history.length > 0) {
            setMessages(history);

            // Auto-detect and resume pending tool calls from the last assistant message
            const lastMsg = history[history.length - 1];
            if (lastMsg && lastMsg.role === "assistant" && lastMsg.toolCalls && lastMsg.toolCalls.length > 0) {
              if (isResumingRef.current) return;
              isResumingRef.current = true;

              const pendingToolCall = lastMsg.toolCalls[0];
              const resumeLoop = async () => {
                const args = typeof pendingToolCall.function.arguments === "string"
                  ? JSON.parse(pendingToolCall.function.arguments)
                  : pendingToolCall.function.arguments;

                setAgentState({
                  toolName: pendingToolCall.function.name,
                  toolArgs: args,
                  isExecuting: true,
                  result: null,
                });

                try {
                  // Execute the pending tool
                  const { data: toolData } = await client.post(
                    "/api/chat/execute-tool",
                    {
                      toolName: pendingToolCall.function.name,
                      toolArgs: args,
                      sessionId: data._id,
                      toolCallId: pendingToolCall.id,
                    },
                  );

                  setAgentState({
                    toolName: pendingToolCall.function.name,
                    toolArgs: args,
                    isExecuting: false,
                    result: toolData.result,
                  });

                  // Trigger the resumption loop with the tool result payload
                  await resumeAgentLoopFromTool(
                    {
                      sessionId: data._id,
                      role: "tool",
                      content: toolData.result,
                      toolCallId: pendingToolCall.id,
                      name: pendingToolCall.function.name,
                    },
                    data._id
                  );

                } catch (err) {
                  console.error("Failed to execute pending tool call on load:", err);
                }
              };
              // Run resumption loop after a slight delay to allow state updates to settle
              setTimeout(resumeLoop, 100);
            }
          } else {
            setMessages([
              {
                _id: "welcome",
                role: "assistant",
                content:
                  "Hello! I'm your Mezan AI Coach. How can I help you balance your nutrition today?",
              },
            ]);
          }
        } catch (apiError) {
          if (apiError.response?.status === 404 && targetId) {
            console.log("Old session not found (404), starting a new one automatically.");
            localStorage.removeItem("lastSessionId");
            // Instead of throwing, fall back to a fresh session
            const { data } = await client.post("/api/chat/session", { new: true });
            setSessionId(data._id);
            localStorage.setItem("lastSessionId", data._id);
            setMessages([
              {
                _id: "welcome",
                role: "assistant",
                content: "Hello! I'm your Mezan AI Coach. How can I help you balance your nutrition today?",
              },
            ]);
          } else {
            throw apiError;
          }
        }
      } catch (error) {
        console.error("Failed to init session", error);
      } finally {
        setLoading(false);
      }
    };
    initSession();
  }, [id]);

  const executeAgentLoop = async (userText, imageUrl = null) => {
    if (!sessionId || !userText.trim()) return;

    // Add User Message to UI
    const tempUserMsg = {
      _id: Date.now().toString(),
      role: "user",
      content: userText,
      imageUrl,
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setInput("");
    setLoading(true);
    setAgentState(null);

    try {
      let currentPayload = {
        sessionId,
        role: "user",
        content: userText,
        imageUrl,
      };
      let aiDone = false;

      while (!aiDone) {
        // Send message/tool result to get AI response
        const { data: aiResponse } = await client.post(
          "/api/chat/message",
          currentPayload,
        );

        console.log("AI Response Received:", aiResponse);

        // Add message to UI (MessageBubble will hide it if content is empty)
        setMessages((prev) => [...prev, aiResponse]);

        if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
          const toolCall = aiResponse.toolCalls[0];
          const toolArgs = JSON.parse(toolCall.function.arguments);

          // Show Agent Action State
          setAgentState({
            toolName: toolCall.function.name,
            toolArgs: toolArgs,
            isExecuting: true,
            result: null,
          });

          // Execute Tool
          const { data: toolData } = await client.post(
            "/api/chat/execute-tool",
            {
              toolName: toolCall.function.name,
              toolArgs: toolArgs,
              sessionId,
              toolCallId: toolCall.id,
            },
          );

          // Update Action State
          setAgentState((prev) => ({
            ...prev,
            isExecuting: false,
            result: toolData.result,
          }));

          // Prepare next iteration
          currentPayload = {
            sessionId,
            role: "tool",
            content: toolData.result,
            toolCallId: toolCall.id,
            name: toolCall.function.name,
          };
        } else {
          // Final text response
          aiDone = true;
          setAgentState(null); // Clear agent state when done
          setLoading(false);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          _id: Date.now().toString(),
          role: "assistant",
          content:
            "Sorry, I encountered an error communicating with the AI. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() && !selectedImage) return;
    const textToSend = input.trim() || "I have uploaded an image.";
    executeAgentLoop(textToSend, selectedImage);
    setSelectedImage(null);
  };

  const startNewSession = async () => {
    setSessionId(null);
    setMessages([]);
    setAgentState(null);
    try {
      const { data } = await client.post("/api/chat/session", { new: true });
      setSessionId(data._id);
      setMessages([
        {
          _id: "welcome",
          role: "assistant",
          content:
            "Hello! I'm your Mezan AI Coach. How can I help you balance your nutrition today?",
        },
      ]);
    } catch (error) {
      console.error("Failed to start new session", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-surface-off-white flex flex-col">
      {/* Top App Bar */}
      <header className="w-full sticky top-0 bg-surface-container-lowest/90 backdrop-blur-md z-40 shadow-sm">
        <div className="flex justify-between items-center px-[24px] py-3 max-w-[800px] mx-auto">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-all cursor-pointer group bg-surface-container-lowest border border-outline-variant/30 px-4 py-2 rounded-full shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="font-headline text-xl font-bold text-primary">Mezan میزان</div>

          <div className="flex items-center gap-2">
            {/* Debug Toggle */}
            <button
              onClick={() => setDebugMode(!debugMode)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                debugMode
                  ? "bg-primary text-on-primary shadow-sm"
                  : "hover:bg-surface-container-low text-on-surface-variant"
              }`}
              title="Debug Mode"
            >
              <span className="material-symbols-outlined text-[20px]">bug_report</span>
            </button>

            {/* New Session */}
            <button
              onClick={startNewSession}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-low text-on-surface-variant transition-colors active:scale-95 duration-150 cursor-pointer"
              title="New Chat"
            >
              <span className="material-symbols-outlined text-[20px]">add_comment</span>
            </button>
          </div>
        </div>
      </header>

      {/* Chat Canvas */}
      <main className="flex-grow flex flex-col max-w-[800px] w-full mx-auto px-[24px] py-6 overflow-y-auto pb-52 md:pb-36">


        {/* Date Badge */}
        <div className="text-center mb-6">
          <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest bg-surface-container-lowest px-4 py-1.5 rounded-full shadow-sm border border-outline-variant/20">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </span>
        </div>

        {/* Messages */}
        <div className="space-y-4">
          {messages.map((msg, idx) => {
            if (msg.role === "tool" && !debugMode) return null;

            if (msg.role === "tool") {
              return (
                <div
                  key={msg._id || idx}
                  className="text-[10px] font-mono bg-primary-container/10 p-4 rounded-xl text-primary my-2 border border-primary/25 shadow-sm"
                >
                  <span className="font-black mr-2 uppercase tracking-widest">
                    [SYSTEM_LOG]
                  </span>
                  {msg.name}: {msg.content}
                </div>
              );
            }

            return (
              <React.Fragment key={msg._id || idx}>
                {msg.role === "assistant" ? (
                  /* AI Message Bubble */
                  <div className="flex items-start gap-3 max-w-[90%]">
                    <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                      <span className="material-symbols-outlined text-on-primary-container text-[18px] fill-icon">smart_toy</span>
                    </div>
                    <div>
                      <MessageBubble message={msg} />
                    </div>
                  </div>
                ) : (
                  /* User Message Bubble */
                  <div className="flex items-end justify-end w-full">
                    <div className="max-w-[85%]">
                      <MessageBubble message={msg} />
                    </div>
                  </div>
                )}

                {debugMode && msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="text-[10px] font-mono bg-white p-4 rounded-xl text-on-surface-variant my-2 border border-outline-variant/30">
                    <span className="font-black mr-2 text-primary uppercase tracking-widest">
                      [CALL_LOG]
                    </span>
                    {JSON.stringify(msg.toolCalls[0])}
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Agent Action State */}
          {agentState && (
            <AgentActionState
              toolName={agentState.toolName}
              toolArgs={agentState.toolArgs}
              result={agentState.result}
              isExecuting={agentState.isExecuting}
            />
          )}

          {/* Typing Indicator */}
          {loading && !agentState?.isExecuting && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3"
            >
              {/* Bot Avatar with Active Glowing Dot */}
              <div className="relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border bg-white border-emerald-100/50 shadow-sm text-emerald-600">
                <span className="material-symbols-outlined text-emerald-600 text-[18px] fill-icon">smart_toy</span>
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              
              {/* Glassmorphic Thinking Canvas */}
              <div className="flex flex-col gap-2">
                <div className="bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 p-5 rounded-2xl rounded-tl-[4px] shadow-[0_4px_20px_rgba(0,0,0,0.015)] border border-emerald-100/40 backdrop-blur-md flex items-center gap-3">
                  <div className="flex items-center gap-1.5 h-3">
                    {[0, 1, 2].map((index) => (
                      <motion.div
                        key={index}
                        animate={{
                          scale: [0.8, 1.2, 0.8],
                          opacity: [0.35, 1, 0.35],
                          y: [0, -3, 0]
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.2,
                          ease: "easeInOut",
                          delay: index * 0.2
                        }}
                        className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                      />
                    ))}
                  </div>
                </div>
                {/* State-aware subtitle message */}
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="text-[10px] font-semibold text-emerald-700/60 uppercase tracking-widest ml-1"
                >
                  Nova is formulating plan...
                </motion.span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Bottom Input Area (Sticky) */}
      <div className="fixed bottom-[80px] md:bottom-0 left-0 w-full z-40 bg-surface-off-white/95 backdrop-blur-xl border-t border-surface-variant/50 pt-3 pb-5 px-[24px]">
        <div className="max-w-[800px] mx-auto">
          {/* Quick Reply Chips */}
          <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar -mx-[24px] px-[24px] md:mx-0 md:px-0">
            {(messages.length < 3 ? suggestedQuestions : quickReplies).map((q, i) => (
              <button
                key={i}
                onClick={() => executeAgentLoop(q)}
                disabled={loading || !sessionId}
                className="flex-shrink-0 text-[11px] font-semibold text-primary bg-primary-container/20 border border-primary-container px-4 py-2 rounded-full hover:bg-primary-container/40 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed tracking-wide"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Image Preview */}
          {selectedImage && (
            <div className="relative mb-3 inline-block ml-1">
              <img src={selectedImage} alt="Selected preview" className="h-20 w-20 object-cover rounded-xl shadow-md border-2 border-primary/20" />
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-error text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>
          )}

          {/* Input Box */}
          <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
            {/* Image Upload */}
            <label
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                sessionId && !loading
                  ? "text-on-surface-variant hover:bg-surface-container-low"
                  : "text-outline-variant/50 cursor-not-allowed"
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">add_photo_alternate</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={!sessionId || loading}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setSelectedImage(reader.result);
                    };
                    reader.readAsDataURL(file);
                  }
                  e.target.value = null; // reset
                }}
              />
            </label>

            {/* Text Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your AI coach..."
              disabled={!sessionId}
              className="flex-1 bg-surface-container-lowest border-none shadow-[0_4px_20px_-4px_rgba(17,24,39,0.05)] rounded-full py-3.5 pl-5 pr-14 focus:ring-2 focus:ring-primary focus:outline-none text-sm text-on-surface placeholder:text-on-surface-variant/50 transition-shadow"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={loading || (!input.trim() && !selectedImage) || !sessionId}
              className="absolute right-1.5 w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="material-symbols-outlined fill-icon text-[20px]">send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <BottomNav />
    </div>
  );
};

export default Chat;
