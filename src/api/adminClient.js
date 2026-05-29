import client from './client';

const admin = {
  getStats: () => client.get('/api/admin/stats'),
  listUsers: (params) => client.get('/api/admin/users', { params }),
  getUser: (id) => client.get(`/api/admin/users/${id}`),
  updateUser: (id, data) => client.patch(`/api/admin/users/${id}`, data),
  deleteUser: (id) => client.delete(`/api/admin/users/${id}`),
  getUserLogs: (id, params) => client.get(`/api/admin/users/${id}/logs`, { params }),
  getUserCheckins: (id, params) => client.get(`/api/admin/users/${id}/checkins`, { params }),

  listFood: (params) => client.get('/api/admin/food', { params }),
  createFood: (data) => client.post('/api/admin/food', data),
  updateFood: (id, data) => client.put(`/api/admin/food/${id}`, data),
  deleteFood: (id) => client.delete(`/api/admin/food/${id}`),
  importFoodCsv: (file) => {
    const form = new FormData();
    form.append('file', file);
    return client.post('/api/admin/food/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadKnowledgeBasePdf: (file) => {
    const form = new FormData();
    form.append('file', file);
    return client.post('/api/admin/knowledge-base/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  listChatSessions: (params) => client.get('/api/admin/chat/sessions', { params }),
  getChatMessages: (sessionId) => client.get(`/api/admin/chat/sessions/${sessionId}/messages`),
  updateChatSession: (sessionId, data) => client.patch(`/api/admin/chat/sessions/${sessionId}`, data),
  deleteChatSession: (sessionId) => client.delete(`/api/admin/chat/sessions/${sessionId}`),
  deleteChatMessage: (messageId) => client.delete(`/api/admin/chat/messages/${messageId}`),

  listMealPlans: (params) => client.get('/api/admin/meal-plans', { params }),
  getMealPlan: (id) => client.get(`/api/admin/meal-plans/${id}`),
  deleteMealPlan: (id) => client.delete(`/api/admin/meal-plans/${id}`),
};

export default admin;
