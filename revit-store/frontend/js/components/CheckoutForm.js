// js/components/CheckoutForm.js
export class CheckoutForm {
    constructor(onSubmit) {
        this.onSubmit = onSubmit;
        this.selectedPaymentMethod = null;
        this.promoCode = null;
    }

    render(bonusesAvailable = 0) {
        return `
            <div class="payment-options bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
                <h2 class="text-xl font-bold mb-4 dark:text-white">${window.app.t('cart.payment.title')}</h2>

                ${this.renderPromoCode()}
                ${this.renderBonusesInput(bonusesAvailable)}
                ${this.renderEmailInput()}
                ${this.renderPaymentMethods(bonusesAvailable)}
            </div>
        `;
    }

    renderPromoCode() {
        return `
            <div class="promo-code mb-4">
                <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                    ${window.app.t('cart.payment.promoCode')}
                </label>
                <div class="flex gap-2">
                    <input type="text" id="promo-input"
                           class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                  dark:bg-gray-700 dark:text-white"
                           placeholder="${window.app.t('cart.payment.enterPromo')}">
                    <button onclick="checkoutForm.applyPromoCode()"
                            class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                        ${window.app.t('cart.payment.apply')}
                    </button>
                </div>
                <div id="promo-status" class="mt-2"></div>
            </div>
        `;
    }

    renderBonusesInput(bonusesAvailable) {
        const maxBonuses = Math.floor(window.cart?.total * 0.7) || 0;
        const maxAllowed = Math.min(bonusesAvailable, maxBonuses);

        return `
            <div class="bonuses mb-4">
                <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                    ${window.app.t('cart.payment.useBonuses')}
                    (${window.app.t('cart.payment.available')}: ${bonusesAvailable})
                </label>
                <div class="flex gap-2">
                    <input type="number" id="bonuses-input"
                           class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                  dark:bg-gray-700 dark:text-white"
                           placeholder="0" min="0" max="${maxAllowed}"
                           onchange="checkoutForm.updateBonuses(this.value)">
                    <span class="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg dark:text-gray-300">
                        ${window.app.t('cart.payment.max')}: ${maxAllowed} (70% ${window.app.t('cart.payment.ofTotal')})
                    </span>
                </div>
            </div>
        `;
    }

    renderEmailInput() {
        return `
            <div class="email mb-4">
                <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                    ${window.app.t('cart.payment.email')}
                </label>
                <input type="email" id="email-input"
                       class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                              dark:bg-gray-700 dark:text-white"
                       placeholder="your@email.com"
                       value="${window.auth?.user?.email || ''}">
            </div>
        `;
    }

    renderPaymentMethods(bonusesAvailable) {
        const total = window.cart?.total || 0;

        return `
            <div class="payment-method">
                <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                    ${window.app.t('cart.payment.method')}
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    ${this.renderPaymentButton('crypto', '💳', window.app.t('cart.payment.crypto'), true)}
                    ${this.renderPaymentButton('bonuses', '🎁', window.app.t('cart.payment.bonusesOnly'),
                        total <= bonusesAvailable)}
                    ${this.renderPaymentButton('subscription', '⭐', window.app.t('cart.payment.subscription'),
                        !!window.auth?.user?.subscription)}
                </div>
            </div>
        `;
    }

    renderPaymentButton(method, icon, label, enabled) {
        return `
            <button onclick="checkoutForm.selectPaymentMethod('${method}')"
                    class="payment-method-btn p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                           hover:border-blue-500 dark:hover:border-blue-400 transition-colors
                           dark:text-white ${!enabled ? 'opacity-50 cursor-not-allowed' : ''}"
                    data-method="${method}"
                    ${!enabled ? 'disabled' : ''}>
                ${icon} ${label}
            </button>
        `;
    }

    selectPaymentMethod(method) {
        // Remove previous selection
        document.querySelectorAll('.payment-method-btn').forEach(btn => {
            btn.classList.remove('border-blue-500', 'bg-blue-50', 'dark:border-blue-400', 'dark:bg-blue-900');
        });

        // Add selection to clicked button
        const selectedBtn = document.querySelector(`.payment-method-btn[data-method="${method}"]`);
        if (selectedBtn && !selectedBtn.disabled) {
            selectedBtn.classList.add('border-blue-500', 'bg-blue-50', 'dark:border-blue-400', 'dark:bg-blue-900');
            this.selectedPaymentMethod = method;
        }
    }

    async applyPromoCode() {
        const input = document.getElementById('promo-input');
        const statusDiv = document.getElementById('promo-status');

        if (!input || !input.value) return;

        try {
            const result = await window.cart?.applyPromoCode(input.value);
            if (result) {
                this.promoCode = result;
                statusDiv.innerHTML = `
                    <div class="text-green-500 text-sm">
                        ✅ ${window.app.t('cart.payment.promoApplied')}:
                        -${result.discount_value}${result.discount_type === 'percent' ? '%' : ''}
                    </div>
                `;
                window.cart?.updateCheckoutSummary();
            } else {
                statusDiv.innerHTML = `
                    <div class="text-red-500 text-sm">
                        ❌ ${window.app.t('notifications.invalidPromo')}
                    </div>
                `;
            }
        } catch (error) {
            statusDiv.innerHTML = `
                <div class="text-red-500 text-sm">
                    ❌ ${window.app.t('notifications.promoError')}
                </div>
            `;
        }
    }

    updateBonuses(value) {
        const amount = parseInt(value) || 0;
        window.cartSummary?.updateBonusesUsed(amount);
    }

    async submit() {
        if (!this.selectedPaymentMethod) {
            Utils.showNotification(window.app.t('notifications.selectPaymentMethod'), 'warning');
            return;
        }

        const bonusesInput = document.getElementById('bonuses-input');
        const emailInput = document.getElementById('email-input');

        const orderData = {
            items: window.cart?.items.map(item => ({
                product_id: item.id,
                quantity: item.quantity || 1
            })),
            payment_method: this.selectedPaymentMethod,
            promo_code: this.promoCode?.code || null,
            bonuses_used: bonusesInput ? parseInt(bonusesInput.value) || 0 : 0,
            email: emailInput?.value || null
        };

        if (this.onSubmit) {
            await this.onSubmit(orderData);
        }
    }
}

// Global reference for event handlers
window.checkoutForm = new CheckoutForm();
export default CheckoutForm;