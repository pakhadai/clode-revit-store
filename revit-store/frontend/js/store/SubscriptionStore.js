// js/store/SubscriptionStore.js
export class SubscriptionStore {
    constructor() {
        this.plans = [];
        this.activeSubscription = null;
        this.history = [];
    }

    setPlans(plans) {
        this.plans = plans || [];
    }

    getPlans() {
        return [...this.plans];
    }

    getPlanById(planId) {
        return this.plans.find(p => p.id === planId);
    }

    setActiveSubscription(subscription) {
        this.activeSubscription = subscription;
    }

    getActiveSubscription() {
        return this.activeSubscription;
    }

    updateActiveSubscription(updates) {
        if (this.activeSubscription) {
            this.activeSubscription = { ...this.activeSubscription, ...updates };
        }
    }

    setHistory(history) {
        this.history = history || [];
    }

    getHistory() {
        return [...this.history];
    }

    clearAll() {
        this.plans = [];
        this.activeSubscription = null;
        this.history = [];
    }
}

window.SubscriptionStore = SubscriptionStore;
export default SubscriptionStore;