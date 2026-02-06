// API Service - Handles all communication with backend

const API_BASE_URL = 'http://localhost:5000/api';

// Helper function to make API calls
const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// API Functions
export const api = {
  // Check if backend is healthy
  checkHealth: () => apiCall('/health'),

  // Upload a contract file
  uploadContract: async (file) => {
    const formData = new FormData();
    formData.append('contract', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return await response.json();
  },

  // Get all contracts
  getContracts: () => apiCall('/contracts'),

  // Get contract analysis
  getContractAnalysis: (contractId) => apiCall(`/contracts/${contractId}/analysis`),

  // Get vendor risks
  getVendorRisks: () => apiCall('/risks'),

  // Get statistics for dashboard
  getStats: () => apiCall('/stats'),
};

export default api;