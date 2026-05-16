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
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-1 border shadow-sm ${message.role === "user" ? "bg-(--kcal-coral) border-(--kcal-coral-light) ml-4" : "bg-(--kcal-green) border-(--kcal-green-light) mr-4"}`}
        >
          {message.role === "user" ? (
            <User className="w-5 h-5 text-white" />
          ) : (
            <Bot className="w-5 h-5 text-white" />
          )}
        </div>
        
        <div className="flex flex-col gap-2 max-w-full overflow-hidden">
          <div
            className={`p-5 rounded-(--radius-lg) shadow-sm ${message.role === "user" ? "bg-(--kcal-green) text-white rounded-tr-none" : "bg-white text-(--kcal-text-main) border border-(--kcal-green-light) rounded-tl-none"} overflow-x-auto`}
          >
            {message.role === "user" ? (
              <p className="whitespace-pre-wrap leading-relaxed text-sm font-medium">
                {message.content}
              </p>
            ) : (
              <div className="leading-relaxed text-sm">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-bold text-(--kcal-text-main)" {...props} />,
                    em: ({ node, ...props }) => <em className="italic text-(--kcal-text-muted)" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-2 marker:text-(--kcal-green)" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-2 marker:text-(--kcal-green)" {...props} />,
                    li: ({ node, ...props }) => <li className="text-(--kcal-text-main)" {...props} />,
                    h1: ({ node, ...props }) => <h1 className="text-xl font-black mb-4 mt-6 text-(--kcal-text-main) tracking-tight" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-3 mt-5 text-(--kcal-text-main) tracking-tight border-b border-(--kcal-green-light) pb-2" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-sm font-bold mb-2 mt-4 text-(--kcal-green) uppercase tracking-wider" {...props} />,
                    code: ({ node, inline, ...props }) => 
                      inline ? (
                        <code className="bg-(--kcal-green-light) text-(--kcal-green) px-2 py-0.5 rounded text-xs font-mono" {...props} />
                      ) : (
                        <pre className="bg-(--kcal-cream) p-5 rounded-xl border border-(--kcal-green-light) overflow-x-auto text-xs mb-4 custom-scrollbar"><code className="font-mono text-(--kcal-text-main)" {...props} /></pre>
                      ),
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto mb-6 rounded-xl border border-(--kcal-green-light) bg-white">
                        <table className="w-full text-xs text-left" {...props} />
                      </div>
                    ),
                    thead: ({ node, ...props }) => <thead className="bg-(--kcal-green-light) text-(--kcal-green) uppercase tracking-wider" {...props} />,
                    tbody: ({ node, ...props }) => <tbody className="divide-y divide-(--kcal-green-light)" {...props} />,
                    tr: ({ node, ...props }) => <tr className="hover:bg-(--kcal-green-light)/30 transition-all" {...props} />,
                    th: ({ node, ...props }) => <th className="px-5 py-4 font-bold" {...props} />,
                    td: ({ node, ...props }) => <td className="px-5 py-4 text-(--kcal-text-muted)" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-(--kcal-green) pl-6 italic text-(--kcal-text-muted) my-4 py-2 bg-(--kcal-green-light) rounded-r-xl" {...props} />,
                    hr: ({ node, ...props }) => <hr className="border-(--kcal-green-light) my-6" {...props} />,
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
                className={`p-2 rounded-lg transition-all ${feedback === 'up' ? 'text-white bg-(--kcal-green) shadow-md' : 'text-(--kcal-text-muted) hover:text-(--kcal-green) hover:bg-(--kcal-green-light)'}`}
                title="Helpful"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => handleFeedback('down')}
                disabled={isSubmitting}
                className={`p-2 rounded-lg transition-all ${feedback === 'down' ? 'text-white bg-(--kcal-coral) shadow-md' : 'text-(--kcal-text-muted) hover:text-(--kcal-coral) hover:bg-(--kcal-coral-light)'}`}
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
