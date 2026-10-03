const API_BASE = '/api';

const api = {
  getToken() {
    return localStorage.getItem('token');
  },

  setToken(token) {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  },

  getCurrentUser() {
    try {
      const data = localStorage.getItem('user');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user) {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  },

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Server request failed');
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth endpoints
  async signup(data) {
    return this.request('/auth/signup', { method: 'POST', body: JSON.stringify(data) });
  },

  async verifyOtp(data) {
    const res = await this.request('/auth/verify-otp', { method: 'POST', body: JSON.stringify(data) });
    if (res.token) this.setToken(res.token);
    if (res.user) this.setCurrentUser(res.user);
    return res;
  },

  async resendOtp(destination, purpose = 'SIGNUP') {
    return this.request('/auth/resend-otp', { method: 'POST', body: JSON.stringify({ destination, purpose }) });
  },

  async login(identifier, password) {
    const res = await this.request('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) });
    if (res.token) this.setToken(res.token);
    if (res.user) this.setCurrentUser(res.user);
    return res;
  },

  async adminLogin(identifier, password) {
    const res = await this.request('/auth/admin-login', { method: 'POST', body: JSON.stringify({ identifier, password }) });
    if (res.token) this.setToken(res.token);
    if (res.user) this.setCurrentUser(res.user);
    return res;
  },

  async getMe() {
    const res = await this.request('/auth/me');
    if (res.user) this.setCurrentUser(res.user);
    return res.user;
  },

  logout() {
    this.setToken(null);
    this.setCurrentUser(null);
  },

  // Categories & Metrics
  async getCategories() {
    const res = await this.request('/categories');
    return res.categories;
  },

  async getImpactMetrics() {
    const res = await this.request('/categories/impact');
    return res.metrics;
  },

  // Listings & Smart Match
  async getListings(params = {}) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, v);
      }
    }
    const res = await this.request(`/listings?${query.toString()}`);
    return res.listings;
  },

  async smartMatch(query, lat, lng) {
    return this.request('/listings/smart-match', {
      method: 'POST',
      body: JSON.stringify({ query, lat, lng })
    });
  },

  async getListing(id) {
    const res = await this.request(`/listings/${id}`);
    return res.listing;
  },

  async createListing(data) {
    return this.request('/listings', { method: 'POST', body: JSON.stringify(data) });
  },

  async uploadImage(base64Data, filename = 'image.jpg') {
    return this.request('/upload', {
      method: 'POST',
      body: JSON.stringify({ image: base64Data, filename })
    });
  },

  async reportListing(id, reason, details) {
    return this.request(`/listings/${id}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, details })
    });
  },

  async toggleSaveListing(id) {
    return this.request(`/listings/${id}/save`, { method: 'POST' });
  },

  async getSavedItems() {
    const res = await this.request('/listings/user/saved');
    return res.savedItems;
  },

  async getMyListings() {
    const res = await this.request('/listings/user/my-listings');
    return res.listings;
  },

  // Requests
  async createRequest(data) {
    return this.request('/requests', { method: 'POST', body: JSON.stringify(data) });
  },

  async getIncomingRequests() {
    const res = await this.request('/requests/incoming');
    return res.requests;
  },

  async getOutgoingRequests() {
    const res = await this.request('/requests/outgoing');
    return res.requests;
  },

  async respondToRequest(id, action, reason) {
    return this.request(`/requests/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action, reason })
    });
  },

  // Transactions
  async getTransaction(id) {
    const res = await this.request(`/transactions/${id}`);
    return res.transaction;
  },

  async getTransactions(role) {
    const q = role ? `?role=${role}` : '';
    const res = await this.request(`/transactions${q}`);
    return res.transactions;
  },

  async payTransaction(id, paymentMethod, reference) {
    return this.request(`/transactions/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethod, reference })
    });
  },

  async uploadConditionEvidence(id, stage, conditionNotes, photoUrls) {
    return this.request(`/transactions/${id}/condition-evidence`, {
      method: 'POST',
      body: JSON.stringify({ stage, conditionNotes, photoUrls })
    });
  },

  async verifyHandover(id, otp) {
    return this.request(`/transactions/${id}/verify-handover`, {
      method: 'POST',
      body: JSON.stringify({ otp })
    });
  },

  async verifyReturn(id, otp, hasDamage = false) {
    return this.request(`/transactions/${id}/verify-return`, {
      method: 'POST',
      body: JSON.stringify({ otp, hasDamage })
    });
  },

  async reportDamage(id, damageDescription, estimatedCost, damagePhotos) {
    return this.request(`/transactions/${id}/report-damage`, {
      method: 'POST',
      body: JSON.stringify({ damageDescription, estimatedCost, damagePhotos })
    });
  },

  // Disputes
  async getDispute(id) {
    const res = await this.request(`/disputes/${id}`);
    return res.dispute;
  },

  async respondToDispute(id, response, notes, photos) {
    return this.request(`/disputes/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response, notes, photos })
    });
  },

  // Chat & Messages
  async getMessages(transactionId) {
    const res = await this.request(`/messages/${transactionId}`);
    return res.messages;
  },

  async sendMessage(transactionId, content) {
    return this.request(`/messages/${transactionId}`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  },

  // Reviews
  async submitReview(transactionId, rating, reviewText) {
    return this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify({ transactionId, rating, reviewText })
    });
  },

  async getUserReviews(userId) {
    return this.request(`/reviews/user/${userId}`);
  },

  // Notifications
  async getNotifications() {
    return this.request('/notifications');
  },

  async markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, { method: 'PUT' });
  },

  async markAllNotificationsRead() {
    return this.request('/notifications/read-all', { method: 'PUT' });
  },

  // Admin
  async getAdminOverview() {
    return this.request('/admin/overview');
  },

  async getAdminModerationQueue() {
    const res = await this.request('/admin/moderation-queue');
    return res.queue;
  },

  async moderateListing(listingId, action, rejectReason, rejectNotes) {
    return this.request(`/admin/moderation/${listingId}`, {
      method: 'POST',
      body: JSON.stringify({ action, rejectReason, rejectNotes })
    });
  },

  async getAdminReports() {
    const res = await this.request('/admin/reports');
    return res.reports;
  },

  async handleAdminReport(reportId, action) {
    return this.request(`/admin/reports/${reportId}`, {
      method: 'POST',
      body: JSON.stringify({ action })
    });
  },

  async getAdminDisputes() {
    const res = await this.request('/admin/disputes');
    return res.disputes;
  },

  async resolveAdminDispute(disputeId, resolution, deductedAmount, adminNotes) {
    return this.request(`/admin/disputes/${disputeId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution, deductedAmount, adminNotes })
    });
  },

  async getAdminUsers() {
    const res = await this.request('/admin/users');
    return res.users;
  },

  async toggleAdminUserStatus(userId) {
    return this.request(`/admin/users/${userId}/toggle-status`, { method: 'PUT' });
  }
};
