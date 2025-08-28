/**
 * Модуль для роботи з підписками
 */

class SubscriptionsModule {
    constructor() {
        this.plans = [];
        this.activeSubscription = null;
        this.selectedPlan = null;
    }

    /**
     * Завантажити плани підписок
     */
    async loadPlans() {
        try {
            const response = await api.get('/subscriptions/plans', {
                language: Utils.getCurrentLanguage()
            });

            this.plans = response.plans;
            this.activeSubscription = response.active_subscription;

            return response;
        } catch (error) {
            console.error('Load plans error:', error);
            Utils.showNotification(window.app.t('subscriptions.loadError'), 'error');
            throw error;
        }
    }

    /**
     * Створити підписку
     */
    async createSubscription(planType, paymentMethod = 'crypto', currency = 'USDT') {
        try {
            Utils.showLoader(true);

            const response = await api.post('/subscriptions/create', {
                plan_type: planType,
                payment_method: paymentMethod,
                currency: currency
            });

            if (response.success) {
                if (response.payment_url) {
                    // Перенаправляємо на сторінку оплати
                    window.location.href = response.payment_url;
                } else {
                    // Оплата бонусами - підписка активована
                    Utils.showNotification(window.app.t('subscriptions.activated'), 'success');

                    // Оновлюємо дані користувача
                    await auth.getCurrentUser();

                    // Закриваємо модальне вікно
                    this.closeSubscriptionModal();

                    // Оновлюємо сторінку
                    window.app.render();
                }
            }

            return response;

        } catch (error) {
            console.error('Create subscription error:', error);
            Utils.showNotification(error.message || window.app.t('subscriptions.createError'), 'error');
            throw error;
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Скасувати підписку (вимкнути автопродовження)
     */
    async cancelSubscription(subscriptionId) {
        try {
            const confirmed = await new Promise(resolve => {
                auth.showConfirm(window.app.t('subscriptions.cancelConfirm'), resolve);
            });

            if (!confirmed) return;

            Utils.showLoader(true);

            const response = await api.post(`/subscriptions/cancel/${subscriptionId}`);

            if (response.success) {
                Utils.showNotification(response.message, 'success');
                this.activeSubscription.auto_renew = false;
                window.app.render();
            }

            return response;

        } catch (error) {
            console.error('Cancel subscription error:', error);
            Utils.showNotification(window.app.t('subscriptions.cancelError'), 'error');
            throw error;
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Показати модальне вікно вибору підписки
     */
    async showSubscriptionModal() {
        await this.loadPlans();

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.id = 'subscription-modal';

        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-3xl font-bold dark:text-white">
                            ⭐ ${window.app.t('subscriptions.title')}
                        </h2>
                        <button onclick="subscriptions.closeSubscriptionModal()"
                                class="text-gray-500 hover:text-gray-700 dark:text-gray-400 text-2xl">
                            ✕
                        </button>
                    </div>

                    ${this.activeSubscription ? `
                        <div class="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-6">
                            <p class="text-green-800 dark:text-green-200">
                                ${window.app.t('subscriptions.activeUntil')}:
                                <strong>${Utils.formatDate(this.activeSubscription.expires_at)}</strong>
                                (${this.activeSubscription.days_remaining} ${window.app.t('time.days')})
                            </p>
                        </div>
                    ` : ''}

                    <div class="features mb-8">
                        <h3 class="text-xl font-bold mb-4 dark:text-white">
                            ${window.app.t('subscriptions.features')}
                        </h3>
                        <div class="grid md:grid-cols-2 gap-3">
                            <div class="flex items-start gap-3">
                                <span class="text-green-500 text-xl">✅</span>
                                <span class="dark:text-gray-300">${window.app.t('subscriptions.feature1')}</span>
                            </div>
                            <div class="flex items-start gap-3">
                                <span class="text-green-500 text-xl">✅</span>
                                <span class="dark:text-gray-300">${window.app.t('subscriptions.feature2')}</span>
                            </div>
                            <div class="flex items-start gap-3">
                                <span class="text-green-500 text-xl">✅</span>
                                <span class="dark:text-gray-300">${window.app.t('subscriptions.feature3')}</span>
                            </div>
                            <div class="flex items-start gap-3">
                                <span class="text-green-500 text-xl">✅</span>
                                <span class="dark:text-gray-300">${window.app.t('subscriptions.feature4')}</span>
                            </div>
                        </div>
                    </div>

                    <div class="plans grid md:grid-cols-2 gap-6 mb-8">
                        ${this.plans.map(plan => `
                            <div class="plan-card border-2 ${plan.is_best_value ? 'border-purple-500' : 'border-gray-300 dark:border-gray-600'}
                                        rounded-xl p-6 ${plan.is_best_value ? 'bg-purple-50 dark:bg-purple-900' : ''}
                                        cursor-pointer hover:shadow-lg transition-all"
                                 onclick="subscriptions.selectPlan('${plan.id}')">

                                ${plan.is_best_value ? `
                                    <div class="bg-purple-500 text-white text-sm px-3 py-1 rounded-full inline-block mb-3">
                                        ${window.app.t('subscriptions.bestValue')}
                                    </div>
                                ` : ''}

                                <h4 class="text-2xl font-bold mb-2 dark:text-white">${plan.name}</h4>
                                <div class="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                                    $${plan.price_usd}
                                </div>
                                <p class="text-gray-600 dark:text-gray-400 mb-4">${plan.description}</p>

                                ${plan.discount ? `
                                    <div class="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200
                                                px-3 py-2 rounded-lg text-sm mb-4">
                                        🎁 ${window.app.t('subscriptions.discount.' + plan.discount)}
                                    </div>
                                ` : ''}

                                <ul class="space-y-2 mb-6">
                                    <li class="flex items-center gap-2">
                                        <span class="text-green-500">✓</span>
                                        <span class="text-sm dark:text-gray-300">
                                            +${plan.benefits.daily_spins_bonus} ${window.app.t('subscriptions.dailySpins')}
                                        </span>
                                    </li>
                                    <li class="flex items-center gap-2">
                                        <span class="text-green-500">✓</span>
                                        <span class="text-sm dark:text-gray-300">
                                            ${plan.benefits.cashback_percent}% ${window.app.t('subscriptions.cashback')}
                                        </span>
                                    </li>
                                </ul>

                                <button class="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg
                                             font-bold transition-colors">
                                    ${window.app.t('buttons.choose')}
                                </button>
                            </div>
                        `).join('')}
                    </div>

                    <div id="payment-options" style="display: none;">
                        <h3 class="text-xl font-bold mb-4 dark:text-white">
                            ${window.app.t('payment.selectMethod')}
                        </h3>

                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                            <button onclick="subscriptions.pay('crypto', 'BTC')"
                                    class="payment-btn bg-orange-100 dark:bg-orange-900 hover:bg-orange-200
                                           dark:hover:bg-orange-800 p-4 rounded-lg transition-colors">
                                <div class="text-2xl mb-1">₿</div>
                                <div class="text-sm font-medium dark:text-white">Bitcoin</div>
                            </button>

                            <button onclick="subscriptions.pay('crypto', 'ETH')"
                                    class="payment-btn bg-purple-100 dark:bg-purple-900 hover:bg-purple-200
                                           dark:hover:bg-purple-800 p-4 rounded-lg transition-colors">
                                <div class="text-2xl mb-1">Ξ</div>
                                <div class="text-sm font-medium dark:text-white">Ethereum</div>
                            </button>

                            <button onclick="subscriptions.pay('crypto', 'USDT')"
                                    class="payment-btn bg-green-100 dark:bg-green-900 hover:bg-green-200
                                           dark:hover:bg-green-800 p-4 rounded-lg transition-colors">
                                <div class="text-2xl mb-1">₮</div>
                                <div class="text-sm font-medium dark:text-white">USDT</div>
                            </button>

                            <button onclick="subscriptions.pay('bonuses')"
                                    class="payment-btn bg-blue-100 dark:bg-blue-900 hover:bg-blue-200
                                           dark:hover:bg-blue-800 p-4 rounded-lg transition-colors"
                                    ${this.canPayWithBonuses() ? '' : 'disabled'}>
                                <div class="text-2xl mb-1">🎁</div>
                                <div class="text-sm font-medium dark:text-white">
                                    ${window.app.t('payment.bonuses')}
                                </div>
                                <div class="text-xs text-gray-600 dark:text-gray-400">
                                    ${auth.user?.balance || 0} ${window.app.t('available')}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Вибрати план
     */
    selectPlan(planId) {
        this.selectedPlan = this.plans.find(p => p.id === planId);

        // Показуємо опції оплати
        const paymentOptions = document.getElementById('payment-options');
        if (paymentOptions) {
            paymentOptions.style.display = 'block';

            // Прокручуємо до опцій
            paymentOptions.scrollIntoView({ behavior: 'smooth' });
        }

        // Підсвічуємо вибраний план
        document.querySelectorAll('.plan-card').forEach(card => {
            card.classList.remove('ring-2', 'ring-blue-500');
        });

        event.currentTarget.classList.add('ring-2', 'ring-blue-500');
    }

    /**
     * Оплатити підписку
     */
    async pay(method, currency = 'USDT') {
        if (!this.selectedPlan) {
            Utils.showNotification(window.app.t('subscriptions.selectPlan'), 'warning');
            return;
        }

        await this.createSubscription(this.selectedPlan.id, method, currency);
    }

    /**
     * Перевірити чи можна оплатити бонусами
     */
    canPayWithBonuses() {
        if (!this.selectedPlan || !auth.user) return false;
        return auth.user.balance >= this.selectedPlan.price_cents;
    }

    /**
     * Закрити модальне вікно
     */
    closeSubscriptionModal() {
        const modal = document.getElementById('subscription-modal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Створити блок підписки для головної сторінки
     */
    createSubscriptionBanner() {
        return `
            <div class="subscription-banner bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white mb-8">
                <h2 class="text-3xl font-bold mb-4">🎯 ${window.app.t('home.subscription.title')}</h2>
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

// Створюємо та експортуємо єдиний екземпляр
const subscriptions = new SubscriptionsModule();

// Експортуємо для використання в інших модулях
window.subscriptions = subscriptions;

export default subscriptions;