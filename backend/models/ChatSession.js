import { z } from 'zod';

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string().optional().nullable(),
  toolCalls: z.array(z.object({
    id: z.string(),
    type: z.string().default('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string()
    })
  })).optional(),
  toolCallId: z.string().optional(),
  name: z.string().optional(),
  feedback: z.enum(['up', 'down']).nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  timestamp: z.date().optional()
});

export const ChatSessionSchema = z.object({
  userId: z.string(),
  title: z.string().default('New Chat'),
  isActive: z.boolean().default(true),
  messages: z.array(MessageSchema).default([]),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const validateChatSession = (data) => {
  return ChatSessionSchema.parse(data);
};

// Message validation if standalone validation is needed
export const validateMessage = (data) => {
  return MessageSchema.parse(data);
};
