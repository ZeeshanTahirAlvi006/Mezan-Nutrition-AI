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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex max-w-[95%] md:max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
      >
        <div
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-1 border shadow-sm ${message.role === "user" ? "bg-primary border-primary/20 ml-4 text-white" : "bg-white border-outline-variant/30 mr-4 text-primary"}`}
        >
          {message.role === "user" ? (
            <User className="w-5 h-5 text-white" />
          ) : (
            <Bot className="w-5 h-5 text-primary" />
          )}
        </div>
        
        <div className="flex flex-col gap-2 max-w-full overflow-hidden">
          <div
            className={`p-5 rounded-2xl shadow-sm ${message.role === "user" ? "bg-primary text-white rounded-tr-none" : "bg-white text-text-rich-black border border-outline-variant/35 rounded-tl-none"} overflow-x-auto`}
          >
            {message.role === "user" ? (
              <p className="whitespace-pre-wrap leading-relaxed text-sm font-medium">
                {message.content}
              </p>
            ) : (
              <div className="leading-relaxed text-sm text-text-rich-black/90">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-extrabold text-text-rich-black" {...props} />,
                    em: ({ node, ...props }) => <em className="italic text-on-surface-variant" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-2 marker:text-primary" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-2 marker:text-primary" {...props} />,
                    li: ({ node, ...props }) => <li className="text-text-rich-black" {...props} />,
                    h1: ({ node, ...props }) => <h1 className="text-xl font-black mb-4 mt-6 text-text-rich-black tracking-tight" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-3 mt-5 text-text-rich-black tracking-tight border-b border-outline-variant/30 pb-2" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-sm font-bold mb-2 mt-4 text-primary uppercase tracking-wider" {...props} />,
                    code: ({ node, inline, ...props }) => 
                      inline ? (
                        <code className="bg-primary-container/10 text-primary px-2 py-0.5 rounded text-xs font-mono font-bold" {...props} />
                      ) : (
                        <pre className="bg-surface-off-white p-5 rounded-xl border border-outline-variant/20 overflow-x-auto text-xs mb-4 custom-scrollbar"><code className="font-mono text-text-rich-black" {...props} /></pre>
                      ),
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto mb-6 rounded-xl border border-outline-variant/25 bg-white shadow-sm">
                        <table className="w-full text-xs text-left" {...props} />
                      </div>
                    ),
                    thead: ({ node, ...props }) => <thead className="bg-surface-off-white border-b border-outline-variant/20 text-primary uppercase tracking-wider font-bold" {...props} />,
                    tbody: ({ node, ...props }) => <tbody className="divide-y divide-outline-variant/20" {...props} />,
                    tr: ({ node, ...props }) => <tr className="hover:bg-primary-container/5 transition-all" {...props} />,
                    th: ({ node, ...props }) => <th className="px-5 py-4 font-bold" {...props} />,
                    td: ({ node, ...props }) => <td className="px-5 py-4 text-on-surface-variant font-medium" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-primary pl-6 italic text-on-surface-variant my-4 py-2 bg-primary-container/5 rounded-r-xl" {...props} />,
                    hr: ({ node, ...props }) => <hr className="border-outline-variant/20 my-6" {...props} />,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
          
          {/* Feedback Section for Assistant Messages */}
          {message.role === "assistant" && message._id && (
            <div className="flex items-center gap-2 mt-1 ml-1">
              <button 
                onClick={() => handleFeedback('up')}
                disabled={isSubmitting}
                className={`p-2 rounded-lg transition-all cursor-pointer ${feedback === 'up' ? 'text-white bg-primary shadow-md' : 'text-on-surface-variant hover:text-primary hover:bg-primary-container/10'}`}
                title="Helpful"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => handleFeedback('down')}
                disabled={isSubmitting}
                className={`p-2 rounded-lg transition-all cursor-pointer ${feedback === 'down' ? 'text-white bg-[#FB7185] shadow-md' : 'text-on-surface-variant hover:text-[#FB7185] hover:bg-[#FFF0F0]'}`}
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
