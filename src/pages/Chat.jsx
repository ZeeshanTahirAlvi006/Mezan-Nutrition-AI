import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import client from "../api/client";
import {
  ArrowLeft,
  Send,
  Bot,
  Sparkles,
  Bug,
  RefreshCw,
  PlusCircle,
  LayoutDashboard,
  Utensils,
  MessageSquare,
  LogOut,
  User,
} from "lucide-react";
import { motion } from "framer-motion";
import MessageBubble from "../components/chat/MessageBubble";
import AgentActionState from "../components/chat/AgentActionState";

const Chat = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [agentState, setAgentState] = useState(null);
  const [debugMode, setDebugMode] = useState(false);

  const messagesEndRef = useRef(null);

  const suggestedQuestions = [
    "What have I eaten today?",
    "Analyze my macros for yesterday",
    "Am I on track for my protein goals?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, agentState, loading]);

  // Initialize Session
  useEffect(() => {
    const initSession = async () => {
      try {
        setLoading(true);
        // 1. Try URL param, then localStorage, then new session
        const targetId = id || localStorage.getItem('lastSessionId');
        
        const { data } = await client.post("/api/chat/session", { sessionId: targetId });
        setSessionId(data._id);
        localStorage.setItem('lastSessionId', data._id);

        // 2. Load existing messages if this is a resumed session
        const { data: history } = await client.get(`/api/chat/session/${data._id}/messages`);
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          setMessages([
            {
              _id: "welcome",
              role: "assistant",
              content:
                "Hello! I am your Antigravity AI Coach. How can I help you reach your nutrition goals today?",
            },
          ]);
        }
      } catch (error) {
        console.error("Failed to init session", error);
      }
    };
    initSession();
  }, []);

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
    executeAgentLoop(input);
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
            "Hello! I am your Antigravity AI Coach. How can I help you reach your nutrition goals today?",
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
    <div className="min-h-screen bg-(--kcal-cream) flex flex-col pb-24 lg:pb-0 lg:pl-72">
      {/* Desktop Sidebar Navigation */}
      <nav className="hidden lg:flex fixed left-0 top-0 h-full w-72 bg-(--kcal-white) border-r border-(--kcal-green-light) p-10 flex-col shadow-sm z-30">
        <div className="mb-12">
          <h1 className="text-3xl font-extrabold text-(--kcal-green) tracking-tighter">
            kcal
          </h1>
        </div>

        <div className="flex-1 space-y-2">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full flex items-center space-x-3 text-(--kcal-text-muted) hover:text-(--kcal-green) px-5 py-4 rounded-(--radius-lg) transition-all font-bold"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-sm">Dashboard</span>
          </button>
          <button
            onClick={() => navigate("/meal-plan")}
            className="w-full flex items-center space-x-3 text-(--kcal-text-muted) hover:text-(--kcal-green) px-5 py-4 rounded-(--radius-lg) transition-all font-bold"
          >
            <Utensils className="w-5 h-5" />
            <span className="text-sm">Meal Plan</span>
          </button>
          <button className="w-full flex items-center space-x-3 bg-(--kcal-green-light) text-(--kcal-green) px-5 py-4 rounded-(--radius-lg) transition-all font-bold">
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm">AI Coach</span>
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="mt-auto w-full flex items-center space-x-3 text-(--kcal-text-muted) hover:text-(--kcal-coral) px-5 py-4 rounded-(--radius-lg) transition-all font-bold"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Log Out</span>
        </button>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-(--kcal-white) border-t border-(--kcal-green-light) px-4 py-2 flex justify-between items-center shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-50">
        <button
          onClick={() => navigate("/dashboard")}
          className="kcal-nav-item"
        >
          <LayoutDashboard className="w-6 h-6" />
        </button>
        <button
          onClick={() => navigate("/meal-plan")}
          className="kcal-nav-item"
        >
          <Utensils className="w-6 h-6" />
        </button>
        <div className="relative -top-8">
          <button className="bg-(--kcal-green) p-5 rounded-full text-white shadow-xl shadow-[#91C788]/40 active:scale-95 transition-all">
            <Bot className="w-7 h-7" />
          </button>
        </div>
        <button className="kcal-nav-item active">
          <MessageSquare className="w-6 h-6" />
        </button>
        <button className="kcal-nav-item" onClick={handleLogout}>
          <LogOut className="w-6 h-6" />
        </button>
      </nav>
      {/* Header */}
      <header className="bg-(--kcal-white) p-6 flex items-center justify-between border-b border-(--kcal-green-light) sticky top-0 z-10 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="bg-(--kcal-green-light) p-3 rounded-xl">
            <Bot className="w-5 h-5 text-(--kcal-green)" />
          </div>
          <div>
            <h1 className="font-black text-lg tracking-tight text-(--kcal-text-main)">
              AI Coach
            </h1>
            <p className="text-[10px] text-(--kcal-text-muted) flex items-center font-bold uppercase tracking-[0.1em]">
              <Sparkles className="w-3 h-3 mr-1.5 text-(--kcal-green)" />{" "}
              Powered by KCAL Intelligence
            </p>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setDebugMode(!debugMode)}
            className={`p-3 rounded-lg transition-all border ${debugMode ? "bg-(--kcal-green) text-white border-(--kcal-green) shadow-md" : "bg-(--kcal-white) border-(--kcal-green-light) text-(--kcal-text-muted) hover:text-(--kcal-green)"}`}
            title="DEBUG MODE"
          >
            <Bug className="w-5 h-5" />
          </button>
          <button
            onClick={startNewSession}
            className="p-3 bg-(--kcal-white) border border-(--kcal-green-light) text-(--kcal-text-muted) hover:text-(--kcal-green) rounded-lg transition-all"
            title="NEW SESSION"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 md:px-12 max-w-7xl mx-auto w-full pb-32 custom-scrollbar">
        {messages.map((msg, idx) => {
          if (msg.role === "tool" && !debugMode) return null;

          if (msg.role === "tool") {
            return (
              <div
                key={msg._id || idx}
                className="text-[10px] font-mono bg-(--kcal-green-light) p-4 rounded-xl text-(--kcal-green) my-4 border border-(--kcal-green-light) shadow-sm"
              >
                <span className="font-black mr-2 uppercase tracking-widest">
                  [SYSTEM_LOG]
                </span>{" "}
                {msg.name}: {msg.content}
              </div>
            );
          }

          return (
            <React.Fragment key={msg._id || idx}>
              <MessageBubble message={msg} />
              {debugMode && msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="text-[10px] font-mono bg-white p-4 rounded-xl text-(--kcal-text-muted) my-2 border border-(--kcal-green-light)">
                  <span className="font-black mr-2 text-(--kcal-green) uppercase tracking-widest">
                    [CALL_LOG]
                  </span>{" "}
                  {JSON.stringify(msg.toolCalls[0])}
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Render Agent Action State */}
        {agentState && (
          <AgentActionState
            toolName={agentState.toolName}
            toolArgs={agentState.toolArgs}
            result={agentState.result}
            isExecuting={agentState.isExecuting}
          />
        )}

        {loading && !agentState?.isExecuting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start my-6"
          >
            <div className="flex bg-(--kcal-green-light) p-5 rounded-2xl rounded-tl-none space-x-3 ml-14 shadow-sm border border-white/50">
              <div className="w-2 h-2 bg-(--kcal-green) rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-(--kcal-green) rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-2 h-2 bg-(--kcal-green) rounded-full animate-bounce"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="bg-(--kcal-white) p-6 border-t border-(--kcal-green-light) fixed bottom-24 lg:bottom-0 left-0 lg:left-72 right-0 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
        <div className="max-w-4xl mx-auto flex flex-col space-y-4">
          {/* Suggested Questions */}
          {messages.length < 3 && (
            <div className="flex space-x-3 overflow-x-auto pb-2 custom-scrollbar">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => executeAgentLoop(q)}
                  className="whitespace-nowrap px-6 py-3 bg-(--kcal-white) border border-(--kcal-green-light) hover:border-(--kcal-green) text-(--kcal-text-muted) hover:text-(--kcal-green) rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex space-x-3 items-center">
            <label
              className={`p-4 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${sessionId ? "bg-(--kcal-cream) border-(--kcal-green-light) hover:border-(--kcal-green) text-(--kcal-green)" : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"}`}
            >
              <PlusCircle className="w-5 h-5" />
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
                      executeAgentLoop(
                        "I have uploaded an image.",
                        reader.result,
                      );
                    };
                    reader.readAsDataURL(file);
                  }
                  e.target.value = null; // reset
                }}
              />
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your nutrition..."
              disabled={!sessionId}
              className="flex-1 bg-(--kcal-cream) border border-(--kcal-green-light) rounded-xl px-6 py-4 text-(--kcal-text-main) focus:outline-none focus:border-(--kcal-green) transition-all placeholder:text-(--kcal-text-muted) text-sm font-medium shadow-inner"
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || !sessionId}
              className="bg-(--kcal-green) disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 text-white p-4 rounded-xl transition-all flex items-center justify-center w-14 shadow-lg shadow-[#91C788]/20 active:scale-95"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
};

export default Chat;
