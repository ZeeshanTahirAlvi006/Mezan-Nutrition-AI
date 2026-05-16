import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  title: {
    type: String,
    default: 'New Chat',
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true,
});

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

export default ChatSession;
