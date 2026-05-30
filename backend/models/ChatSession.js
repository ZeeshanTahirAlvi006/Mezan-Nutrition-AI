import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  _id: { type: String },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system', 'tool'],
    required: true,
  },
  content: { type: String, default: '' },
  toolCalls: { type: mongoose.Schema.Types.Mixed, default: undefined },
  toolCallId: { type: String, default: undefined },
  name: { type: String, default: undefined },
  feedback: { type: String, enum: ['up', 'down', null], default: null },
  imageUrl: { type: String, default: undefined },
  createdAt: { type: String, default: () => new Date().toISOString() },
}, { _id: false });

const chatSessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  title: { type: String, default: 'New Conversation' },
  isActive: { type: Boolean, default: true },
  messages: [messageSchema],
}, {
  timestamps: true,
});

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
export default ChatSession;
