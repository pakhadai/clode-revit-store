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
        return this.translations[key] || defaultValue || key;
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
            Utils.showNotification(`Вітаємо, ${e.detail.first_name}!`, 'success');
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

                case 'admin':
                    if (auth.isAdmin()) {
                        html = await this.renderAdminPage();
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
                <!-- Банер підписки -->
                <div class="subscription-banner bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white mb-8">
                    <h2 class="text-3xl font-bold mb-4">🎯 Преміум підписка</h2>
                    <div class="grid md:grid-cols-2 gap-6 mb-6">
                        <ul class="space-y-2">
                            <li>✅ Доступ до нових преміум архівів</li>
                            <li>✅ +2 прокрутки колеса щодня</li>
                        </ul>
                        <ul class="space-y-2">
                            <li>✅ Кешбек 5% бонусами</li>
                            <li>✅ Пріоритетна підтримка</li>
                        </ul>
                    </div>
                    <div class="flex gap-4">
                        <button onclick="app.showSubscriptionPlans()"
                                class="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100">
                            Місячна $5
                        </button>
                        <button onclick="app.showSubscriptionPlans()"
                                class="bg-white text-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100">
                            Річна $50 (2 місяці безкоштовно)
                        </button>
                    </div>
                </div>

                <!-- Щоденний бонус -->
                <div class="daily-bonus bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg mb-8">
                    <h3 class="text-2xl font-bold mb-4 dark:text-white">🎁 Щоденний бонус</h3>
                    <div class="grid md:grid-cols-2 gap-6">
                        <!-- Стрік система -->
                        <div class="text-center">
                            <p class="mb-4 dark:text-gray-300">
                                Ваш стрік: <span class="font-bold text-blue-600">${user?.daily_streak || 0} ${Utils.pluralize(user?.daily_streak || 0, ['день', 'дні', 'днів'])}</span>
                            </p>
                            <button onclick="app.claimDailyBonus()"
                                    class="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-bold">
                                🎁 Отримати бонус
                            </button>
                        </div>

                        <!-- Колесо фортуни -->
                        <div class="text-center">
                            <p class="mb-4 dark:text-gray-300">
                                Безкоштовні спроби: <span class="font-bold text-purple-600">${user?.free_spins_today || 1}</span>
                            </p>
                            <button onclick="app.showWheelOfFortune()"
                                    class="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-bold">
                                🎰 Крутити колесо
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Товар тижня -->
                ${featured.product_of_week ? `
                    <div class="product-of-week bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 mb-8 text-white">
                        <h3 class="text-2xl font-bold mb-4">🏆 Товар тижня</h3>
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
                                    Детальніше
                                </button>
                            </div>
                            ${featured.product_of_week.preview_image ?
                                `<img src="${featured.product_of_week.preview_image}" alt="${featured.product_of_week.title}"
                                      class="rounded-lg w-full h-48 object-cover">` : ''
                            }
                        </div>
                    </div>
                ` : ''}

                <!-- Новинки -->
                ${featured.new_products?.length > 0 ? `
                    <div class="new-products mb-8">
                        <h3 class="text-2xl font-bold mb-4 dark:text-white">✨ Новинки</h3>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            ${featured.new_products.map(product => products.createProductCard(product)).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Популярні товари -->
                ${featured.featured_products?.length > 0 ? `
                    <div class="featured-products">
                        <h3 class="text-2xl font-bold mb-4 dark:text-white">🔥 Популярні товари</h3>
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
                <h1 class="text-3xl font-bold mb-6 dark:text-white">🛍️ Маркетплейс</h1>

                <!-- Фільтри -->
                <div class="filters bg-white dark:bg-gray-800 rounded-lg p-4 mb-6">
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <!-- Категорія -->
                        <select id="filter-category" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                                              dark:bg-gray-700 dark:text-white"
                                onchange="products.setFilter('category', this.value); app.applyFilters()">
                            <option value="">Всі категорії</option>
                            <option value="free">🆓 Безкоштовні</option>
                            <option value="premium">⭐ Преміум</option>
                            <option value="creator">🎨 Від творців</option>
                        </select>

                        <!-- Тип -->
                        <select id="filter-type" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                                        dark:bg-gray-700 dark:text-white"
                                onchange="products.setFilter('product_type', this.value); app.applyFilters()">
                            <option value="">Всі типи</option>
                            <option value="furniture">🪑 Меблі</option>
                            <option value="textures">🎨 Текстури</option>
                            <option value="components">🔧 Компоненти</option>
                        </select>

                        <!-- Сортування -->
                        <select id="filter-sort" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                                        dark:bg-gray-700 dark:text-white"
                                onchange="app.applySorting(this.value)">
                            <option value="created_at-desc">Найновіші</option>
                            <option value="price-asc">Ціна: за зростанням</option>
                            <option value="price-desc">Ціна: за спаданням</option>
                            <option value="rating-desc">Рейтинг</option>
                            <option value="downloads-desc">Популярність</option>
                        </select>

                        <!-- Пошук -->
                        <div class="relative">
                            <input type="text" id="search-input"
                                   class="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg
                                          dark:bg-gray-700 dark:text-white"
                                   placeholder="Пошук..."
                                   onkeyup="app.handleSearch(event)">
                            <button onclick="app.doSearch()"
                                    class="absolute right-2 top-2 text-gray-500 hover:text-gray-700 dark:text-gray-400">
                                🔍
                            </button>
                        </div>
                    </div>

                    <!-- Додаткові фільтри -->
                    <div class="mt-4 flex flex-wrap gap-2">
                        <label class="inline-flex items-center">
                            <input type="checkbox" onchange="products.setFilter('is_free', this.checked); app.applyFilters()"
                                   class="mr-2">
                            <span class="dark:text-gray-300">Тільки безкоштовні</span>
                        </label>
                        <label class="inline-flex items-center">
                            <input type="checkbox" onchange="products.setFilter('is_new', this.checked); app.applyFilters()"
                                   class="mr-2">
                            <span class="dark:text-gray-300">Новинки</span>
                        </label>
                        <label class="inline-flex items-center">
                            <input type="checkbox" onchange="products.setFilter('has_discount', this.checked); app.applyFilters()"
                                   class="mr-2">
                            <span class="dark:text-gray-300">Зі знижкою</span>
                        </label>
                    </div>
                </div>

                <!-- Список товарів -->
                <div id="products-grid" class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    ${products.products.map(product => products.createProductCard(product)).join('')}
                </div>

                <!-- Пагінація -->
                ${products.totalPages > 1 ? `
                    <div class="pagination flex justify-center gap-2 mt-8">
                        ${products.currentPage > 1 ?
                            `<button onclick="app.loadPage(${products.currentPage - 1})"
                                     class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">
                                ← Назад
                            </button>` : ''
                        }

                        <span class="px-4 py-2 dark:text-white">
                            Сторінка ${products.currentPage} з ${products.totalPages}
                        </span>

                        ${products.currentPage < products.totalPages ?
                            `<button onclick="app.loadPage(${products.currentPage + 1})"
                                     class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">
                                Далі →
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

        return `
            <div class="profile-page max-w-4xl mx-auto">
                <!-- Заголовок профілю -->
                <div class="profile-header bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
                    <div class="flex items-center gap-4">
                        <div class="avatar w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-3xl">
                            ${user.first_name?.[0] || '👤'}
                        </div>
                        <div class="flex-1">
                            <h1 class="text-2xl font-bold dark:text-white">
                                ${user.first_name} ${user.last_name || ''}
                            </h1>
                            <p class="text-gray-600 dark:text-gray-400">@${user.username || `user_${user.telegram_id}`}</p>
                            <div class="flex gap-4 mt-2">
                                <span class="text-sm ${user.vip_level > 0 ? 'text-yellow-500' : 'text-gray-500'}">
                                    ${user.vip_level_name || 'No VIP'}
                                </span>
                                ${user.is_creator ? '<span class="text-sm text-purple-500">🎨 Творець</span>' : ''}
                                ${user.is_admin ? '<span class="text-sm text-red-500">👑 Адмін</span>' : ''}
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">${user.balance}</div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">бонусів</div>
                        </div>
                    </div>
                </div>

                <!-- Вкладки -->
                <div class="tabs bg-white dark:bg-gray-800 rounded-lg mb-6">
                    <div class="flex border-b dark:border-gray-700">
                        <button onclick="app.showProfileTab('downloads')"
                                class="tab-btn px-6 py-3 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                                data-tab="downloads">
                            📥 Завантаження
                        </button>
                        <button onclick="app.showProfileTab('orders')"
                                class="tab-btn px-6 py-3 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                                data-tab="orders">
                            📋 Замовлення
                        </button>
                        <button onclick="app.showProfileTab('favorites')"
                                class="tab-btn px-6 py-3 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                                data-tab="favorites">
                            ❤️ Обране
                        </button>
                        <button onclick="app.showProfileTab('referrals')"
                                class="tab-btn px-6 py-3 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                                data-tab="referrals">
                            🤝 Реферали
                        </button>
                        <button onclick="app.showProfileTab('settings')"
                                class="tab-btn px-6 py-3 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                                data-tab="settings">
                            ⚙️ Налаштування
                        </button>
                    </div>

                    <div class="tab-content p-6" id="profile-tab-content">
                        <!-- Контент вкладок буде тут -->
                    </div>
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
                <h1 class="text-3xl font-bold mb-4 dark:text-white">Сторінку не знайдено</h1>
                <p class="text-gray-600 dark:text-gray-400 mb-8">Вибачте, але запитувана сторінка не існує</p>
                <button onclick="app.navigateTo('home')"
                        class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                    На головну
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
                <h1 class="text-3xl font-bold mb-4 dark:text-white">Щось пішло не так</h1>
                <p class="text-gray-600 dark:text-gray-400 mb-8">${error.message || 'Невідома помилка'}</p>
                <button onclick="location.reload()"
                        class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                    Перезавантажити
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
                <h1 class="text-3xl font-bold mb-4 dark:text-white">Необхідна авторизація</h1>
                <p class="text-gray-600 dark:text-gray-400 mb-8">Для доступу до цієї сторінки необхідно увійти</p>
                <button onclick="auth.authenticate()"
                        class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
                    Увійти через Telegram
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
        cart.updateCartBadge();
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
        // TODO: Реалізувати рендер для кожної вкладки
        return `<p class="text-gray-600 dark:text-gray-400">Контент вкладки "${tab}" буде тут</p>`;
    }

    /**
     * Показати плани підписок
     */
    showSubscriptionPlans() {
        // TODO: Реалізувати модальне вікно з планами підписок
        Utils.showNotification('Плани підписок будуть доступні найближчим часом', 'info');
    }

    /**
     * Отримати щоденний бонус
     */
    async claimDailyBonus() {
        try {
            const response = await api.claimDailyBonus();
            Utils.showNotification(`Отримано ${response.amount} бонусів!`, 'success');
            auth.user.balance = response.new_balance;
            auth.user.daily_streak = response.streak;
            this.render();
        } catch (error) {
            Utils.showNotification('Ви вже отримали бонус сьогодні', 'warning');
        }
    }

    /**
     * Показати колесо фортуни
     */
    showWheelOfFortune() {
        // TODO: Реалізувати колесо фортуни
        Utils.showNotification('Колесо фортуни буде доступне найближчим часом', 'info');
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
        Utils.showNotification('Немає нових сповіщень', 'info');
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