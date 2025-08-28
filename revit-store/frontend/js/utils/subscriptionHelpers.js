// js/utils/subscriptionHelpers.js
export const subscriptionHelpers = {
    calculateSavings(plan) {
        if (!plan) return 0;

        // Calculate savings compared to monthly plan
        if (plan.id === 'yearly') {
            const monthlyPrice = 5; // $5 per month
            const yearlyWithoutDiscount = monthlyPrice * 12;
            return yearlyWithoutDiscount - plan.price_usd;
        }

        return 0;
    },

    formatPlanDuration(planId) {
        const durations = {
            'monthly': window.app.t('subscriptions.duration.monthly'),
            'yearly': window.app.t('subscriptions.duration.yearly'),
            'lifetime': window.app.t('subscriptions.duration.lifetime')
        };

        return durations[planId] || planId;
    },

    formatPlanBenefits(plan) {
        if (!plan || !plan.benefits) return [];

        const benefits = [];

        if (plan.benefits.unlimited_downloads) {
            benefits.push(window.app.t('subscriptions.benefits.unlimited'));
        }

        if (plan.benefits.daily_spins_bonus > 0) {
            benefits.push(
                window.app.t('subscriptions.benefits.daily_spins')
                    .replace('{count}', plan.benefits.daily_spins_bonus)
            );
        }

        if (plan.benefits.cashback_percent > 0) {
            benefits.push(
                window.app.t('subscriptions.benefits.cashback')
                    .replace('{percent}', plan.benefits.cashback_percent)
            );
        }

        return benefits;
    },

    isSubscriptionExpiringSoon(subscription, daysThreshold = 3) {
        if (!subscription || !subscription.expires_at) return false;

        const expiresAt = new Date(subscription.expires_at);
        const now = new Date();
        const diffMs = expiresAt - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        return diffDays > 0 && diffDays <= daysThreshold;
    },

    getSubscriptionStatus(subscription) {
        if (!subscription) {
            return { status: 'none', color: 'gray', text: window.app.t('subscriptions.status.none') };
        }

        const now = new Date();
        const expiresAt = new Date(subscription.expires_at);

        if (expiresAt < now) {
            return { status: 'expired', color: 'red', text: window.app.t('subscriptions.status.expired') };
        }

        if (this.isSubscriptionExpiringSoon(subscription)) {
            return { status: 'expiring', color: 'yellow', text: window.app.t('subscriptions.status.expiring') };
        }

        if (!subscription.auto_renew) {
            return { status: 'cancelled', color: 'orange', text: window.app.t('subscriptions.status.cancelled') };
        }

        return { status: 'active', color: 'green', text: window.app.t('subscriptions.status.active') };
    },

    formatRenewalDate(subscription) {
        if (!subscription || !subscription.expires_at) return '';

        const expiresAt = new Date(subscription.expires_at);

        if (!subscription.auto_renew) {
            return window.app.t('subscriptions.renewal.expires_on')
                   .replace('{date}', Utils.formatDate(expiresAt));
        }

        return window.app.t('subscriptions.renewal.renews_on')
               .replace('{date}', Utils.formatDate(expiresAt));
    },

    calculateProratedRefund(subscription) {
        if (!subscription || !subscription.price_paid) return 0;

        const now = new Date();
        const startDate = new Date(subscription.created_at);
        const endDate = new Date(subscription.expires_at);

        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const usedDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
        const remainingDays = Math.max(0, totalDays - usedDays);

        return Math.floor((subscription.price_paid * remainingDays) / totalDays);
    },

    getRecommendedPlan(userActivity) {
        if (!userActivity) return 'monthly';

        // Recommend based on user activity
        if (userActivity.downloads_per_month > 10) {
            return 'yearly'; // Heavy users benefit from yearly discount
        }

        if (userActivity.days_since_registration > 30 && userActivity.total_spent > 2000) {
            return 'yearly'; // Loyal users
        }

        return 'monthly'; // Default for new or casual users
    }
};

window.subscriptionHelpers = subscriptionHelpers;
export default subscriptionHelpers;