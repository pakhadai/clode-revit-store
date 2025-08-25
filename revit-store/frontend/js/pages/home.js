/**
 * Модуль головної сторінки
 */

class HomePage {
    constructor(app) {
        this.app = app;
        this.subscriptionPlans = {
            monthly: { price: 5, period: 'monthly' },
            yearly: { price: 50, period: 'yearly' }
        };
    }

    /**
     * Рендер сторінки
     */
    async render() {
        const container = document.getElementById('page-content');

        container.innerHTML = `
            <div class="home-page animate-fadeIn">
                <!-- Hero секція -->
                <section class="hero-section mb-8">
                    <div class="hero-content">
                        <h1 class="hero-title">
                            ${this.app.t('app.name')}
                        </h1>
                        <p class="hero-subtitle">
                            ${this.app.t('app.tagline')}
                        </p>
                    </div>
                </section>

                <!-- Підписка -->
                <section class="subscription-section mb-8">
                    ${this.renderSubscription()}
                </section>

                <!-- Щоденний бонус та колесо -->
                <section class="bonus-section mb-8">
                    ${this.renderDailyBonus()}
                </section>

                <!-- Товар тижня -->
                <section class="week-product-section mb-8">
                    ${this.renderWeekProduct()}
                </section>

                <!-- Новинки -->
                <section class="new-arrivals-section mb-8">
                    <div class="section-header">
                        <h2 class="section-title">✨ ${this.app.t('home.newArrivals.title')}</h2>
                        <a href="#" class="section-link" onclick="app.navigateTo('market'); return false;">
                            ${this.app.t('home.newArrivals.viewAll')} →
                        </a>
                    </div>
                    <div id="new-products" class="products-grid">
                        ${this.renderProductsSkeleton()}
                    </div>
                </section>

                <!-- Популярні товари -->
                <section class="popular-section mb-8">
                    <div class="section-header">
                        <h2 class="section-title">🔥 ${this.app.t('home.popularProducts.title')}</h2>
                        <a href="#" class="section-link" onclick="app.navigateTo('market'); return false;">
                            ${this.app.t('home.popularProducts.viewAll')} →
                        </a>
                    </div>
                    <div id="popular-products" class="products-grid">
                        ${this.renderProductsSkeleton()}
                    </div>
                </section>
            </div>
        `;

        this.injectStyles();
        this.attachEventListeners();
        await this.loadProducts();
    }

    /**
     * Рендер секції підписки
     */
    renderSubscription() {
        const user = this.app.auth.currentUser;
        const hasSubscription = user?.subscription_active;

        if (hasSubscription) {
            return `
                <div class="subscription-card active">
                    <div class="subscription-badge">
                        <span class="badge-premium">⭐ Premium</span>
                    </div>
                    <h3 class="subscription-status">
                        ${this.app.t('home.subscription.title')}
                    </h3>
                    <p class="subscription-expires">
                        ${this.app.t('home.subscription.expiresAt')}: ${new Date(user.subscription_expires).toLocaleDateString()}
                    </p>
                </div>
            `;
        }

        return `
            <div class="subscription-card">
                <h2 class="subscription-title">
                    ⭐ ${this.app.t('home.subscription.title')}
                </h2>

                <div class="subscription-plans">
                    <div class="plan-card" data-plan="monthly">
                        <h3 class="plan-name">${this.app.t('home.subscription.monthly')}</h3>
                        <div class="plan-price">${this.app.t('home.subscription.monthlyPrice')}</div>
                        <button class="btn-subscribe" onclick="homePage.subscribeToPlan('monthly')">
                            ${this.app.t('home.subscription.subscribe')}
                        </button>
                    </div>

                    <div class="plan-card featured" data-plan="yearly">
                        <div class="plan-badge">${this.app.t('home.subscription.discount')}</div>
                        <h3 class="plan-name">${this.app.t('home.subscription.yearly')}</h3>
                        <div class="plan-price">${this.app.t('home.subscription.yearlyPrice')}</div>
                        <button class="btn-subscribe primary" onclick="homePage.subscribeToPlan('yearly')">
                            ${this.app.t('home.subscription.subscribe')}
                        </button>
                    </div>
                </div>

                <div class="subscription-benefits">
                    <h4>${this.app.t('home.subscription.benefits.title')}:</h4>
                    <ul class="benefits-list">
                        <li>✅ ${this.app.t('home.subscription.benefits.newArchives')}</li>
                        <li>🎰 ${this.app.t('home.subscription.benefits.bonusSpins')}</li>
                        <li>💰 ${this.app.t('home.subscription.benefits.cashback')}</li>
                        <li>♾️ ${this.app.t('home.subscription.benefits.keepForever')}</li>
                    </ul>
                </div>
            </div>
        `;
    }

