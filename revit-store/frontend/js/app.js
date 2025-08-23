/**
 * Головний файл додатку OhMyRevit
 */

class App {
    constructor() {
        this.currentPage = 'home';
        this.translations = {};
        this.init();
    }

    /**
     * Ініціалізація додатку
     */
    async init() {
        console.log('🚀 Ініціалізація OhMyRevit...');

        // Встановлюємо тему
        this.applyTheme();

        // Завантажуємо переклади
        await this.loadTranslations();

        // Автентифікація
        if (auth.tg && auth.tg.initData) {
            await auth.authenticate();
        }

        // Ініціалізуємо модуль бонусів ПІСЛЯ автентифікації
        // щоб він міг завантажити статуси для авторизованого користувача
        await bonuses.init();

        // Ініціалізуємо навігацію
        this.initNavigation();

        // Ініціалізуємо обробники подій
        this.initEventHandlers();

        // Оновлюємо UI
        this.updateUI();

        // Завантажуємо початкову сторінку
        const urlParams = Utils.getUrlParams();
        const page = urlParams.page || 'home';
        this.navigateTo(page);

        // Оновлюємо бейдж кошика
        cart.updateCartBadge();

        console.log('✅ Додаток готовий!');
    }

    /**
     * Завантажити переклади
     */
    async loadTranslations() {
        const lang = Utils.getCurrentLanguage();
        try {
            const response = await fetch(`/assets/locales/${lang}.json`);
            if (response.ok) {
                this.translations = await response.json();
            }
        } catch (error) {
            console.error('Failed to load translations:', error);
        }
    }

    /**
     * Отримати переклад
     */
    t(key, defaultValue = '') {
        // Simple key retrieval, can be expanded for nested keys
        const keys = key.split('.');
        let result = this.translations;
        for (const k of keys) {
            result = result?.[k];
            if (result === undefined) {
                return defaultValue || key;
            }
        }
        return result || defaultValue || key;
    }

