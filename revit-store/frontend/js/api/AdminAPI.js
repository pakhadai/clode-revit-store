// js/api/AdminAPI.js
export class AdminAPI {
    constructor(apiClient) {
        this.api = apiClient || window.api;
    }

    // Dashboard
    async getDashboard() {
        return this.api.get('/admin/dashboard');
    }

    // Users Management
    async getUsers(filters = {}) {
        return this.api.get('/admin/users', filters);
    }

    async updateUser(userId, data) {
        return this.api.put(`/admin/users/${userId}`, data);
    }

    async deleteUser(userId) {
        return this.api.delete(`/admin/users/${userId}`);
    }

    async grantSubscription(userId, data) {
        return this.api.post(`/admin/users/${userId}/subscription`, data);
    }

    // Products Management
    async getAdminProducts(params = {}) {
        return this.api.get('/admin/products', params);
    }

    async createProduct(formData) {
        return this.api.request('/admin/products', {
            method: 'POST',
            body: formData,
            headers: {}
        });
    }

    async updateProduct(productId, data) {
        return this.api.put(`/admin/products/${productId}`, data);
    }

    async deleteProduct(productId) {
        return this.api.delete(`/admin/products/${productId}`);
    }

    // Moderation
    async getModeration() {
        return this.api.get('/admin/moderation');
    }

    async approveProduct(productId) {
        return this.api.post(`/admin/moderation/${productId}/approve`);
    }

    async rejectProduct(productId, reason) {
        return this.api.post(`/admin/moderation/${productId}/reject`, { reason });
    }

    async sendForRevision(productId, notes) {
        return this.api.post(`/admin/moderation/${productId}/revision`, { notes });
    }

    // Creator Applications
    async getCreatorApplications(params = {}) {
        return this.api.get('/admin/creator-applications', params);
    }

    async approveCreatorApplication(appId) {
        return this.api.post(`/admin/creator-applications/${appId}/approve`);
    }

    async rejectCreatorApplication(appId, reason) {
        return this.api.post(`/admin/creator-applications/${appId}/reject`, { reason });
    }

    // Promocodes
    async getPromocodes() {
        return this.api.get('/admin/promocodes');
    }

    async createPromocode(data) {
        return this.api.post('/admin/promocodes', data);
    }

    async deletePromocode(id) {
        return this.api.delete(`/admin/promocodes/${id}`);
    }

    // Broadcast
    async sendBroadcast(data) {
        return this.api.post('/admin/broadcast', data);
    }

    async getBroadcastHistory() {
        return this.api.get('/admin/broadcast/history');
    }
}

window.AdminAPI = AdminAPI;
export default AdminAPI;