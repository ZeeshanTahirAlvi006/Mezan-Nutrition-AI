import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'ChatSession',
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system', 'tool'],
    required: true,
  },
  content: {
    type: String,
    required: false,
  },
  toolCalls: [{
    _id: false, // Prevent mongoose from creating an ObjectId that overrides the AI's 'id' field
    id: String,
    type: { type: String, default: 'function' },
    function: {
      name: String,
      arguments: String // JSON string
    }
  }],
  toolCallId: {
    type: String, // Only used when role is 'tool'
  },
  name: {
    type: String, // Used when role is 'tool' to indicate which function it resolved
  },
  feedback: {
    type: String,
    enum: ['up', 'down', null],
    default: null
  },
  imageUrl: {
    type: String, // Optional URL if an image was uploaded
    default: null
  }
}, {
  timestamps: true,
});

const Message = mongoose.model('Message', messageSchema);

export default Message;
