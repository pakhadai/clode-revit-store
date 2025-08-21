/**
 * Модуль кошика
 */

class CartModule {
    constructor() {
        this.items = [];
        this.total = 0;
        this.bonusesAvailable = 0;
        this.promoCode = null;
        this.loadFromStorage();
    }

    /**
     * Завантажити кошик з localStorage
     */
    loadFromStorage() {
        const savedCart = Utils.storage.get('cart', []);
        this.items = savedCart;
        this.updateTotal();
    }

    /**
     * Зберегти кошик в localStorage
     */
    saveToStorage() {
        Utils.storage.set('cart', this.items);
    }

    /**
     * Додати товар в кошик
     */
    async addToCart(productId) {
        try {
            // Перевіряємо чи вже є в кошику
            if (this.items.find(item => item.id === productId)) {
                Utils.showNotification(window.app.t('notifications.alreadyInCart'), 'warning');
                return;
            }

            // Отримуємо інформацію про товар
            const product = await api.getProduct(productId, Utils.getCurrentLanguage());

            // Додаємо в кошик
            const cartItem = {
                id: product.id,
                sku: product.sku,
                title: product.title,
                price: product.price,
                current_price: product.current_price,
                discount_percent: product.discount_percent,
                preview_image: product.preview_images?.[0] || null,
                added_at: new Date().toISOString()
            };

            this.items.push(cartItem);
            this.saveToStorage();
            this.updateTotal();
            this.updateCartBadge();

            Utils.showNotification(window.app.t('notifications.addedToCart'), 'success');
            auth.hapticFeedback('impact', 'light');

            // Оновлюємо кнопку якщо є на сторінці
            this.updateAddToCartButton(productId, true);

        } catch (error) {
            console.error('Add to cart error:', error);
            Utils.showNotification(window.app.t('notifications.addToCartError'), 'error');
        }
    }

    /**
     * Видалити з кошика
     */
    removeFromCart(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.saveToStorage();
        this.updateTotal();
        this.updateCartBadge();

        Utils.showNotification(window.app.t('notifications.removedFromCart'), 'info');
        auth.hapticFeedback('impact', 'light');

        // Оновлюємо кнопку якщо є на сторінці
        this.updateAddToCartButton(productId, false);
    }

    /**
     * Очистити кошик
     */
    clearCart() {
        this.items = [];
        this.saveToStorage();
        this.updateTotal();
        this.updateCartBadge();
    }

    /**
     * Оновити загальну суму
     */
    updateTotal() {
        this.total = this.items.reduce((sum, item) => {
            return sum + (item.current_price || item.price);
        }, 0);
    }

