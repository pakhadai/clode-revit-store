/**
 * Модуль сторінки кошика
 */

class CartPage {
    constructor(app) {
        this.app = app;
        this.selectedPaymentMethod = null;
        this.useBonuses = 0;
        this.promoCode = '';
    }

    /**
     * Рендер сторінки
     */
    async render() {
        const container = document.getElementById('page-content');
        const cartItems = this.app.cart.items;

        if (cartItems.length === 0) {
            container.innerHTML = this.renderEmptyCart();
        } else {
            container.innerHTML = this.renderCart();
        }

        this.injectStyles();
        this.attachEventListeners();
        this.updateSummary();
    }

    /**
     * Рендер порожнього кошика
     */
    renderEmptyCart() {
        return `
            <div class="empty-cart-container animate-fadeIn">
                <div class="empty-cart-content">
                    <div class="empty-cart-icon">🛒</div>
                    <h2 class="empty-cart-title">${this.app.t('cart.empty')}</h2>
                    <p class="empty-cart-text">${this.app.t('cart.continueShopping')}</p>
                    <button class="btn-continue-shopping" onclick="app.navigateTo('market')">
                        ${this.app.t('buttons.continueShopping')}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Рендер кошика
     */
    renderCart() {
        const user = this.app.auth.currentUser;
        const bonusBalance = user?.balance || 0;

        return `
            <div class="cart-page animate-fadeIn">
                <h1 class="page-title">🛒 ${this.app.t('cart.title')}</h1>

                <div class="cart-layout">
                    <!-- Список товарів -->
                    <div class="cart-items-section">
                        <div class="cart-items-header">
                            <h2 class="section-title">${this.app.t('cart.items')}</h2>
                            <button class="btn-clear" onclick="cartPage.clearCart()">
                                ${this.app.t('buttons.clearAll')}
                            </button>
                        </div>

                        <div class="cart-items-list">
                            ${this.app.cart.items.map(item => this.renderCartItem(item)).join('')}
                        </div>
                    </div>

                    <!-- Оформлення замовлення -->
                    <div class="checkout-section">
                        <div class="checkout-card">
                            <h2 class="section-title">${this.app.t('cart.checkout.title')}</h2>

                            <!-- Промокод -->
                            <div class="promo-section">
                                <label class="input-label">${this.app.t('cart.checkout.promocode')}</label>
                                <div class="promo-input-group">
                                    <input type="text"
                                           id="promo-code"
                                           class="promo-input"
                                           placeholder="${this.app.t('cart.checkout.promocodePlaceholder')}">
                                    <button class="btn-apply-promo" onclick="cartPage.applyPromoCode()">
                                        ${this.app.t('cart.checkout.applyPromocode')}
                                    </button>
                                </div>
                                <div id="promo-status" class="promo-status"></div>
                            </div>

                            <!-- Використати бонуси -->
                            <div class="bonuses-section">
                                <label class="input-label">
                                    ${this.app.t('cart.checkout.bonuses')}
                                    <span class="bonus-balance">(${bonusBalance} ${this.app.t('currency.bonuses')})</span>
                                </label>
                                <div class="bonuses-slider-container">
                                    <input type="range"
                                           id="bonuses-slider"
                                           class="bonuses-slider"
                                           min="0"
                                           max="${Math.min(bonusBalance, Math.floor(this.app.cart.total * 0.7))}"
                                           value="0"
                                           oninput="cartPage.updateBonuses(this.value)">
                                    <div class="bonuses-value">
                                        <span id="bonuses-amount">0</span> ${this.app.t('currency.bonuses')}
                                    </div>
                                </div>
                            </div>

                            <!-- Email -->
                            <div class="email-section">
                                <label class="input-label">${this.app.t('cart.checkout.email')}</label>
                                <input type="email"
                                       id="email-input"
                                       class="email-input"
                                       placeholder="${this.app.t('cart.checkout.emailPlaceholder')}">
                            </div>

                            <!-- Методи оплати -->
                            <div class="payment-section">
                                <label class="input-label">${this.app.t('cart.checkout.paymentMethod')}</label>
                                <div class="payment-methods">
                                    <button class="payment-method"
                                            data-method="crypto"
                                            onclick="cartPage.selectPaymentMethod('crypto')">
                                        <div class="payment-icon">💳</div>
                                        <div class="payment-name">${this.app.t('cart.checkout.crypto')}</div>
                                    </button>

                                    <button class="payment-method"
                                            data-method="bonuses"
                                            onclick="cartPage.selectPaymentMethod('bonuses')"
                                            ${this.app.cart.total > bonusBalance ? 'disabled' : ''}>
                                        <div class="payment-icon">🎁</div>
                                        <div class="payment-name">${this.app.t('cart.checkout.bonusPayment')}</div>
                                    </button>
                                </div>
                            </div>

                            <!-- Підсумок -->
                            <div class="summary-section">
                                <div class="summary-row">
                                    <span>${this.app.t('cart.checkout.subtotal')}</span>
                                    <span id="subtotal">$0.00</span>
                                </div>
                                <div class="summary-row discount-row" style="display: none;">
                                    <span>${this.app.t('cart.checkout.discount')}</span>
                                    <span id="discount" class="text-green">-$0.00</span>
                                </div>
                                <div class="summary-row bonuses-row" style="display: none;">
                                    <span>${this.app.t('cart.checkout.bonuses')}</span>
                                    <span id="bonuses-discount" class="text-blue">-$0.00</span>
                                </div>
                                <div class="summary-divider"></div>
                                <div class="summary-row total-row">
                                    <span>${this.app.t('cart.checkout.total')}</span>
                                    <span id="total" class="total-amount">$0.00</span>
                                </div>
                            </div>

                            <!-- Кнопка оформлення -->
                            <button class="btn-checkout" onclick="cartPage.proceedToCheckout()">
                                ${this.app.t('cart.checkout.proceedToPayment')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Рендер елемента кошика
     */
    renderCartItem(item) {
        return `
            <div class="cart-item" data-product-id="${item.id}">
                <div class="item-image">
                    <img src="${item.preview_image || '/assets/placeholder.jpg'}"
                         alt="${item.title}">
                </div>

                <div class="item-details">
                    <h3 class="item-title">${item.title}</h3>
                    <p class="item-sku">SKU: ${item.sku}</p>

                    ${item.discount_percent > 0 ? `
                        <div class="item-discount">
                            <span class="discount-badge">-${item.discount_percent}%</span>
                            <span class="original-price">$${(item.price / 100).toFixed(2)}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="item-price">
                    <span class="price-label">${this.app.t('cart.price')}:</span>
                    <span class="price-value">$${((item.current_price || item.price) / 100).toFixed(2)}</span>
                </div>

                <button class="btn-remove" onclick="cartPage.removeItem(${item.id})">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        `;
    }

    /**
     * Видалити товар
     */
    removeItem(productId) {
        this.app.cart.removeFromCart(productId);

        // Анімація видалення
        const item = document.querySelector(`.cart-item[data-product-id="${productId}"]`);
        if (item) {
            item.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                this.render();
            }, 300);
        }
    }

    /**
     * Очистити кошик
     */
    clearCart() {
        if (confirm(this.app.t('cart.clearConfirm'))) {
            this.app.cart.clearCart();
            this.render();
        }
    }

    /**
    * Вибрати метод оплати
    */
   selectPaymentMethod(method) {
       this.selectedPaymentMethod = method;

       // Оновлюємо UI
       document.querySelectorAll('.payment-method').forEach(btn => {
           btn.classList.toggle('active', btn.dataset.method === method);
       });

       // Якщо вибрані бонуси, встановлюємо максимальне використання
       if (method === 'bonuses') {
           const slider = document.getElementById('bonuses-slider');
           if (slider) {
               slider.value = slider.max;
               this.updateBonuses(slider.max);
           }
       }
   }

   /**
    * Застосувати промокод
    */
   async applyPromoCode() {
       const input = document.getElementById('promo-code');
       const status = document.getElementById('promo-status');

       if (!input.value) {
           status.innerHTML = `<span class="text-red">${this.app.t('cart.enterPromoCode')}</span>`;
           return;
       }

       try {
           const result = await this.app.cart.applyPromoCode(input.value);
           if (result) {
               this.promoCode = input.value;
               status.innerHTML = `<span class="text-green">✅ ${this.app.t('cart.promoApplied')}</span>`;
               this.updateSummary();
           }
       } catch (error) {
           status.innerHTML = `<span class="text-red">❌ ${this.app.t('cart.invalidPromo')}</span>`;
       }
   }

   /**
    * Оновити використання бонусів
    */
   updateBonuses(value) {
       this.useBonuses = parseInt(value);
       document.getElementById('bonuses-amount').textContent = value;
       this.updateSummary();
   }

   /**
    * Оновити підсумок
    */
   updateSummary() {
       const calculation = this.app.cart.calculateFinalAmount(this.useBonuses);

       // Оновлюємо суми
       document.getElementById('subtotal').textContent = `$${(calculation.subtotal / 100).toFixed(2)}`;
       document.getElementById('total').textContent = `$${(calculation.total / 100).toFixed(2)}`;

       // Показуємо/ховаємо знижки
       const discountRow = document.querySelector('.discount-row');
       const bonusesRow = document.querySelector('.bonuses-row');

       if (this.app.cart.promoCode) {
           discountRow.style.display = 'flex';
           const discount = calculation.subtotal - calculation.total + calculation.bonusesUsed;
           document.getElementById('discount').textContent = `-$${(discount / 100).toFixed(2)}`;
       } else {
           discountRow.style.display = 'none';
       }

       if (this.useBonuses > 0) {
           bonusesRow.style.display = 'flex';
           document.getElementById('bonuses-discount').textContent = `-$${(this.useBonuses / 100).toFixed(2)}`;
       } else {
           bonusesRow.style.display = 'none';
       }
   }

   /**
    * Оформити замовлення
    */
   async proceedToCheckout() {
       if (!this.selectedPaymentMethod) {
           this.app.utils.showNotification(this.app.t('cart.selectPaymentMethod'), 'warning');
           return;
       }

       if (!this.app.auth.isAuthenticated()) {
           this.app.utils.showNotification(this.app.t('auth.authRequired'), 'warning');
           await this.app.auth.authenticate();
           return;
       }

       try {
           this.app.utils.showLoader(true);

           const orderData = {
               items: this.app.cart.items.map(item => ({ product_id: item.id })),
               payment_method: this.selectedPaymentMethod,
               promo_code: this.promoCode || null,
               bonuses_used: this.useBonuses,
               email: document.getElementById('email-input')?.value || null
           };

           const response = await this.app.api.createOrder(orderData);

           if (response.payment_url) {
               // Перенаправляємо на сторінку оплати
               window.location.href = response.payment_url;
           } else if (response.success) {
               // Оплата бонусами - успішно
               this.app.utils.showNotification(this.app.t('cart.orderSuccess'), 'success');
               this.app.cart.clearCart();
               this.app.navigateTo('profile', { tab: 'orders' });
           }

       } catch (error) {
           console.error('Checkout error:', error);
           this.app.utils.showNotification(this.app.t('cart.orderError'), 'error');
       } finally {
           this.app.utils.showLoader(false);
       }
   }

   /**
    * Прикріплення обробників подій
    */
   attachEventListeners() {
       // Анімація при зміні бонусів
       const slider = document.getElementById('bonuses-slider');
       if (slider) {
           slider.addEventListener('input', (e) => {
               const percent = (e.target.value / e.target.max) * 100;
               e.target.style.background = `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percent}%, #e5e7eb ${percent}%, #e5e7eb 100%)`;
           });
       }

       // Enter для промокоду
       const promoInput = document.getElementById('promo-code');
       if (promoInput) {
           promoInput.addEventListener('keypress', (e) => {
               if (e.key === 'Enter') {
                   this.applyPromoCode();
               }
           });
       }
   }

   /**
    * Додавання стилів
    */
   injectStyles() {
       if (document.getElementById('cart-styles')) return;

       const styles = document.createElement('style');
       styles.id = 'cart-styles';
       styles.innerHTML = `
           /* Основні стилі кошика */
           .cart-page {
               max-width: 1200px;
               margin: 0 auto;
               padding-bottom: 2rem;
           }

           .page-title {
               font-size: 2rem;
               font-weight: 800;
               color: #111827;
               margin-bottom: 2rem;
           }

           .dark .page-title {
               color: white;
           }

           /* Лейаут */
           .cart-layout {
               display: grid;
               grid-template-columns: 1fr 400px;
               gap: 2rem;
           }

           @media (max-width: 1024px) {
               .cart-layout {
                   grid-template-columns: 1fr;
               }
           }

           /* Секція товарів */
           .cart-items-section {
               background: white;
               border-radius: 20px;
               padding: 1.5rem;
               box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
           }

           .dark .cart-items-section {
               background: #1f2937;
           }

           .cart-items-header {
               display: flex;
               justify-content: space-between;
               align-items: center;
               margin-bottom: 1.5rem;
               padding-bottom: 1rem;
               border-bottom: 2px solid #e5e7eb;
           }

           .dark .cart-items-header {
               border-bottom-color: #374151;
           }

           .section-title {
               font-size: 1.25rem;
               font-weight: 700;
               color: #111827;
           }

           .dark .section-title {
               color: white;
           }

           .btn-clear {
               padding: 0.5rem 1rem;
               background: transparent;
               border: 1px solid #ef4444;
               color: #ef4444;
               border-radius: 8px;
               font-weight: 600;
               cursor: pointer;
               transition: all 0.2s;
           }

           .btn-clear:hover {
               background: #ef4444;
               color: white;
           }

           /* Елемент кошика */
           .cart-item {
               display: grid;
               grid-template-columns: 100px 1fr auto auto;
               gap: 1rem;
               padding: 1rem;
               background: #f9fafb;
               border-radius: 12px;
               margin-bottom: 1rem;
               transition: all 0.3s ease;
           }

           .dark .cart-item {
               background: #374151;
           }

           .cart-item:hover {
               transform: translateX(4px);
               box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
           }

           @keyframes slideOut {
               to {
                   transform: translateX(-100%);
                   opacity: 0;
               }
           }

           .item-image {
               width: 100px;
               height: 100px;
               border-radius: 8px;
               overflow: hidden;
               background: white;
           }

           .dark .item-image {
               background: #1f2937;
           }

           .item-image img {
               width: 100%;
               height: 100%;
               object-fit: cover;
           }

           .item-details {
               display: flex;
               flex-direction: column;
               justify-content: center;
           }

           .item-title {
               font-size: 1rem;
               font-weight: 600;
               color: #111827;
               margin-bottom: 0.25rem;
           }

           .dark .item-title {
               color: white;
           }

           .item-sku {
               font-size: 0.875rem;
               color: #6b7280;
               margin-bottom: 0.5rem;
           }

           .dark .item-sku {
               color: #9ca3af;
           }

           .item-discount {
               display: flex;
               align-items: center;
               gap: 0.5rem;
           }

           .discount-badge {
               padding: 0.25rem 0.5rem;
               background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
               color: white;
               border-radius: 6px;
               font-size: 0.75rem;
               font-weight: 600;
           }

           .original-price {
               font-size: 0.875rem;
               color: #9ca3af;
               text-decoration: line-through;
           }

           .item-price {
               display: flex;
               flex-direction: column;
               justify-content: center;
               align-items: flex-end;
           }

           .price-label {
               font-size: 0.75rem;
               color: #6b7280;
               margin-bottom: 0.25rem;
           }

           .dark .price-label {
               color: #9ca3af;
           }

           .price-value {
               font-size: 1.25rem;
               font-weight: 700;
               color: #3b82f6;
           }

           .btn-remove {
               width: 36px;
               height: 36px;
               display: flex;
               align-items: center;
               justify-content: center;
               background: white;
               border: 2px solid #e5e7eb;
               border-radius: 8px;
               color: #ef4444;
               cursor: pointer;
               transition: all 0.2s;
               align-self: center;
           }

           .dark .btn-remove {
               background: #1f2937;
               border-color: #374151;
           }

           .btn-remove:hover {
               background: #fef2f2;
               border-color: #ef4444;
               transform: scale(1.1);
           }

           .dark .btn-remove:hover {
               background: rgba(239, 68, 68, 0.1);
           }

           /* Секція оформлення */
           .checkout-section {
               position: sticky;
               top: 1rem;
               height: fit-content;
           }

           .checkout-card {
               background: white;
               border-radius: 20px;
               padding: 1.5rem;
               box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
           }

           .dark .checkout-card {
               background: #1f2937;
           }

           /* Промокод */
           .promo-section, .bonuses-section, .email-section, .payment-section {
               margin-bottom: 1.5rem;
           }

           .input-label {
               display: block;
               font-size: 0.875rem;
               font-weight: 600;
               color: #6b7280;
               margin-bottom: 0.5rem;
           }

           .dark .input-label {
               color: #9ca3af;
           }

           .bonus-balance {
               font-weight: 400;
               color: #3b82f6;
           }

           .promo-input-group {
               display: flex;
               gap: 0.5rem;
           }

           .promo-input, .email-input {
               flex: 1;
               padding: 0.75rem;
               background: #f3f4f6;
               border: 2px solid transparent;
               border-radius: 10px;
               font-size: 0.875rem;
               transition: all 0.2s;
           }

           .dark .promo-input, .dark .email-input {
               background: #374151;
               color: white;
           }

           .promo-input:focus, .email-input:focus {
               outline: none;
               border-color: #3b82f6;
               background: white;
           }

           .dark .promo-input:focus, .dark .email-input:focus {
               background: #1f2937;
           }

           .btn-apply-promo {
               padding: 0.75rem 1.25rem;
               background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
               color: white;
               border: none;
               border-radius: 10px;
               font-weight: 600;
               cursor: pointer;
               transition: all 0.3s ease;
           }

           .btn-apply-promo:hover {
               transform: translateY(-2px);
               box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
           }

           .promo-status {
               margin-top: 0.5rem;
               font-size: 0.875rem;
           }

           .text-green {
               color: #10b981;
           }

           .text-red {
               color: #ef4444;
           }

           .text-blue {
               color: #3b82f6;
           }

           /* Слайдер бонусів */
           .bonuses-slider-container {
               padding: 1rem;
               background: #f3f4f6;
               border-radius: 12px;
           }

           .dark .bonuses-slider-container {
               background: #374151;
           }

           .bonuses-slider {
               width: 100%;
               height: 6px;
               border-radius: 3px;
               background: #e5e7eb;
               outline: none;
               -webkit-appearance: none;
               appearance: none;
           }

           .bonuses-slider::-webkit-slider-thumb {
               -webkit-appearance: none;
               appearance: none;
               width: 20px;
               height: 20px;
               border-radius: 50%;
               background: #3b82f6;
               cursor: pointer;
               transition: all 0.2s;
           }

           .bonuses-slider::-webkit-slider-thumb:hover {
               transform: scale(1.2);
               box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.1);
           }

           .bonuses-slider::-moz-range-thumb {
               width: 20px;
               height: 20px;
               border-radius: 50%;
               background: #3b82f6;
               cursor: pointer;
               border: none;
               transition: all 0.2s;
           }

           .bonuses-slider::-moz-range-thumb:hover {
               transform: scale(1.2);
               box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.1);
           }

           .bonuses-value {
               text-align: center;
               margin-top: 0.75rem;
               font-weight: 600;
               color: #3b82f6;
           }

           /* Методи оплати */
           .payment-methods {
               display: grid;
               grid-template-columns: 1fr 1fr;
               gap: 1rem;
           }

           .payment-method {
               padding: 1rem;
               background: white;
               border: 2px solid #e5e7eb;
               border-radius: 12px;
               text-align: center;
               cursor: pointer;
               transition: all 0.3s ease;
           }

           .dark .payment-method {
               background: #374151;
               border-color: #4b5563;
           }

           .payment-method:hover {
               border-color: #3b82f6;
               transform: translateY(-2px);
               box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
           }

           .payment-method.active {
               background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
               border-color: #3b82f6;
           }

           .payment-method:disabled {
               opacity: 0.5;
               cursor: not-allowed;
           }

           .payment-method:disabled:hover {
               transform: none;
               box-shadow: none;
           }

           .payment-icon {
               font-size: 2rem;
               margin-bottom: 0.5rem;
           }

           .payment-name {
               font-weight: 600;
               color: #111827;
           }

           .dark .payment-name {
               color: white;
           }

           /* Підсумок */
           .summary-section {
               padding: 1rem;
               background: #f9fafb;
               border-radius: 12px;
               margin-bottom: 1.5rem;
           }

           .dark .summary-section {
               background: #374151;
           }

           .summary-row {
               display: flex;
               justify-content: space-between;
               align-items: center;
               padding: 0.5rem 0;
               font-size: 0.875rem;
               color: #6b7280;
           }

           .dark .summary-row {
               color: #9ca3af;
           }

           .summary-divider {
               height: 1px;
               background: #e5e7eb;
               margin: 0.75rem 0;
           }

           .dark .summary-divider {
               background: #4b5563;
           }

           .total-row {
               font-size: 1.125rem;
               font-weight: 700;
               color: #111827;
           }

           .dark .total-row {
               color: white;
           }

           .total-amount {
               font-size: 1.5rem;
               color: #3b82f6;
           }

           /* Кнопка оформлення */
           .btn-checkout {
               width: 100%;
               padding: 1rem;
               background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
               color: white;
               border: none;
               border-radius: 12px;
               font-size: 1.125rem;
               font-weight: 700;
               cursor: pointer;
               transition: all 0.3s ease;
           }

           .btn-checkout:hover {
               transform: translateY(-2px);
               box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
           }

           .btn-checkout:active {
               transform: translateY(0);
           }

           /* Порожній кошик */
           .empty-cart-container {
               display: flex;
               align-items: center;
               justify-content: center;
               min-height: 60vh;
           }

           .empty-cart-content {
               text-align: center;
               padding: 3rem;
               background: white;
               border-radius: 20px;
               box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
           }

           .dark .empty-cart-content {
               background: #1f2937;
           }

           .empty-cart-icon {
               font-size: 6rem;
               margin-bottom: 1.5rem;
               opacity: 0.5;
           }

           .empty-cart-title {
               font-size: 2rem;
               font-weight: 700;
               color: #111827;
               margin-bottom: 0.5rem;
           }

           .dark .empty-cart-title {
               color: white;
           }

           .empty-cart-text {
               font-size: 1.125rem;
               color: #6b7280;
               margin-bottom: 2rem;
           }

           .dark .empty-cart-text {
               color: #9ca3af;
           }

           .btn-continue-shopping {
               padding: 1rem 2rem;
               background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
               color: white;
               border: none;
               border-radius: 12px;
               font-size: 1.125rem;
               font-weight: 600;
               cursor: pointer;
               transition: all 0.3s ease;
           }

           .btn-continue-shopping:hover {
               transform: translateY(-2px);
               box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
           }

           /* Анімації */
           @keyframes fadeIn {
               from { opacity: 0; transform: translateY(20px); }
               to { opacity: 1; transform: translateY(0); }
           }

           .animate-fadeIn {
               animation: fadeIn 0.4s ease;
           }

           /* Адаптивність */
           @media (max-width: 768px) {
               .cart-item {
                   grid-template-columns: 80px 1fr;
                   gap: 0.75rem;
               }

               .item-price, .btn-remove {
                   grid-column: 2;
               }

               .item-price {
                   flex-direction: row;
                   justify-content: space-between;
                   align-items: center;
                   margin-top: 0.5rem;
               }

               .payment-methods {
                   grid-template-columns: 1fr;
               }
           }
       `;
       document.head.appendChild(styles);
   }
}

window.CartPage = CartPage;
window.cartPage = null; // Буде ініціалізовано в app.js