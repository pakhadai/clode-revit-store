// js/services/SubscriptionService.js
import { SubscriptionsAPI } from '../api/SubscriptionsAPI.js';
import { SubscriptionStore } from '../store/SubscriptionStore.js';

export class SubscriptionService {
    constructor() {
        this.api = new SubscriptionsAPI();
        this.store = new SubscriptionStore();
        this.listeners = [];
    }

    async initialize() {
        if (window.auth?.isAuthenticated()) {
            try {
                const active = await this.api.getActiveSubscription();
                this.store.setActiveSubscription(active);
                this.notifyListeners('subscription:loaded', active);
            } catch (error) {
                console.error('Failed to load subscription:', error);
            }
        }
    }

    async loadPlans() {
        try {
            const language = Utils.getCurrentLanguage();
            const response = await this.api.getPlans(language);

            this.store.setPlans(response.plans);
            this.store.setActiveSubscription(response.active_subscription);

            this.notifyListeners('plans:loaded', response);
            return response;
        } catch (error) {
            console.error('Load plans error:', error);
            throw error;
        }
    }

    async subscribe(planType, paymentMethod, currency = 'USDT') {
        const data = {
            plan_type: planType,
            payment_method: paymentMethod,
            currency
        };

        try {
            const response = await this.api.createSubscription(data);

            if (response.success) {
                if (response.payment_url) {
                    window.location.href = response.payment_url;
                } else {
                    // Payment with bonuses - subscription activated
                    await this.initialize();
                    this.notifyListeners('subscription:activated', response);
                }
            }

            return response;
        } catch (error) {
            console.error('Subscribe error:', error);
            throw error;
        }
    }

    async cancel(subscriptionId) {
        const response = await this.api.cancelSubscription(subscriptionId);

        if (response.success) {
            this.store.updateActiveSubscription({ auto_renew: false });
            this.notifyListeners('subscription:cancelled', response);
        }

        return response;
    }

    canPayWithBonuses(planId) {
        const plan = this.store.getPlanById(planId);
        const userBalance = window.auth?.user?.balance || 0;

        if (!plan) return false;
        return userBalance >= plan.price_cents;
    }

    getActiveSubscription() {
        return this.store.getActiveSubscription();
    }

    isSubscriptionActive() {
        const active = this.store.getActiveSubscription();
        if (!active) return false;

        const expiresAt = new Date(active.expires_at);
        return expiresAt > new Date();
    }

    getDaysRemaining() {
        const active = this.store.getActiveSubscription();
        if (!active) return 0;

        const expiresAt = new Date(active.expires_at);
        const now = new Date();
        const diffMs = expiresAt - now;

        return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notifyListeners(event, data) {
        this.listeners.forEach(listener => listener(event, data));
    }
}

window.SubscriptionService = SubscriptionService;
export default SubscriptionService;