    /**
     * Оновити бейдж кошика
     */
    updateCartBadge() {
        const badge = document.querySelector('#cart-badge');
        if (badge) {
            const count = this.items.length;
            if (count > 0) {
                badge.textContent = count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    /**
     * Оновити кнопку додавання в кошик
     */
    updateAddToCartButton(productId, inCart) {
        const buttons = document.querySelectorAll(`.add-to-cart-btn[data-product-id="${productId}"]`);
        buttons.forEach(btn => {
            if (inCart) {
                btn.innerHTML = `<span>✓</span> ${window.app.t('product.inCart')}`;
                btn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
                btn.classList.add('bg-green-500', 'hover:bg-green-600');
                btn.disabled = true;
            } else {
                btn.innerHTML = `<span>🛒</span> ${window.app.t('product.addToCart')}`;
                btn.classList.remove('bg-green-500', 'hover:bg-green-600');
                btn.classList.add('bg-blue-500', 'hover:bg-blue-600');
                btn.disabled = false;
            }
        });
    }

    /**
     * Перевірити чи товар в кошику
     */
    isInCart(productId) {
        return this.items.some(item => item.id === productId);
    }

    /**
     * Отримати кількість товарів
     */
    getItemsCount() {
        return this.items.length;
    }

    /**
     * Застосувати промокод
     */
    async applyPromoCode(code) {
        try {
            const response = await api.post('/promo/validate', { code });

            if (response.valid) {
                this.promoCode = response;
                Utils.showNotification(`${window.app.t('cart.payment.promoApplied')}: -${response.discount_value}${response.discount_type === 'percent' ? '%' : ''}`, 'success');
                return true;
            } else {
                Utils.showNotification(window.app.t('notifications.invalidPromo'), 'error');
                return false;
            }
        } catch (error) {
            console.error('Promo code error:', error);
            Utils.showNotification(window.app.t('notifications.promoError'), 'error');
            return false;
        }
    }

    /**
     * Розрахувати фінальну суму
     */
    calculateFinalAmount(useBonuses = 0) {
        let amount = this.total;

        // Застосовуємо промокод
        if (this.promoCode) {
            if (this.promoCode.discount_type === 'percent') {
                amount = amount * (1 - this.promoCode.discount_value / 100);
            } else {
                amount = amount - this.promoCode.discount_value;
            }
        }

        // Віднімаємо бонуси (макс 70% від суми)
        const maxBonuses = Math.floor(amount * 0.7);
        const bonusesToUse = Math.min(useBonuses, maxBonuses);
        amount = amount - bonusesToUse;

        return {
            subtotal: this.total,
            discount: this.total - amount + bonusesToUse,
            bonusesUsed: bonusesToUse,
            total: Math.max(0, amount)
        };
    }


    /**
     * Створити HTML сторінки кошика
     */
    createCartPage() {
        if (this.items.length === 0) {
            return `
                <div class="empty-cart text-center py-16">
                    <div class="text-6xl mb-4">🛒</div>
                    <h2 class="text-2xl font-bold mb-4 dark:text-white">${window.app.t('cart.empty')}</h2>
                    <p class="text-gray-600 dark:text-gray-400 mb-8">${window.app.t('cart.emptyDesc')}</p>
                    <button onclick="window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'market' } }))"
                            class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                        ${window.app.t('cart.goToMarket')}
                    </button>
                </div>
            `;
        }

        const user = auth.user;
        const bonusesAvailable = user?.balance || 0;

        return `
            <div class="cart-page max-w-4xl mx-auto">
                <h1 class="text-3xl font-bold mb-6 dark:text-white">${window.app.t('cart.title')}</h1>

                <div class="cart-items space-y-4 mb-8">
                    ${this.items.map(item => `
                        <div class="cart-item bg-white dark:bg-gray-800 rounded-lg p-4 flex gap-4">
                            <div class="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                                ${item.preview_image ?
                                    `<img src="${item.preview_image}" alt="${item.title}" class="w-full h-full object-cover">` :
                                    `<div class="flex items-center justify-center h-full text-gray-400">
                                        <span class="text-3xl">📦</span>
                                    </div>`
                                }
                            </div>

                            <div class="flex-1">
                                <h3 class="font-bold text-lg dark:text-white">${item.title}</h3>
                                <p class="text-sm text-gray-600 dark:text-gray-400">SKU: ${item.sku}</p>
                            </div>

                            <div class="text-right">
                                ${item.discount_percent > 0 ?
                                    `<div class="text-gray-400 line-through text-sm">${Utils.formatPrice(item.price)}</div>` : ''
                                }
                                <div class="text-blue-600 dark:text-blue-400 font-bold text-xl">
                                    ${Utils.formatPrice(item.current_price || item.price)}
                                </div>
                            </div>

                            <button onclick="cart.removeFromCart(${item.id})"
                                    class="text-red-500 hover:text-red-600 p-2">
                                <span class="text-xl">❌</span>
                            </button>
                        </div>
                    `).join('')}
                </div>

                <div class="payment-options bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
                    <h2 class="text-xl font-bold mb-4 dark:text-white">${window.app.t('cart.payment.title')}</h2>

                    <div class="promo-code mb-4">
                        <label class="block text-sm font-medium mb-2 dark:text-gray-300">${window.app.t('cart.payment.promoCode')}</label>
                        <div class="flex gap-2">
                            <input type="text" id="promo-input"
                                   class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                          dark:bg-gray-700 dark:text-white"
                                   placeholder="${window.app.t('cart.payment.enterPromo')}">
                            <button onclick="cart.applyPromoCodeFromInput()"
                                    class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                                ${window.app.t('cart.payment.apply')}
                            </button>
                        </div>
                        ${this.promoCode ?
                            `<div class="text-green-500 text-sm mt-2">
                                ✅ ${window.app.t('cart.payment.promoApplied')}: -${this.promoCode.discount_value}${this.promoCode.discount_type === 'percent' ? '%' : ''}
                            </div>` : ''
                        }
                    </div>

                    <div class="bonuses mb-4">
                        <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                            ${window.app.t('cart.payment.useBonuses')} (${window.app.t('cart.payment.available')}: ${bonusesAvailable})
                        </label>
                        <div class="flex gap-2">
                            <input type="number" id="bonuses-input"
                                   class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                          dark:bg-gray-700 dark:text-white"
                                   placeholder="0" min="0" max="${Math.min(bonusesAvailable, Math.floor(this.total * 0.7))}"
                                   onchange="cart.updateCheckoutSummary()">
                            <span class="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg dark:text-gray-300">
                                ${window.app.t('cart.payment.max')}: ${Math.min(bonusesAvailable, Math.floor(this.total * 0.7))} (70% ${window.app.t('cart.payment.ofTotal')})
                            </span>
                        </div>
                    </div>

                    <div class="email mb-4">
                        <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                            ${window.app.t('cart.payment.email')}
                        </label>
                        <input type="email" id="email-input"
                               class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                      dark:bg-gray-700 dark:text-white"
                               placeholder="your@email.com">
                    </div>

                    <div class="payment-method">
                        <label class="block text-sm font-medium mb-2 dark:text-gray-300">${window.app.t('cart.payment.method')}</label>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button onclick="cart.selectPaymentMethod('crypto')"
                                    class="payment-method-btn p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                                           hover:border-blue-500 dark:hover:border-blue-400 transition-colors
                                           dark:text-white" data-method="crypto">
                                💳 ${window.app.t('cart.payment.crypto')}
                            </button>
                            <button onclick="cart.selectPaymentMethod('bonuses')"
                                    class="payment-method-btn p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                                           hover:border-blue-500 dark:hover:border-blue-400 transition-colors
                                           dark:text-white" data-method="bonuses"
                                    ${this.total > bonusesAvailable ? 'disabled' : ''}>
                                🎁 ${window.app.t('cart.payment.bonusesOnly')}
                            </button>
                            <button onclick="cart.selectPaymentMethod('subscription')"
                                    class="payment-method-btn p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                                           hover:border-blue-500 dark:hover:border-blue-400 transition-colors
                                           dark:text-white" data-method="subscription"
                                    ${!user?.subscription ? 'disabled' : ''}>
                                ⭐ ${window.app.t('cart.payment.subscription')}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="checkout-summary bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
                    <h3 class="text-xl font-bold mb-4 dark:text-white">${window.app.t('cart.summary.title')}</h3>
                    <div class="space-y-2" id="checkout-summary">
                        <div class="flex justify-between">
                            <span class="dark:text-gray-300">${window.app.t('cart.items')}:</span>
                            <span class="font-bold dark:text-white">${this.items.length}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="dark:text-gray-300">${window.app.t('cart.subtotal')}:</span>
                            <span class="font-bold dark:text-white">${Utils.formatPrice(this.total)}</span>
                        </div>
                        <div class="flex justify-between text-green-500" id="discount-row" style="display: none;">
                            <span>${window.app.t('cart.discount')}:</span>
                            <span class="font-bold" id="discount-amount">-$0.00</span>
                        </div>
                        <div class="flex justify-between text-blue-500" id="bonuses-row" style="display: none;">
                            <span>${window.app.t('cart.bonuses')}:</span>
                            <span class="font-bold" id="bonuses-amount">-$0.00</span>
                        </div>
                        <div class="border-t pt-2 mt-2">
                            <div class="flex justify-between text-xl">
                                <span class="font-bold dark:text-white">${window.app.t('cart.total')}:</span>
                                <span class="font-bold text-blue-600 dark:text-blue-400" id="final-amount">
                                    ${Utils.formatPrice(this.total)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button onclick="cart.checkout()"
                            class="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg
                                   font-bold text-lg transition-colors">
                        ${window.app.t('cart.checkout')}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Застосувати промокод з поля вводу
     */
    async applyPromoCodeFromInput() {
        const input = document.getElementById('promo-input');
        if (input && input.value) {
            await this.applyPromoCode(input.value);
            this.updateCheckoutSummary();
        }
    }

    /**
     * Оновити підсумок оплати
     */
    updateCheckoutSummary() {
        const bonusesInput = document.getElementById('bonuses-input');
        const bonusesToUse = bonusesInput ? parseInt(bonusesInput.value) || 0 : 0;

        const calculation = this.calculateFinalAmount(bonusesToUse);

        // Оновлюємо UI
        const discountRow = document.getElementById('discount-row');
        const bonusesRow = document.getElementById('bonuses-row');
        const discountAmount = document.getElementById('discount-amount');
        const bonusesAmount = document.getElementById('bonuses-amount');
        const finalAmount = document.getElementById('final-amount');

        if (this.promoCode && discountRow && discountAmount) {
            const promoDiscount = this.promoCode.discount_type === 'percent'
                ? this.total * this.promoCode.discount_value / 100
                : this.promoCode.discount_value;
            discountRow.style.display = 'flex';
            discountAmount.textContent = `-${Utils.formatPrice(promoDiscount)}`;
        }

        if (bonusesToUse > 0 && bonusesRow && bonusesAmount) {
            bonusesRow.style.display = 'flex';
            bonusesAmount.textContent = `-${Utils.formatPrice(bonusesToUse)}`;
        }

        if (finalAmount) {
            finalAmount.textContent = Utils.formatPrice(calculation.total);
        }
    }

    /**
     * Вибрати метод оплати
     */
    selectPaymentMethod(method) {
        // Знімаємо виділення з усіх кнопок
        document.querySelectorAll('.payment-method-btn').forEach(btn => {
            btn.classList.remove('border-blue-500', 'bg-blue-50', 'dark:border-blue-400', 'dark:bg-blue-900');
        });

        // Виділяємо вибрану кнопку
        const selectedBtn = document.querySelector(`.payment-method-btn[data-method="${method}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('border-blue-500', 'bg-blue-50', 'dark:border-blue-400', 'dark:bg-blue-900');
        }

        this.selectedPaymentMethod = method;
    }

    /**
     * Оформити замовлення
     */
    async checkout() {
        if (!this.selectedPaymentMethod) {
            Utils.showNotification(window.app.t('notifications.selectPaymentMethod'), 'warning');
            return;
        }

        if (!auth.isAuthenticated()) {
            Utils.showNotification(window.app.t('auth.authRequired'), 'warning');
            await auth.authenticate();
            return;
        }

        try {
            Utils.showLoader(true);

            const bonusesInput = document.getElementById('bonuses-input');
            const emailInput = document.getElementById('email-input');

            const orderData = {
                items: this.items.map(item => ({ product_id: item.id })),
                payment_method: this.selectedPaymentMethod,
                promo_code: this.promoCode?.code || null,
                bonuses_used: bonusesInput ? parseInt(bonusesInput.value) || 0 : 0,
                email: emailInput?.value || null
            };

            const response = await api.createOrder(orderData);

            if (response.payment_url) {
                // Перенаправляємо на сторінку оплати
                window.location.href = response.payment_url;
            } else if (response.success) {
                // Оплата бонусами або підпискою
                Utils.showNotification(window.app.t('notifications.orderSuccess'), 'success');
                this.clearCart();
                window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'profile', tab: 'orders' } }));
            }

        } catch (error) {
            console.error('Checkout error:', error);
            Utils.showNotification(window.app.t('notifications.orderError'), 'error');
        } finally {
            Utils.showLoader(false);
        }
    }
}

// Створюємо та експортуємо єдиний екземпляр
const cart = new CartModule();

// Експортуємо для використання в інших модулях
window.cart = cart;

export default cart;