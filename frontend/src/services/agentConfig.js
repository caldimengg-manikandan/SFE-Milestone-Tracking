import api from './api';

export const agentConfigAPI = {
  get: () => api.get('/chatbot/agent-config/'),
  update: (data) => api.put('/chatbot/agent-config/', data),
};

export default agentConfigAPI;
