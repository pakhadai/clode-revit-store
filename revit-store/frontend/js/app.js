/**
 * Головний файл додатку OhMyRevit
 */

class App {
    constructor() {
        this.currentPage = 'home';
        this.translations = {};
        this.utils = window.Utils;
        this.api = window.api;
        this.auth = window.auth;
        this.products = window.products;
        this.cart = window.cart;
        this.bonuses = window.bonuses;
        this.subscriptions = window.subscriptions;
        this.onboarding = window.onboarding;

        // UI модулі
        this.navigation = null;
        this.header = null;

        // Ініціалізуємо сторінки
        this.pages = {
            home: new HomePage(this),
            market: null, // TODO: MarketPage
            cart: null,   // TODO: CartPage
            profile: null, // TODO: ProfilePage
            admin: null   // TODO: AdminPage
        };
        window.homePage = this.pages.home; // Для доступу з onclick

        // UI модулі (будуть ініціалізовані пізніше)
        this.navigation = null;
        this.header = null;

        // Сторінки (будуть ініціалізовані пізніше)
        this.pages = {};

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

        // Ініціалізуємо UI модулі
        this.initUIModules();

        // Ініціалізуємо сторінки
        this.initPages();

        // Автентифікація
        if (this.auth.tg && this.auth.tg.initData) {
            await this.auth.authenticate();
        }

        // Ініціалізуємо модуль бонусів
        await this.bonuses.init();

        // Ініціалізуємо обробники подій
        this.initEventHandlers();

        // Оновлюємо UI
        this.updateUI();

        // Завантажуємо початкову сторінку
        const urlParams = this.utils.getUrlParams();
        if (this.onboarding.shouldShow()) {
            this.onboarding.start();
        }
        const page = urlParams.page || 'home';
        this.navigateTo(page);

        // Оновлюємо бейдж кошика
        this.cart.updateCartBadge();

        console.log('✅ Додаток готовий!');
    }

    /**
     * Ініціалізація UI модулів
     */
    initUIModules() {
        // Навігація
        this.navigation = new NavigationModule(this);
        this.navigation.init();

        // Верхня панель
        this.header = new HeaderModule(this);
        this.header.init();
        window.headerModule = this.header; // Для доступу з модалок
    }

    /**
     * Ініціалізація сторінок
     */
    initPages() {
        // Ініціалізуємо тільки ті сторінки, класи яких завантажені
        if (window.HomePage) {
            this.pages.home = new HomePage(this);
            window.homePage = this.pages.home;
        }

        if (window.MarketPage) {
            this.pages.market = new MarketPage(this);
        }

        if (window.CartPage) {
            this.pages.cart = new CartPage(this);
        }

        if (window.ProfilePage) {
            this.pages.profile = new ProfilePage(this);
        }

        if (window.AdminPage) {
            this.pages.admin = new AdminPage(this);
        }
    }

