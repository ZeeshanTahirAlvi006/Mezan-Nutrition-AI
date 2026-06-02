import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bot, ThumbsUp, ThumbsDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import client from '../../api/client';

const MessageBubble = ({ message }) => {
  const [feedback, setFeedback] = useState(message.feedback || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Don't render empty assistant messages (tool calls or failed completions)
  if (!message.content && message.role === "assistant") {
    return null;
  }

  const handleFeedback = async (type) => {
    if (!message._id || isSubmitting) return;
    
    const newFeedback = feedback === type ? null : type;
    setIsSubmitting(true);
    setFeedback(newFeedback); 

    try {
      await client.post(`/api/chat/feedback/${message._id}`, { feedback: newFeedback });
    } catch (error) {
      console.error("Failed to submit feedback", error);
      setFeedback(feedback); 
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex max-w-[95%] md:max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
      >
        {/* Avatar Area */}
        {message.role === "user" ? (
          <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-1 border shadow-sm bg-gradient-to-br from-emerald-600 to-teal-700 border-emerald-500/20 ml-4 text-white">
            <User className="w-5 h-5 text-white" />
          </div>
        ) : (
          <div className="relative shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-1 border shadow-sm bg-white border-emerald-100/50 mr-4 text-emerald-600">
            <Bot className="w-5 h-5 text-emerald-600" />
            {/* Glowing Active Status Pulse Indicator Dot */}
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
        )}
        
        {/* Content Area */}
        <div className="flex flex-col gap-2 max-w-full overflow-hidden">
          <div
            className={`p-5 rounded-2xl ${
              message.role === "user" 
                ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-tr-[4px] border border-emerald-500/25 shadow-[0_4px_20px_rgba(4,120,87,0.12)]" 
                : "bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 text-text-rich-black border border-emerald-100/40 rounded-tl-[4px] shadow-[0_4px_20px_rgba(0,0,0,0.015)] backdrop-blur-md"
            } overflow-x-auto`}
          >
            {message.role === "user" ? (
              <p className="whitespace-pre-wrap leading-relaxed text-sm font-semibold tracking-wide">
                {message.content}
              </p>
            ) : (
              <div className="leading-relaxed text-sm text-text-rich-black/90">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    p: ({ node, ...props }) => <p className="mb-4 last:mb-0 text-text-rich-black/90 font-medium" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-extrabold text-emerald-950" {...props} />,
                    em: ({ node, ...props }) => <em className="italic text-emerald-800 bg-emerald-50/60 px-1 rounded font-medium" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-2 marker:text-emerald-600" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-2 marker:text-emerald-600" {...props} />,
                    li: ({ node, ...props }) => <li className="text-text-rich-black/90 font-medium" {...props} />,
                    h1: ({ node, ...props }) => <h1 className="text-xl font-black mb-4 mt-6 text-emerald-900 tracking-tight" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-3 mt-5 text-emerald-900 tracking-tight border-b border-emerald-100/40 pb-2" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-xs font-bold mb-2 mt-4 text-emerald-700 uppercase tracking-wider" {...props} />,
                    code: ({ node, inline, ...props }) => 
                      inline ? (
                        <code className="bg-emerald-550/10 text-emerald-700 bg-emerald-50 border border-emerald-100/40 px-2 py-0.5 rounded text-xs font-mono font-bold" {...props} />
                      ) : (
                        <pre className="bg-slate-900 p-5 rounded-xl border border-slate-800 overflow-x-auto text-xs mb-4 shadow-inner text-slate-100 custom-scrollbar"><code className="font-mono" {...props} /></pre>
                      ),
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto mb-6 rounded-xl border border-emerald-100/50 bg-white/70 shadow-sm custom-scrollbar">
                        <table className="w-full text-xs text-left" {...props} />
                      </div>
                    ),
                    thead: ({ node, ...props }) => <thead className="bg-emerald-50/60 border-b border-emerald-100/35 text-emerald-800 uppercase tracking-wider font-bold" {...props} />,
                    tbody: ({ node, ...props }) => <tbody className="divide-y divide-emerald-100/10" {...props} />,
                    tr: ({ node, ...props }) => <tr className="hover:bg-emerald-50/20 border-b border-emerald-50/10 last:border-b-0 transition-all" {...props} />,
                    th: ({ node, ...props }) => <th className="px-5 py-4 font-bold text-emerald-850" {...props} />,
                    td: ({ node, ...props }) => <td className="px-5 py-4 text-emerald-900/80 font-medium" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-emerald-600 pl-6 italic text-emerald-900/80 my-4 py-2 bg-emerald-50/25 rounded-r-xl" {...props} />,
                    hr: ({ node, ...props }) => <hr className="border-emerald-100/45 my-6" {...props} />,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
          
          {/* Feedback Section for Assistant Messages */}
          {message.role === "assistant" && message._id && (
            <div className="flex items-center gap-2 mt-2 ml-1">
              <button 
                onClick={() => handleFeedback('up')}
                disabled={isSubmitting}
                className={`p-2 rounded-lg transition-all active:scale-95 duration-150 cursor-pointer ${
                  feedback === 'up' 
                    ? 'text-white bg-emerald-600 shadow-md shadow-emerald-600/10' 
                    : 'text-emerald-800/60 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
                title="Helpful"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => handleFeedback('down')}
                disabled={isSubmitting}
                className={`p-2 rounded-lg transition-all active:scale-95 duration-150 cursor-pointer ${
                  feedback === 'down' 
                    ? 'text-white bg-rose-500 shadow-md shadow-rose-500/10' 
                    : 'text-emerald-800/60 hover:text-rose-500 hover:bg-rose-50'
                }`}
                title="Not helpful"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
