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
      className={`nova-msg ${message.role === "user" ? "user" : "agent"} w-full`}
    >
      {/* Metadata / Header */}
      <div className="nova-msg-meta">
        {message.role === "user" ? (
          "You"
        ) : (
          <>
            <i className="ti ti-robot" aria-hidden="true" style={{ fontSize: "13px" }}></i>
            <span>Nova</span>
          </>
        )}
      </div>

      {/* Bubble Container */}
      <div className={`nova-bubble ${message.role === "user" ? "user" : "agent"} overflow-x-auto`}>
        {message.role === "user" ? (
          <p className="whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        ) : (
          <div className="leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
              components={{
                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-extrabold text-emerald-900" {...props} />,
                em: ({ node, ...props }) => <em className="italic bg-emerald-50/60 px-1 rounded font-medium text-emerald-800" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1.5" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1.5" {...props} />,
                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                h1: ({ node, ...props }) => <h1 className="text-lg font-black mb-3 mt-5 text-emerald-950 tracking-tight" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-base font-bold mb-2 mt-4 text-emerald-900 tracking-tight border-b border-outline-variant/30 pb-1.5" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-xs font-bold mb-1.5 mt-3 text-emerald-700 uppercase tracking-wider" {...props} />,
                code: ({ node, inline, ...props }) => 
                  inline ? (
                    <code className="bg-surface-container-low text-primary border border-outline-variant/30 px-1.5 py-0.5 rounded text-xs font-mono font-bold" {...props} />
                  ) : (
                    <pre className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 overflow-x-auto text-xs mb-3 shadow-inner text-on-surface custom-scrollbar"><code className="font-mono" {...props} /></pre>
                  ),
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto mb-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm custom-scrollbar">
                    <table className="nova-data-table w-full text-xs text-left" {...props} />
                  </div>
                ),
                thead: ({ node, ...props }) => <thead className="bg-surface-container-low border-b border-outline-variant/30 text-on-surface-variant uppercase tracking-wider font-bold" {...props} />,
                tbody: ({ node, ...props }) => <tbody className="divide-y divide-outline-variant/10" {...props} />,
                tr: ({ node, ...props }) => <tr className="hover:bg-surface-container-low/40 border-b border-outline-variant/10 last:border-b-0 transition-all" {...props} />,
                th: ({ node, ...props }) => <th className="px-4 py-3 font-bold text-on-surface-variant" {...props} />,
                td: ({ node, ...props }) => <td className="px-4 py-3 text-on-surface font-medium" {...props} />,
                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-primary pl-4 italic text-on-surface-variant my-3 py-1.5 bg-surface-container-low/30 rounded-r-xl" {...props} />,
                hr: ({ node, ...props }) => <hr className="border-outline-variant/30 my-4" {...props} />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Feedback Section for Assistant Messages */}
      {message.role === "assistant" && message._id && (
        <div className="flex items-center gap-2 mt-1.5 ml-1">
          <button 
            onClick={() => handleFeedback('up')}
            disabled={isSubmitting}
            className={`p-1.5 rounded-lg transition-all active:scale-95 duration-150 cursor-pointer ${
              feedback === 'up' 
                ? 'text-white bg-primary shadow-md shadow-primary/10' 
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
            title="Helpful"
          >
            <ThumbsUp className="w-3 h-3" />
          </button>
          <button 
            onClick={() => handleFeedback('down')}
            disabled={isSubmitting}
            className={`p-1.5 rounded-lg transition-all active:scale-95 duration-150 cursor-pointer ${
              feedback === 'down' 
                ? 'text-white bg-error shadow-md shadow-error/10' 
                : 'text-on-surface-variant hover:text-error hover:bg-surface-container-low'
            }`}
            title="Not helpful"
          >
            <ThumbsDown className="w-3 h-3" />
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default MessageBubble;
