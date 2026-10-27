import axios from 'axios';

// Get backend URL from local storage or environment
const getBaseUrl = () => {
  const saved = localStorage.getItem('procucev_backend_url');
  if (saved && saved.trim()) {
    return saved.trim();
  }
  return import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
};

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to dynamically update baseURL if changed in settings
apiClient.interceptors.request.use((config) => {
  config.baseURL = getBaseUrl();
  return config;
});

export const transcriptionApi = {
  // Fetch transcriptions list with query and pagination
  getTranscriptions: async (params = {}) => {
    const { query = '', page = 0, size = 10, sort = 'desc' } = params;
    const response = await apiClient.get('/api/transcriptions', {
      params: { query: query.trim() || undefined, page, size, sort },
    });
    return response.data;
  },

  // Fetch single transcription by ID
  getTranscriptionById: async (id) => {
    const response = await apiClient.get(`/api/transcriptions/${id}`);
    return response.data;
  },

  // Create new transcription
  createTranscription: async (data) => {
    const response = await apiClient.post('/api/transcriptions', data);
    return response.data;
  },

  // Update existing transcription
  updateTranscription: async (id, data) => {
    const response = await apiClient.put(`/api/transcriptions/${id}`, data);
    return response.data;
  },

  // Delete transcription
  deleteTranscription: async (id) => {
    await apiClient.delete(`/api/transcriptions/${id}`);
  },

  // Health check
  checkHealth: async () => {
    try {
      const response = await apiClient.get('/actuator/health');
      return { status: response.data?.status || 'UP', details: response.data };
    } catch (err) {
      return { status: 'DOWN', error: err.message };
    }
  },
};
