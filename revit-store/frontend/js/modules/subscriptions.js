// js/modules/subscriptions.js
// LEGACY CODE - REFACTORED TO MODULAR ARCHITECTURE

import { SubscriptionsAPI } from '../api/SubscriptionsAPI.js';
import { SubscriptionService } from '../services/SubscriptionService.js';
import { SubscriptionModal } from '../components/SubscriptionModal.js';
import { subscriptionHelpers } from '../utils/subscriptionHelpers.js';

class SubscriptionsModule {
    constructor() {
        // LEGACY: Original properties preserved
        this.plans = [];
        this.activeSubscription = null;
        this.selectedPlan = null;

        // NEW: Modular services
        this.api = new SubscriptionsAPI();
        this.service = new SubscriptionService();
        this.helpers = subscriptionHelpers;

        // Initialize service
        this.service.initialize();

        // Subscribe to service events
        this.service.subscribe((event, data) => {
            this.handleServiceEvent(event, data);
        });
    }

    handleServiceEvent(event, data) {
        switch(event) {
            case 'plans:loaded':
                this.plans = data.plans;
                this.activeSubscription = data.active_subscription;
                break;
            case 'subscription:activated':
            case 'subscription:cancelled':
                this.activeSubscription = this.service.getActiveSubscription();
                break;
        }
    }

    // LEGACY: Delegate to new service
    async loadPlans() {
        const response = await this.service.loadPlans();
        this.plans = response.plans;
        this.activeSubscription = response.active_subscription;
        return response;
    }

    async createSubscription(planType, paymentMethod = 'crypto', currency = 'USDT') {
        return await this.service.subscribe(planType, paymentMethod, currency);
    }

    async cancelSubscription(subscriptionId) {
        return await this.service.cancel(subscriptionId);
    }

    // LEGACY: Delegate modal to component
    async showSubscriptionModal() {
        await this.loadPlans();

        SubscriptionModal.show(
            this.plans,
            this.activeSubscription,
            async (planId, method, currency) => {
                await this.pay(method, currency);
            }
        );
    }

    selectPlan(planId) {
        this.selectedPlan = this.plans.find(p => p.id === planId);

        // Update UI through component
        const paymentOptions = document.getElementById('payment-options');
        if (paymentOptions) {
            paymentOptions.style.display = 'block';
            paymentOptions.scrollIntoView({ behavior: 'smooth' });
        }
    }

    async pay(method, currency = 'USDT') {
        if (!this.selectedPlan) {
            Utils.showNotification(window.app.t('subscriptions.errors.no_plan_selected'), 'warning');
            return;
        }

        await this.createSubscription(this.selectedPlan.id, method, currency);
    }

    canPayWithBonuses() {
        return this.service.canPayWithBonuses(this.selectedPlan?.id);
    }

    closeSubscriptionModal() {
        const modal = document.getElementById('subscription-modal');
        if (modal) {
            modal.remove();
        }
    }

    // LEGACY: Keep old banner method with delegation
    createSubscriptionBanner() {
        const isActive = this.service.isSubscriptionActive();
        const daysRemaining = this.service.getDaysRemaining();

        return `
            <div class="subscription-banner">
                <h2 class="text-3xl font-bold mb-4">🎯 ${window.app.t('home.subscription.title')}</h2>
                ${isActive ? `
                    <div class="bg-white/20 backdrop-blur rounded-lg p-3 mb-4">
                        <p class="text-sm">
                            ✅ ${window.app.t('subscriptions.banner.active_info')}
                            ${daysRemaining} ${window.app.t('common.days')}
                        </p>
                    </div>
                ` : ''}
                <div class="grid md:grid-cols-2 gap-6 mb-6">
                    <ul class="space-y-2">
                        <li>✅ ${window.app.t('home.subscription.benefits.newArchives')}</li>
                        <li>✅ ${window.app.t('home.subscription.benefits.bonusSpins')}</li>
                    </ul>
                    <ul class="space-y-2">
                        <li>✅ ${window.app.t('home.subscription.benefits.cashback')}</li>
                        <li>✅ ${window.app.t('home.subscription.benefits.support')}</li>
                    </ul>
                </div>
                <div class="flex gap-4">
                    <button onclick="subscriptions.showSubscriptionModal()"
                            class="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100">
                        ${window.app.t('home.subscription.monthly')}
                    </button>
                    <button onclick="subscriptions.showSubscriptionModal()"
                            class="bg-white text-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100">
                        ${window.app.t('home.subscription.yearly')}
                    </button>
                </div>
            </div>
        `;
    }
}

// Create and export singleton instance
const subscriptions = new SubscriptionsModule();

// Export for backward compatibility
window.subscriptions = subscriptions;

export default subscriptions;