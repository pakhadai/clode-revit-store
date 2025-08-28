// js/api/SubscriptionsAPI.js
export class SubscriptionsAPI {
    constructor(apiClient) {
        this.api = apiClient || window.api;
    }

    async getPlans(language = 'uk') {
        return this.api.get('/subscriptions/plans', { language });
    }

    async getActiveSubscription() {
        return this.api.get('/subscriptions/active');
    }

    async createSubscription(data) {
        return this.api.post('/subscriptions/create', data);
    }

    async cancelSubscription(subscriptionId) {
        return this.api.post(`/subscriptions/cancel/${subscriptionId}`);
    }

    async getSubscriptionHistory(page = 1, limit = 10) {
        return this.api.get('/subscriptions/history', { page, limit });
    }

    async checkPaymentStatus(paymentId) {
        return this.api.get(`/subscriptions/payment/${paymentId}/status`);
    }
}

window.SubscriptionsAPI = SubscriptionsAPI;
export default SubscriptionsAPI;