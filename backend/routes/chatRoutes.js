import express from 'express';
import { 
  createOrGetSession, 
  getSessionMessages, 
  sendMessage, 
  executeTool, 
  submitFeedback 
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/session').post(protect, createOrGetSession);
router.route('/session/:sessionId/messages').get(protect, getSessionMessages);
router.route('/message').post(protect, sendMessage);
router.route('/execute-tool').post(protect, executeTool);
router.route('/feedback/:messageId').post(protect, submitFeedback);

export default router;