    /**
     * Завантажити переклади
     */
    async loadTranslations() {
        const lang = this.utils.getCurrentLanguage();
        try {
            const response = await fetch(`/assets/locales/${lang}.json`);
            if (response.ok) {
                this.translations = await response.json();
            } else {
                // Завантажуємо англійську як fallback
                const fallbackResponse = await fetch('/assets/locales/en.json');
                if (fallbackResponse.ok) {
                    this.translations = await fallbackResponse.json();
                }
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
     * Навігація до сторінки
     */
    async navigateTo(page, params = {}, updateHistory = true) {
        // Оновлюємо URL
        if (updateHistory) {
            const url = new URL(window.location);
            url.searchParams.set('page', page);
            window.history.pushState({ page }, '', url);
        }

        // Оновлюємо активну сторінку
        this.currentPage = page;

        // Оновлюємо навігацію
        if (this.navigation) {
            this.navigation.setActivePage(page);
        }

        // Показуємо індикатор завантаження
        const content = document.getElementById('page-content');
        content.innerHTML = `
            <div class="flex items-center justify-center py-20">
                <div class="loader"></div>
            </div>
        `;

        // Рендеримо сторінку
        try {
            switch (page) {
                case 'home':
                    await this.pages.home.render();
                    break;

                case 'market':
                    if (!this.pages.market) {
                        // Тимчасова заглушка
                        content.innerHTML = this.renderPlaceholderPage('nav.market', '🛍️');
                    } else {
                        await this.pages.market.render(params);
                    }
                    break;

                case 'cart':
                    if (!this.pages.cart) {
                        // Показуємо базовий кошик
                        content.innerHTML = await this.cart.renderCartPage();
                    } else {
                        await this.pages.cart.render();
                    }
                    break;

                case 'profile':
                    if (!this.pages.profile) {
                        // Показуємо базовий профіль
                        content.innerHTML = this.renderProfilePage();
                    } else {
                        await this.pages.profile.render();
                    }
                    break;

                case 'admin':
                    if (this.auth.currentUser?.is_admin) {
                        if (!this.pages.admin) {
                            content.innerHTML = this.renderPlaceholderPage('nav.admin', '⚙️');
                        } else {
                            await this.pages.admin.render();
                        }
                    } else {
                        this.navigateTo('home');
                    }
                    break;

                default:
                    this.navigateTo('home');
            }
        } catch (error) {
            console.error('Error rendering page:', error);
            content.innerHTML = `
                <div class="text-center py-20">
                    <p class="text-red-500">${this.t('errors.general')}</p>
                    <button onclick="window.location.reload()" class="btn-primary mt-4">
                        ${this.t('buttons.refresh')}
                    </button>
                </div>
            `;
        }
    }

    /**
     * Відправити повідомлення в підтримку
     */
    sendSupportMessage(event) {
        event.preventDefault();

        const topic = document.getElementById('support-topic')?.value;
        const message = document.getElementById('support-message')?.value;

        if (!message) {
            Utils.showNotification('Введіть повідомлення', 'warning');
            return;
        }

        // Тут буде відправка на сервер
        console.log('Sending support message:', { topic, message });

        // Очищаємо форму
        document.getElementById('support-message').value = '';

        Utils.showNotification('Повідомлення відправлено! Ми відповімо протягом 24 годин.', 'success');
    }

    /**
     * Оновити налаштування
     */
    updateSetting(setting, value) {
        const updates = {};
        updates[setting] = value;

        // Оновлюємо локально
        if (setting === 'theme') {
            Utils.setTheme(value);
            this.applyTheme();
        } else if (setting === 'language') {
            Utils.setLanguage(value);
            this.loadTranslations().then(() => {
                this.render();
            });
        }

        // Якщо авторизований - зберігаємо на сервері
        if (auth.isAuthenticated()) {
            auth.updateProfile(updates).catch(error => {
                console.error('Failed to update setting:', error);
            });
        }

        Utils.showNotification('Налаштування збережено', 'success');
    }

    /**
     * Показати модальне вікно PIN-коду
     */
    showPinCodeModal() {
        const modal = document.createElement('div');
        modal.id = 'pin-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';

        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6">
                <h3 class="text-xl font-bold mb-4 dark:text-white">🔐 Встановити PIN-код</h3>

                <form onsubmit="app.savePinCode(event)">
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                            Новий PIN-код (4 цифри)
                        </label>
                        <input type="password" id="new-pin" pattern="[0-9]{4}" maxlength="4" required
                               class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                      dark:bg-gray-700 dark:text-white text-center text-2xl tracking-widest"
                               placeholder="• • • •">
                    </div>

                    <div class="mb-6">
                        <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                            Підтвердіть PIN-код
                        </label>
                        <input type="password" id="confirm-pin" pattern="[0-9]{4}" maxlength="4" required
                               class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                      dark:bg-gray-700 dark:text-white text-center text-2xl tracking-widest"
                               placeholder="• • • •">
                    </div>

                    <div class="flex gap-3">
                        <button type="button" onclick="document.getElementById('pin-modal').remove()"
                                class="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
                                       text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium">
                            ${this.t('buttons.cancel')}
                        </button>
                        <button type="submit"
                                class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium">
                            ${this.t('buttons.save')}
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Зберегти PIN-код
     */
    savePinCode(event) {
        event.preventDefault();

        const newPin = document.getElementById('new-pin')?.value;
        const confirmPin = document.getElementById('confirm-pin')?.value;

        if (newPin !== confirmPin) {
            Utils.showNotification('PIN-коди не співпадають', 'error');
            return;
        }

        // Тут буде відправка на сервер
        console.log('Saving PIN code');

        document.getElementById('pin-modal')?.remove();
        Utils.showNotification('PIN-код успішно встановлено', 'success');
    }

    /**
     * Показати реферальний код
     */
    showReferralCode(code) {
        const referralLink = `https://t.me/OhMyRevitBot?start=${code}`;

        const modal = document.createElement('div');
        modal.id = 'referral-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';

        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
                <h3 class="text-xl font-bold mb-4 dark:text-white">🤝 Ваш реферальний код</h3>

                <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <div class="text-center text-2xl font-mono font-bold text-blue-600 dark:text-blue-400 mb-2">
                        ${code}
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400 text-center">
                        Ваш унікальний код
                    </div>
                </div>

                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2 dark:text-gray-300">
                        Реферальне посилання:
                    </label>
                    <div class="flex gap-2">
                        <input type="text" value="${referralLink}" readonly
                               class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                      bg-white dark:bg-gray-700 dark:text-white text-sm">
                        <button onclick="Utils.copyToClipboard('${referralLink}')"
                                class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
                            📋
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-3 mb-4">
                    <button onclick="app.shareReferral('telegram')"
                            class="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800">
                        <div class="text-2xl">✈️</div>
                        <div class="text-xs">Telegram</div>
                    </button>
                    <button onclick="app.shareReferral('whatsapp')"
                            class="p-3 bg-green-100 dark:bg-green-900 rounded-lg hover:bg-green-200 dark:hover:bg-green-800">
                        <div class="text-2xl">📱</div>
                        <div class="text-xs">WhatsApp</div>
                    </button>
                    <button onclick="app.shareReferral('copy')"
                            class="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                        <div class="text-2xl">🔗</div>
                        <div class="text-xs">Копіювати</div>
                    </button>
                </div>

                <button onclick="document.getElementById('referral-modal').remove()"
                        class="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
                               text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium">
                    ${this.t('buttons.close')}
                </button>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Поділитися реферальним посиланням
     */
    shareReferral(platform) {
        const code = auth.user?.referral_code || 'NOCODE';
        const referralLink = `https://t.me/OhMyRevitBot?start=${code}`;
        const message = `Приєднуйся до OhMyRevit - найкращого маркетплейсу архівів Revit! Отримай 30 бонусів за реєстрацію: ${referralLink}`;

        switch(platform) {
            case 'telegram':
                window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`);
                break;
            case 'whatsapp':
                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
                break;
            case 'copy':
                Utils.copyToClipboard(referralLink);
                break;
        }
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

                case 'collections':
                    html = await this.renderCollectionsPage();
                    break;

                case 'collection-detail':
                    const collectionId = Utils.getUrlParams().id;
                    html = await this.renderCollectionDetailPage(collectionId);
                    break;

                case 'downloads':
                    html = await this.renderDownloadsTab();
                    break;

                case 'orders':
                    html = this.renderOrdersTab();
                    break;

                case 'referrals':
                    html = this.renderReferralsTab();
                    break;

                case 'settings':
                    html = this.renderSettingsTab();
                    break;

                case 'support':
                    html = this.renderSupportTab();
                    break;

                case 'faq':
                    html = this.renderFaqTab();
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
        // Спочатку завантажуємо товари, щоб отримати актуальні дані для рендеру
        await products.loadProducts();

        // Тепер генеруємо повний HTML сторінки
        const html = `
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
        // Більше не потрібен setTimeout, бо дані приходять одразу
        return html;
    }

    /**
     * Рендер сторінки управління колекціями
     */
    async renderCollectionsPage() {
        if (!auth.isAuthenticated()) return this.renderAuthRequiredPage();

        try {
            const collectionsList = await api.get('/collections/');

            if (collectionsList.length === 0) {
                 return `
                    <div class="text-center py-16">
                        <div class="text-6xl mb-4">📚</div>
                        <h3 class="text-xl font-bold mb-2 dark:text-white">Створіть свою першу колекцію</h3>
                        <p class="text-gray-600 dark:text-gray-400">Зберігайте товари, щоб не загубити їх.</p>
                    </div>
                `;
            }

            return `
                <div class="max-w-4xl mx-auto">
                    <h1 class="text-3xl font-bold mb-6 dark:text-white">📚 Мої Колекції</h1>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${collectionsList.map(c => `
                            <div onclick="app.navigateTo('collection-detail', true, { id: ${c.id} })"
                                 class="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center gap-4 shadow hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer">
                                <div class="text-4xl">${c.icon}</div>
                                <div class="flex-grow" onclick="app.navigateTo('collection-detail', true, { id: ${c.id} })">
                                    <h4 class="font-bold dark:text-white">${c.name}</h4>
                                    <p class="text-sm text-gray-600 dark:text-gray-400">${c.product_count} товарів</p>
                                </div>
                                <button onclick="event.stopPropagation(); collections.showEditCollectionModal(${c.id}, '${c.name}', '${c.icon}')"
                                        class="text-2xl p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                                    ⚙️
                                </button>
                                <span class="text-gray-400 text-2xl">></span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

        } catch (error) {
            return this.renderErrorPage(error);
        }
    }

    /**
     * Рендер сторінки з вмістом конкретної колекції
     */
    async renderCollectionDetailPage(collectionId) {
        if (!auth.isAuthenticated()) return this.renderAuthRequiredPage();

        try {
            const collection = await api.get(`/collections/${collectionId}`);

            return `
                <div class="max-w-4xl mx-auto">
                    <div class="flex items-center gap-4 mb-6">
                        <button onclick="app.navigateTo('collections')" class="text-2xl p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">←</button>
                        <h1 class="text-3xl font-bold dark:text-white flex items-center gap-3">
                           <span class="text-4xl">${collection.icon}</span> ${collection.name}
                        </h1>
                    </div>

                    ${collection.products.length === 0 ? `
                        <div class="text-center py-16">
                            <div class="text-6xl mb-4">📂</div>
                            <h3 class="text-xl font-bold mb-2 dark:text-white">Ця колекція порожня</h3>
                            <p class="text-gray-600 dark:text-gray-400">Додайте товари з маркету, натискаючи на сердечко.</p>
                        </div>
                    ` : `
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            ${collection.products.map(p => products.createProductCard(p)).join('')}
                        </div>
                    `}
                </div>
            `;
        } catch (error) {
            return this.renderErrorPage(error);
        }
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
                    ${createTile('collections', '📚', 'profile.tabs.collections')}
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
     * Оновлення інтерфейсу після зміни стану
     */
    updateUI() {
        const user = this.auth.currentUser;

        // Оновлюємо аватар
        if (this.header) {
            this.header.updateUserAvatar(user);
        }

        // Оновлюємо видимість адмін-кнопки
        if (this.navigation) {
            this.navigation.render(); // Перерендер для показу/приховування адмін кнопки
        }

        // Оновлюємо бейджі
        this.updateBadges();
    }

    /**
     * Оновлення бейджів
     */
    updateBadges() {
        // Кошик
        const cartCount = this.cart.getCartItems().length;
        if (this.navigation) {
            this.navigation.updateCartBadge(cartCount);
        }

        // Сповіщення
        // TODO: отримати кількість непрочитаних сповіщень з API
        if (this.header) {
            this.header.updateNotificationBadge(0);
        }
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
                return `<p class="text-gray-600 dark:text-gray-400">${this.t('profile.tabs.contentPlaceholder').replace('{tab}', tab)}</p>`;
        }
    }

    /**
     * Рендер вкладки завантажень
     */
    async renderDownloadsTab() {
        if (!auth.isAuthenticated()) {
            return this.renderAuthRequiredPage();
        }

        try {
            Utils.showLoader(true);
            const downloads = await api.get('/products/user/downloads', { language: Utils.getCurrentLanguage() });

            const createProductRow = (product) => `
                <div class="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center gap-4 shadow hover:shadow-lg transition-shadow cursor-pointer" onclick="app.navigateTo('product', true, { id: ${product.id} })">
                    <img src="${product.preview_image || '/assets/icons/favicon-96x96.png'}" alt="${product.title}" class="w-20 h-20 rounded-md object-cover flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                    <div class="flex-grow">
                        <h4 class="font-bold dark:text-white">${product.title}</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">${product.description}</p>
                    </div>
                    <button onclick="event.stopPropagation(); products.downloadProduct(${product.id})" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex-shrink-0">
                        Завантажити
                    </button>
                </div>
            `;

            const createSection = (title, productList) => {
                if (!productList || productList.length === 0) {
                    return ''; // Не показуємо секцію, якщо вона порожня
                }
                return `
                    <div class="mb-8">
                        <h2 class="text-2xl font-bold mb-4 dark:text-white">${title}</h2>
                        <div class="space-y-4">
                            ${productList.map(createProductRow).join('')}
                        </div>
                    </div>
                `;
            };

            return `
                <div class="downloads-page max-w-4xl mx-auto">
                    <h1 class="text-3xl font-bold mb-8 dark:text-white">📥 Мої Завантаження</h1>

                    ${createSection('🆓 Безкоштовні архіви', downloads.free)}
                    ${createSection('🛒 Придбані архіви', downloads.purchased)}
                    ${createSection('⭐ Архіви по підписці', downloads.subscription)}

                    ${(downloads.free.length === 0 && downloads.purchased.length === 0 && downloads.subscription.length === 0) ? `
                        <div class="text-center py-16">
                            <div class="text-6xl mb-4">📂</div>
                            <h3 class="text-xl font-bold mb-2 dark:text-white">Тут поки що порожньо</h3>
                            <p class="text-gray-600 dark:text-gray-400">Безкоштовні та куплені архіви з'являться на цій сторінці.</p>
                        </div>
                    ` : ''}
                </div>
            `;

        } catch (error) {
            console.error('Render downloads page error:', error);
            return this.renderErrorPage(error);
        } finally {
            Utils.showLoader(false);
        }
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
                            <option value="uk" ${user?.language === 'uk' ? 'selected' : ''}>🇺🇦 Українська</option>
                            <option value="en" ${user?.language === 'en' ? 'selected' : ''}>🇬🇧 English</option>
                            <option value="ru" ${user?.language === 'ru' ? 'selected' : ''}>🏳 Русский</option>
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
     * Рендер вкладки статистики
     */
    renderStatisticsTab() {
        // Використовуємо модуль бонусів для створення статистики
        if (bonuses && bonuses.statistics) {
            return bonuses.createStatisticsHTML();
        }

        // Fallback якщо статистика не завантажена
        return `
            <div class="statistics-content">
                <h3 class="text-xl font-bold mb-4 dark:text-white">📊 ${this.t('profile.statistics.title')}</h3>

                <div class="text-center py-8">
                    <div class="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-16 w-16 mx-auto mb-4"></div>
                    <p class="text-gray-600 dark:text-gray-400">${this.t('notifications.loading')}</p>
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
     * Рендер вкладки FAQ
     */
    renderFaqTab() {
        const faqItems = [
            {
                question: 'Як отримати безкоштовні архіви?',
                answer: 'Безкоштовні архіви доступні всім користувачам у розділі "Безкоштовні" маркетплейсу. Просто виберіть потрібний архів та завантажте його.'
            },
            {
                question: 'Що дає підписка?',
                answer: 'Підписка надає доступ до всіх преміум архівів, які вийшли під час дії підписки, +2 прокрутки колеса щодня, 5% кешбек бонусами та пріоритетну підтримку.'
            },
            {
                question: 'Як працює реферальна програма?',
                answer: 'Запрошуйте друзів за вашим посиланням. Ви отримаєте 30 бонусів за кожну реєстрацію та 5% від усіх покупок ваших рефералів.'
            },
            {
                question: 'Як стати творцем?',
                answer: 'Натисніть кнопку "Стати творцем" у профілі, заповніть заявку з інформацією про себе та портфоліо. Після схвалення модератором ви отримаєте доступ до кабінету творця.'
            },
            {
                question: 'Які методи оплати доступні?',
                answer: 'Ми приймаємо криптовалюту (Bitcoin, Ethereum, USDT), бонуси системи та оплату через активну підписку для преміум товарів.'
            },
            {
                question: 'Як використовувати промокод?',
                answer: 'Введіть промокод у спеціальне поле при оформленні замовлення в кошику. Знижка буде застосована автоматично.'
            },
            {
                question: 'Скільки разів можна крутити колесо фортуни?',
                answer: 'Ви отримуєте 1 безкоштовну спробу щодня, з підпискою - 3 спроби. Додаткові спроби можна купити за 5 бонусів.'
            },
            {
                question: 'Як працює VIP система?',
                answer: 'VIP рівень залежить від загальної суми покупок: Bronze ($100+), Silver ($500+), Gold ($1000+), Diamond ($5000+). Кожен рівень дає додатковий кешбек.'
            }
        ];

        return `
            <div class="faq-content">
                <h3 class="text-xl font-bold mb-6 dark:text-white">❓ Часті питання</h3>

                <div class="space-y-4">
                    ${faqItems.map((item, index) => `
                        <div class="faq-item bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
                            <button onclick="app.toggleFaqItem(${index})"
                                    class="w-full text-left px-6 py-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700">
                                <span class="font-medium dark:text-white">${item.question}</span>
                                <span class="text-gray-400 transform transition-transform" id="faq-icon-${index}">
                                    ▼
                                </span>
                            </button>
                            <div id="faq-answer-${index}" class="hidden px-6 pb-4">
                                <p class="text-gray-600 dark:text-gray-400">${item.answer}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="mt-8 p-6 bg-blue-50 dark:bg-blue-900 rounded-lg">
                    <p class="text-blue-800 dark:text-blue-200">
                        💡 Не знайшли відповідь на своє питання?
                        <button onclick="app.showProfileTab('support')"
                                class="underline hover:no-underline">
                            Зверніться до підтримки
                        </button>
                    </p>
                </div>
            </div>
        `;
    }

    /**
     * Перемкнути FAQ елемент
     */
    toggleFaqItem(index) {
        const answer = document.getElementById(`faq-answer-${index}`);
        const icon = document.getElementById(`faq-icon-${index}`);

        if (answer) {
            answer.classList.toggle('hidden');
            if (icon) {
                icon.style.transform = answer.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
            }
        }
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
        const currentLang = Utils.getCurrentLanguage();

        const modal = document.createElement('div');
        modal.id = 'language-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';

        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6">
                <h3 class="text-xl font-bold mb-4 dark:text-white">🌐 ${this.t('profile.settings.language')}</h3>

                <div class="space-y-2">
                    <button onclick="app.selectLanguage('uk')"
                            class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                                   ${currentLang === 'uk' ? 'bg-blue-100 dark:bg-blue-900' : ''}
                                   flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">🇺🇦</span>
                            <span class="dark:text-white">Українська</span>
                        </div>
                        ${currentLang === 'uk' ? '<span class="text-blue-500">✓</span>' : ''}
                    </button>

                    <button onclick="app.selectLanguage('en')"
                            class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                                   ${currentLang === 'en' ? 'bg-blue-100 dark:bg-blue-900' : ''}
                                   flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">🇬🇧</span>
                            <span class="dark:text-white">English</span>
                        </div>
                        ${currentLang === 'en' ? '<span class="text-blue-500">✓</span>' : ''}
                    </button>

                    <button onclick="app.selectLanguage('ru')"
                            class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                                   ${currentLang === 'ru' ? 'bg-blue-100 dark:bg-blue-900' : ''}
                                   flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">⚪</span>
                            <span class="dark:text-white">Русский</span>
                        </div>
                        ${currentLang === 'ru' ? '<span class="text-blue-500">✓</span>' : ''}
                    </button>
                </div>

                <button onclick="document.getElementById('language-modal').remove()"
                        class="mt-6 w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
                               text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium">
                    ${this.t('buttons.close')}
                </button>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Вибрати мову
     */
    selectLanguage(lang) {
        Utils.setLanguage(lang);

        // Якщо користувач авторизований - зберігаємо на сервері
        if (auth.isAuthenticated()) {
            auth.updateProfile({ language: lang }).catch(error => {
                console.error('Failed to update language preference:', error);
            });
        }

        // Закриваємо модальне вікно
        document.getElementById('language-modal')?.remove();

        // Оновлюємо UI
        this.updateLanguageButton();

        // Перезавантажуємо переклади та перерендеримо сторінку
        this.loadTranslations().then(() => {
            this.render();
            Utils.showNotification('✅ Мову змінено', 'success');
        });
    }

    /**
     * Показати сповіщення
     */
    showNotifications() {
        // Моковані сповіщення для демонстрації
        const notifications = [
            {
                id: 1,
                type: 'bonus',
                icon: '🎁',
                title: 'Щоденний бонус доступний!',
                message: 'Не забудьте отримати свій щоденний бонус',
                time: new Date().toISOString(),
                read: false
            },
            {
                id: 2,
                type: 'product',
                icon: '✅',
                title: 'Товар схвалено',
                message: 'Ваш товар "Modern Furniture Pack" було схвалено та опубліковано',
                time: new Date(Date.now() - 3600000).toISOString(),
                read: false
            },
            {
                id: 3,
                type: 'sale',
                icon: '💰',
                title: 'Новий продаж!',
                message: 'Користувач придбав ваш товар "Kitchen Set Pro"',
                time: new Date(Date.now() - 86400000).toISOString(),
                read: true
            },
            {
                id: 4,
                type: 'subscription',
                icon: '⭐',
                title: 'Підписка закінчується',
                message: 'Ваша підписка закінчиться через 3 дні',
                time: new Date(Date.now() - 172800000).toISOString(),
                read: true
            }
        ];

        const unreadCount = notifications.filter(n => !n.read).length;

        const modal = document.createElement('div');
        modal.id = 'notifications-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';

        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
                <div class="p-6 border-b dark:border-gray-700">
                    <div class="flex justify-between items-center">
                        <h3 class="text-xl font-bold dark:text-white">
                            🔔 Сповіщення ${unreadCount > 0 ? `(${unreadCount})` : ''}
                        </h3>
                        <button onclick="document.getElementById('notifications-modal').remove()"
                                class="text-gray-500 hover:text-gray-700 dark:text-gray-400 text-2xl">
                            ×
                        </button>
                    </div>

                    ${unreadCount > 0 ? `
                        <button onclick="app.markAllAsRead()"
                                class="mt-3 text-sm text-blue-500 hover:text-blue-600">
                            Позначити всі як прочитані
                        </button>
                    ` : ''}
                </div>

                <div class="flex-1 overflow-y-auto">
                    ${notifications.length > 0 ? `
                        <div class="divide-y dark:divide-gray-700">
                            ${notifications.map(notif => `
                                <div class="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer
                                            ${!notif.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}"
                                     onclick="app.handleNotificationClick(${notif.id})">
                                    <div class="flex gap-3">
                                        <div class="text-2xl flex-shrink-0">${notif.icon}</div>
                                        <div class="flex-1">
                                            <div class="font-medium dark:text-white ${!notif.read ? 'font-bold' : ''}">
                                                ${notif.title}
                                            </div>
                                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                ${notif.message}
                                            </p>
                                            <div class="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                                ${this.formatNotificationTime(notif.time)}
                                            </div>
                                        </div>
                                        ${!notif.read ? '<div class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>' : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="text-center py-16">
                            <div class="text-5xl mb-4">📭</div>
                            <p class="text-gray-600 dark:text-gray-400">${this.t('notifications.noNotifications')}</p>
                        </div>
                    `}
                </div>

                <div class="p-4 border-t dark:border-gray-700">
                    <button onclick="app.clearAllNotifications()"
                            class="w-full text-center text-sm text-red-500 hover:text-red-600">
                        Очистити всі сповіщення
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Форматувати час сповіщення
     */
    formatNotificationTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Щойно';
        if (minutes < 60) return `${minutes} хв. тому`;
        if (hours < 24) return `${hours} год. тому`;
        if (days < 7) return `${days} ${Utils.pluralize(days, ['день', 'дні', 'днів'])} тому`;

        return date.toLocaleDateString('uk-UA');
    }

    /**
     * Обробка кліку на сповіщення
     */
    handleNotificationClick(notificationId) {
        // Позначаємо як прочитане
        console.log('Notification clicked:', notificationId);

        // Закриваємо модальне вікно
        document.getElementById('notifications-modal')?.remove();

        // Тут можна додати навігацію до відповідної сторінки
        // залежно від типу сповіщення
    }

    /**
     * Позначити всі як прочитані
     */
    markAllAsRead() {
        console.log('Marking all notifications as read');
        // Тут буде логіка позначення всіх сповіщень як прочитаних
        this.showNotifications(); // Перерендерити модальне вікно
    }

    /**
     * Очистити всі сповіщення
     */
    clearAllNotifications() {
        console.log('Clearing all notifications');
        // Тут буде логіка очищення всіх сповіщень
        document.getElementById('notifications-modal')?.remove();
        Utils.showNotification('Сповіщення очищено', 'info');
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
                        <option value="uk" ${user.language === 'uk' ? 'selected' : ''}>Українська</option>
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