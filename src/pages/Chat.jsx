import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import client from "../api/client";
import MessageBubble from "../components/chat/MessageBubble";

const Chat = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [agentState, setAgentState] = useState(null);
  const [debugMode, setDebugMode] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef(null);
  const isResumingRef = useRef(false);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? prev + " " + transcript : transcript));
      };
      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };


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

  const executeAgentLoop = async (userText) => {
    if (!sessionId || !userText.trim()) return;

    // Add User Message to UI
    const tempUserMsg = {
      _id: Date.now().toString(),
      role: "user",
      content: userText,
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
    if (!input.trim()) return;
    executeAgentLoop(input.trim());
  };

  const startNewSession = async () => {
    setSessionId(null);
    setMessages([]);
    setAgentState(null);
    try {
      const { data } = await client.post("/api/chat/session", { new: true });
      setSessionId(data._id);
      localStorage.setItem("lastSessionId", data._id);
      setMessages([
        {
          _id: "welcome",
          role: "assistant",
          content:
            "Hello! I'm your Mezan AI Coach. How can I help you balance your nutrition today?",
        },
      ]);
      navigate(`/chat/${data._id}`);
    } catch (error) {
      console.error("Failed to start new session", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="nova-layout">
      {/* Sidebar */}
      <div className="nova-sidebar">
        <div className="nova-sidebar-header" style={{ padding: "12px 18px 8px", fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "7px", color: "var(--color-on-surface)" }}>
          <i className="ti ti-robot" aria-hidden="true" style={{ fontSize: "16px", color: "var(--color-primary)" }}></i> <span>Mezan Coach</span>
        </div>

        <div className="nova-sidebar-section">Chats</div>
        <div className="nova-sidebar-item active">
          <i className="ti ti-message" aria-hidden="true"></i> <span>Current session</span>
        </div>
        <div className="nova-sidebar-item" onClick={startNewSession}>
          <i className="ti ti-plus" aria-hidden="true"></i> <span>New Chat</span>
        </div>

        <div className="nova-sidebar-section" style={{ marginTop: "8px" }}>Tools</div>
        <div className="nova-sidebar-item">
          <i className="ti ti-database" aria-hidden="true"></i> <span>Food Database</span>
        </div>
        <div className="nova-sidebar-item">
          <i className="ti ti-apple" aria-hidden="true"></i> <span>Macro Tracker</span>
        </div>

        <div className="nova-sidebar-section" style={{ marginTop: "8px" }}>Memory</div>
        <div className="nova-sidebar-item" onClick={() => setDebugMode(!debugMode)}>
          <i className="ti ti-bug" aria-hidden="true"></i> <span>{debugMode ? "Hide Debug" : "Show Debug"}</span>
        </div>

        <div style={{ marginTop: "auto", padding: "12px 18px", borderTop: "0.5px solid var(--color-outline-variant)" }}>
          <div className="nova-sidebar-item" style={{ padding: 0 }} onClick={() => navigate("/dashboard")}>
            <i className="ti ti-home" aria-hidden="true"></i> <span>Dashboard</span>
          </div>
          <div className="nova-sidebar-item" style={{ padding: "8px 0 0 0" }} onClick={handleLogout}>
            <i className="ti ti-logout" aria-hidden="true"></i> <span>Logout</span>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="nova-main">
        {/* Topbar */}
        <div className="nova-topbar">
          <i className="ti ti-robot" aria-hidden="true" style={{ fontSize: "16px", color: "var(--color-primary)" }}></i>
          <span className="nova-topbar-title">Nova AI Agent</span>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginLeft: "auto" }}>
            <div className={`nova-status-dot ${loading ? 'active' : ''}`} style={{ backgroundColor: loading ? '#f59e0b' : '#4ade80' }}></div>
            <span className="nova-status-label">{loading ? 'Processing' : 'Ready'}</span>
          </div>
        </div>

        {/* Messages Canvas */}
        <div className="nova-messages custom-scrollbar">
          {/* Date Badge */}
          <div className="text-center mb-4">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest bg-surface-container-lowest px-4 py-1.5 rounded-full shadow-sm border border-outline-variant/20">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </span>
          </div>

          {/* Message List */}
          {messages.map((msg, idx) => {
            if (msg.role === "tool" && !debugMode) return null;

            if (msg.role === "tool") {
              return (
                <div
                  key={msg._id || idx}
                  className="nova-step-bubble text-[11px] font-mono bg-primary-container/10 text-primary border border-primary/25"
                >
                  <div className="nova-step-num">L</div>
                  <div>
                    <strong>[SYSTEM_LOG] {msg.name}:</strong> {msg.content}
                  </div>
                </div>
              );
            }

            return (
              <React.Fragment key={msg._id || idx}>
                <MessageBubble message={msg} />

                {debugMode && msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="nova-step-bubble text-[11px] font-mono bg-white text-on-surface-variant border border-outline-variant/30">
                    <div className="nova-step-num">C</div>
                    <div>
                      <strong>[CALL_LOG]:</strong> {JSON.stringify(msg.toolCalls[0])}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Agent Action State */}
          {debugMode && agentState && (
            <div className="nova-step-bubble text-xs">
              <div className="nova-step-num">
                <i className="ti ti-settings animate-spin"></i>
              </div>
              <div className="flex-1">
                <strong>Nova is active:</strong> {agentState.toolName}
                {agentState.toolArgs && (
                  <pre className="text-[10px] bg-surface-container-low p-2 rounded mt-1.5 overflow-x-auto">
                    {JSON.stringify(agentState.toolArgs, null, 2)}
                  </pre>
                )}
                {agentState.result && (
                  <div className="mt-2 text-[10px] font-mono bg-surface-off-white p-2 rounded border border-outline-variant/25">
                    {agentState.result}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Thinking state */}
          {loading && !agentState?.isExecuting && (
            <div className="nova-msg agent">
              <div className="nova-msg-meta">
                <i className="ti ti-robot" aria-hidden="true" style={{ fontSize: "13px" }}></i> Nova
              </div>
              <div className="thinking">
                <i className="ti ti-loader-2 animate-spin" aria-hidden="true" style={{ fontSize: "14px", marginRight: "4px" }}></i>
                Thinking
                <span className="dots"><span>.</span><span>.</span><span>.</span></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="nova-input-bar">
          <button
            type="button"
            onClick={toggleListening}
            disabled={!sessionId || loading}
            className="nova-send-btn animate-all"
            style={{
              backgroundColor: isListening ? "#ef4444" : "var(--color-surface-container-low)",
              color: isListening ? "white" : "var(--color-on-surface-variant)",
            }}
            title={isListening ? "Listening... click to stop" : "Start voice typing"}
          >
            <i className={`ti ${isListening ? 'ti-microphone-off animate-pulse' : 'ti-microphone'}`} style={{ fontSize: "18px" }}></i>
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={isListening ? "Listening..." : "Ask Nova..."}
            disabled={!sessionId}
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !input.trim() || !sessionId}
            className="nova-send-btn animate-all"
            aria-label="Send"
          >
            <i className="ti ti-send" style={{ fontSize: "16px" }}></i>
          </button>
        </div>
      </div>

    </div>
  );
};

export default Chat;