    /**
     * Застосувати тему
     */
    applyTheme() {
        const theme = Utils.getCurrentTheme();
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    /**
     * Ініціалізація навігації
     */
    initNavigation() {
        // Навігаційні кнопки
        document.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const page = btn.dataset.page;
                this.navigateTo(page);
            });
        });

        // Обробка кнопки "Назад" браузера
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page) {
                this.navigateTo(e.state.page, false);
            }
        });
    }

    /**
     * Ініціалізація обробників подій
     */
    initEventHandlers() {
        // Зміна теми
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            const currentTheme = Utils.getCurrentTheme();
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            Utils.setTheme(newTheme);
            this.applyTheme();
            this.updateThemeButton();
        });

        // Зміна мови
        document.getElementById('language-toggle')?.addEventListener('click', () => {
            this.showLanguageMenu();
        });

        // Профіль
        document.getElementById('profile-btn')?.addEventListener('click', () => {
            this.navigateTo('profile');
        });

        // Сповіщення
        document.getElementById('notifications-btn')?.addEventListener('click', () => {
            this.showNotifications();
        });

        // Пошук
        document.getElementById('search-btn')?.addEventListener('click', () => {
            this.showSearch();
        });

        // Кастомні події
        window.addEventListener('auth:success', (e) => {
            this.updateUI();
            Utils.showNotification(`${this.t('auth.welcome')}, ${e.detail.first_name}!`, 'success');
        });

        window.addEventListener('auth:logout', () => {
            this.updateUI();
            this.navigateTo('home');
        });

        window.addEventListener('navigate', (e) => {
            this.navigateTo(e.detail.page, true, e.detail.params);
        });

        window.addEventListener('language:change', async () => {
            await this.loadTranslations();
            this.render();
            this.updateNavigationText(); // Оновлюємо текст навігації
        });
    }

    /**
     * Навігація до сторінки
     */
    navigateTo(page, pushState = true, params = {}) {
        this.currentPage = page;

        // Оновлюємо URL
        if (pushState) {
            const url = new URL(window.location);
            url.searchParams.set('page', page);
            Object.keys(params).forEach(key => {
                url.searchParams.set(key, params[key]);
            });
            window.history.pushState({ page }, '', url);
        }

        // Оновлюємо активну кнопку навігації
        document.querySelectorAll('[data-page]').forEach(btn => {
            if (btn.dataset.page === page) {
                btn.classList.add('text-blue-600', 'dark:text-blue-400');
                btn.classList.remove('text-gray-600', 'dark:text-gray-400');
            } else {
                btn.classList.remove('text-blue-600', 'dark:text-blue-400');
                btn.classList.add('text-gray-600', 'dark:text-gray-400');
            }
        });

        // Рендеримо сторінку
        this.render();

        // Скролимо вгору
        window.scrollTo(0, 0);
    }


    /**
     * Рендер сторінки
     */
    async render() {
        const content = document.getElementById('page-content');
        if (!content) return;

        Utils.showLoader(true);

        try {
            let html = '';

            switch (this.currentPage) {
                case 'home':
                    html = await this.renderHomePage();
                    break;

                case 'market':
                    html = await this.renderMarketPage();
                    break;

                case 'cart':
                    html = this.renderCartPage();
                    break;

                case 'profile':
                    html = await this.renderProfilePage();
                    break;

                case 'product':
                    const productId = Utils.getUrlParams().id;
                    html = await this.renderProductPage(productId);
                    break;

                case 'downloads':
                    html = this.renderDownloadsPage();
                    break;

                case 'orders':
                    html = this.renderOrdersPage();
                    break;

                case 'favorites':
                    html = await favorites.createFavoritesPage();
                    break;

                case 'referrals':
                    html = await this.renderReferralsPage();
                    break;

                case 'settings':
                    html = this.renderSettingsPage();
                    break;

                case 'support':
                    html = this.renderSupportPage();
                    break;

                case 'faq':
                    html = this.renderFaqPage();
                    break;

                case 'creator':
                    if (auth.isCreator()) {
                        html = creator.createCreatorPage();
                    } else {
                        html = this.render404Page();
                    }
                    break;

                case 'admin':
                    if (auth.isAdmin()) {
                        html = admin.createAdminPage();
                    } else {
                        html = this.render404Page();
                    }
                    break;

                default:
                    html = this.render404Page();
            }

            content.innerHTML = html;

            // Ініціалізуємо обробники для нової сторінки
            this.initPageHandlers();

        } catch (error) {
            console.error('Render error:', error);
            content.innerHTML = this.renderErrorPage(error);
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Рендер головної сторінки
     */
    async renderHomePage() {
        const featured = await products.loadFeaturedProducts();
        const user = auth.user;

        return `
            <div class="home-page">
                <div class="subscription-banner bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white mb-8">
                    <h2 class="text-3xl font-bold mb-4">🎯 ${this.t('home.subscription.title')}</h2>
                    <div class="grid md:grid-cols-2 gap-6 mb-6">
                        <ul class="space-y-2">
                            <li>✅ ${this.t('home.subscription.benefits.newArchives')}</li>
                            <li>✅ ${this.t('home.subscription.benefits.bonusSpins')}</li>
                        </ul>
                        <ul class="space-y-2">
                            <li>✅ ${this.t('home.subscription.benefits.cashback')}</li>
                            <li>✅ ${this.t('home.subscription.benefits.support')}</li>
                        </ul>
                    </div>
                    <div class="flex gap-4">
                        <button onclick="app.showSubscriptionPlans()"
                                class="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100">
                            ${this.t('home.subscription.monthly')}
                        </button>
                        <button onclick="app.showSubscriptionPlans()"
                                class="bg-white text-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100">
                            ${this.t('home.subscription.yearly')}
                        </button>
                    </div>
                </div>

                <div class="daily-bonus bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg mb-8">
                    <h3 class="text-2xl font-bold mb-4 dark:text-white">🎁 ${this.t('home.dailyBonus.title')}</h3>
                    <div class="grid md:grid-cols-2 gap-6">
                        <div class="text-center">
                            <p class="mb-4 dark:text-gray-300">
                                ${this.t('home.dailyBonus.streak')}: <span class="font-bold text-blue-600">${user?.daily_streak || 0} ${Utils.pluralize(user?.daily_streak || 0, [this.t('home.dailyBonus.day'), this.t('home.dailyBonus.days'), this.t('home.dailyBonus.daysMany')])}</span>
                            </p>
                            <button onclick="app.claimDailyBonus()"
                                    class="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-bold">
                                🎁 ${this.t('home.dailyBonus.claimBonus')}
                            </button>
                        </div>

                        <div class="text-center">
                            <p class="mb-4 dark:text-gray-300">
                                ${this.t('home.dailyBonus.freeSpins')}: <span class="font-bold text-purple-600">${user?.free_spins_today || 1}</span>
                            </p>
                            <button onclick="wheelGame.init().then(() => wheelGame.open())"
                                    class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-bold">
                                🎰 ${this.t('home.dailyBonus.spinWheel')}
                            </button>
                        </div>
                    </div>
                </div>

                ${featured.product_of_week ? `
                    <div class="product-of-week bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 mb-8 text-white">
                        <h3 class="text-2xl font-bold mb-4">🏆 ${this.t('home.productOfWeek.title')}</h3>
                        <div class="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 class="text-xl font-bold mb-2">${featured.product_of_week.title}</h4>
                                <div class="mb-4">
                                    <span class="text-3xl font-bold">${Utils.formatPrice(featured.product_of_week.current_price)}</span>
                                    ${featured.product_of_week.discount_percent > 0 ?
                                        `<span class="ml-2 bg-red-500 px-2 py-1 rounded">-${featured.product_of_week.discount_percent}%</span>` : ''
                                    }
                                </div>
                                <button onclick="app.navigateTo('product', true, {id: ${featured.product_of_week.id}})"
                                        class="bg-white text-orange-600 px-6 py-2 rounded-lg font-bold hover:bg-gray-100">
                                    ${this.t('home.productOfWeek.details')}
                                </button>
                            </div>
                            ${featured.product_of_week.preview_image ?
                                `<img src="${featured.product_of_week.preview_image}" alt="${featured.product_of_week.title}"
                                      class="rounded-lg w-full h-48 object-cover">` : ''
                            }
                        </div>
                    </div>
                ` : ''}

                ${featured.new_products?.length > 0 ? `
                    <div class="new-products mb-8">
                        <h3 class="text-2xl font-bold mb-4 dark:text-white">✨ ${this.t('home.sections.new')}</h3>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            ${featured.new_products.map(product => products.createProductCard(product)).join('')}
                        </div>
                    </div>
                ` : ''}

                ${featured.featured_products?.length > 0 ? `
                    <div class="featured-products">
                        <h3 class="text-2xl font-bold mb-4 dark:text-white">🔥 ${this.t('home.sections.featured')}</h3>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            ${featured.featured_products.map(product => products.createProductCard(product)).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Рендер сторінки маркету
     */
    async renderMarketPage() {
        await products.loadProducts();

        return `
            <div class="market-page">
                <h1 class="text-3xl font-bold mb-6 dark:text-white">🛍️ ${this.t('market.title')}</h1>

                <div class="filters bg-white dark:bg-gray-800 rounded-lg p-4 mb-6">
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <select id="filter-category" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                                              dark:bg-gray-700 dark:text-white"
                                onchange="products.setFilter('category', this.value); app.applyFilters()">
                            <option value="">${this.t('market.filters.allCategories')}</option>
                            <option value="free">🆓 ${this.t('market.filters.free')}</option>
                            <option value="premium">⭐ ${this.t('market.filters.premium')}</option>
                            <option value="creator">🎨 ${this.t('market.filters.fromCreators')}</option>
                        </select>

                        <select id="filter-type" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                                        dark:bg-gray-700 dark:text-white"
                                onchange="products.setFilter('product_type', this.value); app.applyFilters()">
                            <option value="">${this.t('market.filters.allTypes')}</option>
                            <option value="furniture">🪑 ${this.t('market.filters.furniture')}</option>
                            <option value="textures">🎨 ${this.t('market.filters.textures')}</option>
                            <option value="components">🔧 ${this.t('market.filters.components')}</option>
                        </select>

                        <select id="filter-sort" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                                        dark:bg-gray-700 dark:text-white"
                                onchange="app.applySorting(this.value)">
                            <option value="created_at-desc">${this.t('market.sorting.newest')}</option>
                            <option value="price-asc">${this.t('market.sorting.priceAsc')}</option>
                            <option value="price-desc">${this.t('market.sorting.priceDesc')}</option>
                            <option value="rating-desc">${this.t('market.sorting.rating')}</option>
                            <option value="downloads-desc">${this.t('market.sorting.popularity')}</option>
                        </select>

                        <div class="relative">
                            <input type="text" id="search-input"
                                   class="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg
                                          dark:bg-gray-700 dark:text-white"
                                   placeholder="${this.t('market.filters.search')}"
                                   onkeyup="app.handleSearch(event)">
                            <button onclick="app.doSearch()"
                                    class="absolute right-2 top-2 text-gray-500 hover:text-gray-700 dark:text-gray-400">
                                🔍
                            </button>
                        </div>
                    </div>

                    <div class="mt-4 flex flex-wrap gap-2">
                        <label class="inline-flex items-center">
                            <input type="checkbox" onchange="products.setFilter('is_free', this.checked); app.applyFilters()"
                                   class="mr-2">
                            <span class="dark:text-gray-300">${this.t('market.filters.onlyFree')}</span>
                        </label>
                        <label class="inline-flex items-center">
                            <input type="checkbox" onchange="products.setFilter('is_new', this.checked); app.applyFilters()"
                                   class="mr-2">
                            <span class="dark:text-gray-300">${this.t('market.filters.new')}</span>
                        </label>
                        <label class="inline-flex items-center">
                            <input type="checkbox" onchange="products.setFilter('has_discount', this.checked); app.applyFilters()"
                                   class="mr-2">
                            <span class="dark:text-gray-300">${this.t('market.filters.withDiscount')}</span>
                        </label>
                    </div>
                </div>

                <div id="products-grid" class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    ${products.products.map(product => products.createProductCard(product)).join('')}
                </div>

                ${products.totalPages > 1 ? `
                    <div class="pagination flex justify-center gap-2 mt-8">
                        ${products.currentPage > 1 ?
                            `<button onclick="app.loadPage(${products.currentPage - 1})"
                                     class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">
                                ← ${this.t('market.pagination.prev')}
                            </button>` : ''
                        }

                        <span class="px-4 py-2 dark:text-white">
                            ${this.t('market.pagination.page')} ${products.currentPage} ${this.t('market.pagination.of')} ${products.totalPages}
                        </span>

                        ${products.currentPage < products.totalPages ?
                            `<button onclick="app.loadPage(${products.currentPage + 1})"
                                     class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">
                                ${this.t('market.pagination.next')} →
                            </button>` : ''
                        }
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Рендер сторінки кошика
     */
    renderCartPage() {
        return cart.createCartPage();
    }

    /**
     * Рендер сторінки профілю
     */
    async renderProfilePage() {
        if (!auth.isAuthenticated()) {
            return this.renderAuthRequiredPage();
        }

        const user = auth.user;

        // Helper function to create a tile button
        const createTile = (page, icon, titleKey) => `
            <button onclick="app.navigateTo('${page}')" class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow hover:shadow-lg transition-shadow text-center">
                <div class="text-4xl mb-2">${icon}</div>
                <div class="font-semibold dark:text-white">${this.t(titleKey)}</div>
            </button>
        `;

        return `
            <div class="profile-page max-w-4xl mx-auto">
                <div class="profile-header bg-white dark:bg-gray-800 rounded-lg p-6 mb-4">
                    <div class="flex items-center gap-4">
                        <div class="avatar w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-3xl flex-shrink-0">
                            ${user.first_name?.[0] || '👤'}
                        </div>
                        <div class="flex-1">
                            <h1 class="text-2xl font-bold dark:text-white">${user.first_name} ${user.last_name || ''}</h1>
                            <p class="text-gray-600 dark:text-gray-400">@${user.username || `user_${user.telegram_id}`}</p>
                            <div class="flex flex-wrap gap-4 mt-2">
                                <span class="text-sm font-medium ${user.vip_level > 0 ? 'text-yellow-500' : 'text-gray-500'}">${user.vip_level_name || this.t('profile.noVip')}</span>
                                ${user.is_creator ? `<span class="text-sm font-medium text-purple-500">🎨 ${this.t('profile.creator')}</span>` : ''}
                                ${user.is_admin ? `<span class="text-sm font-medium text-red-500">👑 ${this.t('profile.admin')}</span>` : ''}
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-4xl font-bold text-blue-600 dark:text-blue-400">${user.balance}</div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">${this.t('profile.balance')}</div>
                        </div>
                    </div>
                </div>

                ${user.is_admin ? `
                    <div class="mb-4">
                        <button onclick="app.navigateTo('admin')" class="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg font-bold text-lg">
                            👑 Адмін панель
                        </button>
                    </div>
                ` : ''}

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    ${createTile('downloads', '📥', 'profile.tabs.downloads')}
                    ${createTile('orders', '📋', 'profile.tabs.orders')}
                    ${createTile('favorites', '❤️', 'profile.tabs.favorites')}
                    ${createTile('referrals', '🤝', 'profile.tabs.referrals')}
                    ${createTile('settings', '⚙️', 'profile.tabs.settings')}
                    ${createTile('support', '💬', 'profile.tabs.support')}
                    ${createTile('faq', '❓', 'profile.tabs.faq')}

                    ${user.is_creator ?
                        `<button onclick="app.navigateTo('creator')" class="bg-purple-100 dark:bg-purple-900 rounded-xl p-4 shadow hover:shadow-lg transition-shadow">
                            <div class="text-3xl mb-1">🎨</div>
                            <div class="text-sm font-semibold text-purple-700 dark:text-purple-300">Кабінет творця</div>
                        </button>`
                    :
                        `<button onclick="admin.showCreatorApplicationModal()" class="bg-green-100 dark:bg-green-900 rounded-xl p-4 shadow hover:shadow-lg transition-shadow">
                            <div class="text-3xl mb-1">🚀</div>
                            <div class="text-sm font-semibold text-green-700 dark:text-green-300">Стати творцем</div>
                        </button>`
                    }
                </div>
            </div>
        `;
    }

    /**
     * Рендер сторінки продукту
     */
    async renderProductPage(productId) {
        if (!productId) {
            return this.render404Page();
        }

        await products.loadProduct(productId);

        if (!products.currentProduct) {
            return this.render404Page();
        }

        return products.createProductPage(products.currentProduct);
    }

    /**
     * Рендер 404 сторінки
     */
    render404Page() {
        return `
            <div class="error-page text-center py-16">
                <div class="text-6xl mb-4">😕</div>
                <h1 class="text-3xl font-bold mb-4 dark:text-white">${this.t('errors.404')}</h1>
                <p class="text-gray-600 dark:text-gray-400 mb-8">${this.t('errors.404Desc')}</p>
                <button onclick="app.navigateTo('home')"
                        class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                    ${this.t('errors.backHome')}
                </button>
            </div>
        `;
    }

    /**
     * Рендер сторінки помилки
     */
    renderErrorPage(error) {
        return `
            <div class="error-page text-center py-16">
                <div class="text-6xl mb-4">❌</div>
                <h1 class="text-3xl font-bold mb-4 dark:text-white">${this.t('errors.500')}</h1>
                <p class="text-gray-600 dark:text-gray-400 mb-8">${error.message || this.t('errors.500Desc')}</p>
                <button onclick="location.reload()"
                        class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                    ${this.t('errors.reload')}
                </button>
            </div>
        `;
    }

    /**
     * Рендер сторінки що вимагає авторизацію
     */
    renderAuthRequiredPage() {
        return `
            <div class="auth-required text-center py-16">
                <div class="text-6xl mb-4">🔒</div>
                <h1 class="text-3xl font-bold mb-4 dark:text-white">${this.t('auth.authRequired')}</h1>
                <p class="text-gray-600 dark:text-gray-400 mb-8">${this.t('auth.authRequiredDesc')}</p>
                <button onclick="auth.authenticate()"
                        class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                    ${this.t('auth.loginWithTelegram')}
                </button>
            </div>
        `;
    }

    /**
     * Ініціалізація обробників для поточної сторінки
     */
    initPageHandlers() {
        // Обробники для карток товарів
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.favorite-btn') && !e.target.closest('.add-to-cart-btn')) {
                    const productId = card.dataset.productId;
                    this.navigateTo('product', true, { id: productId });
                }
            });
        });

        // Обробники для кнопок додавання в кошик
        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const productId = parseInt(btn.dataset.productId);
                await cart.addToCart(productId);
            });
        });

        // Обробники для кнопок обраного
        document.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const productId = parseInt(btn.dataset.productId);
                await products.toggleFavorite(productId);
            });
        });
    }

    /**
     * Оновити UI
     */
    updateUI() {
        this.updateThemeButton();
        this.updateLanguageButton();
        this.updateProfileButton();
        this.updateNavigationText();
        cart.updateCartBadge();
    }

    /**
     * Оновити текст у навігації
     */
    updateNavigationText() {
        document.querySelector('button[data-page="home"] .text-xs').textContent = this.t('navigation.home');
        document.querySelector('button[data-page="market"] .text-xs').textContent = this.t('navigation.market');
        document.querySelector('button[data-page="cart"] .text-xs').textContent = this.t('navigation.cart');
        document.querySelector('button[data-page="profile"] .text-xs').textContent = this.t('navigation.profile');
    }

    /**
     * Оновити кнопку теми
     */
    updateThemeButton() {
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            const theme = Utils.getCurrentTheme();
            btn.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    /**
     * Оновити кнопку мови
     */
    updateLanguageButton() {
        const btn = document.getElementById('language-toggle');
        if (btn) {
            const lang = Utils.getCurrentLanguage();
            btn.textContent = `🌐 ${lang.toUpperCase()}`;
        }
    }

    /**
     * Оновити кнопку профілю
     */
    updateProfileButton() {
        const btn = document.getElementById('profile-btn');
        if (btn && auth.user) {
            btn.innerHTML = `<span class="text-2xl">👤</span><span class="text-xs">${auth.user.first_name}</span>`;
        }
    }

    // ========== ДОПОМІЖНІ МЕТОДИ ==========

    /**
     * Застосувати фільтри
     */
    async applyFilters() {
        await products.loadProducts();
        const grid = document.getElementById('products-grid');
        if (grid) {
            grid.innerHTML = products.products.map(product => products.createProductCard(product)).join('');
            this.initPageHandlers();
        }
    }

    /**
     * Застосувати сортування
     */
    applySorting(value) {
        const [sortBy, sortOrder] = value.split('-');
        products.setFilter('sort_by', sortBy);
        products.setFilter('sort_order', sortOrder);
        this.applyFilters();
    }

    /**
     * Обробка пошуку
     */
    handleSearch(event) {
        if (event.key === 'Enter') {
            this.doSearch();
        }
    }

    /**
     * Виконати пошук
     */
    doSearch() {
        const input = document.getElementById('search-input');
        if (input) {
            products.setFilter('search', input.value);
            this.applyFilters();
        }
    }

    /**
     * Завантажити сторінку
     */
    async loadPage(page) {
        await products.loadProducts(page);
        this.render();
    }

    /**
     * Показати вкладку профілю
     */
    showProfileTab(tab) {
        // Оновлюємо активну вкладку
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tab === tab) {
                btn.classList.add('border-b-2', 'border-blue-500', 'text-blue-600');
            } else {
                btn.classList.remove('border-b-2', 'border-blue-500', 'text-blue-600');
            }
        });

        // Рендеримо контент вкладки
        const content = document.getElementById('profile-tab-content');
        if (content) {
            content.innerHTML = this.renderProfileTabContent(tab);
        }
    }

    /**
     * Рендер контенту вкладки профілю
     */
    renderProfileTabContent(tab) {
        const user = auth.user;

        switch(tab) {
            case 'downloads':
                return this.renderDownloadsTab();
            case 'orders':
                return this.renderOrdersTab();
            case 'favorites':
                return this.renderFavoritesTab();
            case 'referrals':
                return this.renderReferralsTab();
            case 'settings':
                return this.renderSettingsTab();
            case 'support':
                return this.renderSupportTab();
            case 'faq':
                return this.renderFaqTab();
            case 'statistics':
                return this.renderStatisticsTab();
            default:
                return `<p class="text-gray-600 dark:text-gray-400">Вкладка "${tab}" в розробці</p>`;
        }
    }

    /**
     * Рендер вкладки завантажень
     */
    renderDownloadsTab() {
        // Завантажуємо історію покупок
        const downloads = Utils.storage.get('user_downloads', []);

        if (downloads.length === 0) {
            return `
                <div class="text-center py-16">
                    <div class="text-6xl mb-4">📥</div>
                    <h3 class="text-xl font-bold mb-2 dark:text-white">Немає завантажень</h3>
                    <p class="text-gray-600 dark:text-gray-400">Куплені архіви з'являться тут</p>
                </div>
            `;
        }

        return `
            <div class="downloads-list">
                <h3 class="text-xl font-bold mb-4 dark:text-white">📥 Мої завантаження</h3>
                <div class="space-y-4">
                    ${downloads.map(item => `
                        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 flex justify-between items-center">
                            <div>
                                <h4 class="font-bold dark:text-white">${item.title}</h4>
                                <p class="text-sm text-gray-600 dark:text-gray-400">
                                    Куплено: ${Utils.formatDate(item.purchased_at)}
                                </p>
                            </div>
                            <button onclick="app.downloadProduct(${item.product_id})"
                                    class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">
                                Завантажити
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Рендер вкладки замовлень
     */
    renderOrdersTab() {
        const orders = Utils.storage.get('user_orders', []);

        if (orders.length === 0) {
            return `
                <div class="text-center py-16">
                    <div class="text-6xl mb-4">📋</div>
                    <h3 class="text-xl font-bold mb-2 dark:text-white">Немає замовлень</h3>
                    <p class="text-gray-600 dark:text-gray-400">Ваші замовлення з'являться тут</p>
                </div>
            `;
        }

        return `
            <div class="orders-list">
                <h3 class="text-xl font-bold mb-4 dark:text-white">📋 Історія замовлень</h3>
                <div class="space-y-4">
                    ${orders.map(order => `
                        <div class="bg-white dark:bg-gray-800 rounded-lg p-4">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <h4 class="font-bold dark:text-white">Замовлення #${order.order_number}</h4>
                                    <p class="text-sm text-gray-600 dark:text-gray-400">
                                        ${Utils.formatDate(order.created_at)}
                                    </p>
                                </div>
                                <span class="px-3 py-1 rounded-full text-sm ${
                                    order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                }">
                                    ${order.status === 'completed' ? '✅ Завершено' :
                                      order.status === 'pending' ? '⏳ В обробці' :
                                      '❌ Скасовано'}
                                </span>
                            </div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">
                                Товарів: ${order.items_count} | Сума: ${Utils.formatPrice(order.total)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Рендер вкладки обраного
     */
    renderFavoritesTab() {
        const favorites = Utils.storage.get('favorites', []);

        if (favorites.length === 0) {
            return `
                <div class="text-center py-16">
                    <div class="text-6xl mb-4">❤️</div>
                    <h3 class="text-xl font-bold mb-2 dark:text-white">Немає обраних товарів</h3>
                    <p class="text-gray-600 dark:text-gray-400">Додайте товари в обране для швидкого доступу</p>
                </div>
            `;
        }

        return `
            <div class="favorites-list">
                <h3 class="text-xl font-bold mb-4 dark:text-white">❤️ Обрані товари</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    ${favorites.map(productId => `
                        <div class="product-card bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                            <div class="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                            <h4 class="font-bold dark:text-white text-sm">Товар #${productId}</h4>
                            <button onclick="app.navigateTo('product', true, {id: ${productId}})"
                                    class="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
                                Переглянути
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Рендер вкладки рефералів
     */
    renderReferralsTab() {
        const user = auth.user;
        const referralCode = user?.referral_code || 'NOCODE';
        const referralLink = `https://t.me/OhMyRevitBot?start=${referralCode}`;

        return `
            <div class="referrals-content">
                <h3 class="text-xl font-bold mb-4 dark:text-white">🤝 ${this.t('profile.referrals.title')}</h3>

                <div class="bg-blue-50 dark:bg-blue-900 rounded-lg p-6 mb-6">
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Ваше реферальне посилання:</p>
                    <div class="flex gap-2">
                        <input type="text" value="${referralLink}" readonly
                               class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                      bg-white dark:bg-gray-800 dark:text-white">
                        <button onclick="Utils.copyToClipboard('${referralLink}')"
                                class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                            📋 Копіювати
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                        <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            ${user?.referral_count || 0}
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">Запрошено друзів</div>
                    </div>
                    <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                        <div class="text-3xl font-bold text-green-600 dark:text-green-400">
                            ${user?.referral_earnings || 0}
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">Зароблено бонусів</div>
                    </div>
                </div>

                <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                    <h4 class="font-bold mb-2 dark:text-white">Як це працює:</h4>
                    <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <li>✅ Друг реєструється за вашим посиланням</li>
                        <li>✅ Ви отримуєте 30 бонусів за реєстрацію</li>
                        <li>✅ Отримуєте 5% від кожної покупки друга</li>
                        <li>✅ Бонуси нараховуються автоматично</li>
                    </ul>
                </div>
            </div>
        `;
    }

    /**
     * Рендер вкладки налаштувань
     */
    renderSettingsTab() {
        const user = auth.user;

        return `
            <div class="settings-content">
                <h3 class="text-xl font-bold mb-4 dark:text-white">⚙️ ${this.t('profile.tabs.settings')}</h3>

                <div class="space-y-6">
                    <!-- Мова -->
                    <div>
                        <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                            ${this.t('profile.settings.language')}
                        </label>
                        <select id="settings-language"
                                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                       dark:bg-gray-700 dark:text-white"
                                onchange="app.updateSetting('language', this.value)">
                            <option value="ua" ${user?.language === 'ua' ? 'selected' : ''}>🇺🇦 Українська</option>
                            <option value="en" ${user?.language === 'en' ? 'selected' : ''}>🇬🇧 English</option>
                            <option value="ru" ${user?.language === 'ru' ? 'selected' : ''}>⚪ Русский</option>
                        </select>
                    </div>

                    <!-- Тема -->
                    <div>
                        <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                            ${this.t('profile.settings.theme')}
                        </label>
                        <div class="grid grid-cols-2 gap-4">
                            <button onclick="app.updateSetting('theme', 'light')"
                                    class="p-4 border-2 ${user?.theme === 'light' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                                           rounded-lg hover:border-blue-500">
                                <div class="text-3xl mb-2">☀️</div>
                                <div>${this.t('profile.settings.light')}</div>
                            </button>
                            <button onclick="app.updateSetting('theme', 'dark')"
                                    class="p-4 border-2 ${user?.theme === 'dark' ? 'border-blue-500 bg-blue-900' : 'border-gray-300 dark:border-gray-600'}
                                           rounded-lg hover:border-blue-500">
                                <div class="text-3xl mb-2">🌙</div>
                                <div>${this.t('profile.settings.dark')}</div>
                            </button>
                        </div>
                    </div>

                    <!-- Сповіщення -->
                    <div>
                        <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                            ${this.t('profile.settings.notifications')}
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox"
                                   ${user?.notifications_enabled ? 'checked' : ''}
                                   onchange="app.updateSetting('notifications', this.checked)"
                                   class="mr-3">
                            <span class="dark:text-gray-300">
                                ${user?.notifications_enabled ? this.t('profile.settings.enabled') : this.t('profile.settings.disabled')}
                            </span>
                        </label>
                    </div>

                    <!-- Безпека -->
                    ${user?.is_creator || user?.is_admin ? `
                        <div>
                            <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                                ${this.t('profile.settings.security')}
                            </label>
                            <button onclick="app.showPinCodeModal()"
                                    class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                                🔐 ${this.t('profile.settings.pinCode')} - ${this.t('profile.settings.change')}
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Рендер вкладки підтримки
     */
    renderSupportTab() {
        return `
            <div class="support-content">
                <h3 class="text-xl font-bold mb-4 dark:text-white">💬 Підтримка</h3>

                <div class="bg-white dark:bg-gray-800 rounded-lg p-6">
                    <form onsubmit="app.sendSupportMessage(event)">
                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                                Тема звернення
                            </label>
                            <select id="support-topic"
                                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                           dark:bg-gray-700 dark:text-white">
                                <option value="general">Загальне питання</option>
                                <option value="payment">Проблема з оплатою</option>
                                <option value="download">Проблема з завантаженням</option>
                                <option value="creator">Питання творця</option>
                                <option value="other">Інше</option>
                            </select>
                        </div>

                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                                Повідомлення
                            </label>
                            <textarea id="support-message"
                                      rows="5"
                                      class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                             dark:bg-gray-700 dark:text-white"
                                      placeholder="Опишіть вашу проблему або питання..."
                                      required></textarea>
                        </div>

                        <button type="submit"
                                class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                            📤 Відправити
                        </button>
                    </form>
                </div>

                <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <a href="https://t.me/ohmyrevit_support" target="_blank"
                       class="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 text-center hover:bg-blue-100 dark:hover:bg-blue-800">
                        <div class="text-3xl mb-2">💬</div>
                        <div class="font-medium dark:text-white">Telegram</div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">@ohmyrevit_support</div>
                    </a>

                    <a href="mailto:support@ohmyrevit.com"
                       class="bg-green-50 dark:bg-green-900 rounded-lg p-4 text-center hover:bg-green-100 dark:hover:bg-green-800">
                        <div class="text-3xl mb-2">✉️</div>
                        <div class="font-medium dark:text-white">Email</div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">support@ohmyrevit.com</div>
                    </a>

                    <div class="bg-purple-50 dark:bg-purple-900 rounded-lg p-4 text-center">
                        <div class="text-3xl mb-2">⏰</div>
                        <div class="font-medium dark:text-white">Час відповіді</div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">24-48 годин</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Показати плани підписок
     */
    async showSubscriptionPlans() {
        try {
            Utils.showLoader(true);

            // Завантажуємо плани з API
            const response = await api.get('/subscriptions/plans', {
                language: Utils.getCurrentLanguage()
            });

            const plans = response.plans || [];
            const activeSubscription = response.active_subscription;

            // Створюємо модальне вікно
            const modal = document.createElement('div');
            modal.id = 'subscription-plans-modal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4';

            modal.innerHTML = `
                <div class="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div class="p-6">
                        <!-- Заголовок -->
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-3xl font-bold dark:text-white">
                                ⭐ ${this.t('home.subscription.title')}
                            </h2>
                            <button onclick="document.getElementById('subscription-plans-modal').remove()"
                                    class="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white text-3xl">
                                &times;
                            </button>
                        </div>

                        ${activeSubscription ? `
                            <div class="bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg p-4 mb-6">
                                <p class="text-green-800 dark:text-green-200">
                                    ✅ У вас є активна підписка до ${Utils.formatDate(activeSubscription.expires_at)}
                                    (залишилось ${activeSubscription.days_remaining} днів)
                                </p>
                            </div>
                        ` : ''}

                        <!-- Переваги підписки -->
                        <div class="mb-8">
                            <h3 class="text-xl font-bold mb-4 dark:text-white">Переваги підписки:</h3>
                            <div class="grid md:grid-cols-2 gap-4">
                                <div class="flex items-start gap-3">
                                    <span class="text-green-500 text-xl">✅</span>
                                    <span class="dark:text-gray-300">${this.t('home.subscription.benefits.newArchives')}</span>
                                </div>
                                <div class="flex items-start gap-3">
                                    <span class="text-green-500 text-xl">✅</span>
                                    <span class="dark:text-gray-300">${this.t('home.subscription.benefits.bonusSpins')}</span>
                                </div>
                                <div class="flex items-start gap-3">
                                    <span class="text-green-500 text-xl">✅</span>
                                    <span class="dark:text-gray-300">${this.t('home.subscription.benefits.cashback')}</span>
                                </div>
                                <div class="flex items-start gap-3">
                                    <span class="text-green-500 text-xl">✅</span>
                                    <span class="dark:text-gray-300">${this.t('home.subscription.benefits.support')}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Плани підписок -->
                        <div class="grid md:grid-cols-2 gap-6 mb-6">
                            ${plans.map(plan => `
                                <div class="border-2 ${plan.is_best_value ? 'border-purple-500' : 'border-gray-300 dark:border-gray-600'}
                                            rounded-xl p-6 ${plan.is_best_value ? 'bg-purple-50 dark:bg-purple-900/20' : ''}">
                                    ${plan.is_best_value ? `
                                        <div class="bg-purple-500 text-white text-sm px-3 py-1 rounded-full inline-block mb-3">
                                            🎯 Найкраща пропозиція
                                        </div>
                                    ` : ''}

                                    <h4 class="text-2xl font-bold mb-2 dark:text-white">
                                        ${plan.name[Utils.getCurrentLanguage()] || plan.name.en}
                                    </h4>

                                    <div class="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                                        $${plan.price_usd}
                                    </div>

                                    <p class="text-gray-600 dark:text-gray-400 mb-4">
                                        ${plan.description[Utils.getCurrentLanguage()] || plan.description.en}
                                    </p>

                                    ${plan.discount ? `
                                        <div class="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200
                                                    px-3 py-2 rounded-lg text-sm mb-4">
                                            🎁 ${plan.discount}
                                        </div>
                                    ` : ''}

                                    <button onclick="app.selectSubscriptionPlan('${plan.id}')"
                                            class="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                                        Вибрати план
                                    </button>
                                </div>
                            `).join('')}
                        </div>

                        <!-- Методи оплати (прихований спочатку) -->
                        <div id="payment-methods" style="display: none;" class="mt-6 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <h3 class="text-xl font-bold mb-4 dark:text-white">Виберіть метод оплати:</h3>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <button onclick="app.paySubscription('crypto', 'BTC')"
                                        class="p-4 bg-orange-100 dark:bg-orange-900 hover:bg-orange-200 dark:hover:bg-orange-800 rounded-lg">
                                    <div class="text-3xl mb-2">₿</div>
                                    <div class="font-medium">Bitcoin</div>
                                </button>
                                <button onclick="app.paySubscription('crypto', 'ETH')"
                                        class="p-4 bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 rounded-lg">
                                    <div class="text-3xl mb-2">Ξ</div>
                                    <div class="font-medium">Ethereum</div>
                                </button>
                                <button onclick="app.paySubscription('crypto', 'USDT')"
                                        class="p-4 bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 rounded-lg">
                                    <div class="text-3xl mb-2">₮</div>
                                    <div class="font-medium">USDT</div>
                                </button>
                                <button onclick="app.paySubscription('bonuses')"
                                        class="p-4 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg"
                                        ${auth.user && auth.user.balance >= 500 ? '' : 'disabled style="opacity: 0.5;"'}>
                                    <div class="text-3xl mb-2">🎁</div>
                                    <div class="font-medium">Бонуси</div>
                                    <div class="text-xs text-gray-600 dark:text-gray-400">
                                        ${auth.user?.balance || 0} доступно
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

        } catch (error) {
            console.error('Load subscription plans error:', error);
            Utils.showNotification('Помилка завантаження планів підписки', 'error');
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Вибрати план підписки
     */
    selectSubscriptionPlan(planId) {
        this.selectedSubscriptionPlan = planId;

        // Показуємо методи оплати
        const paymentMethods = document.getElementById('payment-methods');
        if (paymentMethods) {
            paymentMethods.style.display = 'block';
            paymentMethods.scrollIntoView({ behavior: 'smooth' });
        }

        // Підсвічуємо вибраний план
        document.querySelectorAll('[onclick*="selectSubscriptionPlan"]').forEach(btn => {
            const parent = btn.closest('.border-2');
            if (btn.getAttribute('onclick').includes(planId)) {
                parent.classList.add('ring-4', 'ring-blue-500');
            } else {
                parent.classList.remove('ring-4', 'ring-blue-500');
            }
        });
    }

    /**
     * Оплатити підписку
     */
    async paySubscription(method, currency = 'USDT') {
        if (!this.selectedSubscriptionPlan) {
            Utils.showNotification('Спочатку виберіть план підписки', 'warning');
            return;
        }

        try {
            Utils.showLoader(true);

            const response = await api.post('/subscriptions/create', {
                plan_type: this.selectedSubscriptionPlan,
                payment_method: method,
                currency: currency
            });

            if (response.success) {
                if (response.payment_url) {
                    // Перенаправляємо на сторінку оплати
                    window.location.href = response.payment_url;
                } else {
                    // Підписка активована (оплата бонусами)
                    Utils.showNotification('Підписка успішно активована!', 'success');
                    document.getElementById('subscription-plans-modal')?.remove();

                    // Оновлюємо дані користувача
                    await auth.getCurrentUser();
                    this.render();
                }
            }

        } catch (error) {
            console.error('Payment error:', error);
            Utils.showNotification('Помилка оплати', 'error');
        } finally {
            Utils.showLoader(false);
        }
    }

    /**
     * Отримати щоденний бонус
     */
    async claimDailyBonus() {
        try {
            const response = await api.claimDailyBonus();
            Utils.showNotification(this.t('notifications.bonusClaimed').replace('{amount}', response.amount), 'success');
            auth.user.balance = response.new_balance;
            auth.user.daily_streak = response.streak;
            this.render();
        } catch (error) {
            Utils.showNotification(this.t('notifications.alreadyClaimed'), 'warning');
        }
    }

    /**
     * Показати колесо фортуни
     */
    showWheelOfFortune() {
        // Створюємо модальне вікно
        const modal = document.createElement('div');
        modal.id = 'wheel-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4';

        // Додаємо контент модального вікна
        modal.innerHTML = `
            <div class="bg-gray-100 dark:bg-gray-900 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto relative">
                <button onclick="document.getElementById('wheel-modal').remove()"
                        class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white text-2xl z-20">
                    &times;
                </button>
                <div id="wheel-container">
                    <div class="text-center p-8">Завантаження колеса...</div>
                </div>
            </div>
        `;

        // Додаємо модальне вікно на сторінку
        document.body.appendChild(modal);

        // Ініціалізуємо компонент колеса всередині модального вікна
        // Ця функція визначена в /js/components/wheel-of-fortune.js
        if (typeof initWheelOfFortune === 'function') {
            initWheelOfFortune('wheel-container');
        } else {
            console.error('Функція initWheelOfFortune не знайдена!');
            document.getElementById('wheel-container').innerHTML = '<div class="text-center text-red-500 p-8">Помилка завантаження компонента.</div>';
        }
    }

    /**
     * Показати меню мов
     */
    showLanguageMenu() {
        // TODO: Реалізувати меню вибору мови
        const languages = ['en', 'ua', 'ru'];
        const currentLang = Utils.getCurrentLanguage();
        const nextLang = languages[(languages.indexOf(currentLang) + 1) % languages.length];
        Utils.setLanguage(nextLang);
        this.updateLanguageButton();
    }

    /**
     * Показати сповіщення
     */
    showNotifications() {
        // TODO: Реалізувати сторінку сповіщень
        Utils.showNotification(this.t('notifications.noNotifications'), 'info');
    }

    /**
     * Показати пошук
     */
    showSearch() {
        this.navigateTo('market');
        setTimeout(() => {
            document.getElementById('search-input')?.focus();
        }, 100);
    }

    // ========== PROFILE PAGES ==========

    async renderReferralsPage() {
        const referralInfo = await api.get('/referrals/info');
        // ... (тут буде повний рендер сторінки рефералів)
        return `
        <div class="max-w-4xl mx-auto">
            <h1 class="text-3xl font-bold mb-6 dark:text-white">🤝 ${this.t('profile.referrals.title')}</h1>
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6">
                <p class="mb-4">${this.t('profile.referrals.yourCode')}:</p>
                <div class="flex flex-col sm:flex-row gap-2 mb-6">
                    <input type="text" value="${referralInfo.referral_link}" readonly class="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700">
                    <button onclick="Utils.copyToClipboard('${referralInfo.referral_link}')" class="bg-gray-200 dark:bg-gray-600 px-4 py-2 rounded-lg font-semibold">${this.t('profile.referrals.copy')}</button>
                    <button onclick="auth.showInviteFriend()" class="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold">${this.t('profile.referrals.invite')}</button>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <div class="text-2xl font-bold">${referralInfo.total_referrals}</div>
                        <div>${this.t('profile.referrals.invited')}</div>
                    </div>
                    <div class="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <div class="text-2xl font-bold">${referralInfo.total_earned} 🎁</div>
                        <div>${this.t('profile.referrals.earned')}</div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    renderSettingsPage() {
        const user = auth.user;
        return `
        <div class="max-w-4xl mx-auto">
            <h1 class="text-3xl font-bold mb-6 dark:text-white">⚙️ ${this.t('profile.tabs.settings')}</h1>
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
                <div>
                    <label for="language-select" class="block text-sm font-medium dark:text-gray-300">${this.t('profile.settings.language')}</label>
                    <select id="language-select" class="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 dark:bg-gray-700 dark:border-gray-600 rounded-md">
                        <option value="ua" ${user.language === 'ua' ? 'selected' : ''}>Українська</option>
                        <option value="en" ${user.language === 'en' ? 'selected' : ''}>English</option>
                        <option value="ru" ${user.language === 'ru' ? 'selected' : ''}>Русский</option>
                    </select>
                </div>
                <div>
                    <label for="theme-select" class="block text-sm font-medium dark:text-gray-300">${this.t('profile.settings.theme')}</label>
                    <select id="theme-select" class="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 dark:bg-gray-700 dark:border-gray-600 rounded-md">
                        <option value="light" ${user.theme === 'light' ? 'selected' : ''}>${this.t('profile.settings.light')}</option>
                        <option value="dark" ${user.theme === 'dark' ? 'selected' : ''}>${this.t('profile.settings.dark')}</option>
                    </select>
                </div>
                <button onclick="app.saveSettings()" class="bg-blue-500 text-white px-6 py-2 rounded-lg">${this.t('buttons.save')}</button>
            </div>
        </div>
        `;
    }

    async saveSettings() {
        const lang = document.getElementById('language-select').value;
        const theme = document.getElementById('theme-select').value;
        await auth.updateProfile({ language: lang, theme: theme });
    }

    renderPlaceholderPage(titleKey, icon) {
        return `
            <div class="text-center py-16">
                <div class="text-6xl mb-4">${icon}</div>
                <h1 class="text-3xl font-bold mb-4 dark:text-white">${this.t(titleKey)}</h1>
                <p class="text-gray-600 dark:text-gray-400">${this.t('notifications.comingSoon')}</p>
            </div>
        `;
    }

    renderDownloadsPage() { return this.renderPlaceholderPage('profile.tabs.downloads', '📥'); }
    renderOrdersPage() { return this.renderPlaceholderPage('profile.tabs.orders', '📋'); }
    renderSupportPage() { return this.renderPlaceholderPage('profile.tabs.support', '💬'); }
    renderFaqPage() { return this.renderPlaceholderPage('profile.tabs.faq', '❓'); }

}

// Створюємо та запускаємо додаток
const app = new App();

// Експортуємо для доступу з консолі (для дебагу)
window.app = app;
window.OhMyRevit = {
    app,
    api: window.api,
    auth: window.auth,
    products: window.products,
    cart: window.cart,
    utils: window.Utils,
    version: '1.0.0'
};

console.log('🎉 OhMyRevit Web App v1.0.0');
console.log('📚 Доступні об\'єкти: window.OhMyRevit');