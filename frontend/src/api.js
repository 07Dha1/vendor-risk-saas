const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiCall = async (endpoint, method = 'GET', body = null) => {
  try {
    const options = {
      method,
      headers: {}
    };

    if (body && !(body instanceof FormData)) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    } else if (body instanceof FormData) {
      options.body = body;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

export const api = {
  // Health check
  checkHealth: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'error' };
    }
  },

  // Authentication
  login: async (email, password) => {
    return apiCall('/auth/login', 'POST', { email, password });
  },

  signup: async (email, password, name) => {
    return apiCall('/auth/signup', 'POST', { email, password, name });
  },

  forgotPassword: async (email) => {
    return apiCall('/auth/forgot-password', 'POST', { email });
  },

  resetPassword: async (token, password) => {
    return apiCall('/auth/reset-password', 'POST', { token, password });
  },

  updateProfile: async (userId, data) => {
    return apiCall('/auth/update-profile', 'POST', { userId, ...data });
  },

  deleteContract: async (userId, contractId) => {
    return apiCall(`/contracts/${contractId}/delete`, 'POST', { userId });
  },

  deleteVendor: async (userId, vendorId) => {
    return apiCall(`/vendors/${vendorId}/delete`, 'POST', { userId });
  },

  // Upload a contract file
  uploadContract: async (file, userId) => {
    const formData = new FormData();
    formData.append('contract', file);
    formData.append('userId', userId);

    const response = await fetch(`${API_BASE_URL}/contracts/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return await response.json();
  },

  // Get stats
  async getStats(userId) {
    return apiCall('/stats', 'POST', { userId });
  },

  // Get all contracts
  async getContracts(userId) {
    return apiCall('/contracts', 'POST', { userId });
  },

  // Get contract analysis
  async getContractAnalysis(contractId, userId) {
    return apiCall(`/contracts/${contractId}/analysis`, 'POST', { userId });
  },

  // Chat with a contract (AI Q&A)
  async chatWithContract(contractId, userId, question) {
    return apiCall(`/contracts/${contractId}/chat`, 'POST', { userId, question });
  },

  // Get all vendors
  async getVendors(userId) {
    return apiCall('/vendors', 'POST', { userId });
  },

  // Add vendor
  async addVendor(userId, name, contactEmail, contactPhone) {
    return apiCall('/vendors/add', 'POST', { userId, name, contactEmail, contactPhone });
  },

  // Link contract to vendor
  async linkContractToVendor(contractId, vendorName) {
    return apiCall(`/contracts/${contractId}/link-vendor`, 'POST', { vendorName });
  },

  // Admin: Get all users
  async getUsers(userId) {
    return apiCall('/admin/users', 'POST', { userId });
  },

  // Admin: Get user stats
  async getUserStats(userId) {
    return apiCall('/admin/stats', 'POST', { userId });
  },

  // Admin: Update user status
  async updateUserStatus(userId, targetUserId, status) {
    return apiCall(`/admin/users/${targetUserId}/status`, 'POST', { userId, status });
  },

  // Admin: Delete user
  async deleteUser(userId, targetUserId) {
    return apiCall(`/admin/users/${targetUserId}/delete`, 'POST', { userId });
  },

  // Contact form (public)
  async submitContactForm(name, email, company, subject, message) {
    return apiCall('/contact/submit', 'POST', { name, email, company, subject, message });
  },

  // ─── Support Tickets (logged-in users) ─────────────────────────────────────
  async submitSupportTicket(userId, subject, message, category) {
    return apiCall('/support/submit', 'POST', { userId, subject, message, category });
  },

  async getUserTickets(userId) {
    return apiCall('/support/tickets', 'POST', { userId });
  },

  // ─── Admin: Support Management ─────────────────────────────────────────────
  async updateTicketStatus(adminId, ticketId, status) {
    return apiCall('/admin/support/update-status', 'POST', { userId: adminId, ticketId, status });
  },

  async replyToTicket(adminId, ticketId, reply) {
    return apiCall('/admin/support/reply', 'POST', { userId: adminId, ticketId, reply });
  },

  // Admin: Get contact submissions
  async getContactSubmissions(userId) {
    return apiCall('/admin/contact/submissions', 'POST', { userId });
  },

  // Admin: Get contact stats
  async getContactStats(userId) {
    return apiCall('/admin/contact/stats', 'POST', { userId });
  },

  // Admin: Get all users with subscription data
  async getAdminSubscriptions(userId) {
    return apiCall('/admin/subscriptions', 'POST', { userId });
  },

  // Admin: Override a user's plan
  async overrideUserPlan(adminId, targetUserId, plan) {
    return apiCall(`/admin/subscriptions/${targetUserId}/override-plan`, 'POST', { userId: adminId, plan });
  },

  // Admin: Get all payment records
  async getAdminPayments(userId) {
    return apiCall('/admin/payments', 'POST', { userId });
  },

  // Admin: Issue Stripe refund
  async issueRefund(adminId, stripeSubscriptionId, amount, reason) {
    return apiCall('/admin/refund', 'POST', { userId: adminId, stripeSubscriptionId, amount, reason });
  },

  // Admin: Get revenue metrics
  async getAdminRevenue(userId) {
    return apiCall('/admin/revenue', 'POST', { userId });
  },

  // ─── Subscription / Plan ──────────────────────────────────────────────────

  // Get full subscription status (plan, feature_access, usage, limits)
  async getSubscriptionStatus(userId) {
    return apiCall('/subscription/status', 'POST', { userId });
  },

  // Check if user can access a specific feature
  async checkFeature(userId, feature) {
    return apiCall('/subscription/check-feature', 'POST', { userId, feature });
  },

  // Create Stripe Checkout Session → returns { url } to redirect to
  async createCheckoutSession(userId, plan, billingCycle = 'monthly') {
    const res = await fetch(`${API_BASE_URL}/stripe/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, plan, billingCycle }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create checkout session');
    return data; // { url, sessionId }
  },

  // Create Stripe Customer Portal session → returns { url }
  async createPortalSession(userId) {
    const res = await fetch(`${API_BASE_URL}/stripe/create-portal-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create portal session');
    return data; // { url }
  },

  // Cancel subscription at period end
  async cancelSubscription(userId) {
    return apiCall('/subscription/cancel', 'POST', { userId });
  },

  // Upload contract — returns full response (not throwing on 403 limit errors)
  async uploadContractSafe(file, userId) {
    const formData = new FormData();
    formData.append('contract', file);
    formData.append('userId', userId);
    const response = await fetch(`${API_BASE_URL}/contracts/upload`, {
      method: 'POST',
      body: formData,
    });
    return { status: response.status, data: await response.json() };
  },

  // ─── Reports ──────────────────────────────────────────────────────────────

  // Download single contract PDF — triggers browser download
  async downloadContractPdf(userId, contractId, filename) {
    const response = await fetch(`${API_BASE_URL}/reports/contract-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, contractId }),
    });
    if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to generate PDF'); }
    const blob = await response.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `risk-report-${filename || contractId}.pdf`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  },

  // Download all contracts as Excel
  async downloadExcel(userId) {
    const response = await fetch(`${API_BASE_URL}/reports/excel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) throw new Error('Failed to generate Excel');
    const blob = await response.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'vendorshield-contracts.xlsx';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  },

  // Download custom filtered report as Excel
  async downloadCustomReport(userId, filters) {
    const response = await fetch(`${API_BASE_URL}/reports/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...filters }),
    });
    if (!response.ok) throw new Error('Failed to generate report');
    const blob = await response.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'custom-report.xlsx';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  },

  // Save / update report schedule
  async saveReportSchedule(userId, frequency, email) {
    return apiCall('/reports/schedule', 'POST', { userId, frequency, email });
  },

  // Get saved schedule for a user
  async getReportSchedule(userId) {
    return apiCall(`/reports/schedule/${userId}`, 'GET');
  },

  // Send report email immediately
  async sendReportNow(userId, email) {
    return apiCall('/reports/send-now', 'POST', { userId, email });
  },

  // Generate AI executive summary
  async getAiSummary(userId) {
    return apiCall('/reports/ai-summary', 'POST', { userId });
  },

  // ─── Compliance ────────────────────────────────────────────────────────────

  async getCertifications(userId) {
    return apiCall(`/compliance/certifications/${userId}`, 'GET');
  },
  async addCertification(userId, data) {
    return apiCall('/compliance/certifications', 'POST', { userId, ...data });
  },
  async updateCertification(id, userId, data) {
    return apiCall(`/compliance/certifications/${id}`, 'PUT', { userId, ...data });
  },
  async deleteCertification(id, userId) {
    return apiCall(`/compliance/certifications/${id}?userId=${userId}`, 'DELETE');
  },
  async getExpiringCertifications(userId, days = 90) {
    return apiCall(`/compliance/expiring/${userId}?days=${days}`, 'GET');
  },

  async getAuditLog(userId, limit = 100) {
    return apiCall(`/compliance/audit-log/${userId}?limit=${limit}`, 'GET');
  },

  async getRiskActions(userId) {
    return apiCall(`/compliance/actions/${userId}`, 'GET');
  },
  async addRiskAction(userId, data) {
    return apiCall('/compliance/actions', 'POST', { userId, ...data });
  },
  async updateRiskAction(id, userId, data) {
    return apiCall(`/compliance/actions/${id}`, 'PUT', { userId, ...data });
  },
  async deleteRiskAction(id, userId) {
    return apiCall(`/compliance/actions/${id}?userId=${userId}`, 'DELETE');
  },

  async getAssessments(userId) {
    return apiCall(`/compliance/assessments/${userId}`, 'GET');
  },
  async addAssessment(userId, data) {
    return apiCall('/compliance/assessments', 'POST', { userId, ...data });
  },
  async updateAssessment(id, userId, data) {
    return apiCall(`/compliance/assessments/${id}`, 'PUT', { userId, ...data });
  },
  async deleteAssessment(id, userId) {
    return apiCall(`/compliance/assessments/${id}?userId=${userId}`, 'DELETE');
  },

  async downloadCompliancePdf(userId) {
    const response = await fetch(`${API_BASE_URL}/compliance/report-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) throw new Error('Failed to generate compliance report');
    const blob = await response.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'compliance-report.pdf';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  },
};