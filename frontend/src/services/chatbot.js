import api from './api';

export const chatbotAPI = {
  getSessions: () => api.get('/chatbot/sessions/'),
  createSession: (title) => api.post('/chatbot/sessions/', { title }),
  getSessionDetail: (sessionId) => api.get(`/chatbot/sessions/${sessionId}/`),
  deleteSession: (sessionId) => api.delete(`/chatbot/sessions/${sessionId}/`),
  query: (queryText, sessionId = null) => api.post('/chatbot/chat/', { query: queryText, session_id: sessionId }),
  uploadWorkflow: (formData) => api.post('/chatbot/upload/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getStatus: () => api.get('/chatbot/status/'),
};

export default chatbotAPI;