    /**
     * Рендер щоденного бонусу
     */
    renderDailyBonus() {
        const bonusData = this.app.bonuses.getBonusStatus();

        return `
            <div class="bonus-card">
                <div class="bonus-header">
                    <h3 class="bonus-title">🎁 ${this.app.t('home.dailyBonus.title')}</h3>
                    <div class="streak-counter">
                        ${this.app.t('home.dailyBonus.streak')}: ${bonusData?.streak || 1}
                    </div>
                </div>

                <div class="bonus-actions">
                    <button class="btn-bonus ${bonusData?.claimed_today ? 'disabled' : ''}"
                            onclick="homePage.claimDailyBonus()"
                            ${bonusData?.claimed_today ? 'disabled' : ''}>
                        ${bonusData?.claimed_today ? '✅' : '🎁'} ${this.app.t('home.dailyBonus.claim')}
                    </button>

                    <button class="btn-wheel" onclick="homePage.openWheel()">
                        🎰 ${this.app.t('home.dailyBonus.wheelOfFortune')}
                        <span class="wheel-spins">${bonusData?.free_spins || 1} ${this.app.t('home.dailyBonus.freeSpins')}</span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Рендер товару тижня
     */
    renderWeekProduct() {
        // Заглушка для товару тижня
        return `
            <div class="week-product-card skeleton-container">
                <div class="week-product-badge">
                    🏆 ${this.app.t('home.weekProduct.title')}
                </div>
                <div class="week-product-content">
                    <div class="skeleton skeleton-image"></div>
                    <div class="week-product-info">
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-text short"></div>
                        <div class="skeleton skeleton-price"></div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Рендер скелетону продуктів
     */
    renderProductsSkeleton() {
        const skeletons = Array(4).fill(null).map(() => `
            <div class="product-card skeleton-container">
                <div class="skeleton skeleton-image"></div>
                <div class="product-info">
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text short"></div>
                    <div class="skeleton skeleton-price"></div>
                </div>
            </div>
        `).join('');

        return skeletons;
    }

    /**
     * Завантаження продуктів
     */
    async loadProducts() {
        try {
            // Завантажуємо новинки
            const newProducts = await this.app.products.getProducts({ sort: 'newest', limit: 4 });
            this.renderProducts('new-products', newProducts);

            // Завантажуємо популярні
            const popularProducts = await this.app.products.getProducts({ sort: 'popular', limit: 4 });
            this.renderProducts('popular-products', popularProducts);

            // Завантажуємо товар тижня
            await this.loadWeekProduct();
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    /**
     * Рендер списку продуктів
     */
    renderProducts(containerId, products) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!products || products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>${this.app.t('market.empty')}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = products.map(product => this.renderProductCard(product)).join('');
    }

    /**
     * Рендер картки продукту
     */
    renderProductCard(product) {
        const isInCart = this.app.cart.isInCart(product.id);
        const isPurchased = product.purchased;

        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">
                    <img src="${product.images?.[0] || '/assets/images/placeholder.jpg'}"
                         alt="${product.title}"
                         loading="lazy">
                    ${product.discount > 0 ? `
                        <span class="product-discount">-${product.discount}%</span>
                    ` : ''}
                </div>
                <div class="product-info">
                    <h4 class="product-title">${product.title}</h4>
                    <div class="product-meta">
                        <span class="product-rating">⭐ ${product.rating || 0}</span>
                        <span class="product-type">${product.type}</span>
                    </div>
                    <div class="product-footer">
                        <div class="product-price">
                            ${product.price > 0 ? `$${(product.price / 100).toFixed(2)}` : this.app.t('market.product.free')}
                        </div>
                        <button class="btn-product-action ${isPurchased ? 'purchased' : isInCart ? 'in-cart' : ''}"
                                onclick="homePage.handleProductAction(${product.id})">
                            ${isPurchased ? '⬇' : isInCart ? '✓' : '🛒'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Завантажити товар тижня
     */
    async loadWeekProduct() {
        try {
            const product = await this.app.products.getWeekProduct();
            if (product) {
                const container = document.querySelector('.week-product-card');
                container.classList.remove('skeleton-container');
                container.innerHTML = `
                    <div class="week-product-badge">
                        🏆 ${this.app.t('home.weekProduct.title')}
                    </div>
                    <div class="week-product-content" onclick="app.navigateTo('product', {id: ${product.id}})">
                        <img src="${product.images?.[0]}" alt="${product.title}" class="week-product-image">
                        <div class="week-product-info">
                            <h3>${product.title}</h3>
                            <div class="week-product-discount">
                                ${this.app.t('home.weekProduct.discount')}: ${product.discount}%
                            </div>
                            <div class="week-product-prices">
                                <span class="old-price">$${(product.original_price / 100).toFixed(2)}</span>
                                <span class="new-price">$${(product.price / 100).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading week product:', error);
        }
    }

    /**
     * Обробка дії з продуктом
     */
    async handleProductAction(productId) {
        const product = await this.app.products.getProduct(productId);

        if (product.purchased) {
            // Завантажити
            this.app.products.downloadProduct(productId);
        } else if (this.app.cart.isInCart(productId)) {
            // Перейти в кошик
            this.app.navigateTo('cart');
        } else {
            // Додати в кошик
            this.app.cart.addToCart(product);
            this.app.utils.showNotification(this.app.t('cart.addedToCart'), 'success');
            this.renderProducts(); // Оновити відображення
        }
    }

    /**
     * Підписатися на план
     */
    async subscribeToPlan(plan) {
        this.app.subscriptions.showSubscriptionModal(plan);
    }

    /**
     * Отримати щоденний бонус
     */
    async claimDailyBonus() {
        const result = await this.app.bonuses.claimDailyBonus();
        if (result.success) {
            this.app.utils.showNotification(
                this.app.t('home.dailyBonus.bonusReceived').replace('{{amount}}', result.amount),
                'success'
            );
            this.render(); // Оновити сторінку
        }
    }

    /**
     * Відкрити колесо фортуни
     */
    openWheel() {
        this.app.bonuses.showWheelOfFortune();
    }

    /**
     * Прикріплення обробників подій
     */
    attachEventListeners() {
        // Pull to refresh
        let startY = 0;
        let isPulling = false;

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].pageY;
                isPulling = true;
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (isPulling) {
                const currentY = e.touches[0].pageY;
                const diff = currentY - startY;

                if (diff > 50) {
                    // Показати індикатор оновлення
                }
            }
        });

        document.addEventListener('touchend', (e) => {
            if (isPulling) {
                isPulling = false;
                // Оновити сторінку якщо потягнули достатньо
            }
        });
    }

    /**
     * Додавання стилів
     */
    injectStyles() {
        if (document.getElementById('home-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'home-styles';
        styles.innerHTML = `
            /* Hero секція */
            .hero-section {
                text-align: center;
                padding: 2rem 0;
            }

            .hero-title {
                font-size: 2rem;
                font-weight: 800;
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 0.5rem;
            }

            .hero-subtitle {
                color: #6b7280;
                font-size: 1.125rem;
            }

            .dark .hero-subtitle {
                color: #9ca3af;
            }

            /* Секції */
            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }

            .section-title {
                font-size: 1.5rem;
                font-weight: 700;
                color: #111827;
            }

            .dark .section-title {
                color: white;
            }

            .section-link {
                color: #3b82f6;
                text-decoration: none;
                font-weight: 500;
                transition: color 0.2s;
            }

            .section-link:hover {
                color: #8b5cf6;
            }

            /* Картка підписки */
            .subscription-card {
                background: white;
                border-radius: 20px;
                padding: 1.5rem;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            }

            .dark .subscription-card {
                background: #1f2937;
            }

            .subscription-card.active {
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                color: white;
            }

            .subscription-title {
                font-size: 1.5rem;
                font-weight: 700;
                margin-bottom: 1rem;
                color: #111827;
            }

            .dark .subscription-title {
                color: white;
            }

            .subscription-plans {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
                margin-bottom: 1.5rem;
            }

            .plan-card {
                position: relative;
                padding: 1rem;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                text-align: center;
                transition: all 0.3s ease;
            }

            .dark .plan-card {
                border-color: #374151;
            }

            .plan-card.featured {
                border-color: #3b82f6;
                transform: scale(1.05);
            }

            .plan-badge {
                position: absolute;
                top: -10px;
                left: 50%;
                transform: translateX(-50%);
                background: #3b82f6;
                color: white;
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 600;
            }

            .plan-name {
                font-weight: 600;
                margin-bottom: 0.5rem;
            }

            .plan-price {
                font-size: 1.25rem;
                font-weight: 700;
                color: #3b82f6;
                margin-bottom: 0.75rem;
            }

            .btn-subscribe {
                width: 100%;
                padding: 0.5rem;
                background: white;
                border: 2px solid #3b82f6;
                color: #3b82f6;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            .btn-subscribe.primary {
                background: #3b82f6;
                color: white;
            }

            .btn-subscribe:hover {
                transform: translateY(-2px);
            }

            .benefits-list {
                list-style: none;
                space-y: 0.5rem;
            }

            .benefits-list li {
                padding: 0.5rem 0;
                color: #4b5563;
            }

            .dark .benefits-list li {
                color: #d1d5db;
            }

            /* Картка бонусів */
            .bonus-card {
                background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                color: white;
                border-radius: 20px;
                padding: 1.5rem;
                box-shadow: 0 10px 25px rgba(251, 191, 36, 0.3);
            }

            .bonus-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }

            .bonus-title {
                font-size: 1.25rem;
                font-weight: 700;
            }

            .streak-counter {
                background: rgba(255, 255, 255, 0.2);
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-weight: 600;
            }

            .bonus-actions {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
            }

            .btn-bonus, .btn-wheel {
                padding: 0.75rem;
                background: white;
                color: #f59e0b;
                border: none;
                border-radius: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            .btn-bonus:hover, .btn-wheel:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            }

            .btn-bonus.disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .wheel-spins {
                display: block;
                font-size: 0.875rem;
                opacity: 0.8;
                margin-top: 0.25rem;
            }

            /* Товар тижня */
            .week-product-card {
                position: relative;
                background: white;
                border-radius: 20px;
                overflow: hidden;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            }

            .dark .week-product-card {
                background: #1f2937;
            }

            .week-product-badge {
                position: absolute;
                top: 1rem;
                left: 1rem;
                background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                font-weight: 600;
                z-index: 1;
            }

            .week-product-content {
                display: flex;
                cursor: pointer;
                transition: transform 0.3s ease;
            }

            .week-product-content:hover {
                transform: scale(1.02);
            }

            .week-product-image {
                width: 150px;
                height: 150px;
                object-fit: cover;
            }

            .week-product-info {
                flex: 1;
                padding: 1.5rem;
            }

            .week-product-info h3 {
                font-size: 1.25rem;
                font-weight: 700;
                margin-bottom: 0.5rem;
                color: #111827;
            }

            .dark .week-product-info h3 {
                color: white;
            }

            .week-product-discount {
                display: inline-block;
                background: #fee2e2;
                color: #ef4444;
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-size: 0.875rem;
                font-weight: 600;
                margin-bottom: 0.75rem;
            }

            .dark .week-product-discount {
                background: rgba(239, 68, 68, 0.2);
            }

            .week-product-prices {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }

            .old-price {
                color: #9ca3af;
                text-decoration: line-through;
            }

            .new-price {
                font-size: 1.5rem;
                font-weight: 700;
                color: #3b82f6;
            }

            /* Сітка продуктів */
            .products-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                gap: 1rem;
            }

            @media (min-width: 640px) {
                .products-grid {
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                }
            }

            /* Картка продукту */
            .product-card {
                background: white;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                transition: all 0.3s ease;
                cursor: pointer;
            }

            .dark .product-card {
                background: #1f2937;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }

            .product-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
            }

            .product-image {
                position: relative;
                width: 100%;
                height: 160px;
                overflow: hidden;
                background: #f3f4f6;
            }

            .dark .product-image {
                background: #374151;
            }

            .product-image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.3s ease;
            }

            .product-card:hover .product-image img {
                transform: scale(1.1);
            }

            .product-discount {
                position: absolute;
                top: 0.5rem;
                right: 0.5rem;
                background: #ef4444;
                color: white;
                padding: 0.25rem 0.5rem;
                border-radius: 8px;
                font-size: 0.75rem;
                font-weight: 600;
            }

            .product-info {
                padding: 1rem;
            }

            .product-title {
                font-size: 0.875rem;
                font-weight: 600;
                color: #111827;
                margin-bottom: 0.5rem;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .dark .product-title {
                color: white;
            }

            .product-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.75rem;
                font-size: 0.75rem;
                color: #6b7280;
            }

            .dark .product-meta {
                color: #9ca3af;
            }

            .product-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .product-price {
                font-size: 1.125rem;
                font-weight: 700;
                color: #3b82f6;
            }

            .btn-product-action {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .btn-product-action:hover {
                background: #2563eb;
                transform: scale(1.1);
            }

            .btn-product-action.in-cart {
                background: #10b981;
            }

            .btn-product-action.purchased {
                background: #6b7280;
            }

            /* Скелетон */
            .skeleton-container .skeleton-image {
                width: 100%;
                height: 160px;
                border-radius: 8px;
            }

            .skeleton-container .skeleton-text {
                height: 16px;
                border-radius: 4px;
                margin-bottom: 0.5rem;
            }

            .skeleton-container .skeleton-text.short {
                width: 60%;
            }

            .skeleton-container .skeleton-price {
                height: 24px;
                width: 40%;
                border-radius: 4px;
            }

            /* Empty state */
            .empty-state {
                text-align: center;
                padding: 3rem 1rem;
                color: #6b7280;
            }

            .dark .empty-state {
                color: #9ca3af;
            }

            /* Адаптивність */
            @media (max-width: 640px) {
                .hero-title {
                    font-size: 1.5rem;
                }

                .subscription-plans {
                    grid-template-columns: 1fr;
                }

                .plan-card.featured {
                    transform: none;
                }

                .week-product-content {
                    flex-direction: column;
                }

                .week-product-image {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(styles);
    }
}

// Експортуємо клас
window.HomePage = HomePage;
window.homePage = null; // Буде ініціалізовано в app.js