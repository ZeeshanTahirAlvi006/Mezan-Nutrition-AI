import express from 'express';
import { protect } from '../middleware/auth.js';
import { admin } from '../middleware/admin.js';
import { csvUploadMiddleware, parseCsvBuffer } from '../middleware/csvUpload.js';
import { pdfUploadMiddleware } from '../middleware/pdfUpload.js';
import {
  getStats,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserLogs,
  getUserCheckins,
  listFood,
  createFood,
  updateFood,
  deleteFood,
  importFoodCsv,
  listChatSessions,
  getChatMessages,
  updateChatSession,
  deleteChatSession,
  deleteChatMessage,
  listMealPlans,
  getMealPlan,
  deleteMealPlan,
  uploadPdfKnowledgeBase
} from '../controllers/adminController.js';

const router = express.Router();

router.use(protect, admin);

router.get('/stats', getStats);

router.get('/users', listUsers);
router.get('/users/:id', getUser);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/users/:id/logs', getUserLogs);
router.get('/users/:id/checkins', getUserCheckins);

router.get('/food', listFood);
router.post('/food', createFood);
router.put('/food/:id', updateFood);
router.delete('/food/:id', deleteFood);
router.post('/food/import', csvUploadMiddleware, parseCsvBuffer, importFoodCsv);

router.get('/chat/sessions', listChatSessions);
router.get('/chat/sessions/:sessionId/messages', getChatMessages);
router.patch('/chat/sessions/:sessionId', updateChatSession);
router.delete('/chat/sessions/:sessionId', deleteChatSession);
router.delete('/chat/messages/:messageId', deleteChatMessage);

router.get('/meal-plans', listMealPlans);
router.get('/meal-plans/:id', getMealPlan);
router.delete('/meal-plans/:id', deleteMealPlan);

router.post('/knowledge-base/upload', pdfUploadMiddleware, uploadPdfKnowledgeBase);

export default router;
