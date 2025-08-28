// js/components/SubscriptionModal.js
export class SubscriptionModal {
    constructor(plans, activeSubscription, onSelect, onClose) {
        this.plans = plans || [];
        this.activeSubscription = activeSubscription;
        this.onSelect = onSelect;
        this.onClose = onClose;
        this.selectedPlanId = null;
    }

    render() {
        const modal = document.createElement('div');
        modal.id = 'subscription-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';

        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                ${this.renderHeader()}
                <div class="p-6">
                    ${this.renderActiveStatus()}
                    ${this.renderFeatures()}
                    ${this.renderPlans()}
                    ${this.renderPaymentOptions()}
                </div>
            </div>
        `;

        this.attachEventListeners(modal);
        return modal;
    }

    renderHeader() {
        return `
            <div class="p-6 border-b dark:border-gray-700">
                <div class="flex justify-between items-center">
                    <h2 class="text-3xl font-bold dark:text-white">
                        ⭐ ${window.app.t('subscriptions.modal.title')}
                    </h2>
                    <button class="close-modal text-gray-500 hover:text-gray-700 dark:text-gray-400 text-2xl">
                        ✕
                    </button>
                </div>
            </div>
        `;
    }

    renderActiveStatus() {
        if (!this.activeSubscription) return '';

        return `
            <div class="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-6">
                <p class="text-green-800 dark:text-green-200">
                    ${window.app.t('subscriptions.modal.activeUntil')}:
                    <strong>${Utils.formatDate(this.activeSubscription.expires_at)}</strong>
                    (${this.activeSubscription.days_remaining} ${window.app.t('common.days')})
                </p>
            </div>
        `;
    }

    renderFeatures() {
        const features = [
            'subscriptions.features.unlimited_downloads',
            'subscriptions.features.bonus_spins',
            'subscriptions.features.cashback',
            'subscriptions.features.priority_support'
        ];

        return `
            <div class="features mb-8">
                <h3 class="text-xl font-bold mb-4 dark:text-white">
                    ${window.app.t('subscriptions.modal.features')}
                </h3>
                <div class="grid md:grid-cols-2 gap-3">
                    ${features.map(feature => `
                        <div class="flex items-start gap-3">
                            <span class="text-green-500 text-xl">✅</span>
                            <span class="dark:text-gray-300">${window.app.t(feature)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderPlans() {
        return `
            <div class="plans grid md:grid-cols-2 gap-6 mb-8">
                ${this.plans.map(plan => this.renderPlanCard(plan)).join('')}
            </div>
        `;
    }

    renderPlanCard(plan) {
        const isBestValue = plan.is_best_value;
        const lang = Utils.getCurrentLanguage();

        return `
            <div class="plan-card border-2 ${isBestValue ? 'border-purple-500' : 'border-gray-300 dark:border-gray-600'}
                        rounded-xl p-6 ${isBestValue ? 'bg-purple-50 dark:bg-purple-900' : ''}
                        cursor-pointer hover:shadow-lg transition-all"
                 data-plan-id="${plan.id}">

                ${isBestValue ? `
                    <div class="bg-purple-500 text-white text-sm px-3 py-1 rounded-full inline-block mb-3">
                        ${window.app.t('subscriptions.badge.best_value')}
                    </div>
                ` : ''}

                <h4 class="text-2xl font-bold mb-2 dark:text-white">
                    ${plan.name[lang] || plan.name.en}
                </h4>

                <div class="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    $${plan.price_usd}
                </div>

                <p class="text-gray-600 dark:text-gray-400 mb-4">
                    ${plan.description[lang] || plan.description.en}
                </p>

                ${plan.discount ? `
                    <div class="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200
                                px-3 py-2 rounded-lg text-sm mb-4">
                        🎁 ${window.app.t('subscriptions.discount.' + plan.discount)}
                    </div>
                ` : ''}

                <button class="select-plan-btn w-full bg-blue-500 hover:bg-blue-600 text-white
                               px-6 py-3 rounded-lg font-bold transition-colors"
                        data-plan-id="${plan.id}">
                    ${window.app.t('buttons.choose')}
                </button>
            </div>
        `;
    }

    renderPaymentOptions() {
        return `
            <div id="payment-options" class="hidden">
                <h3 class="text-xl font-bold mb-4 dark:text-white">
                    ${window.app.t('payment.select_method')}
                </h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    ${this.renderPaymentMethod('crypto', 'BTC', '₿', 'Bitcoin', 'orange')}
                    ${this.renderPaymentMethod('crypto', 'ETH', 'Ξ', 'Ethereum', 'purple')}
                    ${this.renderPaymentMethod('crypto', 'USDT', '₮', 'USDT', 'green')}
                    ${this.renderBonusesPayment()}
                </div>
            </div>
        `;
    }

    renderPaymentMethod(method, currency, symbol, name, color) {
        return `
            <button class="payment-method-btn bg-${color}-100 dark:bg-${color}-900
                           hover:bg-${color}-200 dark:hover:bg-${color}-800
                           p-4 rounded-lg transition-colors"
                    data-method="${method}" data-currency="${currency}">
                <div class="text-2xl mb-1">${symbol}</div>
                <div class="text-sm font-medium dark:text-white">${name}</div>
            </button>
        `;
    }

    renderBonusesPayment() {
        const userBalance = window.auth?.user?.balance || 0;
        const canPay = this.selectedPlanId &&
                       window.subscriptionService?.canPayWithBonuses(this.selectedPlanId);

        return `
            <button class="payment-method-btn bg-blue-100 dark:bg-blue-900
                           hover:bg-blue-200 dark:hover:bg-blue-800
                           p-4 rounded-lg transition-colors
                           ${!canPay ? 'opacity-50 cursor-not-allowed' : ''}"
                    data-method="bonuses"
                    ${!canPay ? 'disabled' : ''}>
                <div class="text-2xl mb-1">🎁</div>
                <div class="text-sm font-medium dark:text-white">
                    ${window.app.t('payment.bonuses')}
                </div>
                <div class="text-xs text-gray-600 dark:text-gray-400">
                    ${userBalance} ${window.app.t('common.available')}
                </div>
            </button>
        `;
    }

    attachEventListeners(modal) {
        // Close button
        modal.querySelector('.close-modal')?.addEventListener('click', () => {
            this.close();
        });

        // Click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.close();
            }
        });

        // Select plan
        modal.querySelectorAll('.select-plan-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const planId = btn.dataset.planId;
                this.selectPlan(planId);
            });
        });

        // Payment methods
        modal.querySelectorAll('.payment-method-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const method = btn.dataset.method;
                const currency = btn.dataset.currency || null;
                this.processPayment(method, currency);
            });
        });
    }

    selectPlan(planId) {
        this.selectedPlanId = planId;

        // Update UI
        document.querySelectorAll('.plan-card').forEach(card => {
            card.classList.remove('ring-2', 'ring-blue-500');
        });

        document.querySelector(`.plan-card[data-plan-id="${planId}"]`)
                ?.classList.add('ring-2', 'ring-blue-500');

        // Show payment options
        const paymentOptions = document.getElementById('payment-options');
        if (paymentOptions) {
            paymentOptions.classList.remove('hidden');
            paymentOptions.scrollIntoView({ behavior: 'smooth' });

            // Update bonuses button state
            this.updateBonusesButton();
        }
    }

    updateBonusesButton() {
        const bonusesBtn = document.querySelector('.payment-method-btn[data-method="bonuses"]');
        if (!bonusesBtn) return;

        const canPay = window.subscriptionService?.canPayWithBonuses(this.selectedPlanId);

        if (canPay) {
            bonusesBtn.disabled = false;
            bonusesBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            bonusesBtn.disabled = true;
            bonusesBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }

    processPayment(method, currency) {
        if (!this.selectedPlanId) {
            Utils.showNotification(window.app.t('subscriptions.errors.no_plan_selected'), 'warning');
            return;
        }

        if (this.onSelect) {
            this.onSelect(this.selectedPlanId, method, currency);
        }
    }

    close() {
        const modal = document.getElementById('subscription-modal');
        if (modal) {
            modal.remove();
        }

        if (this.onClose) {
            this.onClose();
        }
    }

    static show(plans, activeSubscription, onSelect) {
        const existingModal = document.getElementById('subscription-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = new SubscriptionModal(plans, activeSubscription, onSelect);
        const element = modal.render();
        document.body.appendChild(element);

        return modal;
    }
}

window.SubscriptionModal = SubscriptionModal;
export default SubscriptionModal;